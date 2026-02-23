<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ClosingService
{
    /**
     * Create a new closing submission
     */
    public function createClosing(array $data): array
    {
        $revenuePoint = DB::connection('tenant')
            ->table('revenue_points')
            ->where('id', $data['revenue_point_id'])
            ->first();

        if (!$revenuePoint) {
            return ['success' => false, 'message' => 'Revenue point not found'];
        }

        // Check for existing closing in the same period
        $existingClosing = DB::connection('tenant')
            ->table('closings')
            ->where('revenue_point_id', $data['revenue_point_id'])
            ->where('period_start', $data['period_start'])
            ->where('period_end', $data['period_end'])
            ->whereNotIn('status', ['rejected'])
            ->first();

        if ($existingClosing) {
            return ['success' => false, 'message' => 'Closing already exists for this period'];
        }

        // Calculate expected amount from tickets
        $expected = $this->calculateExpectedAmount($data['revenue_point_id'], $data['period_start'], $data['period_end']);

        $variance = $data['remitted_amount'] - $expected['expected_amount'];
        $variancePercentage = $expected['expected_amount'] > 0 
            ? ($variance / $expected['expected_amount']) * 100 
            : 0;

        $status = abs($variancePercentage) > 5 ? 'variance_flagged' : 'submitted';

        $closingId = DB::connection('tenant')->table('closings')->insertGetId([
            'revenue_point_id' => $data['revenue_point_id'],
            'submitted_by' => $data['submitted_by'] ?? auth()->id(),
            'submitted_by_type' => $data['submitted_by_type'] ?? 'user',
            'period_type' => $data['period_type'] ?? $revenuePoint->closing_frequency,
            'period_start' => $data['period_start'],
            'period_end' => $data['period_end'],
            'expected_amount' => $expected['expected_amount'],
            'remitted_amount' => $data['remitted_amount'],
            'variance' => $variance,
            'variance_percentage' => round($variancePercentage, 2),
            'tickets_sold' => $expected['tickets_sold'],
            'ticket_revenue' => $expected['ticket_revenue'],
            'cash_collected' => $data['cash_collected'] ?? 0,
            'transfer_collected' => $data['transfer_collected'] ?? 0,
            'pos_collected' => $data['pos_collected'] ?? 0,
            'remittance_method' => $data['remittance_method'] ?? 'transfer',
            'remittance_reference' => $data['remittance_reference'] ?? null,
            'proof_url' => $data['proof_url'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->logAudit('submit', 'closings', 'Closing', $closingId, [
            'revenue_point' => $revenuePoint->name,
            'expected' => $expected['expected_amount'],
            'remitted' => $data['remitted_amount'],
            'variance' => $variance,
        ]);

        return [
            'success' => true,
            'closing_id' => $closingId,
            'status' => $status,
            'variance' => $variance,
            'variance_percentage' => round($variancePercentage, 2),
        ];
    }

    /**
     * Calculate expected amount for a period
     */
    public function calculateExpectedAmount(int $revenuePointId, string $startDate, string $endDate): array
    {
        $tickets = DB::connection('tenant')
            ->table('tickets')
            ->join('ticket_batches', 'tickets.batch_id', '=', 'ticket_batches.id')
            ->where('ticket_batches.revenue_point_id', $revenuePointId)
            ->where('tickets.status', 'sold')
            ->whereBetween('tickets.sold_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->selectRaw('COUNT(*) as count, SUM(tickets.amount) as total')
            ->first();

        return [
            'tickets_sold' => $tickets->count ?? 0,
            'ticket_revenue' => $tickets->total ?? 0,
            'expected_amount' => $tickets->total ?? 0,
        ];
    }

    /**
     * Approve a closing
     */
    public function approveClosing(int $closingId, array $data): array
    {
        $closing = DB::connection('tenant')
            ->table('closings')
            ->where('id', $closingId)
            ->first();

        if (!$closing) {
            return ['success' => false, 'message' => 'Closing not found'];
        }

        if (!in_array($closing->status, ['submitted', 'variance_flagged', 'pending_approval'])) {
            return ['success' => false, 'message' => 'Closing cannot be approved in current status'];
        }

        DB::connection('tenant')->table('closings')
            ->where('id', $closingId)
            ->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
                'approved_at' => now(),
                'approval_notes' => $data['notes'] ?? null,
                'updated_at' => now(),
            ]);

        $this->logAudit('approve', 'closings', 'Closing', $closingId, [
            'variance' => $closing->variance,
            'notes' => $data['notes'] ?? null,
        ]);

        return ['success' => true, 'message' => 'Closing approved successfully'];
    }

    /**
     * Reject a closing
     */
    public function rejectClosing(int $closingId, array $data): array
    {
        $closing = DB::connection('tenant')
            ->table('closings')
            ->where('id', $closingId)
            ->first();

        if (!$closing) {
            return ['success' => false, 'message' => 'Closing not found'];
        }

        DB::connection('tenant')->table('closings')
            ->where('id', $closingId)
            ->update([
                'status' => 'rejected',
                'approved_by' => auth()->id(),
                'approved_at' => now(),
                'approval_notes' => $data['reason'],
                'updated_at' => now(),
            ]);

        $this->logAudit('reject', 'closings', 'Closing', $closingId, [
            'reason' => $data['reason'],
        ]);

        return ['success' => true, 'message' => 'Closing rejected'];
    }

    /**
     * Get closing summary for a period
     */
    public function getSummary(string $startDate, string $endDate, ?int $wardId = null): array
    {
        $query = DB::connection('tenant')
            ->table('closings')
            ->join('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->whereBetween('closings.period_start', [$startDate, $endDate]);

        if ($wardId) {
            $query->where('revenue_points.ward_id', $wardId);
        }

        $summary = $query->selectRaw('
            COUNT(*) as total_closings,
            SUM(expected_amount) as total_expected,
            SUM(remitted_amount) as total_remitted,
            SUM(variance) as total_variance,
            SUM(tickets_sold) as total_tickets,
            COUNT(CASE WHEN status = "approved" THEN 1 END) as approved_count,
            COUNT(CASE WHEN status = "variance_flagged" THEN 1 END) as flagged_count,
            COUNT(CASE WHEN status = "submitted" THEN 1 END) as pending_count
        ')->first();

        return [
            'total_closings' => $summary->total_closings ?? 0,
            'total_expected' => $summary->total_expected ?? 0,
            'total_remitted' => $summary->total_remitted ?? 0,
            'total_variance' => $summary->total_variance ?? 0,
            'total_tickets' => $summary->total_tickets ?? 0,
            'approved' => $summary->approved_count ?? 0,
            'flagged' => $summary->flagged_count ?? 0,
            'pending' => $summary->pending_count ?? 0,
        ];
    }

    /**
     * Get collector performance
     */
    public function getCollectorPerformance(int $userId, string $startDate, string $endDate): array
    {
        $closings = DB::connection('tenant')
            ->table('closings')
            ->where('submitted_by', $userId)
            ->whereBetween('period_start', [$startDate, $endDate])
            ->selectRaw('
                COUNT(*) as total_closings,
                SUM(expected_amount) as total_expected,
                SUM(remitted_amount) as total_remitted,
                SUM(variance) as total_variance,
                AVG(variance_percentage) as avg_variance_percentage,
                COUNT(CASE WHEN status = "approved" THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = "variance_flagged" THEN 1 END) as flagged_count
            ')
            ->first();

        $collectionRate = ($closings->total_expected > 0) 
            ? ($closings->total_remitted / $closings->total_expected) * 100 
            : 0;

        return [
            'total_closings' => $closings->total_closings ?? 0,
            'total_expected' => $closings->total_expected ?? 0,
            'total_remitted' => $closings->total_remitted ?? 0,
            'total_variance' => $closings->total_variance ?? 0,
            'avg_variance_percentage' => round($closings->avg_variance_percentage ?? 0, 2),
            'collection_rate' => round($collectionRate, 2),
            'approved_closings' => $closings->approved_count ?? 0,
            'flagged_closings' => $closings->flagged_count ?? 0,
        ];
    }

    protected function logAudit(string $action, string $module, string $entityType, int $entityId, array $details): void
    {
        DB::connection('tenant')->table('tenant_audit_logs')->insert([
            'user_id' => auth()->id(),
            'user_type' => 'tenant_user',
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'details' => json_encode($details),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

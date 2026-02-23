<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TicketService
{
    /**
     * Create a new ticket batch
     */
    public function createBatch(array $data): array
    {
        // Verify revenue point exists
        $revenuePoint = DB::connection('tenant')
            ->table('revenue_points')
            ->where('id', $data['revenue_point_id'])
            ->where('is_active', true)
            ->first();

        if (!$revenuePoint) {
            return ['success' => false, 'message' => 'Revenue point not found or inactive'];
        }

        // Verify revenue item exists
        $revenueItem = DB::connection('tenant')
            ->table('revenue_items')
            ->where('id', $data['revenue_item_id'])
            ->where('is_active', true)
            ->first();

        if (!$revenueItem) {
            return ['success' => false, 'message' => 'Revenue item not found or inactive'];
        }

        // Generate batch code
        $batchCode = $this->generateBatchCode($revenuePoint->code);

        // Calculate totals
        $totalTickets = $data['end_number'] - $data['start_number'] + 1;
        $expectedAmount = $totalTickets * $data['unit_price'];

        $batchId = DB::connection('tenant')->table('ticket_batches')->insertGetId([
            'batch_code' => $batchCode,
            'revenue_point_id' => $data['revenue_point_id'],
            'revenue_item_id' => $data['revenue_item_id'],
            'assigned_to' => $data['assigned_to'] ?? null,
            'assigned_to_type' => $data['assigned_to_type'] ?? 'user',
            'start_number' => $data['start_number'],
            'end_number' => $data['end_number'],
            'total_tickets' => $totalTickets,
            'unit_price' => $data['unit_price'],
            'expected_amount' => $expectedAmount,
            'valid_from' => $data['valid_from'],
            'valid_to' => $data['valid_to'],
            'status' => 'active',
            'created_by' => $data['created_by'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create individual tickets
        $this->createTicketsForBatch($batchId, $data['start_number'], $data['end_number'], $data['unit_price']);

        $this->logAudit('create', 'tickets', 'TicketBatch', $batchId, [
            'batch_code' => $batchCode,
            'revenue_point' => $revenuePoint->name,
            'total_tickets' => $totalTickets,
            'expected_amount' => $expectedAmount,
        ]);

        return [
            'success' => true,
            'batch_id' => $batchId,
            'batch_code' => $batchCode,
            'total_tickets' => $totalTickets,
            'expected_amount' => $expectedAmount,
        ];
    }

    /**
     * Create individual tickets for a batch
     */
    protected function createTicketsForBatch(int $batchId, int $startNumber, int $endNumber, float $unitPrice): void
    {
        $batch = DB::connection('tenant')
            ->table('ticket_batches')
            ->where('id', $batchId)
            ->first();

        $tickets = [];
        $prefix = $this->getSetting('ticket_prefix', 'TKT');

        for ($i = $startNumber; $i <= $endNumber; $i++) {
            $ticketNumber = sprintf('%s-%s-%06d', $prefix, $batch->batch_code, $i);
            $qrCode = $this->generateQRCode($ticketNumber);

            $tickets[] = [
                'batch_id' => $batchId,
                'ticket_number' => $ticketNumber,
                'qr_code' => $qrCode,
                'amount' => $unitPrice,
                'status' => 'available',
                'synced' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Insert in chunks
            if (count($tickets) >= 100) {
                DB::connection('tenant')->table('tickets')->insert($tickets);
                $tickets = [];
            }
        }

        // Insert remaining
        if (!empty($tickets)) {
            DB::connection('tenant')->table('tickets')->insert($tickets);
        }
    }

    /**
     * Sell/Issue a ticket
     */
    public function sellTicket(array $data): array
    {
        $ticket = DB::connection('tenant')
            ->table('tickets')
            ->where('id', $data['ticket_id'])
            ->first();

        if (!$ticket) {
            return ['success' => false, 'message' => 'Ticket not found'];
        }

        if ($ticket->status !== 'available') {
            return ['success' => false, 'message' => 'Ticket is not available for sale'];
        }

        // Verify batch is valid
        $batch = DB::connection('tenant')
            ->table('ticket_batches')
            ->where('id', $ticket->batch_id)
            ->first();

        if (!$batch || $batch->status !== 'active') {
            return ['success' => false, 'message' => 'Batch is not active'];
        }

        $now = now();
        if ($now < $batch->valid_from || $now > $batch->valid_to) {
            return ['success' => false, 'message' => 'Ticket is outside validity period'];
        }

        // Verify seller is assigned to this batch
        $userId = $data['sold_by'] ?? auth()->id();
        if ($batch->assigned_to && $batch->assigned_to != $userId) {
            return ['success' => false, 'message' => 'You are not assigned to this batch'];
        }

        // Update ticket
        DB::connection('tenant')->table('tickets')
            ->where('id', $ticket->id)
            ->update([
                'status' => 'sold',
                'payment_method' => $data['payment_method'] ?? 'cash',
                'payment_reference' => $data['payment_reference'] ?? null,
                'sold_by' => $userId,
                'sold_at' => now(),
                'payer_name' => $data['payer_name'] ?? null,
                'payer_phone' => $data['payer_phone'] ?? null,
                'vehicle_number' => $data['vehicle_number'] ?? null,
                'synced' => $data['synced'] ?? true,
                'synced_at' => ($data['synced'] ?? true) ? now() : null,
                'updated_at' => now(),
            ]);

        // Update batch counters
        DB::connection('tenant')->table('ticket_batches')
            ->where('id', $batch->id)
            ->increment('tickets_sold');

        DB::connection('tenant')->table('ticket_batches')
            ->where('id', $batch->id)
            ->increment('amount_collected', $ticket->amount);

        // Create payment record
        DB::connection('tenant')->table('ticket_payments')->insert([
            'ticket_id' => $ticket->id,
            'amount' => $ticket->amount,
            'payment_method' => $data['payment_method'] ?? 'cash',
            'payment_reference' => $data['payment_reference'] ?? null,
            'status' => 'success',
            'collected_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->logAudit('sell', 'tickets', 'Ticket', $ticket->id, [
            'ticket_number' => $ticket->ticket_number,
            'amount' => $ticket->amount,
            'payment_method' => $data['payment_method'] ?? 'cash',
        ]);

        return [
            'success' => true,
            'ticket_number' => $ticket->ticket_number,
            'qr_code' => $ticket->qr_code,
            'amount' => $ticket->amount,
        ];
    }

    /**
     * Sell next available ticket from a batch
     */
    public function sellNextTicket(int $batchId, array $data): array
    {
        // Get next available ticket
        $ticket = DB::connection('tenant')
            ->table('tickets')
            ->where('batch_id', $batchId)
            ->where('status', 'available')
            ->orderBy('id', 'asc')
            ->first();

        if (!$ticket) {
            return ['success' => false, 'message' => 'No available tickets in this batch'];
        }

        return $this->sellTicket(array_merge($data, ['ticket_id' => $ticket->id]));
    }

    /**
     * Verify a ticket
     */
    public function verifyTicket(string $ticketNumber): array
    {
        $ticket = DB::connection('tenant')
            ->table('tickets')
            ->join('ticket_batches', 'tickets.batch_id', '=', 'ticket_batches.id')
            ->join('revenue_points', 'ticket_batches.revenue_point_id', '=', 'revenue_points.id')
            ->where('tickets.ticket_number', $ticketNumber)
            ->orWhere('tickets.qr_code', $ticketNumber)
            ->select('tickets.*', 'ticket_batches.valid_from', 'ticket_batches.valid_to', 
                     'revenue_points.name as revenue_point_name')
            ->first();

        if (!$ticket) {
            return [
                'success' => false,
                'valid' => false,
                'message' => 'Ticket not found',
            ];
        }

        $now = now();
        $isValid = $ticket->status === 'sold' 
                   && $now >= $ticket->valid_from 
                   && $now <= $ticket->valid_to;

        // Mark as verified
        if ($isValid && $ticket->status === 'sold') {
            DB::connection('tenant')->table('tickets')
                ->where('id', $ticket->id)
                ->update([
                    'status' => 'verified',
                    'verified_at' => now(),
                    'verified_by' => auth()->id(),
                    'updated_at' => now(),
                ]);
        }

        return [
            'success' => true,
            'valid' => $isValid,
            'ticket' => [
                'ticket_number' => $ticket->ticket_number,
                'status' => $ticket->status,
                'amount' => $ticket->amount,
                'sold_at' => $ticket->sold_at,
                'valid_from' => $ticket->valid_from,
                'valid_to' => $ticket->valid_to,
                'revenue_point' => $ticket->revenue_point_name,
                'payer_name' => $ticket->payer_name,
                'vehicle_number' => $ticket->vehicle_number,
            ],
            'message' => $isValid ? 'Ticket is valid' : 'Ticket is invalid or expired',
        ];
    }

    /**
     * Request ticket cancellation
     */
    public function requestCancellation(int $ticketId, string $reason): array
    {
        $ticket = DB::connection('tenant')
            ->table('tickets')
            ->where('id', $ticketId)
            ->first();

        if (!$ticket) {
            return ['success' => false, 'message' => 'Ticket not found'];
        }

        if (!in_array($ticket->status, ['sold', 'available'])) {
            return ['success' => false, 'message' => 'Ticket cannot be cancelled'];
        }

        DB::connection('tenant')->table('tickets')
            ->where('id', $ticketId)
            ->update([
                'status' => 'cancelled',
                'cancellation_reason' => $reason,
                'cancelled_by' => auth()->id(),
                'cancelled_at' => now(),
                'updated_at' => now(),
            ]);

        // Update batch counters
        $batch = DB::connection('tenant')
            ->table('ticket_batches')
            ->where('id', $ticket->batch_id)
            ->first();

        DB::connection('tenant')->table('ticket_batches')
            ->where('id', $batch->id)
            ->increment('tickets_cancelled');

        if ($ticket->status === 'sold') {
            DB::connection('tenant')->table('ticket_batches')
                ->where('id', $batch->id)
                ->decrement('tickets_sold');

            DB::connection('tenant')->table('ticket_batches')
                ->where('id', $batch->id)
                ->decrement('amount_collected', $ticket->amount);
        }

        $this->logAudit('cancel', 'tickets', 'Ticket', $ticketId, [
            'ticket_number' => $ticket->ticket_number,
            'reason' => $reason,
        ]);

        return ['success' => true, 'message' => 'Ticket cancelled successfully'];
    }

    /**
     * Sync offline tickets
     */
    public function syncOfflineTickets(array $tickets): array
    {
        $results = [];

        foreach ($tickets as $ticketData) {
            $ticket = DB::connection('tenant')
                ->table('tickets')
                ->where('id', $ticketData['ticket_id'])
                ->first();

            if (!$ticket) {
                $results[$ticketData['ticket_id']] = ['success' => false, 'message' => 'Ticket not found'];
                continue;
            }

            // Update ticket with offline data
            DB::connection('tenant')->table('tickets')
                ->where('id', $ticket->id)
                ->update([
                    'status' => 'sold',
                    'payment_method' => $ticketData['payment_method'] ?? 'cash',
                    'sold_by' => $ticketData['sold_by'],
                    'sold_at' => $ticketData['sold_at'],
                    'payer_name' => $ticketData['payer_name'] ?? null,
                    'payer_phone' => $ticketData['payer_phone'] ?? null,
                    'vehicle_number' => $ticketData['vehicle_number'] ?? null,
                    'synced' => true,
                    'synced_at' => now(),
                    'updated_at' => now(),
                ]);

            $results[$ticketData['ticket_id']] = ['success' => true];
        }

        return ['success' => true, 'results' => $results];
    }

    protected function generateBatchCode(string $pointCode): string
    {
        $date = date('ymd');
        $random = strtoupper(Str::random(4));
        return "{$pointCode}-{$date}-{$random}";
    }

    protected function generateQRCode(string $ticketNumber): string
    {
        return base64_encode(hash('sha256', $ticketNumber . config('app.key')));
    }

    protected function getSetting(string $key, $default = null)
    {
        $setting = DB::connection('tenant')
            ->table('tenant_settings')
            ->where('key', $key)
            ->first();

        return $setting?->value ?? $default;
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

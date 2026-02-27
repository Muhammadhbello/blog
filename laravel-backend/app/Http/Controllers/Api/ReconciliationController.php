<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ReconciliationController extends Controller
{
    /**
     * Get reconciliation statistics
     */
    public function stats(Request $request)
    {
        $startDate = $request->get('from', now()->startOfMonth()->toDateString());
        $endDate = $request->get('to', now()->toDateString());

        $totals = DB::connection('platform')
            ->table('reconciliation_records')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched_count,
                SUM(CASE WHEN status = 'matched' THEN amount ELSE 0 END) as matched_amount,
                SUM(CASE WHEN status = 'unmatched' THEN 1 ELSE 0 END) as unmatched_count,
                SUM(CASE WHEN status = 'unmatched' THEN amount ELSE 0 END) as unmatched_amount,
                SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END) as disputed_count
            ")
            ->first();

        $matchRate = $totals->total_transactions > 0
            ? round(($totals->matched_count / $totals->total_transactions) * 100, 1)
            : 0;

        return response()->json([
            'total_transactions' => $totals->total_transactions ?? 0,
            'matched_count' => $totals->matched_count ?? 0,
            'matched_amount' => $totals->matched_amount ?? 0,
            'unmatched_count' => $totals->unmatched_count ?? 0,
            'unmatched_amount' => $totals->unmatched_amount ?? 0,
            'disputed_count' => $totals->disputed_count ?? 0,
            'match_rate' => $matchRate,
        ]);
    }

    /**
     * Get all transactions for reconciliation
     */
    public function transactions(Request $request)
    {
        $query = DB::connection('platform')
            ->table('reconciliation_records')
            ->join('tenants', 'reconciliation_records.tenant_id', '=', 'tenants.id')
            ->select(
                'reconciliation_records.*',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug'
            )
            ->orderBy('reconciliation_records.created_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('reconciliation_records.status', $request->status);
        }

        // Filter by type
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('reconciliation_records.type', $request->type);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reconciliation_records.reference', 'like', "%{$search}%")
                  ->orWhere('reconciliation_records.invoice_number', 'like', "%{$search}%")
                  ->orWhere('reconciliation_records.business_name', 'like', "%{$search}%")
                  ->orWhere('reconciliation_records.gateway_reference', 'like', "%{$search}%");
            });
        }

        // Date range
        if ($request->has('from') && $request->from) {
            $query->whereDate('reconciliation_records.created_at', '>=', $request->from);
        }
        if ($request->has('to') && $request->to) {
            $query->whereDate('reconciliation_records.created_at', '<=', $request->to);
        }

        $transactions = $query->paginate($request->get('per_page', 50));

        return response()->json($transactions);
    }

    /**
     * Get reconciliation periods
     */
    public function periods(Request $request)
    {
        $periods = DB::connection('platform')
            ->table('reconciliation_periods')
            ->orderBy('end_date', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($periods);
    }

    /**
     * Run reconciliation process
     */
    public function run(Request $request)
    {
        $startDate = $request->get('from', now()->subDays(7)->toDateString());
        $endDate = $request->get('to', now()->toDateString());

        // Create reconciliation period record
        $periodId = DB::connection('platform')->table('reconciliation_periods')->insertGetId([
            'period' => $this->formatPeriodName($startDate, $endDate),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => 'in_progress',
            'total_transactions' => 0,
            'matched' => 0,
            'unmatched' => 0,
            'total_amount' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $tenants = DB::connection('platform')
                ->table('tenants')
                ->where('status', 'active')
                ->get();

            $totalMatched = 0;
            $totalUnmatched = 0;
            $totalAmount = 0;
            $totalTransactions = 0;

            foreach ($tenants as $tenant) {
                $result = $this->reconcileTenant($tenant, $startDate, $endDate, $periodId);
                $totalMatched += $result['matched'];
                $totalUnmatched += $result['unmatched'];
                $totalAmount += $result['amount'];
                $totalTransactions += $result['total'];
            }

            // Update period record
            DB::connection('platform')
                ->table('reconciliation_periods')
                ->where('id', $periodId)
                ->update([
                    'status' => 'completed',
                    'total_transactions' => $totalTransactions,
                    'matched' => $totalMatched,
                    'unmatched' => $totalUnmatched,
                    'total_amount' => $totalAmount,
                    'updated_at' => now(),
                ]);

            return response()->json([
                'success' => true,
                'period_id' => $periodId,
                'total_transactions' => $totalTransactions,
                'matched' => $totalMatched,
                'unmatched' => $totalUnmatched,
                'total_amount' => $totalAmount,
                'match_rate' => $totalTransactions > 0 
                    ? round(($totalMatched / $totalTransactions) * 100, 1) 
                    : 0,
            ]);
        } catch (\Exception $e) {
            DB::connection('platform')
                ->table('reconciliation_periods')
                ->where('id', $periodId)
                ->update([
                    'status' => 'failed',
                    'updated_at' => now(),
                ]);

            Log::error('Reconciliation failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Reconciliation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reconcile a single tenant
     */
    protected function reconcileTenant($tenant, $startDate, $endDate, $periodId): array
    {
        try {
            // Switch to tenant database
            config(['database.connections.tenant.database' => $tenant->slug . '_tenant']);
            DB::purge('tenant');

            // Get all payments from tenant
            $payments = DB::connection('tenant')
                ->table('invoice_payments')
                ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
                ->whereBetween('invoice_payments.created_at', [$startDate, $endDate])
                ->select(
                    'invoice_payments.*',
                    'invoices.invoice_number',
                    'businesses.name as business_name'
                )
                ->get();

            $matched = 0;
            $unmatched = 0;
            $totalAmount = 0;

            foreach ($payments as $payment) {
                $status = $this->matchTransaction($payment);
                
                // Store in platform reconciliation records
                DB::connection('platform')->table('reconciliation_records')->insert([
                    'id' => 'TXN-' . Str::upper(Str::random(6)),
                    'period_id' => $periodId,
                    'tenant_id' => $tenant->id,
                    'type' => $payment->amount >= 0 ? 'payment' : 'refund',
                    'amount' => abs($payment->amount),
                    'reference' => $payment->payment_reference ?? 'PAY-' . $payment->id,
                    'invoice_number' => $payment->invoice_number,
                    'business_name' => $payment->business_name,
                    'status' => $status,
                    'gateway' => $payment->gateway_provider ?? 'Unknown',
                    'gateway_reference' => $payment->gateway_reference,
                    'reconciled_at' => $status === 'matched' ? now() : null,
                    'created_at' => $payment->created_at,
                    'updated_at' => now(),
                ]);

                if ($status === 'matched') {
                    $matched++;
                } else {
                    $unmatched++;
                }
                
                $totalAmount += abs($payment->amount);
            }

            return [
                'total' => count($payments),
                'matched' => $matched,
                'unmatched' => $unmatched,
                'amount' => $totalAmount,
            ];
        } catch (\Exception $e) {
            Log::error("Failed to reconcile tenant {$tenant->slug}", [
                'error' => $e->getMessage(),
            ]);
            return ['total' => 0, 'matched' => 0, 'unmatched' => 0, 'amount' => 0];
        }
    }

    /**
     * Match transaction with gateway records
     */
    protected function matchTransaction($payment): string
    {
        // TODO: Implement actual gateway verification
        // This would typically:
        // 1. Query the payment gateway API to verify the transaction
        // 2. Compare amounts, references, and timestamps
        // 3. Flag discrepancies
        
        // For now, use a simple rule:
        // - If gateway_reference exists and status is success, mark as matched
        // - Otherwise, mark as unmatched
        
        if ($payment->gateway_reference && $payment->status === 'success') {
            return 'matched';
        }
        
        return 'unmatched';
    }

    /**
     * Resolve a transaction manually
     */
    public function resolve(Request $request, string $transactionId)
    {
        $request->validate([
            'action' => 'required|in:match,reject,dispute',
            'notes' => 'nullable|string|max:500',
        ]);

        $transaction = DB::connection('platform')
            ->table('reconciliation_records')
            ->where('id', $transactionId)
            ->first();

        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        $newStatus = match($request->action) {
            'match' => 'matched',
            'reject' => 'resolved',
            'dispute' => 'disputed',
        };

        DB::connection('platform')
            ->table('reconciliation_records')
            ->where('id', $transactionId)
            ->update([
                'status' => $newStatus,
                'notes' => $request->notes,
                'reconciled_at' => in_array($newStatus, ['matched', 'resolved']) ? now() : null,
                'resolved_by' => auth()->id(),
                'updated_at' => now(),
            ]);

        // Log audit
        DB::connection('platform')->table('platform_audit_logs')->insert([
            'user_id' => auth()->id() ?? 0,
            'action' => 'reconciliation_resolved',
            'entity_type' => 'ReconciliationRecord',
            'entity_id' => $transactionId,
            'details' => json_encode([
                'action' => $request->action,
                'new_status' => $newStatus,
                'notes' => $request->notes,
            ]),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaction resolved successfully',
            'status' => $newStatus,
        ]);
    }

    /**
     * Get transaction details
     */
    public function show(string $transactionId)
    {
        $transaction = DB::connection('platform')
            ->table('reconciliation_records')
            ->join('tenants', 'reconciliation_records.tenant_id', '=', 'tenants.id')
            ->where('reconciliation_records.id', $transactionId)
            ->select(
                'reconciliation_records.*',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug'
            )
            ->first();

        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        return response()->json($transaction);
    }

    /**
     * Export reconciliation report
     */
    public function export(Request $request)
    {
        $request->validate([
            'period_id' => 'nullable|integer',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'format' => 'nullable|in:csv,xlsx',
        ]);

        $query = DB::connection('platform')
            ->table('reconciliation_records')
            ->join('tenants', 'reconciliation_records.tenant_id', '=', 'tenants.id')
            ->select(
                'reconciliation_records.id',
                'reconciliation_records.reference',
                'reconciliation_records.type',
                'tenants.name as tenant_name',
                'reconciliation_records.business_name',
                'reconciliation_records.invoice_number',
                'reconciliation_records.amount',
                'reconciliation_records.gateway',
                'reconciliation_records.gateway_reference',
                'reconciliation_records.status',
                'reconciliation_records.reconciled_at',
                'reconciliation_records.created_at'
            )
            ->orderBy('reconciliation_records.created_at', 'desc');

        if ($request->period_id) {
            $query->where('reconciliation_records.period_id', $request->period_id);
        }

        if ($request->from) {
            $query->whereDate('reconciliation_records.created_at', '>=', $request->from);
        }

        if ($request->to) {
            $query->whereDate('reconciliation_records.created_at', '<=', $request->to);
        }

        $records = $query->get();

        // For now, return JSON. In production, use Laravel Excel or similar for proper export
        return response()->json([
            'records' => $records,
            'total' => $records->count(),
            'generated_at' => now()->toISOString(),
        ]);
    }

    /**
     * Format period name
     */
    protected function formatPeriodName($startDate, $endDate): string
    {
        $start = \Carbon\Carbon::parse($startDate);
        $end = \Carbon\Carbon::parse($endDate);

        if ($start->month === $end->month && $start->year === $end->year) {
            $weekNum = ceil($start->day / 7);
            return $start->format('F Y') . " - Week {$weekNum}";
        }

        return $start->format('M d') . ' - ' . $end->format('M d, Y');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PayoutController extends Controller
{
    /**
     * Get all payouts with optional filters
     */
    public function index(Request $request)
    {
        $query = DB::connection('platform')
            ->table('payouts')
            ->join('tenants', 'payouts.tenant_id', '=', 'tenants.id')
            ->select(
                'payouts.*',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug'
            )
            ->orderBy('payouts.created_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('payouts.status', $request->status);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('payouts.id', 'like', "%{$search}%")
                  ->orWhere('tenants.name', 'like', "%{$search}%");
            });
        }

        // Date range
        if ($request->has('from') && $request->from) {
            $query->whereDate('payouts.created_at', '>=', $request->from);
        }
        if ($request->has('to') && $request->to) {
            $query->whereDate('payouts.created_at', '<=', $request->to);
        }

        $payouts = $query->paginate($request->get('per_page', 20));

        return response()->json($payouts);
    }

    /**
     * Get payout statistics
     */
    public function stats()
    {
        $today = now()->toDateString();
        $startOfMonth = now()->startOfMonth()->toDateString();

        $stats = [
            'total_pending' => DB::connection('platform')
                ->table('payouts')
                ->where('status', 'pending')
                ->count(),
            'total_pending_amount' => DB::connection('platform')
                ->table('payouts')
                ->where('status', 'pending')
                ->sum('net_amount'),
            'total_completed_this_month' => DB::connection('platform')
                ->table('payouts')
                ->where('status', 'completed')
                ->whereDate('processed_at', '>=', $startOfMonth)
                ->count(),
            'total_paid_this_month' => DB::connection('platform')
                ->table('payouts')
                ->where('status', 'completed')
                ->whereDate('processed_at', '>=', $startOfMonth)
                ->sum('net_amount'),
            'platform_earnings_this_month' => DB::connection('platform')
                ->table('payouts')
                ->whereDate('created_at', '>=', $startOfMonth)
                ->sum('platform_fee'),
        ];

        // Calculate average payout time
        $avgTime = DB::connection('platform')
            ->table('payouts')
            ->where('status', 'completed')
            ->whereNotNull('processed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, processed_at)) as avg_hours')
            ->value('avg_hours');

        $stats['average_payout_time'] = $avgTime 
            ? round($avgTime / 24, 1) . ' days' 
            : 'N/A';

        return response()->json($stats);
    }

    /**
     * Generate payouts for all tenants for a period
     */
    public function generate(Request $request)
    {
        $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $tenants = DB::connection('platform')
            ->table('tenants')
            ->where('status', 'active')
            ->get();

        $payoutsCreated = 0;

        foreach ($tenants as $tenant) {
            try {
                // Get tenant's revenue for the period
                $revenue = $this->getTenantRevenue($tenant, $request->period_start, $request->period_end);
                
                if ($revenue['gross'] <= 0) {
                    continue;
                }

                // Get tenant's bank details
                $bankDetails = DB::connection('platform')
                    ->table('tenant_bank_accounts')
                    ->where('tenant_id', $tenant->id)
                    ->where('is_primary', true)
                    ->first();

                // Create payout record
                DB::connection('platform')->table('payouts')->insert([
                    'id' => 'PO-' . Str::upper(Str::random(8)),
                    'tenant_id' => $tenant->id,
                    'amount' => $revenue['gross'],
                    'platform_fee' => $revenue['platform_fee'],
                    'net_amount' => $revenue['net'],
                    'transaction_count' => $revenue['transactions'],
                    'period_start' => $request->period_start,
                    'period_end' => $request->period_end,
                    'status' => 'pending',
                    'bank_name' => $bankDetails->bank_name ?? null,
                    'account_number' => $bankDetails->account_number ?? null,
                    'account_name' => $bankDetails->account_name ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $payoutsCreated++;
            } catch (\Exception $e) {
                Log::error("Failed to generate payout for tenant {$tenant->slug}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'payouts_created' => $payoutsCreated,
            'message' => "{$payoutsCreated} payouts generated successfully",
        ]);
    }

    /**
     * Process a single payout
     */
    public function process(Request $request, string $payoutId)
    {
        $payout = DB::connection('platform')
            ->table('payouts')
            ->where('id', $payoutId)
            ->first();

        if (!$payout) {
            return response()->json(['message' => 'Payout not found'], 404);
        }

        if ($payout->status !== 'pending') {
            return response()->json(['message' => 'Payout is not in pending status'], 400);
        }

        // Update status to processing
        DB::connection('platform')
            ->table('payouts')
            ->where('id', $payoutId)
            ->update([
                'status' => 'processing',
                'updated_at' => now(),
            ]);

        try {
            // Simulate bank transfer (replace with actual payment gateway integration)
            $transferResult = $this->initiateTransfer($payout);

            if ($transferResult['success']) {
                DB::connection('platform')
                    ->table('payouts')
                    ->where('id', $payoutId)
                    ->update([
                        'status' => 'completed',
                        'reference' => $transferResult['reference'],
                        'processed_at' => now(),
                        'updated_at' => now(),
                    ]);

                // Log audit
                $this->logAudit('payout_processed', $payoutId, [
                    'amount' => $payout->net_amount,
                    'reference' => $transferResult['reference'],
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Payout processed successfully',
                    'reference' => $transferResult['reference'],
                ]);
            } else {
                throw new \Exception($transferResult['message']);
            }
        } catch (\Exception $e) {
            DB::connection('platform')
                ->table('payouts')
                ->where('id', $payoutId)
                ->update([
                    'status' => 'failed',
                    'failure_reason' => $e->getMessage(),
                    'updated_at' => now(),
                ]);

            Log::error("Payout processing failed", [
                'payout_id' => $payoutId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payout processing failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process multiple payouts
     */
    public function processBulk(Request $request)
    {
        $request->validate([
            'payout_ids' => 'required|array|min:1',
            'payout_ids.*' => 'string',
        ]);

        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($request->payout_ids as $payoutId) {
            $response = $this->process(new Request(), $payoutId);
            $data = json_decode($response->getContent(), true);

            if ($response->getStatusCode() === 200 && $data['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'payout_id' => $payoutId,
                    'error' => $data['message'] ?? 'Unknown error',
                ];
            }
        }

        return response()->json([
            'success' => $results['failed'] === 0,
            'processed' => $results['success'],
            'failed' => $results['failed'],
            'errors' => $results['errors'],
        ]);
    }

    /**
     * Get payout details
     */
    public function show(string $payoutId)
    {
        $payout = DB::connection('platform')
            ->table('payouts')
            ->join('tenants', 'payouts.tenant_id', '=', 'tenants.id')
            ->where('payouts.id', $payoutId)
            ->select(
                'payouts.*',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug'
            )
            ->first();

        if (!$payout) {
            return response()->json(['message' => 'Payout not found'], 404);
        }

        return response()->json($payout);
    }

    /**
     * Get tenant revenue for a period
     */
    protected function getTenantRevenue($tenant, $startDate, $endDate): array
    {
        try {
            // Switch to tenant database
            config(['database.connections.tenant.database' => $tenant->slug . '_tenant']);
            DB::purge('tenant');

            $revenue = DB::connection('tenant')
                ->table('invoice_payments')
                ->whereBetween('paid_at', [$startDate, $endDate])
                ->where('status', 'success')
                ->selectRaw('COUNT(*) as count, SUM(amount) as total')
                ->first();

            $gross = $revenue->total ?? 0;
            
            // Get revenue share percentage for this tenant
            $shareConfig = DB::connection('platform')
                ->table('revenue_share_configs')
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->first();

            $platformPercent = $shareConfig->platform_percent ?? 5.0;
            $platformFee = $gross * ($platformPercent / 100);
            $net = $gross - $platformFee;

            return [
                'gross' => $gross,
                'platform_fee' => $platformFee,
                'net' => $net,
                'transactions' => $revenue->count ?? 0,
            ];
        } catch (\Exception $e) {
            Log::error("Failed to get tenant revenue", [
                'tenant' => $tenant->slug,
                'error' => $e->getMessage(),
            ]);
            return ['gross' => 0, 'platform_fee' => 0, 'net' => 0, 'transactions' => 0];
        }
    }

    /**
     * Initiate bank transfer (mock implementation)
     */
    protected function initiateTransfer($payout): array
    {
        // TODO: Integrate with actual payment gateway (Paystack, Flutterwave, etc.)
        // This is a mock implementation
        
        if (!$payout->bank_name || !$payout->account_number) {
            return [
                'success' => false,
                'message' => 'Bank details not configured for tenant',
            ];
        }

        // Simulate transfer
        return [
            'success' => true,
            'reference' => 'TRF-' . date('Ymd') . Str::upper(Str::random(6)),
        ];
    }

    /**
     * Log audit entry
     */
    protected function logAudit(string $action, string $entityId, array $details): void
    {
        DB::connection('platform')->table('platform_audit_logs')->insert([
            'user_id' => auth()->id() ?? 0,
            'action' => $action,
            'entity_type' => 'Payout',
            'entity_id' => $entityId,
            'details' => json_encode($details),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
        ]);
    }
}

<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Consultant Commission Service
 * Handles wallet management, commission calculations, and payouts
 */
class ConsultantCommissionService
{
    /**
     * Calculate commission for a transaction
     */
    public function calculateCommission(
        int $consultantId,
        float $amount,
        string $transactionType,
        ?int $revenueItemId = null,
        ?int $revenueCategoryId = null
    ): array {
        $consultant = $this->getConsultantDetails($consultantId);
        if (!$consultant) {
            return ['commission' => 0, 'rule' => null];
        }

        // Find applicable commission rule
        $rule = $this->findApplicableRule(
            $consultant->consultant_type ?? 'individual',
            $revenueItemId,
            $revenueCategoryId
        );

        if (!$rule) {
            return ['commission' => 0, 'rule' => null];
        }

        $commission = $this->computeCommission($amount, $rule);

        return [
            'commission' => round($commission, 2),
            'rule' => $rule,
            'rate_applied' => $rule->rate ?? $rule->fixed_amount,
            'rule_type' => $rule->rule_type,
        ];
    }

    /**
     * Credit commission to consultant wallet
     */
    public function creditCommission(
        int $consultantId,
        float $amount,
        string $sourceType,
        int $sourceId,
        ?string $description = null
    ): array {
        $wallet = $this->getOrCreateWallet($consultantId);
        
        $balanceBefore = $wallet->balance;
        $balanceAfter = $balanceBefore + $amount;
        $reference = $this->generateReference('COM');

        // Create transaction
        DB::connection('tenant')->table('wallet_transactions')->insert([
            'wallet_id' => $wallet->id,
            'type' => 'commission',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'reference' => $reference,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'status' => 'completed',
            'description' => $description ?? "Commission from {$sourceType} #{$sourceId}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update wallet
        DB::connection('tenant')->table('consultant_wallets')
            ->where('id', $wallet->id)
            ->update([
                'balance' => $balanceAfter,
                'total_earned' => DB::raw('total_earned + ' . $amount),
                'last_transaction_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'success' => true,
            'reference' => $reference,
            'new_balance' => $balanceAfter,
        ];
    }

    /**
     * Process withdrawal request
     */
    public function requestWithdrawal(
        int $consultantId,
        float $amount,
        array $bankDetails
    ): array {
        $wallet = $this->getOrCreateWallet($consultantId);

        if ($wallet->status !== 'active') {
            return ['success' => false, 'message' => 'Wallet is not active'];
        }

        if ($wallet->balance < $amount) {
            return ['success' => false, 'message' => 'Insufficient balance'];
        }

        // Minimum withdrawal check
        $minWithdrawal = 1000; // ₦1,000 minimum
        if ($amount < $minWithdrawal) {
            return ['success' => false, 'message' => "Minimum withdrawal is ₦{$minWithdrawal}"];
        }

        // Create withdrawal request
        $requestId = DB::connection('tenant')->table('withdrawal_requests')->insertGetId([
            'wallet_id' => $wallet->id,
            'consultant_id' => $consultantId,
            'amount' => $amount,
            'bank_name' => $bankDetails['bank_name'],
            'account_number' => $bankDetails['account_number'],
            'account_name' => $bankDetails['account_name'],
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Hold the amount (reduce available balance)
        DB::connection('tenant')->table('consultant_wallets')
            ->where('id', $wallet->id)
            ->update([
                'balance' => DB::raw('balance - ' . $amount),
                'pending_commission' => DB::raw('pending_commission + ' . $amount),
                'updated_at' => now(),
            ]);

        return [
            'success' => true,
            'request_id' => $requestId,
            'message' => 'Withdrawal request submitted for approval',
        ];
    }

    /**
     * Approve withdrawal request
     */
    public function approveWithdrawal(int $requestId, int $approverId): array
    {
        $request = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('id', $requestId)
            ->first();

        if (!$request) {
            return ['success' => false, 'message' => 'Request not found'];
        }

        if ($request->status !== 'pending') {
            return ['success' => false, 'message' => 'Request already processed'];
        }

        DB::connection('tenant')->table('withdrawal_requests')
            ->where('id', $requestId)
            ->update([
                'status' => 'approved',
                'approved_by' => $approverId,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

        return ['success' => true, 'message' => 'Withdrawal approved'];
    }

    /**
     * Complete withdrawal (after payment)
     */
    public function completeWithdrawal(int $requestId, int $processedBy, string $paymentReference): array
    {
        $request = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('id', $requestId)
            ->first();

        if (!$request || $request->status !== 'approved') {
            return ['success' => false, 'message' => 'Invalid request'];
        }

        $wallet = DB::connection('tenant')
            ->table('consultant_wallets')
            ->where('id', $request->wallet_id)
            ->first();

        $reference = $this->generateReference('WTH');

        // Create transaction record
        DB::connection('tenant')->table('wallet_transactions')->insert([
            'wallet_id' => $wallet->id,
            'type' => 'withdrawal',
            'amount' => -$request->amount,
            'balance_before' => $wallet->balance + $request->amount, // Add back pending
            'balance_after' => $wallet->balance,
            'reference' => $reference,
            'source_type' => 'WithdrawalRequest',
            'source_id' => $requestId,
            'status' => 'completed',
            'description' => "Withdrawal to {$request->bank_name} - {$request->account_number}",
            'processed_by' => $processedBy,
            'metadata' => json_encode(['payment_reference' => $paymentReference]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update request
        DB::connection('tenant')->table('withdrawal_requests')
            ->where('id', $requestId)
            ->update([
                'status' => 'completed',
                'processed_by' => $processedBy,
                'processed_at' => now(),
                'payment_reference' => $paymentReference,
                'updated_at' => now(),
            ]);

        // Update wallet
        DB::connection('tenant')->table('consultant_wallets')
            ->where('id', $wallet->id)
            ->update([
                'pending_commission' => DB::raw('pending_commission - ' . $request->amount),
                'total_withdrawn' => DB::raw('total_withdrawn + ' . $request->amount),
                'last_transaction_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'success' => true,
            'reference' => $reference,
            'message' => 'Withdrawal completed',
        ];
    }

    /**
     * Reject withdrawal request
     */
    public function rejectWithdrawal(int $requestId, int $rejectedBy, string $reason): array
    {
        $request = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('id', $requestId)
            ->first();

        if (!$request || !in_array($request->status, ['pending', 'approved'])) {
            return ['success' => false, 'message' => 'Invalid request'];
        }

        // Return funds to wallet
        DB::connection('tenant')->table('consultant_wallets')
            ->where('id', $request->wallet_id)
            ->update([
                'balance' => DB::raw('balance + ' . $request->amount),
                'pending_commission' => DB::raw('pending_commission - ' . $request->amount),
                'updated_at' => now(),
            ]);

        // Update request
        DB::connection('tenant')->table('withdrawal_requests')
            ->where('id', $requestId)
            ->update([
                'status' => 'rejected',
                'rejection_reason' => $reason,
                'processed_by' => $rejectedBy,
                'processed_at' => now(),
                'updated_at' => now(),
            ]);

        return ['success' => true, 'message' => 'Withdrawal rejected'];
    }

    /**
     * Get wallet summary for consultant
     */
    public function getWalletSummary(int $consultantId): array
    {
        $wallet = $this->getOrCreateWallet($consultantId);
        
        // Get recent transactions
        $transactions = DB::connection('tenant')
            ->table('wallet_transactions')
            ->where('wallet_id', $wallet->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get pending withdrawals
        $pendingWithdrawals = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('consultant_id', $consultantId)
            ->whereIn('status', ['pending', 'approved', 'processing'])
            ->get();

        // Get this month's earnings
        $monthlyEarnings = DB::connection('tenant')
            ->table('wallet_transactions')
            ->where('wallet_id', $wallet->id)
            ->where('type', 'commission')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        return [
            'wallet' => $wallet,
            'available_balance' => $wallet->balance,
            'pending_balance' => $wallet->pending_commission,
            'total_earned' => $wallet->total_earned,
            'total_withdrawn' => $wallet->total_withdrawn,
            'monthly_earnings' => $monthlyEarnings,
            'recent_transactions' => $transactions,
            'pending_withdrawals' => $pendingWithdrawals,
        ];
    }

    /**
     * Update performance metrics
     */
    public function updatePerformanceMetrics(int $consultantId, string $periodType = 'daily'): void
    {
        $periodDate = match($periodType) {
            'daily' => now()->startOfDay(),
            'weekly' => now()->startOfWeek(),
            'monthly' => now()->startOfMonth(),
            default => now()->startOfDay(),
        };

        $endDate = match($periodType) {
            'daily' => now()->endOfDay(),
            'weekly' => now()->endOfWeek(),
            'monthly' => now()->endOfMonth(),
            default => now()->endOfDay(),
        };

        // Calculate metrics
        $ticketsSold = DB::connection('tenant')
            ->table('tickets')
            ->where('sold_by', $consultantId)
            ->whereBetween('sold_at', [$periodDate, $endDate])
            ->count();

        $invoicesCollected = DB::connection('tenant')
            ->table('invoice_payments')
            ->where('received_by', $consultantId)
            ->whereBetween('created_at', [$periodDate, $endDate])
            ->count();

        $grossCollection = DB::connection('tenant')
            ->table('invoice_payments')
            ->where('received_by', $consultantId)
            ->whereBetween('created_at', [$periodDate, $endDate])
            ->sum('amount');

        $grossCollection += DB::connection('tenant')
            ->table('tickets')
            ->where('sold_by', $consultantId)
            ->whereBetween('sold_at', [$periodDate, $endDate])
            ->sum('amount');

        $commissionEarned = DB::connection('tenant')
            ->table('wallet_transactions')
            ->join('consultant_wallets', 'wallet_transactions.wallet_id', '=', 'consultant_wallets.id')
            ->where('consultant_wallets.consultant_id', $consultantId)
            ->where('wallet_transactions.type', 'commission')
            ->whereBetween('wallet_transactions.created_at', [$periodDate, $endDate])
            ->sum('wallet_transactions.amount');

        // Upsert performance record
        DB::connection('tenant')->table('consultant_performance')->updateOrInsert(
            [
                'consultant_id' => $consultantId,
                'period_date' => $periodDate->toDateString(),
                'period_type' => $periodType,
            ],
            [
                'tickets_sold' => $ticketsSold,
                'invoices_collected' => $invoicesCollected,
                'gross_collection' => $grossCollection,
                'commission_earned' => $commissionEarned,
                'updated_at' => now(),
            ]
        );
    }

    /**
     * Get leaderboard
     */
    public function getLeaderboard(string $periodType = 'monthly', int $limit = 10): array
    {
        $periodDate = match($periodType) {
            'daily' => now()->startOfDay()->toDateString(),
            'weekly' => now()->startOfWeek()->toDateString(),
            'monthly' => now()->startOfMonth()->toDateString(),
            default => now()->startOfMonth()->toDateString(),
        };

        return DB::connection('tenant')
            ->table('consultant_performance')
            ->join('users', 'consultant_performance.consultant_id', '=', 'users.id')
            ->where('period_date', $periodDate)
            ->where('period_type', $periodType)
            ->select(
                'users.id',
                'users.name',
                'consultant_performance.gross_collection',
                'consultant_performance.commission_earned',
                'consultant_performance.tickets_sold',
                'consultant_performance.invoices_collected'
            )
            ->orderByDesc('gross_collection')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    // ==================== HELPERS ====================

    protected function getConsultantDetails(int $consultantId)
    {
        return DB::connection('tenant')
            ->table('users')
            ->where('id', $consultantId)
            ->first();
    }

    protected function getOrCreateWallet(int $consultantId)
    {
        $wallet = DB::connection('tenant')
            ->table('consultant_wallets')
            ->where('consultant_id', $consultantId)
            ->first();

        if (!$wallet) {
            $walletId = DB::connection('tenant')->table('consultant_wallets')->insertGetId([
                'consultant_id' => $consultantId,
                'balance' => 0,
                'total_earned' => 0,
                'total_withdrawn' => 0,
                'pending_commission' => 0,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $wallet = DB::connection('tenant')
                ->table('consultant_wallets')
                ->where('id', $walletId)
                ->first();
        }

        return $wallet;
    }

    protected function findApplicableRule(string $consultantType, ?int $itemId, ?int $categoryId)
    {
        // Check for item-specific rule
        if ($itemId) {
            $rule = DB::connection('tenant')
                ->table('commission_rules')
                ->where('consultant_type', $consultantType)
                ->where('revenue_item_id', $itemId)
                ->where('is_active', true)
                ->first();
            if ($rule) return $rule;
        }

        // Check for category-specific rule
        if ($categoryId) {
            $rule = DB::connection('tenant')
                ->table('commission_rules')
                ->where('consultant_type', $consultantType)
                ->where('revenue_category_id', $categoryId)
                ->whereNull('revenue_item_id')
                ->where('is_active', true)
                ->first();
            if ($rule) return $rule;
        }

        // Default rule for consultant type
        return DB::connection('tenant')
            ->table('commission_rules')
            ->where('consultant_type', $consultantType)
            ->whereNull('revenue_item_id')
            ->whereNull('revenue_category_id')
            ->where('is_active', true)
            ->first();
    }

    protected function computeCommission(float $amount, object $rule): float
    {
        switch ($rule->rule_type) {
            case 'percentage':
                return $amount * ($rule->rate / 100);
            
            case 'fixed':
                return $rule->fixed_amount;
            
            case 'tiered':
                $tiers = json_decode($rule->tiers, true);
                foreach ($tiers as $range => $rate) {
                    [$min, $max] = explode('-', $range);
                    if ($amount >= $min && $amount <= $max) {
                        return $amount * ($rate / 100);
                    }
                }
                return 0;
            
            default:
                return 0;
        }
    }

    protected function generateReference(string $prefix): string
    {
        return $prefix . '-' . date('Ymd') . '-' . strtoupper(Str::random(8));
    }
}

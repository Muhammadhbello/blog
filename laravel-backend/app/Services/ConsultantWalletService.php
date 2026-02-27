<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Consultant Wallet Service
 * 
 * Handles all wallet operations including commission credits,
 * withdrawals, and balance management.
 */
class ConsultantWalletService
{
    /**
     * Get or create wallet for a consultant
     */
    public function getOrCreateWallet(int $consultantId): object
    {
        $wallet = DB::connection('tenant')
            ->table('consultant_wallets')
            ->where('consultant_id', $consultantId)
            ->first();

        if (!$wallet) {
            $walletId = DB::connection('tenant')
                ->table('consultant_wallets')
                ->insertGetId([
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
                ->find($walletId);
        }

        return $wallet;
    }

    /**
     * Credit commission to wallet
     */
    public function creditCommission(
        int $consultantId,
        float $amount,
        string $sourceType,
        ?int $sourceId = null,
        ?string $description = null
    ): array {
        $wallet = $this->getOrCreateWallet($consultantId);
        
        if ($wallet->status !== 'active') {
            return [
                'success' => false,
                'message' => 'Wallet is not active',
            ];
        }

        $balanceBefore = $wallet->balance;
        $balanceAfter = $balanceBefore + $amount;
        $reference = 'COM-' . strtoupper(Str::random(10));

        DB::connection('tenant')->beginTransaction();

        try {
            // Update wallet balance
            DB::connection('tenant')
                ->table('consultant_wallets')
                ->where('id', $wallet->id)
                ->update([
                    'balance' => $balanceAfter,
                    'total_earned' => $wallet->total_earned + $amount,
                    'last_transaction_at' => now(),
                    'updated_at' => now(),
                ]);

            // Record transaction
            $transactionId = DB::connection('tenant')
                ->table('wallet_transactions')
                ->insertGetId([
                    'wallet_id' => $wallet->id,
                    'type' => 'commission',
                    'amount' => $amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'reference' => $reference,
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                    'status' => 'completed',
                    'description' => $description ?? "Commission from {$sourceType}",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::connection('tenant')->commit();

            return [
                'success' => true,
                'transaction_id' => $transactionId,
                'reference' => $reference,
                'new_balance' => $balanceAfter,
            ];

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return [
                'success' => false,
                'message' => 'Failed to credit commission: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Request withdrawal
     */
    public function requestWithdrawal(
        int $consultantId,
        float $amount,
        string $bankName,
        string $accountNumber,
        string $accountName
    ): array {
        $wallet = $this->getOrCreateWallet($consultantId);

        if ($wallet->status !== 'active') {
            return [
                'success' => false,
                'message' => 'Wallet is not active',
            ];
        }

        if ($wallet->balance < $amount) {
            return [
                'success' => false,
                'message' => 'Insufficient balance',
            ];
        }

        // Check for pending withdrawals
        $pendingCount = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('consultant_id', $consultantId)
            ->whereIn('status', ['pending', 'approved', 'processing'])
            ->count();

        if ($pendingCount > 0) {
            return [
                'success' => false,
                'message' => 'You have a pending withdrawal request',
            ];
        }

        $requestId = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->insertGetId([
                'wallet_id' => $wallet->id,
                'consultant_id' => $consultantId,
                'amount' => $amount,
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'account_name' => $accountName,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'success' => true,
            'request_id' => $requestId,
            'message' => 'Withdrawal request submitted successfully',
        ];
    }

    /**
     * Approve withdrawal request
     */
    public function approveWithdrawal(int $requestId, int $approverId): array
    {
        $request = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->find($requestId);

        if (!$request) {
            return ['success' => false, 'message' => 'Request not found'];
        }

        if ($request->status !== 'pending') {
            return ['success' => false, 'message' => 'Request is not pending'];
        }

        $wallet = DB::connection('tenant')
            ->table('consultant_wallets')
            ->find($request->wallet_id);

        if ($wallet->balance < $request->amount) {
            return ['success' => false, 'message' => 'Insufficient balance'];
        }

        DB::connection('tenant')->beginTransaction();

        try {
            // Update request status
            DB::connection('tenant')
                ->table('withdrawal_requests')
                ->where('id', $requestId)
                ->update([
                    'status' => 'approved',
                    'approved_by' => $approverId,
                    'approved_at' => now(),
                    'updated_at' => now(),
                ]);

            // Deduct from wallet
            $balanceBefore = $wallet->balance;
            $balanceAfter = $balanceBefore - $request->amount;

            DB::connection('tenant')
                ->table('consultant_wallets')
                ->where('id', $wallet->id)
                ->update([
                    'balance' => $balanceAfter,
                    'total_withdrawn' => $wallet->total_withdrawn + $request->amount,
                    'last_transaction_at' => now(),
                    'updated_at' => now(),
                ]);

            // Record transaction
            DB::connection('tenant')
                ->table('wallet_transactions')
                ->insert([
                    'wallet_id' => $wallet->id,
                    'type' => 'withdrawal',
                    'amount' => -$request->amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'reference' => 'WTH-' . strtoupper(Str::random(10)),
                    'source_type' => 'WithdrawalRequest',
                    'source_id' => $requestId,
                    'status' => 'completed',
                    'description' => "Withdrawal to {$request->bank_name} - {$request->account_number}",
                    'processed_by' => $approverId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::connection('tenant')->commit();

            return [
                'success' => true,
                'message' => 'Withdrawal approved successfully',
            ];

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return [
                'success' => false,
                'message' => 'Failed to approve withdrawal: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Reject withdrawal request
     */
    public function rejectWithdrawal(int $requestId, int $rejectedBy, string $reason): array
    {
        $request = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->find($requestId);

        if (!$request) {
            return ['success' => false, 'message' => 'Request not found'];
        }

        if ($request->status !== 'pending') {
            return ['success' => false, 'message' => 'Request is not pending'];
        }

        DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('id', $requestId)
            ->update([
                'status' => 'rejected',
                'rejection_reason' => $reason,
                'processed_by' => $rejectedBy,
                'processed_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'success' => true,
            'message' => 'Withdrawal rejected',
        ];
    }

    /**
     * Get wallet summary for consultant
     */
    public function getWalletSummary(int $consultantId): array
    {
        $wallet = $this->getOrCreateWallet($consultantId);

        $recentTransactions = DB::connection('tenant')
            ->table('wallet_transactions')
            ->where('wallet_id', $wallet->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $pendingWithdrawals = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->where('consultant_id', $consultantId)
            ->whereIn('status', ['pending', 'approved', 'processing'])
            ->get();

        return [
            'wallet' => $wallet,
            'recent_transactions' => $recentTransactions,
            'pending_withdrawals' => $pendingWithdrawals,
            'stats' => [
                'total_earned' => $wallet->total_earned,
                'total_withdrawn' => $wallet->total_withdrawn,
                'current_balance' => $wallet->balance,
                'pending_amount' => $pendingWithdrawals->sum('amount'),
            ],
        ];
    }

    /**
     * Calculate commission for a sale
     */
    public function calculateCommission(
        int $consultantId,
        float $saleAmount,
        ?int $revenueItemId = null,
        ?int $revenueCategoryId = null
    ): float {
        // Get consultant type
        $consultant = DB::connection('tenant')
            ->table('users')
            ->where('id', $consultantId)
            ->first();

        $consultantType = $consultant->consultant_type ?? 'individual';

        // Check for specific rule
        $rule = DB::connection('tenant')
            ->table('commission_rules')
            ->where('is_active', true)
            ->where(function($query) use ($consultantType, $revenueItemId, $revenueCategoryId) {
                $query->where('consultant_type', $consultantType);
                if ($revenueItemId) {
                    $query->where('revenue_item_id', $revenueItemId);
                }
                if ($revenueCategoryId) {
                    $query->orWhere('revenue_category_id', $revenueCategoryId);
                }
            })
            ->orderByRaw('CASE WHEN revenue_item_id IS NOT NULL THEN 1 WHEN revenue_category_id IS NOT NULL THEN 2 ELSE 3 END')
            ->first();

        if (!$rule) {
            // Default 10% commission
            return $saleAmount * 0.10;
        }

        switch ($rule->rule_type) {
            case 'percentage':
                return $saleAmount * ($rule->rate / 100);

            case 'fixed':
                return $rule->fixed_amount;

            case 'tiered':
                $tiers = json_decode($rule->tiers, true) ?? [];
                foreach ($tiers as $range => $rate) {
                    [$min, $max] = array_map('intval', explode('-', $range));
                    if ($saleAmount >= $min && $saleAmount <= $max) {
                        return $saleAmount * ($rate / 100);
                    }
                }
                return $saleAmount * 0.10; // Default

            default:
                return $saleAmount * 0.10;
        }
    }
}

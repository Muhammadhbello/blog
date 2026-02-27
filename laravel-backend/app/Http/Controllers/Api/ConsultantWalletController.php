<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\ConsultantWalletService;
use Illuminate\Support\Facades\DB;

class ConsultantWalletController extends Controller
{
    protected ConsultantWalletService $walletService;

    public function __construct(ConsultantWalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Get wallet summary for the authenticated consultant
     */
    public function getMyWallet(Request $request)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['consultant', 'consultant_admin'])) {
            return response()->json([
                'message' => 'Only consultants can access wallet'
            ], 403);
        }

        $summary = $this->walletService->getWalletSummary($user->id);

        return response()->json($summary);
    }

    /**
     * Get wallet transactions
     */
    public function getTransactions(Request $request)
    {
        $user = $request->user();
        $wallet = $this->walletService->getOrCreateWallet($user->id);

        $query = DB::connection('tenant')
            ->table('wallet_transactions')
            ->where('wallet_id', $wallet->id);

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        $transactions = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($transactions);
    }

    /**
     * Request a withdrawal
     */
    public function requestWithdrawal(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1000',
            'bank_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:20',
            'account_name' => 'required|string|max:255',
        ]);

        $user = $request->user();
        
        $result = $this->walletService->requestWithdrawal(
            $user->id,
            $validated['amount'],
            $validated['bank_name'],
            $validated['account_number'],
            $validated['account_name']
        );

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result, 201);
    }

    /**
     * Get withdrawal requests (for admin)
     */
    public function getWithdrawalRequests(Request $request)
    {
        $query = DB::connection('tenant')
            ->table('withdrawal_requests')
            ->join('users', 'withdrawal_requests.consultant_id', '=', 'users.id')
            ->select(
                'withdrawal_requests.*',
                'users.name as consultant_name',
                'users.email as consultant_email'
            );

        if ($request->has('status')) {
            $query->where('withdrawal_requests.status', $request->status);
        }

        if ($request->has('consultant_id')) {
            $query->where('withdrawal_requests.consultant_id', $request->consultant_id);
        }

        $requests = $query->orderByDesc('withdrawal_requests.created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($requests);
    }

    /**
     * Approve withdrawal request (admin only)
     */
    public function approveWithdrawal(Request $request, $id)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['chairman', 'treasurer'])) {
            return response()->json([
                'message' => 'Not authorized to approve withdrawals'
            ], 403);
        }

        $result = $this->walletService->approveWithdrawal($id, $user->id);

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }

    /**
     * Reject withdrawal request (admin only)
     */
    public function rejectWithdrawal(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $user = $request->user();
        
        if (!in_array($user->role, ['chairman', 'treasurer'])) {
            return response()->json([
                'message' => 'Not authorized to reject withdrawals'
            ], 403);
        }

        $result = $this->walletService->rejectWithdrawal(
            $id,
            $user->id,
            $validated['reason']
        );

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }

    /**
     * Get wallet statistics (admin view)
     */
    public function getWalletStats(Request $request)
    {
        $stats = [
            'total_wallets' => DB::connection('tenant')
                ->table('consultant_wallets')
                ->count(),
                
            'total_balance' => DB::connection('tenant')
                ->table('consultant_wallets')
                ->sum('balance'),
                
            'total_earned' => DB::connection('tenant')
                ->table('consultant_wallets')
                ->sum('total_earned'),
                
            'total_withdrawn' => DB::connection('tenant')
                ->table('consultant_wallets')
                ->sum('total_withdrawn'),
                
            'pending_withdrawals' => DB::connection('tenant')
                ->table('withdrawal_requests')
                ->where('status', 'pending')
                ->count(),
                
            'pending_amount' => DB::connection('tenant')
                ->table('withdrawal_requests')
                ->where('status', 'pending')
                ->sum('amount'),
                
            'top_earners' => DB::connection('tenant')
                ->table('consultant_wallets')
                ->join('users', 'consultant_wallets.consultant_id', '=', 'users.id')
                ->select('users.name', 'consultant_wallets.total_earned', 'consultant_wallets.balance')
                ->orderByDesc('consultant_wallets.total_earned')
                ->limit(5)
                ->get(),
        ];

        return response()->json($stats);
    }

    /**
     * Get commission rules
     */
    public function getCommissionRules(Request $request)
    {
        $rules = DB::connection('tenant')
            ->table('commission_rules')
            ->orderBy('consultant_type')
            ->orderBy('rule_type')
            ->get();

        return response()->json($rules);
    }

    /**
     * Create or update commission rule
     */
    public function saveCommissionRule(Request $request)
    {
        $validated = $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'consultant_type' => 'required|in:individual,company,internal',
            'rule_type' => 'required|in:percentage,fixed,tiered',
            'rate' => 'nullable|numeric|min:0|max:100',
            'fixed_amount' => 'nullable|numeric|min:0',
            'tiers' => 'nullable|array',
            'revenue_item_id' => 'nullable|integer',
            'revenue_category_id' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['id'])) {
            DB::connection('tenant')
                ->table('commission_rules')
                ->where('id', $validated['id'])
                ->update(array_merge($validated, [
                    'tiers' => isset($validated['tiers']) ? json_encode($validated['tiers']) : null,
                    'updated_at' => now(),
                ]));
                
            return response()->json(['message' => 'Rule updated successfully']);
        }

        $id = DB::connection('tenant')
            ->table('commission_rules')
            ->insertGetId(array_merge($validated, [
                'tiers' => isset($validated['tiers']) ? json_encode($validated['tiers']) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]));

        return response()->json([
            'message' => 'Rule created successfully',
            'id' => $id,
        ], 201);
    }

    /**
     * Delete commission rule
     */
    public function deleteCommissionRule($id)
    {
        DB::connection('tenant')
            ->table('commission_rules')
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Rule deleted successfully']);
    }
}

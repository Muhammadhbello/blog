<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;

        $totalRevenue = Transaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->startOfMonth())
            ->sum('net_lga_amount');

        $totalTransactions = Transaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        $platformFees = Transaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->startOfMonth())
            ->sum('platform_fee');

        $revenueByCategory = DB::table('transactions')
            ->join('invoices', 'transactions.invoice_id', '=', 'invoices.id')
            ->join('revenue_items', 'invoices.revenue_item_id', '=', 'revenue_items.id')
            ->join('revenue_categories', 'revenue_items.category_id', '=', 'revenue_categories.id')
            ->where('transactions.tenant_id', $tenantId)
            ->select('revenue_categories.name', DB::raw('SUM(transactions.net_lga_amount) as total'))
            ->groupBy('revenue_categories.id', 'revenue_categories.name')
            ->get();

        return response()->json([
            'total_revenue' => round($totalRevenue, 2),
            'total_transactions' => $totalTransactions,
            'platform_fees' => round($platformFees, 2),
            'revenue_by_category' => $revenueByCategory,
            'period' => 'current_month',
        ]);
    }
}

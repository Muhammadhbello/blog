<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Invoice;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function getAdvancedStats(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30'); // days

        $startDate = Carbon::now()->subDays($period);

        // Revenue trend (daily)
        $revenueTrend = Transaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(net_lga_amount) as revenue'),
                DB::raw('SUM(platform_fee) as fees'),
                DB::raw('COUNT(*) as transactions')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Revenue by category
        $revenueByCategory = DB::table('transactions')
            ->join('invoices', 'transactions.invoice_id', '=', 'invoices.id')
            ->join('revenue_items', 'invoices.revenue_item_id', '=', 'revenue_items.id')
            ->join('revenue_categories', 'revenue_items.category_id', '=', 'revenue_categories.id')
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.created_at', '>=', $startDate)
            ->select(
                'revenue_categories.name',
                DB::raw('SUM(transactions.net_lga_amount) as total'),
                DB::raw('COUNT(transactions.id) as count')
            )
            ->groupBy('revenue_categories.id', 'revenue_categories.name')
            ->get();

        // Revenue by ward
        $revenueByWard = DB::table('transactions')
            ->join('invoices', 'transactions.invoice_id', '=', 'invoices.id')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->leftJoin('wards', DB::raw('1'), '=', DB::raw('1')) // Simplified join
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.created_at', '>=', $startDate)
            ->select(
                'wards.name',
                DB::raw('SUM(transactions.net_lga_amount) as revenue')
            )
            ->groupBy('wards.id', 'wards.name')
            ->limit(10)
            ->get();

        // Payment methods distribution
        $paymentMethods = Transaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->select(
                'payment_method',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(amount_gross) as total')
            )
            ->groupBy('payment_method')
            ->get();

        // Top performing revenue items
        $topRevenueItems = DB::table('transactions')
            ->join('invoices', 'transactions.invoice_id', '=', 'invoices.id')
            ->join('revenue_items', 'invoices.revenue_item_id', '=', 'revenue_items.id')
            ->where('transactions.tenant_id', $tenantId)
            ->where('transactions.created_at', '>=', $startDate)
            ->select(
                'revenue_items.name',
                'revenue_items.type',
                DB::raw('SUM(transactions.amount_gross) as revenue'),
                DB::raw('COUNT(transactions.id) as transactions')
            )
            ->groupBy('revenue_items.id', 'revenue_items.name', 'revenue_items.type')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        // Monthly comparison
        $currentMonth = Transaction::where('tenant_id', $tenantId)
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('net_lga_amount');

        $previousMonth = Transaction::where('tenant_id', $tenantId)
            ->whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->whereYear('created_at', Carbon::now()->subMonth()->year)
            ->sum('net_lga_amount');

        $growth = $previousMonth > 0 ? (($currentMonth - $previousMonth) / $previousMonth) * 100 : 0;

        // Collection efficiency
        $totalInvoices = Invoice::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->count();

        $paidInvoices = Invoice::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->where('status', 'paid')
            ->count();

        $collectionRate = $totalInvoices > 0 ? ($paidInvoices / $totalInvoices) * 100 : 0;

        return response()->json([
            'revenue_trend' => $revenueTrend,
            'revenue_by_category' => $revenueByCategory,
            'revenue_by_ward' => $revenueByWard,
            'payment_methods' => $paymentMethods,
            'top_revenue_items' => $topRevenueItems,
            'monthly_comparison' => [
                'current_month' => $currentMonth,
                'previous_month' => $previousMonth,
                'growth_percentage' => round($growth, 2),
            ],
            'collection_efficiency' => [
                'total_invoices' => $totalInvoices,
                'paid_invoices' => $paidInvoices,
                'collection_rate' => round($collectionRate, 2),
            ],
            'period_days' => $period,
        ]);
    }
}

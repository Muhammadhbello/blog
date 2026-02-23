<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportsController extends Controller
{
    /**
     * Get comprehensive dashboard analytics
     */
    public function getDashboardAnalytics(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->toDateString());
        $wardId = $request->get('ward_id');

        // Revenue Summary
        $invoiceRevenue = DB::connection('tenant')
            ->table('invoice_payments')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->sum('amount');

        $ticketRevenue = DB::connection('tenant')
            ->table('ticket_payments')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->sum('amount');

        // Daily Revenue Trend
        $dailyRevenue = DB::connection('tenant')
            ->table('invoice_payments')
            ->selectRaw('DATE(created_at) as date, SUM(amount) as invoice_amount')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $dailyTickets = DB::connection('tenant')
            ->table('ticket_payments')
            ->selectRaw('DATE(created_at) as date, SUM(amount) as ticket_amount')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Merge daily data
        $dates = collect();
        $current = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        while ($current <= $end) {
            $dateStr = $current->toDateString();
            $dates->push([
                'date' => $dateStr,
                'invoice_amount' => $dailyRevenue[$dateStr]->invoice_amount ?? 0,
                'ticket_amount' => $dailyTickets[$dateStr]->ticket_amount ?? 0,
                'total' => ($dailyRevenue[$dateStr]->invoice_amount ?? 0) + ($dailyTickets[$dateStr]->ticket_amount ?? 0),
            ]);
            $current->addDay();
        }

        // Revenue by Ward
        $revenueByWard = DB::connection('tenant')
            ->table('invoices')
            ->join('wards', 'invoices.ward_id', '=', 'wards.id')
            ->selectRaw('wards.name as ward, SUM(invoices.amount_paid) as amount')
            ->whereBetween('invoices.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('wards.id', 'wards.name')
            ->orderByDesc('amount')
            ->get();

        // Revenue by Category
        $revenueByCategory = DB::connection('tenant')
            ->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('revenue_items', 'invoice_items.revenue_item_id', '=', 'revenue_items.id')
            ->join('revenue_categories', 'revenue_items.category_id', '=', 'revenue_categories.id')
            ->selectRaw('revenue_categories.name as category, SUM(invoice_items.amount) as amount')
            ->whereBetween('invoices.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('revenue_categories.id', 'revenue_categories.name')
            ->orderByDesc('amount')
            ->get();

        // Invoice Status Distribution
        $invoiceStatus = DB::connection('tenant')
            ->table('invoices')
            ->selectRaw('status, COUNT(*) as count, SUM(total_amount) as amount')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('status')
            ->get();

        // Collection Performance (by collector)
        $collectorPerformance = DB::connection('tenant')
            ->table('ticket_payments')
            ->join('tenant_users', 'ticket_payments.collected_by', '=', 'tenant_users.id')
            ->selectRaw('tenant_users.name as collector, COUNT(*) as tickets_sold, SUM(ticket_payments.amount) as amount')
            ->whereBetween('ticket_payments.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('tenant_users.id', 'tenant_users.name')
            ->orderByDesc('amount')
            ->limit(10)
            ->get();

        // Top Revenue Points
        $topRevenuePoints = DB::connection('tenant')
            ->table('tickets')
            ->join('revenue_points', 'tickets.revenue_point_id', '=', 'revenue_points.id')
            ->selectRaw('revenue_points.name as point, COUNT(*) as tickets_sold, SUM(tickets.amount) as amount')
            ->where('tickets.status', 'sold')
            ->whereBetween('tickets.sold_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('revenue_points.id', 'revenue_points.name')
            ->orderByDesc('amount')
            ->limit(10)
            ->get();

        // Business Registration Trend
        $businessTrend = DB::connection('tenant')
            ->table('businesses')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Monthly Comparison
        $thisMonth = DB::connection('tenant')
            ->table('invoice_payments')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('amount');

        $lastMonth = DB::connection('tenant')
            ->table('invoice_payments')
            ->whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->whereYear('created_at', Carbon::now()->subMonth()->year)
            ->sum('amount');

        $monthlyGrowth = $lastMonth > 0 ? (($thisMonth - $lastMonth) / $lastMonth) * 100 : 0;

        return response()->json([
            'summary' => [
                'total_revenue' => $invoiceRevenue + $ticketRevenue,
                'invoice_revenue' => $invoiceRevenue,
                'ticket_revenue' => $ticketRevenue,
                'this_month' => $thisMonth,
                'last_month' => $lastMonth,
                'monthly_growth' => round($monthlyGrowth, 2),
            ],
            'daily_trend' => $dates,
            'revenue_by_ward' => $revenueByWard,
            'revenue_by_category' => $revenueByCategory,
            'invoice_status' => $invoiceStatus,
            'collector_performance' => $collectorPerformance,
            'top_revenue_points' => $topRevenuePoints,
            'business_trend' => $businessTrend,
        ]);
    }

    /**
     * Get invoice reports
     */
    public function getInvoiceReport(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->toDateString());

        $query = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->leftJoin('wards', 'invoices.ward_id', '=', 'wards.id')
            ->whereBetween('invoices.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($request->has('status')) {
            $query->where('invoices.status', $request->status);
        }

        if ($request->has('ward_id')) {
            $query->where('invoices.ward_id', $request->ward_id);
        }

        $invoices = $query->select(
                'invoices.*',
                'businesses.business_name',
                'businesses.owner_name',
                'wards.name as ward_name'
            )
            ->orderBy('invoices.created_at', 'desc')
            ->get();

        $summary = [
            'total_invoices' => $invoices->count(),
            'total_amount' => $invoices->sum('total_amount'),
            'total_paid' => $invoices->sum('amount_paid'),
            'total_outstanding' => $invoices->sum('balance'),
            'by_status' => $invoices->groupBy('status')->map(function ($items) {
                return [
                    'count' => $items->count(),
                    'amount' => $items->sum('total_amount'),
                    'paid' => $items->sum('amount_paid'),
                ];
            }),
        ];

        return response()->json([
            'invoices' => $invoices,
            'summary' => $summary,
        ]);
    }

    /**
     * Get ticket reports
     */
    public function getTicketReport(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->toDateString());

        $query = DB::connection('tenant')
            ->table('tickets')
            ->join('ticket_batches', 'tickets.batch_id', '=', 'ticket_batches.id')
            ->join('revenue_points', 'tickets.revenue_point_id', '=', 'revenue_points.id')
            ->where('tickets.status', 'sold')
            ->whereBetween('tickets.sold_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($request->has('revenue_point_id')) {
            $query->where('tickets.revenue_point_id', $request->revenue_point_id);
        }

        $tickets = $query->select(
                'tickets.*',
                'ticket_batches.batch_number',
                'revenue_points.name as revenue_point_name'
            )
            ->orderBy('tickets.sold_at', 'desc')
            ->get();

        $summary = [
            'total_tickets' => $tickets->count(),
            'total_amount' => $tickets->sum('amount'),
            'by_revenue_point' => $tickets->groupBy('revenue_point_name')->map(function ($items) {
                return [
                    'count' => $items->count(),
                    'amount' => $items->sum('amount'),
                ];
            }),
            'by_date' => $tickets->groupBy(function ($item) {
                return Carbon::parse($item->sold_at)->toDateString();
            })->map(function ($items) {
                return [
                    'count' => $items->count(),
                    'amount' => $items->sum('amount'),
                ];
            }),
        ];

        return response()->json([
            'tickets' => $tickets,
            'summary' => $summary,
        ]);
    }

    /**
     * Get closing reports
     */
    public function getClosingReport(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->toDateString());

        $closings = DB::connection('tenant')
            ->table('closings')
            ->join('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->leftJoin('tenant_users as submitter', 'closings.submitted_by', '=', 'submitter.id')
            ->whereBetween('closings.period_start', [$startDate, $endDate])
            ->select(
                'closings.*',
                'revenue_points.name as revenue_point_name',
                'submitter.name as submitted_by_name'
            )
            ->orderBy('closings.period_start', 'desc')
            ->get();

        $summary = [
            'total_closings' => $closings->count(),
            'total_expected' => $closings->sum('expected_amount'),
            'total_remitted' => $closings->sum('remitted_amount'),
            'total_variance' => $closings->sum('variance'),
            'by_status' => $closings->groupBy('status')->map(function ($items) {
                return [
                    'count' => $items->count(),
                    'expected' => $items->sum('expected_amount'),
                    'remitted' => $items->sum('remitted_amount'),
                ];
            }),
            'variance_flagged' => $closings->where('status', 'variance_flagged')->count(),
        ];

        return response()->json([
            'closings' => $closings,
            'summary' => $summary,
        ]);
    }

    /**
     * Get defaulter reports
     */
    public function getDefaulterReport(Request $request)
    {
        $defaulters = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->leftJoin('wards', 'businesses.ward_id', '=', 'wards.id')
            ->where('invoices.status', 'overdue')
            ->where('invoices.balance', '>', 0)
            ->select(
                'businesses.id as business_id',
                'businesses.business_name',
                'businesses.owner_name',
                'businesses.owner_phone',
                'wards.name as ward_name',
                DB::raw('COUNT(invoices.id) as overdue_invoices'),
                DB::raw('SUM(invoices.balance) as total_outstanding'),
                DB::raw('MIN(invoices.due_date) as oldest_due_date'),
                DB::raw('DATEDIFF(NOW(), MIN(invoices.due_date)) as max_days_overdue')
            )
            ->groupBy('businesses.id', 'businesses.business_name', 'businesses.owner_name', 'businesses.owner_phone', 'wards.name')
            ->orderByDesc('total_outstanding')
            ->get();

        $summary = [
            'total_defaulters' => $defaulters->count(),
            'total_outstanding' => $defaulters->sum('total_outstanding'),
            'total_overdue_invoices' => $defaulters->sum('overdue_invoices'),
            'by_days_overdue' => [
                '1_30' => $defaulters->where('max_days_overdue', '<=', 30)->count(),
                '31_60' => $defaulters->whereBetween('max_days_overdue', [31, 60])->count(),
                '61_90' => $defaulters->whereBetween('max_days_overdue', [61, 90])->count(),
                'over_90' => $defaulters->where('max_days_overdue', '>', 90)->count(),
            ],
        ];

        return response()->json([
            'defaulters' => $defaulters,
            'summary' => $summary,
        ]);
    }

    /**
     * Export report to CSV
     */
    public function exportReport(Request $request)
    {
        $type = $request->get('type', 'invoices');
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->toDateString());

        $filename = "{$type}_report_{$startDate}_to_{$endDate}.csv";

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($type, $startDate, $endDate) {
            $file = fopen('php://output', 'w');

            switch ($type) {
                case 'invoices':
                    fputcsv($file, ['Invoice #', 'Business', 'Amount', 'Paid', 'Balance', 'Status', 'Due Date', 'Created']);
                    $data = DB::connection('tenant')
                        ->table('invoices')
                        ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
                        ->whereBetween('invoices.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                        ->select('invoices.*', 'businesses.business_name')
                        ->get();
                    foreach ($data as $row) {
                        fputcsv($file, [
                            $row->invoice_number,
                            $row->business_name,
                            $row->total_amount,
                            $row->amount_paid,
                            $row->balance,
                            $row->status,
                            $row->due_date,
                            $row->created_at,
                        ]);
                    }
                    break;

                case 'tickets':
                    fputcsv($file, ['Ticket #', 'Revenue Point', 'Amount', 'Status', 'Sold At']);
                    $data = DB::connection('tenant')
                        ->table('tickets')
                        ->join('revenue_points', 'tickets.revenue_point_id', '=', 'revenue_points.id')
                        ->where('tickets.status', 'sold')
                        ->whereBetween('tickets.sold_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                        ->select('tickets.*', 'revenue_points.name as revenue_point_name')
                        ->get();
                    foreach ($data as $row) {
                        fputcsv($file, [
                            $row->ticket_number,
                            $row->revenue_point_name,
                            $row->amount,
                            $row->status,
                            $row->sold_at,
                        ]);
                    }
                    break;
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

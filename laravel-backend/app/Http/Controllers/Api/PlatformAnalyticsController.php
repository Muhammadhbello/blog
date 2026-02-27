<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Tenant;
use Carbon\Carbon;

class PlatformAnalyticsController extends Controller
{
    /**
     * Get comprehensive platform analytics
     */
    public function getDashboardStats(Request $request)
    {
        $range = $request->get('range', 'month');
        $startDate = $this->getStartDate($range);
        $previousStart = $this->getPreviousStartDate($range);

        // Get all tenants with their stats
        $tenants = Tenant::withCount(['users', 'businesses', 'transactions'])
            ->with(['transactions' => function($query) use ($startDate) {
                $query->where('created_at', '>=', $startDate)
                      ->where('status', 'completed');
            }])
            ->get();

        // Calculate totals
        $currentRevenue = 0;
        $currentPlatformFees = 0;
        $currentTransactions = 0;
        $tenantBreakdown = [];

        foreach ($tenants as $tenant) {
            $tenantGross = $tenant->transactions->sum('total_amount');
            $tenantPlatformFee = $tenant->transactions->sum('platform_fee');
            $tenantNet = $tenantGross - $tenantPlatformFee;
            $tenantTxCount = $tenant->transactions->count();

            $currentRevenue += $tenantGross;
            $currentPlatformFees += $tenantPlatformFee;
            $currentTransactions += $tenantTxCount;

            $tenantBreakdown[] = [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'gross' => $tenantGross,
                'platform_fee' => $tenantPlatformFee,
                'net_tenant' => $tenantNet,
                'transactions' => $tenantTxCount,
                'businesses_count' => $tenant->businesses_count ?? 0,
                'users_count' => $tenant->users_count ?? 0,
            ];
        }

        // Sort by gross revenue
        usort($tenantBreakdown, fn($a, $b) => $b['gross'] <=> $a['gross']);

        // Get previous period for growth calculation
        $previousGross = $this->getPreviousPeriodRevenue($previousStart, $startDate);
        $growth = $previousGross > 0 ? (($currentRevenue - $previousGross) / $previousGross) * 100 : 0;

        // Get revenue by day for charts
        $revenueByDay = $this->getRevenueByDay($startDate, $range);

        // Get revenue by category
        $revenueByCategory = $this->getRevenueByCategory($startDate);

        // Get top performing tenants (top 5)
        $topTenants = array_slice($tenantBreakdown, 0, 5);

        return response()->json([
            'total_tenants' => $tenants->count(),
            'active_tenants' => $tenants->where('status', 'active')->count(),
            'suspended_tenants' => $tenants->where('status', 'suspended')->count(),
            'total_gross_revenue' => $currentRevenue,
            'total_platform_revenue' => $currentPlatformFees,
            'total_tenant_net' => $currentRevenue - $currentPlatformFees,
            'total_transactions' => $currentTransactions,
            'monthly_growth' => round($growth, 1),
            'tenant_breakdown' => $tenantBreakdown,
            'top_tenants' => $topTenants,
            'revenue_by_day' => $revenueByDay,
            'revenue_by_category' => $revenueByCategory,
            'date_range' => [
                'start' => $startDate->toDateString(),
                'end' => now()->toDateString(),
                'label' => $range,
            ],
        ]);
    }

    /**
     * Get revenue trends over time
     */
    public function getRevenueTrends(Request $request)
    {
        $range = $request->get('range', 'month');
        $groupBy = $request->get('group_by', 'day'); // day, week, month
        $startDate = $this->getStartDate($range);

        $query = DB::table('transactions')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate);

        $trends = match($groupBy) {
            'week' => $query->selectRaw("
                YEARWEEK(created_at) as period,
                MIN(DATE(created_at)) as date,
                SUM(total_amount) as gross,
                SUM(platform_fee) as platform_fee,
                COUNT(*) as transactions
            ")->groupBy('period')->orderBy('period')->get(),
            
            'month' => $query->selectRaw("
                DATE_FORMAT(created_at, '%Y-%m') as period,
                DATE_FORMAT(created_at, '%Y-%m-01') as date,
                SUM(total_amount) as gross,
                SUM(platform_fee) as platform_fee,
                COUNT(*) as transactions
            ")->groupBy('period')->orderBy('period')->get(),
            
            default => $query->selectRaw("
                DATE(created_at) as date,
                DATE(created_at) as period,
                SUM(total_amount) as gross,
                SUM(platform_fee) as platform_fee,
                COUNT(*) as transactions
            ")->groupBy('date')->orderBy('date')->get(),
        };

        return response()->json([
            'trends' => $trends,
            'group_by' => $groupBy,
            'range' => $range,
        ]);
    }

    /**
     * Get tenant comparison data
     */
    public function getTenantComparison(Request $request)
    {
        $range = $request->get('range', 'month');
        $startDate = $this->getStartDate($range);
        $metric = $request->get('metric', 'revenue'); // revenue, transactions, businesses

        $tenants = Tenant::select('id', 'name', 'slug', 'status')
            ->with(['transactions' => function($query) use ($startDate) {
                $query->where('created_at', '>=', $startDate)
                      ->where('status', 'completed');
            }])
            ->withCount(['businesses', 'users'])
            ->get();

        $comparison = $tenants->map(function($tenant) use ($metric) {
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'value' => match($metric) {
                    'transactions' => $tenant->transactions->count(),
                    'businesses' => $tenant->businesses_count,
                    default => $tenant->transactions->sum('total_amount'),
                },
                'secondary' => [
                    'revenue' => $tenant->transactions->sum('total_amount'),
                    'transactions' => $tenant->transactions->count(),
                    'businesses' => $tenant->businesses_count,
                    'users' => $tenant->users_count,
                ],
            ];
        })->sortByDesc('value')->values();

        return response()->json([
            'comparison' => $comparison,
            'metric' => $metric,
            'range' => $range,
        ]);
    }

    /**
     * Get transaction volume analytics
     */
    public function getTransactionVolume(Request $request)
    {
        $range = $request->get('range', 'month');
        $startDate = $this->getStartDate($range);

        // Hourly distribution
        $hourlyDistribution = DB::table('transactions')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                HOUR(created_at) as hour,
                COUNT(*) as count,
                SUM(total_amount) as total
            ")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Day of week distribution
        $dayOfWeekDistribution = DB::table('transactions')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                DAYOFWEEK(created_at) as day_of_week,
                DAYNAME(created_at) as day_name,
                COUNT(*) as count,
                SUM(total_amount) as total
            ")
            ->groupBy('day_of_week', 'day_name')
            ->orderBy('day_of_week')
            ->get();

        // Transaction size distribution
        $sizeDistribution = DB::table('transactions')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                CASE 
                    WHEN total_amount < 1000 THEN 'Under ₦1,000'
                    WHEN total_amount < 5000 THEN '₦1,000 - ₦5,000'
                    WHEN total_amount < 10000 THEN '₦5,000 - ₦10,000'
                    WHEN total_amount < 50000 THEN '₦10,000 - ₦50,000'
                    WHEN total_amount < 100000 THEN '₦50,000 - ₦100,000'
                    ELSE 'Over ₦100,000'
                END as size_bucket,
                COUNT(*) as count,
                SUM(total_amount) as total
            ")
            ->groupBy('size_bucket')
            ->get();

        return response()->json([
            'hourly_distribution' => $hourlyDistribution,
            'day_of_week_distribution' => $dayOfWeekDistribution,
            'size_distribution' => $sizeDistribution,
            'range' => $range,
        ]);
    }

    /**
     * Get platform health metrics
     */
    public function getPlatformHealth()
    {
        $last24Hours = now()->subDay();
        $last7Days = now()->subDays(7);

        // Recent activity
        $recentTransactions = DB::table('transactions')
            ->where('created_at', '>=', $last24Hours)
            ->count();

        // Failed transactions
        $failedTransactions = DB::table('transactions')
            ->where('status', 'failed')
            ->where('created_at', '>=', $last7Days)
            ->count();

        // Active tenants (with activity in last 7 days)
        $activeTenants = DB::table('transactions')
            ->where('created_at', '>=', $last7Days)
            ->distinct('tenant_id')
            ->count('tenant_id');

        // Backup status
        $lastBackup = DB::table('backup_records')
            ->orderBy('created_at', 'desc')
            ->first();

        // SMS balance check
        $smsStatus = $this->checkSmsBalance();

        return response()->json([
            'health_score' => $this->calculateHealthScore($recentTransactions, $failedTransactions, $activeTenants),
            'recent_transactions_24h' => $recentTransactions,
            'failed_transactions_7d' => $failedTransactions,
            'active_tenants_7d' => $activeTenants,
            'last_backup' => $lastBackup ? [
                'date' => $lastBackup->created_at,
                'status' => $lastBackup->status,
                'type' => $lastBackup->type,
            ] : null,
            'sms_status' => $smsStatus,
            'system_status' => 'operational',
        ]);
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    protected function getStartDate(string $range): Carbon
    {
        return match($range) {
            'today' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'quarter' => now()->startOfQuarter(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
    }

    protected function getPreviousStartDate(string $range): Carbon
    {
        return match($range) {
            'today' => now()->subDay()->startOfDay(),
            'week' => now()->subWeek()->startOfWeek(),
            'month' => now()->subMonth()->startOfMonth(),
            'quarter' => now()->subQuarter()->startOfQuarter(),
            'year' => now()->subYear()->startOfYear(),
            default => now()->subMonth()->startOfMonth(),
        };
    }

    protected function getPreviousPeriodRevenue(Carbon $start, Carbon $end): float
    {
        return DB::table('transactions')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->sum('total_amount');
    }

    protected function getRevenueByDay(Carbon $startDate, string $range): array
    {
        $limit = match($range) {
            'today' => 24, // hours
            'week' => 7,
            'month' => 30,
            'year' => 12,
            default => 30,
        };

        $groupFormat = match($range) {
            'today' => '%Y-%m-%d %H:00:00',
            'year' => '%Y-%m-01',
            default => '%Y-%m-%d',
        };

        return DB::table('transactions')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                DATE_FORMAT(created_at, '{$groupFormat}') as date,
                SUM(total_amount) as gross,
                SUM(platform_fee) as platform_fee,
                COUNT(*) as transactions
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    protected function getRevenueByCategory(Carbon $startDate): array
    {
        return DB::table('transactions')
            ->join('revenue_items', 'transactions.revenue_item_id', '=', 'revenue_items.id')
            ->join('revenue_categories', 'revenue_items.category_id', '=', 'revenue_categories.id')
            ->where('transactions.status', 'completed')
            ->where('transactions.created_at', '>=', $startDate)
            ->selectRaw("
                revenue_categories.name as category,
                SUM(transactions.total_amount) as total,
                COUNT(*) as count
            ")
            ->groupBy('revenue_categories.id', 'revenue_categories.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->toArray();
    }

    protected function checkSmsBalance(): array
    {
        // This would typically query the SMS provider
        return [
            'status' => 'ok',
            'balance' => 'N/A',
            'message' => 'SMS configuration not active',
        ];
    }

    protected function calculateHealthScore(int $recentTx, int $failedTx, int $activeTenants): int
    {
        $score = 100;
        
        // Deduct for failed transactions
        if ($failedTx > 0) {
            $score -= min(20, $failedTx * 2);
        }
        
        // Deduct for no recent activity
        if ($recentTx === 0) {
            $score -= 10;
        }
        
        // Deduct for low active tenants
        if ($activeTenants < 3) {
            $score -= 10;
        }
        
        return max(0, $score);
    }

    /**
     * Get comprehensive revenue dashboard data
     */
    public function getRevenueDashboard(Request $request)
    {
        $range = $request->get('range', 'month');
        $startDate = $request->get('start_date') ? Carbon::parse($request->get('start_date')) : $this->getStartDate($range);
        $endDate = $request->get('end_date') ? Carbon::parse($request->get('end_date')) : now();
        $previousStart = $startDate->copy()->subDays($startDate->diffInDays($endDate));

        // Revenue by day
        $revenueByDay = DB::connection('platform')
            ->table('transactions')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("
                DATE(created_at) as date,
                SUM(total_amount) as gross,
                SUM(platform_fee) as platform_fee,
                SUM(total_amount) - SUM(platform_fee) as net,
                COUNT(*) as transactions
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Tenant revenue breakdown
        $tenantRevenue = DB::connection('platform')
            ->table('transactions as t')
            ->join('tenants as tn', 't.tenant_id', '=', 'tn.id')
            ->where('t.status', 'completed')
            ->whereBetween('t.created_at', [$startDate, $endDate])
            ->selectRaw("
                tn.id,
                tn.name,
                tn.slug,
                SUM(t.total_amount) as gross,
                SUM(t.platform_fee) as platform_fee,
                COUNT(*) as transactions
            ")
            ->groupBy('tn.id', 'tn.name', 'tn.slug')
            ->orderByDesc('gross')
            ->get();

        // Calculate growth for each tenant
        $tenantRevenueWithGrowth = $tenantRevenue->map(function($tenant) use ($previousStart, $startDate) {
            $previousRevenue = DB::connection('platform')
                ->table('transactions')
                ->where('tenant_id', $tenant->id)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$previousStart, $startDate])
                ->sum('total_amount');
            
            $growth = $previousRevenue > 0 
                ? (($tenant->gross - $previousRevenue) / $previousRevenue) * 100 
                : ($tenant->gross > 0 ? 100 : 0);
            
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'gross' => (float) $tenant->gross,
                'platform_fee' => (float) $tenant->platform_fee,
                'transactions' => (int) $tenant->transactions,
                'growth' => round($growth, 1),
            ];
        });

        // Revenue by category
        $categoryRevenue = DB::connection('platform')
            ->table('transactions as t')
            ->leftJoin('revenue_items as ri', 't.revenue_item_id', '=', 'ri.id')
            ->leftJoin('revenue_categories as rc', 'ri.category_id', '=', 'rc.id')
            ->where('t.status', 'completed')
            ->whereBetween('t.created_at', [$startDate, $endDate])
            ->selectRaw("
                COALESCE(rc.name, 'Other') as name,
                SUM(t.total_amount) as value,
                COUNT(*) as count
            ")
            ->groupBy('rc.name')
            ->orderByDesc('value')
            ->limit(6)
            ->get();

        // Payout data
        $payoutData = DB::connection('platform')
            ->table('payouts')
            ->selectRaw("
                DATE_FORMAT(created_at, '%b') as month,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(net_amount) as amount
            ")
            ->where('created_at', '>=', now()->subMonths(5))
            ->groupByRaw("DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')")
            ->orderByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            ->get();

        // Reconciliation data
        $reconciliationData = DB::connection('platform')
            ->table('reconciliation_periods')
            ->select('period', 'matched', 'unmatched', 'total_transactions')
            ->selectRaw("
                ROUND((matched / NULLIF(total_transactions, 0)) * 100, 1) as rate,
                (total_transactions - matched - unmatched) as disputed
            ")
            ->where('created_at', '>=', now()->subMonths(2))
            ->orderBy('created_at', 'desc')
            ->limit(4)
            ->get()
            ->reverse()
            ->values();

        // Calculate totals
        $totalGross = $revenueByDay->sum('gross');
        $totalPlatformFee = $revenueByDay->sum('platform_fee');
        $totalTransactions = $revenueByDay->sum('transactions');

        // Previous period totals for growth
        $previousGross = DB::connection('platform')
            ->table('transactions')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$previousStart, $startDate])
            ->sum('total_amount');

        $monthlyGrowth = $previousGross > 0 
            ? (($totalGross - $previousGross) / $previousGross) * 100 
            : 0;

        // Get reconciliation match rate
        $matchRate = DB::connection('platform')
            ->table('reconciliation_records')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                ROUND(SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
            ")
            ->value('rate') ?? 0;

        return response()->json([
            'stats' => [
                'totalGross' => (float) $totalGross,
                'totalPlatformFee' => (float) $totalPlatformFee,
                'totalTransactions' => (int) $totalTransactions,
                'avgTransactionValue' => $totalTransactions > 0 ? round($totalGross / $totalTransactions) : 0,
                'monthlyGrowth' => round($monthlyGrowth, 1),
                'matchRate' => (float) $matchRate,
            ],
            'revenueData' => $revenueByDay,
            'tenantRevenue' => $tenantRevenueWithGrowth,
            'categoryData' => $categoryRevenue,
            'payoutData' => $payoutData,
            'reconciliationData' => $reconciliationData,
            'dateRange' => [
                'start' => $startDate->toDateString(),
                'end' => $endDate->toDateString(),
                'range' => $range,
            ],
        ]);
    }

    /**
     * Export revenue data as CSV
     */
    public function exportRevenueCsv(Request $request)
    {
        $range = $request->get('range', 'month');
        $startDate = $request->get('start_date') ? Carbon::parse($request->get('start_date')) : $this->getStartDate($range);
        $endDate = $request->get('end_date') ? Carbon::parse($request->get('end_date')) : now();
        $type = $request->get('type', 'transactions'); // transactions, tenants, categories

        $filename = "flexcloud_{$type}_{$startDate->format('Ymd')}_{$endDate->format('Ymd')}.csv";

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($type, $startDate, $endDate) {
            $file = fopen('php://output', 'w');

            switch ($type) {
                case 'transactions':
                    fputcsv($file, ['Date', 'Tenant', 'Reference', 'Amount', 'Platform Fee', 'Net Amount', 'Status']);
                    
                    DB::connection('platform')
                        ->table('transactions as t')
                        ->join('tenants as tn', 't.tenant_id', '=', 'tn.id')
                        ->whereBetween('t.created_at', [$startDate, $endDate])
                        ->orderBy('t.created_at', 'desc')
                        ->chunk(1000, function($transactions) use ($file) {
                            foreach ($transactions as $tx) {
                                fputcsv($file, [
                                    $tx->created_at,
                                    $tx->name,
                                    $tx->reference ?? 'N/A',
                                    $tx->total_amount,
                                    $tx->platform_fee,
                                    $tx->total_amount - $tx->platform_fee,
                                    $tx->status,
                                ]);
                            }
                        });
                    break;

                case 'tenants':
                    fputcsv($file, ['Tenant', 'Slug', 'Gross Revenue', 'Platform Fee', 'Net Revenue', 'Transactions', 'Businesses', 'Users']);
                    
                    $tenants = DB::connection('platform')
                        ->table('transactions as t')
                        ->join('tenants as tn', 't.tenant_id', '=', 'tn.id')
                        ->where('t.status', 'completed')
                        ->whereBetween('t.created_at', [$startDate, $endDate])
                        ->selectRaw("
                            tn.name, tn.slug,
                            SUM(t.total_amount) as gross,
                            SUM(t.platform_fee) as platform_fee,
                            SUM(t.total_amount) - SUM(t.platform_fee) as net,
                            COUNT(*) as transactions,
                            (SELECT COUNT(*) FROM businesses WHERE tenant_id = tn.id) as businesses,
                            (SELECT COUNT(*) FROM users WHERE tenant_id = tn.id) as users
                        ")
                        ->groupBy('tn.id', 'tn.name', 'tn.slug')
                        ->orderByDesc('gross')
                        ->get();
                    
                    foreach ($tenants as $tenant) {
                        fputcsv($file, [
                            $tenant->name,
                            $tenant->slug,
                            $tenant->gross,
                            $tenant->platform_fee,
                            $tenant->net,
                            $tenant->transactions,
                            $tenant->businesses,
                            $tenant->users,
                        ]);
                    }
                    break;

                case 'categories':
                    fputcsv($file, ['Category', 'Total Revenue', 'Transaction Count', 'Average Value']);
                    
                    $categories = DB::connection('platform')
                        ->table('transactions as t')
                        ->leftJoin('revenue_items as ri', 't.revenue_item_id', '=', 'ri.id')
                        ->leftJoin('revenue_categories as rc', 'ri.category_id', '=', 'rc.id')
                        ->where('t.status', 'completed')
                        ->whereBetween('t.created_at', [$startDate, $endDate])
                        ->selectRaw("
                            COALESCE(rc.name, 'Other') as category,
                            SUM(t.total_amount) as total,
                            COUNT(*) as count,
                            AVG(t.total_amount) as avg_value
                        ")
                        ->groupBy('rc.name')
                        ->orderByDesc('total')
                        ->get();
                    
                    foreach ($categories as $cat) {
                        fputcsv($file, [
                            $cat->category,
                            $cat->total,
                            $cat->count,
                            round($cat->avg_value, 2),
                        ]);
                    }
                    break;

                case 'daily':
                    fputcsv($file, ['Date', 'Gross Revenue', 'Platform Fee', 'Net Revenue', 'Transactions']);
                    
                    $daily = DB::connection('platform')
                        ->table('transactions')
                        ->where('status', 'completed')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->selectRaw("
                            DATE(created_at) as date,
                            SUM(total_amount) as gross,
                            SUM(platform_fee) as platform_fee,
                            SUM(total_amount) - SUM(platform_fee) as net,
                            COUNT(*) as transactions
                        ")
                        ->groupBy('date')
                        ->orderBy('date')
                        ->get();
                    
                    foreach ($daily as $day) {
                        fputcsv($file, [
                            $day->date,
                            $day->gross,
                            $day->platform_fee,
                            $day->net,
                            $day->transactions,
                        ]);
                    }
                    break;
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export revenue data as PDF
     */
    public function exportRevenuePdf(Request $request)
    {
        $range = $request->get('range', 'month');
        $startDate = $request->get('start_date') ? Carbon::parse($request->get('start_date')) : $this->getStartDate($range);
        $endDate = $request->get('end_date') ? Carbon::parse($request->get('end_date')) : now();

        // Get summary data
        $summary = DB::connection('platform')
            ->table('transactions')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("
                SUM(total_amount) as gross,
                SUM(platform_fee) as platform_fee,
                COUNT(*) as transactions,
                AVG(total_amount) as avg_value
            ")
            ->first();

        // Get tenant breakdown
        $tenants = DB::connection('platform')
            ->table('transactions as t')
            ->join('tenants as tn', 't.tenant_id', '=', 'tn.id')
            ->where('t.status', 'completed')
            ->whereBetween('t.created_at', [$startDate, $endDate])
            ->selectRaw("
                tn.name,
                SUM(t.total_amount) as gross,
                SUM(t.platform_fee) as platform_fee,
                COUNT(*) as transactions
            ")
            ->groupBy('tn.id', 'tn.name')
            ->orderByDesc('gross')
            ->limit(10)
            ->get();

        // For now, return JSON that can be converted to PDF on frontend
        // In production, use dompdf or similar library
        return response()->json([
            'report' => [
                'title' => 'FlexCloud Revenue Report',
                'period' => $startDate->format('M d, Y') . ' - ' . $endDate->format('M d, Y'),
                'generated_at' => now()->toISOString(),
            ],
            'summary' => [
                'gross_revenue' => $summary->gross ?? 0,
                'platform_fees' => $summary->platform_fee ?? 0,
                'net_revenue' => ($summary->gross ?? 0) - ($summary->platform_fee ?? 0),
                'total_transactions' => $summary->transactions ?? 0,
                'avg_transaction_value' => round($summary->avg_value ?? 0, 2),
            ],
            'tenant_breakdown' => $tenants,
        ]);
    }
}

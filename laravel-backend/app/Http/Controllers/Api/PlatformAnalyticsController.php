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
}

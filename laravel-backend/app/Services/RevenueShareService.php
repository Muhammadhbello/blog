<?php

namespace App\Services;

use App\Models\Platform\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Enterprise Revenue Share Service
 * 
 * Handles all revenue split calculations between FlexCloud Platform and Tenants.
 * Supports multiple share models:
 * - Percentage: Fixed percentage of all revenue
 * - Tiered: Different percentages based on revenue brackets
 * - Category-based: Different rates per revenue category
 * - Flat: Fixed monthly fee
 */
class RevenueShareService
{
    /**
     * Calculate revenue split for a transaction
     */
    public function calculateSplit(float $amount, Tenant $tenant, array $options = []): array
    {
        $categoryId = $options['category_id'] ?? null;
        $itemId = $options['item_id'] ?? null;
        $transactionType = $options['type'] ?? 'general'; // invoice, ticket, etc.

        // Check for category/item specific overrides first
        $overrideRate = $this->getOverrideRate($tenant, $categoryId, $itemId);
        
        if ($overrideRate !== null) {
            return $this->calculateWithRate($amount, $overrideRate, $tenant);
        }

        // Apply tenant's default share model
        return $this->calculateWithModel($amount, $tenant);
    }

    /**
     * Calculate using tenant's share model
     */
    protected function calculateWithModel(float $amount, Tenant $tenant): array
    {
        $model = $tenant->revenue_share_model ?? 'percentage';
        $value = $tenant->share_value ?? 5.0; // Default 5%

        switch ($model) {
            case 'percentage':
                return $this->calculatePercentage($amount, $value, $tenant);

            case 'tiered':
                return $this->calculateTiered($amount, $tenant);

            case 'flat':
                return $this->calculateFlat($amount, $value, $tenant);

            case 'hybrid':
                return $this->calculateHybrid($amount, $tenant);

            default:
                return $this->calculatePercentage($amount, 5.0, $tenant);
        }
    }

    /**
     * Simple percentage calculation
     */
    protected function calculatePercentage(float $amount, float $rate, Tenant $tenant): array
    {
        $platformFee = ($amount * $rate) / 100;
        $consultantShare = $this->calculateConsultantShare($amount, $tenant);
        $netLgaAmount = $amount - $platformFee - $consultantShare;

        return [
            'gross_amount' => round($amount, 2),
            'platform_fee' => round($platformFee, 2),
            'platform_rate' => $rate,
            'consultant_share' => round($consultantShare, 2),
            'net_tenant_amount' => round($netLgaAmount, 2),
            'share_model' => 'percentage',
            'calculation_breakdown' => [
                'gross' => $amount,
                'platform_deduction' => "-{$rate}% = " . round($platformFee, 2),
                'consultant_deduction' => round($consultantShare, 2),
                'net' => round($netLgaAmount, 2),
            ],
        ];
    }

    /**
     * Tiered percentage calculation based on revenue brackets
     */
    protected function calculateTiered(float $amount, Tenant $tenant): array
    {
        $tiers = $this->getTenantTiers($tenant);
        
        // Get current month's total to determine tier
        $monthlyTotal = $this->getCurrentMonthRevenue($tenant);
        $newTotal = $monthlyTotal + $amount;

        $rate = $this->getTierRate($newTotal, $tiers);
        $platformFee = ($amount * $rate) / 100;
        $consultantShare = $this->calculateConsultantShare($amount, $tenant);
        $netLgaAmount = $amount - $platformFee - $consultantShare;

        return [
            'gross_amount' => round($amount, 2),
            'platform_fee' => round($platformFee, 2),
            'platform_rate' => $rate,
            'consultant_share' => round($consultantShare, 2),
            'net_tenant_amount' => round($netLgaAmount, 2),
            'share_model' => 'tiered',
            'tier_info' => [
                'monthly_total_before' => $monthlyTotal,
                'monthly_total_after' => $newTotal,
                'applied_rate' => $rate,
            ],
        ];
    }

    /**
     * Flat monthly fee (deducted from first transactions)
     */
    protected function calculateFlat(float $amount, float $monthlyFee, Tenant $tenant): array
    {
        // Check if monthly fee already collected
        $collectedThisMonth = $this->getPlatformFeeCollectedThisMonth($tenant);
        $remaining = max(0, $monthlyFee - $collectedThisMonth);
        
        $platformFee = min($remaining, $amount);
        $consultantShare = $this->calculateConsultantShare($amount, $tenant);
        $netLgaAmount = $amount - $platformFee - $consultantShare;

        return [
            'gross_amount' => round($amount, 2),
            'platform_fee' => round($platformFee, 2),
            'platform_rate' => null,
            'consultant_share' => round($consultantShare, 2),
            'net_tenant_amount' => round($netLgaAmount, 2),
            'share_model' => 'flat',
            'flat_info' => [
                'monthly_fee' => $monthlyFee,
                'collected_this_month' => $collectedThisMonth,
                'deducted_now' => $platformFee,
                'remaining' => max(0, $remaining - $platformFee),
            ],
        ];
    }

    /**
     * Hybrid: Base flat fee + percentage above threshold
     */
    protected function calculateHybrid(float $amount, Tenant $tenant): array
    {
        $baseFee = $tenant->metadata['hybrid_base_fee'] ?? 50000;
        $thresholdRate = $tenant->metadata['hybrid_rate'] ?? 3.0;
        $threshold = $tenant->metadata['hybrid_threshold'] ?? 1000000;

        $monthlyTotal = $this->getCurrentMonthRevenue($tenant);
        $newTotal = $monthlyTotal + $amount;

        // Calculate base fee portion
        $baseCollected = $this->getPlatformFeeCollectedThisMonth($tenant);
        $baseFeeDeduction = max(0, min($baseFee - $baseCollected, $amount));

        // Calculate percentage on amount above threshold
        $percentageDeduction = 0;
        if ($newTotal > $threshold) {
            $amountAboveThreshold = min($amount, $newTotal - $threshold);
            $percentageDeduction = ($amountAboveThreshold * $thresholdRate) / 100;
        }

        $platformFee = $baseFeeDeduction + $percentageDeduction;
        $consultantShare = $this->calculateConsultantShare($amount, $tenant);
        $netLgaAmount = $amount - $platformFee - $consultantShare;

        return [
            'gross_amount' => round($amount, 2),
            'platform_fee' => round($platformFee, 2),
            'platform_rate' => $thresholdRate,
            'consultant_share' => round($consultantShare, 2),
            'net_tenant_amount' => round($netLgaAmount, 2),
            'share_model' => 'hybrid',
            'hybrid_info' => [
                'base_fee' => $baseFee,
                'base_deducted' => $baseFeeDeduction,
                'threshold' => $threshold,
                'percentage_rate' => $thresholdRate,
                'percentage_deducted' => $percentageDeduction,
            ],
        ];
    }

    /**
     * Calculate with explicit rate (for overrides)
     */
    protected function calculateWithRate(float $amount, float $rate, Tenant $tenant): array
    {
        return $this->calculatePercentage($amount, $rate, $tenant);
    }

    /**
     * Get category/item specific override rate
     */
    protected function getOverrideRate(Tenant $tenant, ?int $categoryId, ?int $itemId): ?float
    {
        // Check platform DB for override rules
        $query = DB::connection('platform')
            ->table('revenue_share_rules')
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true);

        // Item-level override takes priority
        if ($itemId) {
            $itemRule = (clone $query)
                ->where('item_id', $itemId)
                ->first();
            if ($itemRule) {
                return $itemRule->rate;
            }
        }

        // Category-level override
        if ($categoryId) {
            $categoryRule = (clone $query)
                ->where('category_id', $categoryId)
                ->whereNull('item_id')
                ->first();
            if ($categoryRule) {
                return $categoryRule->rate;
            }
        }

        return null;
    }

    /**
     * Calculate consultant share if applicable
     */
    protected function calculateConsultantShare(float $amount, Tenant $tenant): float
    {
        // This would check if a consultant is involved in the transaction
        // For now, return 0 - actual implementation would check transaction metadata
        return 0.0;
    }

    /**
     * Get tiered rates for tenant
     */
    protected function getTenantTiers(Tenant $tenant): array
    {
        // Default tiers if none configured
        return $tenant->metadata['revenue_tiers'] ?? [
            ['min' => 0, 'max' => 500000, 'rate' => 7],
            ['min' => 500000, 'max' => 2000000, 'rate' => 5],
            ['min' => 2000000, 'max' => 5000000, 'rate' => 4],
            ['min' => 5000000, 'max' => PHP_INT_MAX, 'rate' => 3],
        ];
    }

    /**
     * Get applicable tier rate based on amount
     */
    protected function getTierRate(float $total, array $tiers): float
    {
        foreach ($tiers as $tier) {
            if ($total >= $tier['min'] && $total < $tier['max']) {
                return $tier['rate'];
            }
        }
        return 5.0; // Default
    }

    /**
     * Get current month's total revenue for tenant
     */
    protected function getCurrentMonthRevenue(Tenant $tenant): float
    {
        try {
            return DB::connection('platform')
                ->table('revenue_transactions')
                ->where('tenant_id', $tenant->id)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('gross_amount') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get platform fees collected this month
     */
    protected function getPlatformFeeCollectedThisMonth(Tenant $tenant): float
    {
        try {
            return DB::connection('platform')
                ->table('revenue_transactions')
                ->where('tenant_id', $tenant->id)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('platform_fee') ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Record revenue transaction in platform database
     */
    public function recordTransaction(Tenant $tenant, array $split, array $metadata = []): int
    {
        return DB::connection('platform')
            ->table('revenue_transactions')
            ->insertGetId([
                'tenant_id' => $tenant->id,
                'gross_amount' => $split['gross_amount'],
                'platform_fee' => $split['platform_fee'],
                'consultant_share' => $split['consultant_share'] ?? 0,
                'net_tenant_amount' => $split['net_tenant_amount'],
                'share_model' => $split['share_model'],
                'transaction_type' => $metadata['type'] ?? 'general',
                'source_type' => $metadata['source_type'] ?? null,
                'source_id' => $metadata['source_id'] ?? null,
                'category_id' => $metadata['category_id'] ?? null,
                'item_id' => $metadata['item_id'] ?? null,
                'metadata' => json_encode($metadata),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
    }

    /**
     * Get revenue statistics for platform dashboard
     */
    public function getPlatformStats(array $filters = []): array
    {
        $query = DB::connection('platform')
            ->table('revenue_transactions');

        if (isset($filters['tenant_id'])) {
            $query->where('tenant_id', $filters['tenant_id']);
        }

        if (isset($filters['start_date'])) {
            $query->where('created_at', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->where('created_at', '<=', $filters['end_date']);
        }

        $stats = $query->selectRaw('
            COUNT(*) as total_transactions,
            SUM(gross_amount) as total_gross,
            SUM(platform_fee) as total_platform_fee,
            SUM(consultant_share) as total_consultant_share,
            SUM(net_tenant_amount) as total_net_tenant
        ')->first();

        // Get breakdown by tenant
        $byTenant = DB::connection('platform')
            ->table('revenue_transactions')
            ->join('tenants', 'revenue_transactions.tenant_id', '=', 'tenants.id')
            ->selectRaw('
                tenants.id,
                tenants.name,
                tenants.slug,
                COUNT(*) as transactions,
                SUM(gross_amount) as gross,
                SUM(platform_fee) as platform_fee,
                SUM(net_tenant_amount) as net_tenant
            ')
            ->groupBy('tenants.id', 'tenants.name', 'tenants.slug')
            ->orderByDesc('gross')
            ->limit(10)
            ->get();

        return [
            'summary' => [
                'total_transactions' => $stats->total_transactions ?? 0,
                'total_gross_revenue' => round($stats->total_gross ?? 0, 2),
                'total_platform_revenue' => round($stats->total_platform_fee ?? 0, 2),
                'total_consultant_share' => round($stats->total_consultant_share ?? 0, 2),
                'total_tenant_net' => round($stats->total_net_tenant ?? 0, 2),
            ],
            'by_tenant' => $byTenant,
        ];
    }

    /**
     * Calculate projected revenue for a tenant
     */
    public function calculateProjectedRevenue(Tenant $tenant, array $params): array
    {
        $projectedGross = $params['expected_collection'] ?? 0;
        $split = $this->calculateSplit($projectedGross, $tenant);

        return [
            'projected_gross' => $split['gross_amount'],
            'projected_platform_fee' => $split['platform_fee'],
            'projected_consultant_share' => $split['consultant_share'],
            'projected_net_tenant' => $split['net_tenant_amount'],
            'share_model' => $split['share_model'],
            'share_rate' => $split['platform_rate'] ?? null,
        ];
    }
}

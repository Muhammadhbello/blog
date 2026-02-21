<?php

namespace App\Services;

use App\Models\Tenant;

class RevenueShareService
{
    public function calculateSplit(float $amount, Tenant $tenant): array
    {
        $platformFee = 0.00;
        $netLgaAmount = $amount;

        if ($tenant->revenue_share_model === 'percentage') {
            $platformFee = ($amount * $tenant->share_value) / 100;
            $netLgaAmount = $amount - $platformFee;
        } elseif ($tenant->revenue_share_model === 'fixed') {
            $platformFee = $tenant->share_value;
            $netLgaAmount = $amount - $platformFee;
        }

        return [
            'amount_gross' => round($amount, 2),
            'platform_fee' => round($platformFee, 2),
            'net_lga_amount' => round($netLgaAmount, 2),
        ];
    }

    public function calculateProjectedRevenue(Tenant $tenant, array $params): array
    {
        $projectedGross = $params['expected_collection'] ?? 0;
        $split = $this->calculateSplit($projectedGross, $tenant);

        return [
            'projected_gross' => $split['amount_gross'],
            'projected_platform_fee' => $split['platform_fee'],
            'projected_net_lga' => $split['net_lga_amount'],
            'share_model' => $tenant->revenue_share_model,
            'share_value' => $tenant->share_value,
        ];
    }
}

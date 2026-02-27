<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TenantDatabaseService;

/**
 * CheckTenantMaintenance Middleware
 * 
 * Returns 503 Service Unavailable for tenants in maintenance mode.
 * Other tenants and platform remain unaffected.
 */
class CheckTenantMaintenance
{
    public function handle(Request $request, Closure $next)
    {
        // Get current tenant from resolved context
        $tenant = app('current_tenant') ?? null;

        if (!$tenant) {
            return $next($request);
        }

        // Check if tenant is in maintenance mode
        if ($tenant->is_in_maintenance) {
            return response()->json([
                'error' => 'service_unavailable',
                'message' => 'This service is temporarily unavailable due to maintenance.',
                'reason' => $tenant->maintenance_reason ?? 'Scheduled maintenance',
                'maintenance_started_at' => $tenant->maintenance_started_at,
                'estimated_completion' => null, // Could be enhanced
                'retry_after' => 300, // Suggest retry in 5 minutes
            ], 503, [
                'Retry-After' => 300,
            ]);
        }

        return $next($request);
    }
}

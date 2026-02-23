<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Platform\Tenant;
use App\Services\TenantDatabaseService;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    protected TenantDatabaseService $tenantService;

    public function __construct(TenantDatabaseService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveTenant($request);

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found or inactive',
            ], 404);
        }

        if ($tenant->status !== 'active') {
            return response()->json([
                'message' => 'Tenant account is ' . $tenant->status,
            ], 403);
        }

        // Switch to tenant database
        $this->tenantService->switchToTenant($tenant);

        return $next($request);
    }

    protected function resolveTenant(Request $request): ?Tenant
    {
        // Method 1: From subdomain
        $host = $request->getHost();
        $subdomain = explode('.', $host)[0];
        
        if ($subdomain && $subdomain !== 'www' && $subdomain !== 'flexcloud') {
            $tenant = Tenant::where('subdomain', $subdomain)
                ->orWhere('slug', $subdomain)
                ->first();
            
            if ($tenant) return $tenant;
        }

        // Method 2: From route parameter
        if ($request->route('tenant')) {
            return Tenant::where('slug', $request->route('tenant'))
                ->orWhere('subdomain', $request->route('tenant'))
                ->first();
        }

        // Method 3: From header
        if ($request->hasHeader('X-Tenant-ID')) {
            return Tenant::find($request->header('X-Tenant-ID'));
        }

        // Method 4: From authenticated user's tenant (for API calls)
        $user = $request->user();
        if ($user && $user->tenant_id) {
            return Tenant::find($user->tenant_id);
        }

        return null;
    }
}

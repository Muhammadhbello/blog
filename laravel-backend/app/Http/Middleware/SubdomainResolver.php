<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Platform\Tenant;
use App\Services\TenantDatabaseService;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enterprise Subdomain Tenant Resolution Middleware
 * 
 * Resolution Priority:
 * 1. Subdomain extraction (production): {tenant}.flexcloud.com
 * 2. X-Tenant-ID header (API/testing)
 * 3. Route parameter (legacy support)
 * 
 * Security: Validates tenant status, enforces DB isolation
 */
class SubdomainResolver
{
    protected TenantDatabaseService $tenantService;
    
    // Reserved subdomains that should never be treated as tenants
    protected array $reservedSubdomains = [
        'www', 'api', 'admin', 'platform', 'app', 'dashboard',
        'mail', 'smtp', 'ftp', 'cdn', 'assets', 'static',
        'staging', 'dev', 'test', 'demo', 'sandbox',
        'flexcloud', 'localhost', 'preview'
    ];

    public function __construct(TenantDatabaseService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        
        $tenant = $this->resolveTenant($request);

        if (!$tenant) {
            Log::warning('Tenant resolution failed', [
                'host' => $request->getHost(),
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Tenant not found. Please check your subdomain or contact support.',
                'error_code' => 'TENANT_NOT_FOUND',
            ], 404);
        }

        // Validate tenant status
        $statusCheck = $this->validateTenantStatus($tenant);
        if ($statusCheck !== true) {
            return $statusCheck;
        }

        // Switch to tenant database connection
        try {
            $this->tenantService->switchToTenant($tenant);
        } catch (\Exception $e) {
            Log::error('Failed to switch tenant database', [
                'tenant_id' => $tenant->id,
                'db_name' => $tenant->db_name,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Service temporarily unavailable. Please try again.',
                'error_code' => 'DB_SWITCH_FAILED',
            ], 503);
        }

        // Store tenant in request for downstream use
        $request->attributes->set('tenant', $tenant);
        $request->attributes->set('tenant_id', $tenant->id);
        
        // Add tenant info to response headers (for debugging)
        $response = $next($request);
        
        if ($response instanceof \Illuminate\Http\JsonResponse || $response instanceof \Illuminate\Http\Response) {
            $response->headers->set('X-Tenant-ID', $tenant->id);
            $response->headers->set('X-Tenant-Slug', $tenant->slug);
            $response->headers->set('X-Response-Time', round((microtime(true) - $startTime) * 1000, 2) . 'ms');
        }

        return $response;
    }

    protected function resolveTenant(Request $request): ?Tenant
    {
        // Method 1: Subdomain extraction (Primary for production)
        $tenant = $this->resolveFromSubdomain($request);
        if ($tenant) {
            return $tenant;
        }

        // Method 2: X-Tenant-ID header (For API clients and testing)
        $tenant = $this->resolveFromHeader($request);
        if ($tenant) {
            return $tenant;
        }

        // Method 3: Route parameter (Legacy/fallback)
        $tenant = $this->resolveFromRoute($request);
        if ($tenant) {
            return $tenant;
        }

        // Method 4: From authenticated user context
        $tenant = $this->resolveFromUser($request);
        if ($tenant) {
            return $tenant;
        }

        return null;
    }

    protected function resolveFromSubdomain(Request $request): ?Tenant
    {
        $host = $request->getHost();
        $parts = explode('.', $host);
        
        // Method 0: Check for custom domain first (full host match)
        $customDomainTenant = $this->resolveFromCustomDomain($host);
        if ($customDomainTenant) {
            return $customDomainTenant;
        }
        
        // Need at least 2 parts for subdomain (e.g., tenant.flexcloud.test)
        if (count($parts) < 2) {
            return null;
        }

        $subdomain = strtolower($parts[0]);

        // Skip reserved subdomains
        if (in_array($subdomain, $this->reservedSubdomains)) {
            return null;
        }

        // Skip if it looks like an IP address
        if (filter_var($subdomain, FILTER_VALIDATE_IP)) {
            return null;
        }

        return Tenant::where('subdomain', $subdomain)
            ->orWhere('slug', $subdomain)
            ->first();
    }

    /**
     * Resolve tenant from custom domain
     */
    protected function resolveFromCustomDomain(string $host): ?Tenant
    {
        // Remove www. prefix if present
        $host = preg_replace('/^www\./', '', strtolower($host));
        
        // Look for tenant with verified custom domain
        return Tenant::where('custom_domain', $host)
            ->where('custom_domain_verified', true)
            ->first();
    }

    protected function resolveFromHeader(Request $request): ?Tenant
    {
        // Support multiple header formats
        $tenantIdentifier = $request->header('X-Tenant-ID') 
            ?? $request->header('X-Tenant-Slug')
            ?? $request->header('Tenant-ID');

        if (!$tenantIdentifier) {
            return null;
        }

        // Try by ID first, then by slug
        if (is_numeric($tenantIdentifier)) {
            return Tenant::find($tenantIdentifier);
        }

        return Tenant::where('slug', $tenantIdentifier)
            ->orWhere('subdomain', $tenantIdentifier)
            ->first();
    }

    protected function resolveFromRoute(Request $request): ?Tenant
    {
        $tenantParam = $request->route('tenant');
        
        if (!$tenantParam) {
            return null;
        }

        return Tenant::where('slug', $tenantParam)
            ->orWhere('subdomain', $tenantParam)
            ->first();
    }

    protected function resolveFromUser(Request $request): ?Tenant
    {
        $user = $request->user();
        
        if (!$user || !isset($user->tenant_id)) {
            return null;
        }

        return Tenant::find($user->tenant_id);
    }

    protected function validateTenantStatus(Tenant $tenant): Response|bool
    {
        switch ($tenant->status) {
            case 'active':
                return true;

            case 'suspended':
                Log::info('Access attempt to suspended tenant', [
                    'tenant_id' => $tenant->id,
                    'slug' => $tenant->slug,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'This account has been suspended. Please contact support.',
                    'error_code' => 'TENANT_SUSPENDED',
                    'support_email' => config('flexcloud.support_email', 'support@flexcloud.ng'),
                ], 403);

            case 'pending':
                return response()->json([
                    'success' => false,
                    'message' => 'Account setup is pending. Please complete the onboarding process.',
                    'error_code' => 'TENANT_PENDING',
                ], 403);

            case 'expired':
                return response()->json([
                    'success' => false,
                    'message' => 'Your subscription has expired. Please renew to continue.',
                    'error_code' => 'TENANT_EXPIRED',
                ], 402);

            case 'deleted':
            case 'inactive':
                return response()->json([
                    'success' => false,
                    'message' => 'This account is no longer active.',
                    'error_code' => 'TENANT_INACTIVE',
                ], 410);

            default:
                return response()->json([
                    'success' => false,
                    'message' => 'Account status unknown. Please contact support.',
                    'error_code' => 'TENANT_STATUS_UNKNOWN',
                ], 500);
        }
    }
}

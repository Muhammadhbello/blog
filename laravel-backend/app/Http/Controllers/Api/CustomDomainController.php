<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CustomDomainService;
use App\Models\Tenant;

class CustomDomainController extends Controller
{
    protected CustomDomainService $domainService;

    public function __construct(CustomDomainService $domainService)
    {
        $this->domainService = $domainService;
    }

    /**
     * Get domain status for a tenant
     */
    public function getStatus(string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $status = $this->domainService->getDomainStatus($tenant);

        return response()->json($status);
    }

    /**
     * Set custom domain for a tenant
     */
    public function setDomain(Request $request, string $slug)
    {
        $validated = $request->validate([
            'domain' => 'required|string|max:255',
        ]);

        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $result = $this->domainService->setCustomDomain($tenant, $validated['domain']);

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }

    /**
     * Verify domain ownership
     */
    public function verifyDomain(string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $result = $this->domainService->verifyDomain($tenant);

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }

    /**
     * Remove custom domain
     */
    public function removeDomain(string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $result = $this->domainService->removeDomain($tenant);

        return response()->json($result);
    }

    /**
     * Enable SSL for verified domain
     */
    public function enableSsl(string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $result = $this->domainService->enableSsl($tenant);

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }

    /**
     * Get all tenants with custom domains
     */
    public function getAllCustomDomains()
    {
        $tenants = $this->domainService->getTenantsWithCustomDomains();

        return response()->json([
            'tenants' => $tenants,
        ]);
    }

    /**
     * Check and renew expiring SSL certificates
     */
    public function checkSslCertificates()
    {
        $result = $this->domainService->checkExpiringCertificates();

        return response()->json($result);
    }
}

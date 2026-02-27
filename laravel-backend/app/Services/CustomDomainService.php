<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Tenant;

/**
 * CustomDomainService - Handles custom domain management for tenants
 */
class CustomDomainService
{
    /**
     * Set custom domain for a tenant
     */
    public function setCustomDomain(Tenant $tenant, string $domain): array
    {
        // Normalize domain (remove protocol, trailing slash)
        $domain = $this->normalizeDomain($domain);

        // Validate domain format
        if (!$this->isValidDomain($domain)) {
            return [
                'success' => false,
                'message' => 'Invalid domain format',
            ];
        }

        // Check if domain is already in use
        $existing = Tenant::where('custom_domain', $domain)
            ->where('id', '!=', $tenant->id)
            ->exists();

        if ($existing) {
            return [
                'success' => false,
                'message' => 'Domain is already in use by another tenant',
            ];
        }

        // Generate verification token
        $verificationToken = 'flexcloud-verify-' . Str::random(32);

        $tenant->update([
            'custom_domain' => $domain,
            'custom_domain_verified' => false,
            'custom_domain_verification_token' => $verificationToken,
            'custom_domain_verified_at' => null,
            'ssl_enabled' => false,
        ]);

        return [
            'success' => true,
            'domain' => $domain,
            'verification_token' => $verificationToken,
            'verification_methods' => $this->getVerificationInstructions($domain, $verificationToken),
        ];
    }

    /**
     * Verify custom domain ownership
     */
    public function verifyDomain(Tenant $tenant): array
    {
        if (!$tenant->custom_domain) {
            return [
                'success' => false,
                'message' => 'No custom domain configured',
            ];
        }

        $verificationToken = $tenant->custom_domain_verification_token;
        $domain = $tenant->custom_domain;

        // Method 1: DNS TXT Record verification
        $txtVerified = $this->verifyDnsTxt($domain, $verificationToken);

        // Method 2: CNAME verification
        $cnameVerified = $this->verifyCname($domain);

        if ($txtVerified || $cnameVerified) {
            $tenant->update([
                'custom_domain_verified' => true,
                'custom_domain_verified_at' => now(),
            ]);

            $this->logAudit('custom_domain_verified', $tenant->slug, [
                'domain' => $domain,
                'method' => $txtVerified ? 'dns_txt' : 'cname',
            ]);

            return [
                'success' => true,
                'message' => 'Domain verified successfully',
                'verified_via' => $txtVerified ? 'DNS TXT Record' : 'CNAME Record',
            ];
        }

        return [
            'success' => false,
            'message' => 'Domain verification failed. Please check your DNS settings.',
            'dns_txt_found' => $txtVerified,
            'cname_found' => $cnameVerified,
        ];
    }

    /**
     * Remove custom domain
     */
    public function removeDomain(Tenant $tenant): array
    {
        $domain = $tenant->custom_domain;

        $tenant->update([
            'custom_domain' => null,
            'custom_domain_verified' => false,
            'custom_domain_verification_token' => null,
            'custom_domain_verified_at' => null,
            'ssl_enabled' => false,
            'ssl_expires_at' => null,
        ]);

        $this->logAudit('custom_domain_removed', $tenant->slug, [
            'domain' => $domain,
        ]);

        return [
            'success' => true,
            'message' => 'Custom domain removed successfully',
        ];
    }

    /**
     * Enable SSL for verified domain
     */
    public function enableSsl(Tenant $tenant): array
    {
        if (!$tenant->custom_domain || !$tenant->custom_domain_verified) {
            return [
                'success' => false,
                'message' => 'Domain must be configured and verified before enabling SSL',
            ];
        }

        // In production, this would trigger SSL certificate provisioning
        // via Let's Encrypt or similar service
        
        $tenant->update([
            'ssl_enabled' => true,
            'ssl_expires_at' => now()->addMonths(3), // Standard 90-day cert
        ]);

        return [
            'success' => true,
            'message' => 'SSL certificate provisioned successfully',
            'expires_at' => $tenant->ssl_expires_at,
        ];
    }

    /**
     * Get domain configuration status
     */
    public function getDomainStatus(Tenant $tenant): array
    {
        return [
            'has_custom_domain' => !empty($tenant->custom_domain),
            'custom_domain' => $tenant->custom_domain,
            'is_verified' => $tenant->custom_domain_verified,
            'verified_at' => $tenant->custom_domain_verified_at,
            'verification_token' => $tenant->custom_domain_verification_token,
            'ssl_enabled' => $tenant->ssl_enabled,
            'ssl_expires_at' => $tenant->ssl_expires_at,
            'ssl_expires_in_days' => $tenant->ssl_expires_at 
                ? now()->diffInDays($tenant->ssl_expires_at, false)
                : null,
            'default_subdomain' => "{$tenant->subdomain}.flexcloud.ng",
            'urls' => [
                'subdomain' => "https://{$tenant->subdomain}.flexcloud.ng",
                'custom' => $tenant->custom_domain 
                    ? ($tenant->ssl_enabled ? "https://" : "http://") . $tenant->custom_domain
                    : null,
            ],
        ];
    }

    /**
     * Get all tenants with custom domains
     */
    public function getTenantsWithCustomDomains(): array
    {
        return Tenant::whereNotNull('custom_domain')
            ->select([
                'id', 'name', 'slug', 'subdomain', 'custom_domain',
                'custom_domain_verified', 'ssl_enabled', 'ssl_expires_at'
            ])
            ->get()
            ->toArray();
    }

    /**
     * Check and renew expiring SSL certificates
     */
    public function checkExpiringCertificates(): array
    {
        $expiringTenants = Tenant::where('ssl_enabled', true)
            ->whereNotNull('ssl_expires_at')
            ->where('ssl_expires_at', '<=', now()->addDays(14))
            ->get();

        $renewed = [];
        foreach ($expiringTenants as $tenant) {
            // In production, trigger cert renewal
            $tenant->update([
                'ssl_expires_at' => now()->addMonths(3),
            ]);
            $renewed[] = $tenant->slug;
        }

        return [
            'checked' => $expiringTenants->count(),
            'renewed' => $renewed,
        ];
    }

    // ===========================================
    // PRIVATE HELPER METHODS
    // ===========================================

    private function normalizeDomain(string $domain): string
    {
        // Remove protocol
        $domain = preg_replace('/^https?:\/\//', '', $domain);
        // Remove trailing slash
        $domain = rtrim($domain, '/');
        // Remove www. prefix
        $domain = preg_replace('/^www\./', '', $domain);
        // Lowercase
        return strtolower($domain);
    }

    private function isValidDomain(string $domain): bool
    {
        // Basic domain validation
        $pattern = '/^(?!-)([a-z0-9-]+\.)+[a-z]{2,}$/i';
        
        if (!preg_match($pattern, $domain)) {
            return false;
        }

        // Ensure it's not a FlexCloud subdomain
        if (str_ends_with($domain, '.flexcloud.ng') || str_ends_with($domain, '.flexcloud.com')) {
            return false;
        }

        return true;
    }

    private function verifyDnsTxt(string $domain, string $expectedToken): bool
    {
        try {
            $records = dns_get_record("_flexcloud.{$domain}", DNS_TXT);
            
            foreach ($records as $record) {
                if (isset($record['txt']) && $record['txt'] === $expectedToken) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // DNS lookup failed
        }

        return false;
    }

    private function verifyCname(string $domain): bool
    {
        try {
            $records = dns_get_record($domain, DNS_CNAME);
            
            foreach ($records as $record) {
                if (isset($record['target']) && 
                    str_ends_with($record['target'], '.flexcloud.ng')) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // DNS lookup failed
        }

        return false;
    }

    private function getVerificationInstructions(string $domain, string $token): array
    {
        return [
            'dns_txt' => [
                'type' => 'TXT',
                'host' => "_flexcloud.{$domain}",
                'value' => $token,
                'instructions' => "Add a TXT record to your DNS with hostname '_flexcloud' and value '{$token}'",
            ],
            'cname' => [
                'type' => 'CNAME',
                'host' => $domain,
                'value' => 'custom.flexcloud.ng',
                'instructions' => "Add a CNAME record pointing your domain to 'custom.flexcloud.ng'",
            ],
        ];
    }

    private function logAudit(string $action, string $tenantSlug, array $details): void
    {
        DB::connection('platform')->table('platform_audit_logs')->insert([
            'user_id' => auth()->id(),
            'action' => $action,
            'entity_type' => 'domain',
            'entity_id' => $tenantSlug,
            'details' => json_encode($details),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $connection = 'platform';

    protected $fillable = [
        'name',
        'slug',
        'subdomain',
        'db_name',
        'domain',
        'logo_url',
        'brand_color',
        'contact_email',
        'contact_phone',
        'address',
        'state',
        'lga_code',
        'revenue_share_model',
        'share_value',
        'status',
        'settings',
        // Custom Domain fields
        'custom_domain',
        'custom_domain_verified',
        'custom_domain_verification_token',
        'custom_domain_verified_at',
        'ssl_enabled',
        'ssl_expires_at',
        // Backup & Maintenance fields
        'is_in_maintenance',
        'maintenance_reason',
        'maintenance_started_at',
        'last_backup_at',
        'last_backup_status',
        'last_backup_size',
        'backup_retention_days',
    ];

    protected $casts = [
        'share_value' => 'decimal:2',
        'settings' => 'array',
        'custom_domain_verified' => 'boolean',
        'custom_domain_verified_at' => 'datetime',
        'ssl_enabled' => 'boolean',
        'ssl_expires_at' => 'datetime',
        'is_in_maintenance' => 'boolean',
        'maintenance_started_at' => 'datetime',
        'last_backup_at' => 'datetime',
        'backup_retention_days' => 'integer',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function revenueCategories(): HasMany
    {
        return $this->hasMany(RevenueCategory::class);
    }

    public function businesses(): HasMany
    {
        return $this->hasMany(Business::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(TenantSetting::class);
    }

    public function backupRecords(): HasMany
    {
        return $this->hasMany(BackupRecord::class, 'tenant_slug', 'slug');
    }

    public function getFullDomainAttribute(): string
    {
        if ($this->custom_domain && $this->custom_domain_verified) {
            return $this->custom_domain;
        }
        return $this->subdomain ? "{$this->subdomain}.flexcloud.ng" : $this->slug . ".flexcloud.ng";
    }

    public function getPrimaryUrlAttribute(): string
    {
        if ($this->custom_domain && $this->custom_domain_verified) {
            $protocol = $this->ssl_enabled ? 'https' : 'http';
            return "{$protocol}://{$this->custom_domain}";
        }
        return "https://{$this->subdomain}.flexcloud.ng";
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    public function scopeInMaintenance($query)
    {
        return $query->where('is_in_maintenance', true);
    }

    public function scopeWithCustomDomain($query)
    {
        return $query->whereNotNull('custom_domain');
    }
}

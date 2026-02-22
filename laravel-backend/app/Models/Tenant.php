<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'subdomain',
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
    ];

    protected $casts = [
        'share_value' => 'decimal:2',
        'settings' => 'array',
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

    public function getFullDomainAttribute(): string
    {
        return $this->subdomain ? "{$this->subdomain}.flexcloud.ng" : $this->slug . ".flexcloud.ng";
    }
}

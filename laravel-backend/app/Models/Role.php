<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'description',
        'permissions',
        'is_system',
    ];

    protected $casts = [
        'permissions' => 'array',
        'is_system' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function hasPermission(string $permission): bool
    {
        if (!$this->permissions) {
            return false;
        }
        return in_array($permission, $this->permissions) || in_array('*', $this->permissions);
    }

    public static function getDefaultPermissions(): array
    {
        return [
            'dashboard.view',
            'wards.view', 'wards.create', 'wards.edit', 'wards.delete',
            'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
            'revenue_items.view', 'revenue_items.create', 'revenue_items.edit', 'revenue_items.delete',
            'businesses.view', 'businesses.create', 'businesses.edit', 'businesses.delete',
            'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
            'tickets.view', 'tickets.create', 'tickets.sell', 'tickets.verify',
            'defaulters.view', 'defaulters.remind',
            'consultants.view', 'consultants.assign',
            'collectors.view', 'collectors.assign',
            'analytics.view',
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
            'settings.view', 'settings.edit',
            'audit_logs.view',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'tenant_id',
        'department_id',
        'name',
        'email',
        'password',
        'role',
        'phone',
        'avatar_url',
        'assigned_wards',
        'assigned_revenue_points',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'assigned_wards' => 'array',
        'assigned_revenue_points' => 'array',
        'last_login_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function collectorAssignments(): HasMany
    {
        return $this->hasMany(CollectorAssignment::class, 'collector_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function hasPermission(string $permission): bool
    {
        // Super admin has all permissions
        if ($this->role === 'super_admin') {
            return true;
        }

        // Chairman has all tenant permissions
        if ($this->role === 'chairman') {
            return true;
        }

        // Check role-based permissions
        foreach ($this->roles as $role) {
            if ($role->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isCollector(): bool
    {
        return $this->role === 'collector';
    }

    public function canAccessWard(int $wardId): bool
    {
        if ($this->role === 'chairman' || $this->role === 'treasurer') {
            return true;
        }

        if ($this->assigned_wards && in_array($wardId, $this->assigned_wards)) {
            return true;
        }

        return false;
    }

    public function canAccessRevenuePoint(int $revenuePointId): bool
    {
        if ($this->role === 'chairman' || $this->role === 'treasurer') {
            return true;
        }

        if ($this->assigned_revenue_points && in_array($revenuePointId, $this->assigned_revenue_points)) {
            return true;
        }

        return false;
    }
}

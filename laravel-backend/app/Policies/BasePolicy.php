<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * Base Policy for Tenant Resources
 * 
 * Roles hierarchy:
 * - lga_admin/chairman: Full access
 * - treasurer: Finance operations
 * - hod: Department-scoped
 * - consultant_admin: Consultant management
 * - consultant: Own data only
 * - collector: Field operations
 * - auditor_finance: Read-only
 * - business_user: Own business only
 */
abstract class BasePolicy
{
    use HandlesAuthorization;

    /**
     * Super roles that bypass all checks
     */
    protected array $superRoles = ['lga_admin', 'chairman'];

    /**
     * Check if user has super role
     */
    protected function isSuperRole(User $user): bool
    {
        return in_array($user->role, $this->superRoles);
    }

    /**
     * Check if user has any of the given roles
     */
    protected function hasRole(User $user, array $roles): bool
    {
        return in_array($user->role, $roles);
    }

    /**
     * Check if user belongs to same department
     */
    protected function isSameDepartment(User $user, $resource): bool
    {
        if (!isset($resource->department_id) || !isset($user->department_id)) {
            return true; // No department restriction
        }
        return $user->department_id === $resource->department_id;
    }

    /**
     * Check if user belongs to same ward
     */
    protected function isSameWard(User $user, $resource): bool
    {
        if (!isset($resource->ward_id) || !isset($user->ward_id)) {
            return true;
        }
        return $user->ward_id === $resource->ward_id;
    }

    /**
     * Before hook - super roles bypass all checks
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($this->isSuperRole($user)) {
            return true;
        }
        return null;
    }
}

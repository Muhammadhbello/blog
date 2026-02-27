<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, ['treasurer', 'hod', 'consultant_admin']);
    }

    public function view(User $user, User $model): bool
    {
        // Users can view themselves
        if ($user->id === $model->id) {
            return true;
        }

        // HOD can only view users in their department
        if ($user->role === 'hod') {
            return $this->isSameDepartment($user, $model);
        }

        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    public function create(User $user): bool
    {
        return $this->hasRole($user, ['treasurer']);
    }

    public function update(User $user, User $model): bool
    {
        // Users can update themselves
        if ($user->id === $model->id) {
            return true;
        }

        // Cannot edit super roles unless you are one
        if (in_array($model->role, $this->superRoles)) {
            return false;
        }

        return $this->hasRole($user, ['treasurer']);
    }

    public function delete(User $user, User $model): bool
    {
        // Cannot delete self
        if ($user->id === $model->id) {
            return false;
        }

        // Cannot delete super roles
        if (in_array($model->role, $this->superRoles)) {
            return false;
        }

        return $this->hasRole($user, ['treasurer']);
    }

    public function assignRole(User $user, User $model): bool
    {
        return $this->hasRole($user, ['treasurer']);
    }

    public function impersonate(User $user, User $model): bool
    {
        // Only platform admins can impersonate (handled separately)
        return false;
    }
}

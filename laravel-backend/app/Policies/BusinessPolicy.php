<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Business;

class BusinessPolicy extends BasePolicy
{
    /**
     * View any businesses
     */
    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'consultant', 
            'collector', 'auditor_finance'
        ]);
    }

    /**
     * View a specific business
     */
    public function view(User $user, Business $business): bool
    {
        // Business users can only view their own
        if ($user->role === 'business_user') {
            return $user->business_id === $business->id;
        }

        // HOD can only view businesses in their department
        if ($user->role === 'hod') {
            return $this->isSameDepartment($user, $business);
        }

        // Consultants can view assigned businesses
        if ($user->role === 'consultant') {
            return $this->isAssignedToBusiness($user, $business);
        }

        return $this->hasRole($user, [
            'treasurer', 'consultant_admin', 'collector', 'auditor_finance'
        ]);
    }

    /**
     * Create a business
     */
    public function create(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'collector'
        ]);
    }

    /**
     * Update a business
     */
    public function update(User $user, Business $business): bool
    {
        // Business users can update their own profile
        if ($user->role === 'business_user') {
            return $user->business_id === $business->id;
        }

        // HOD can only update businesses in their department
        if ($user->role === 'hod') {
            return $this->isSameDepartment($user, $business);
        }

        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    /**
     * Delete a business
     */
    public function delete(User $user, Business $business): bool
    {
        return $this->hasRole($user, ['treasurer']);
    }

    /**
     * Generate invoice for business
     */
    public function generateInvoice(User $user, Business $business): bool
    {
        if ($user->role === 'hod') {
            return $this->isSameDepartment($user, $business);
        }

        return $this->hasRole($user, ['treasurer', 'consultant_admin', 'collector']);
    }

    /**
     * Check if consultant is assigned to business
     */
    protected function isAssignedToBusiness(User $user, Business $business): bool
    {
        // Check consultant assignments
        return \DB::connection('tenant')
            ->table('consultant_assignments')
            ->where('consultant_id', $user->id)
            ->where(function ($query) use ($business) {
                $query->where('business_id', $business->id)
                    ->orWhere('ward_id', $business->ward_id);
            })
            ->where('status', 'active')
            ->exists();
    }
}

<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Closing;

class ClosingPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'consultant',
            'collector', 'auditor_finance'
        ]);
    }

    public function view(User $user, Closing $closing): bool
    {
        if ($user->role === 'collector' || $user->role === 'consultant') {
            return $closing->collector_id === $user->id;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $this->hasRole($user, ['consultant', 'collector']);
    }

    public function submit(User $user, Closing $closing): bool
    {
        // Can only submit own closings
        if ($closing->collector_id !== $user->id) {
            return false;
        }

        // Must be draft
        if ($closing->status !== 'draft') {
            return false;
        }

        return true;
    }

    public function approve(User $user, Closing $closing): bool
    {
        // Cannot approve own closing
        if ($closing->collector_id === $user->id) {
            return false;
        }

        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    public function reject(User $user, Closing $closing): bool
    {
        return $this->approve($user, $closing);
    }

    public function viewVarianceReport(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'consultant_admin', 'auditor_finance'
        ]);
    }
}

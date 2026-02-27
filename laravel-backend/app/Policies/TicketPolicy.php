<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Ticket;

class TicketPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'consultant',
            'collector', 'auditor_finance'
        ]);
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->role === 'collector' || $user->role === 'consultant') {
            return $ticket->assigned_to === $user->id || $ticket->sold_by === $user->id;
        }

        return true;
    }

    public function create(User $user): bool
    {
        // Only admins can create ticket batches
        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    public function sell(User $user, Ticket $ticket): bool
    {
        // Must be assigned to user
        if ($ticket->assigned_to !== $user->id) {
            return false;
        }

        // Must be available
        if ($ticket->status !== 'available') {
            return false;
        }

        return $this->hasRole($user, ['consultant', 'collector']);
    }

    public function verify(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'auditor_finance'
        ]);
    }

    public function assignBatch(User $user): bool
    {
        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    public function viewBatchReports(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'consultant_admin', 'auditor_finance'
        ]);
    }
}

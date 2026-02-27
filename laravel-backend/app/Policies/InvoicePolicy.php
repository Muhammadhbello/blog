<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Invoice;

class InvoicePolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'consultant',
            'collector', 'auditor_finance', 'business_user'
        ]);
    }

    public function view(User $user, Invoice $invoice): bool
    {
        if ($user->role === 'business_user') {
            return $user->business_id === $invoice->business_id;
        }

        if ($user->role === 'hod') {
            return $this->isSameDepartment($user, $invoice);
        }

        if ($user->role === 'consultant') {
            return $invoice->created_by === $user->id;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'hod', 'consultant_admin', 'consultant', 'collector'
        ]);
    }

    public function update(User $user, Invoice $invoice): bool
    {
        // Cannot update paid invoices
        if ($invoice->status === 'paid') {
            return false;
        }

        if ($user->role === 'hod') {
            return $this->isSameDepartment($user, $invoice);
        }

        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        // Only draft invoices can be deleted
        if ($invoice->status !== 'draft') {
            return false;
        }

        return $this->hasRole($user, ['treasurer']);
    }

    public function recordPayment(User $user, Invoice $invoice): bool
    {
        return $this->hasRole($user, [
            'treasurer', 'consultant_admin', 'consultant', 'collector'
        ]);
    }

    public function bulkGenerate(User $user): bool
    {
        return $this->hasRole($user, ['treasurer', 'consultant_admin']);
    }

    public function export(User $user): bool
    {
        return $this->hasRole($user, ['treasurer', 'auditor_finance']);
    }
}

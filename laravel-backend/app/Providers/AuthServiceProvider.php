<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Business;
use App\Models\Invoice;
use App\Models\Ticket;
use App\Models\Closing;
use App\Models\User;
use App\Policies\BusinessPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\TicketPolicy;
use App\Policies\ClosingPolicy;
use App\Policies\UserPolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     */
    protected $policies = [
        Business::class => BusinessPolicy::class,
        Invoice::class => InvoicePolicy::class,
        Ticket::class => TicketPolicy::class,
        Closing::class => ClosingPolicy::class,
        User::class => UserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Define Gates for common permissions
        $this->defineGates();
    }

    /**
     * Define application-level gates
     */
    protected function defineGates(): void
    {
        // Dashboard access levels
        Gate::define('view-dashboard', function ($user) {
            return true; // All authenticated users
        });

        Gate::define('view-analytics', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'auditor_finance'
            ]);
        });

        Gate::define('view-reports', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'hod', 'auditor_finance'
            ]);
        });

        Gate::define('export-data', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'auditor_finance'
            ]);
        });

        // Revenue management
        Gate::define('manage-revenue-items', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        Gate::define('manage-revenue-points', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'consultant_admin'
            ]);
        });

        Gate::define('manage-tariffs', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        // Organizational structure
        Gate::define('manage-wards', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        Gate::define('manage-departments', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        // Consultants & Collectors
        Gate::define('manage-consultants', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'consultant_admin'
            ]);
        });

        Gate::define('manage-collectors', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'consultant_admin'
            ]);
        });

        Gate::define('assign-collectors', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'consultant_admin'
            ]);
        });

        // Defaulters
        Gate::define('manage-defaulters', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'consultant_admin'
            ]);
        });

        Gate::define('send-reminders', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer', 'consultant_admin', 'collector'
            ]);
        });

        // Settings
        Gate::define('manage-settings', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        Gate::define('manage-payment-settings', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        Gate::define('manage-sms-settings', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        Gate::define('manage-email-settings', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        // Audit
        Gate::define('view-audit-logs', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'auditor_finance'
            ]);
        });

        // Admin
        Gate::define('manage-users', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman', 'treasurer'
            ]);
        });

        Gate::define('manage-roles', function ($user) {
            return in_array($user->role, [
                'lga_admin', 'chairman'
            ]);
        });

        // Offline Sync
        Gate::define('use-offline-sync', function ($user) {
            return in_array($user->role, [
                'consultant', 'collector'
            ]);
        });

        // Consultant Portal
        Gate::define('access-consultant-portal', function ($user) {
            return $user->role === 'consultant';
        });

        // Business Portal
        Gate::define('access-business-portal', function ($user) {
            return $user->role === 'business_user';
        });
    }
}

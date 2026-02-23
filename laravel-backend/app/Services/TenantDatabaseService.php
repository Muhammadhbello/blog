<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use App\Models\Platform\Tenant;

class TenantDatabaseService
{
    /**
     * Create a new tenant database and run migrations
     */
    public function createTenantDatabase(Tenant $tenant): bool
    {
        $dbName = $tenant->db_name;
        
        // Create the database
        DB::statement("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // Configure the tenant connection
        $this->configureTenantConnection($dbName);
        
        // Run tenant migrations
        $this->runTenantMigrations($dbName);
        
        // Seed default data
        $this->seedTenantDefaults($tenant);
        
        return true;
    }

    /**
     * Configure tenant database connection dynamically
     */
    public function configureTenantConnection(string $dbName): void
    {
        Config::set('database.connections.tenant', [
            'driver' => 'mysql',
            'host' => config('database.connections.mysql.host'),
            'port' => config('database.connections.mysql.port'),
            'database' => $dbName,
            'username' => config('database.connections.mysql.username'),
            'password' => config('database.connections.mysql.password'),
            'unix_socket' => config('database.connections.mysql.unix_socket'),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
        ]);

        DB::purge('tenant');
        DB::reconnect('tenant');
    }

    /**
     * Run tenant-specific migrations
     */
    public function runTenantMigrations(string $dbName): void
    {
        $this->configureTenantConnection($dbName);
        
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);
    }

    /**
     * Seed default data for a new tenant
     */
    public function seedTenantDefaults(Tenant $tenant): void
    {
        $this->configureTenantConnection($tenant->db_name);
        
        // Create default notification templates
        $templates = [
            [
                'name' => 'Invoice Issued',
                'slug' => 'invoice_issued',
                'type' => 'sms',
                'event' => 'invoice_issued',
                'sms_template' => 'Dear {{business_name}}, Invoice #{{invoice_no}} of {{amount}} has been issued. Due: {{due_date}}. Pay via {{payment_link}} - {{tenant_name}}',
            ],
            [
                'name' => 'Invoice Paid',
                'slug' => 'invoice_paid',
                'type' => 'sms',
                'event' => 'invoice_paid',
                'sms_template' => 'Payment of {{amount}} received for Invoice #{{invoice_no}}. Ref: {{reference}}. Thank you! - {{tenant_name}}',
            ],
            [
                'name' => 'Invoice Overdue Reminder',
                'slug' => 'invoice_overdue',
                'type' => 'sms',
                'event' => 'invoice_overdue',
                'sms_template' => 'REMINDER: Invoice #{{invoice_no}} of {{amount}} is overdue. Please pay now via {{payment_link}} - {{tenant_name}}',
            ],
            [
                'name' => 'Ticket Receipt',
                'slug' => 'ticket_receipt',
                'type' => 'sms',
                'event' => 'ticket_receipt',
                'sms_template' => 'Ticket #{{ticket_no}} issued. Amount: {{amount}}. Thank you for your payment! - {{tenant_name}}',
            ],
            [
                'name' => 'Payment Received',
                'slug' => 'payment_received',
                'type' => 'sms',
                'event' => 'payment_received',
                'sms_template' => 'Payment of {{amount}} received. Ref: {{reference}}. Thank you! - {{tenant_name}}',
            ],
        ];

        foreach ($templates as $template) {
            DB::connection('tenant')->table('notification_templates')->insert(array_merge($template, [
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // Create default tenant settings
        $settings = [
            ['key' => 'invoice_prefix', 'value' => 'INV', 'type' => 'string', 'group' => 'invoices'],
            ['key' => 'ticket_prefix', 'value' => 'TKT', 'type' => 'string', 'group' => 'tickets'],
            ['key' => 'fiscal_year_start', 'value' => '01', 'type' => 'string', 'group' => 'general'],
            ['key' => 'currency', 'value' => 'NGN', 'type' => 'string', 'group' => 'general'],
            ['key' => 'default_due_days', 'value' => '30', 'type' => 'integer', 'group' => 'invoices'],
            ['key' => 'allow_partial_payments', 'value' => 'true', 'type' => 'boolean', 'group' => 'payments'],
            ['key' => 'auto_send_invoice_sms', 'value' => 'true', 'type' => 'boolean', 'group' => 'notifications'],
        ];

        foreach ($settings as $setting) {
            DB::connection('tenant')->table('tenant_settings')->insert(array_merge($setting, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // Create default roles
        $roles = [
            [
                'name' => 'Chairman',
                'slug' => 'chairman',
                'description' => 'Full access to all tenant features',
                'permissions' => json_encode(['*']),
                'is_system' => true,
            ],
            [
                'name' => 'Treasurer',
                'slug' => 'treasurer',
                'description' => 'Financial management and reporting',
                'permissions' => json_encode([
                    'dashboard.view', 'analytics.view',
                    'invoices.*', 'payments.*', 'closings.*',
                    'businesses.view', 'defaulters.*',
                ]),
                'is_system' => true,
            ],
            [
                'name' => 'HOD',
                'slug' => 'hod',
                'description' => 'Department head with scoped access',
                'permissions' => json_encode([
                    'dashboard.view',
                    'businesses.view', 'businesses.create',
                    'invoices.view', 'invoices.create',
                    'collectors.manage', 'closings.view',
                ]),
                'is_system' => true,
            ],
            [
                'name' => 'Collector',
                'slug' => 'collector',
                'description' => 'Field collector with limited access',
                'permissions' => json_encode([
                    'dashboard.view',
                    'tickets.sell', 'tickets.verify',
                    'closings.submit',
                ]),
                'is_system' => true,
            ],
            [
                'name' => 'Agent Admin',
                'slug' => 'agent_admin',
                'description' => 'Can register businesses only',
                'permissions' => json_encode([
                    'dashboard.view',
                    'businesses.view_own', 'businesses.create',
                ]),
                'is_system' => true,
            ],
            [
                'name' => 'Auditor',
                'slug' => 'auditor',
                'description' => 'Read-only access for auditing',
                'permissions' => json_encode([
                    'dashboard.view', 'analytics.view',
                    'businesses.view', 'invoices.view',
                    'tickets.view', 'closings.view',
                    'audit_logs.view',
                ]),
                'is_system' => true,
            ],
        ];

        foreach ($roles as $role) {
            DB::connection('tenant')->table('tenant_roles')->insert(array_merge($role, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    /**
     * Delete tenant database
     */
    public function deleteTenantDatabase(string $dbName): bool
    {
        DB::statement("DROP DATABASE IF EXISTS `{$dbName}`");
        return true;
    }

    /**
     * Switch to tenant database for the current request
     */
    public function switchToTenant(Tenant $tenant): void
    {
        $this->configureTenantConnection($tenant->db_name);
        app()->instance('current_tenant', $tenant);
    }

    /**
     * Get current tenant from container
     */
    public function getCurrentTenant(): ?Tenant
    {
        return app()->bound('current_tenant') ? app('current_tenant') : null;
    }
}

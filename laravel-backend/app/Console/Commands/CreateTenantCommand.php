<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\TenantDatabaseService;
use App\Models\Platform\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Create a new tenant with automated database setup
 * 
 * Usage: php artisan tenant:create potiskum "Potiskum LGA" admin@potiskum.gov --subdomain=potiskum
 */
class CreateTenantCommand extends Command
{
    protected $signature = 'tenant:create 
                            {slug : Unique identifier for the tenant (e.g., potiskum)}
                            {name : Display name (e.g., "Potiskum LGA")}
                            {admin_email : Email for the initial admin user}
                            {--subdomain= : Subdomain (defaults to slug)}
                            {--admin_password= : Password for admin (auto-generated if not provided)}
                            {--admin_name= : Name of the admin user}
                            {--share_model=percentage : Revenue share model (percentage, tiered, flat, hybrid)}
                            {--share_value=5 : Share percentage or flat amount}
                            {--skip-seed : Skip running tenant seeders}
                            {--force : Force creation even if tenant exists}';

    protected $description = 'Create a new tenant with automated database provisioning, migration, and admin user setup';

    protected TenantDatabaseService $tenantService;

    public function __construct(TenantDatabaseService $tenantService)
    {
        parent::__construct();
        $this->tenantService = $tenantService;
    }

    public function handle(): int
    {
        $slug = Str::slug($this->argument('slug'));
        $name = $this->argument('name');
        $adminEmail = $this->argument('admin_email');
        $subdomain = $this->option('subdomain') ?: $slug;
        $adminPassword = $this->option('admin_password') ?: Str::random(12);
        $adminName = $this->option('admin_name') ?: 'LGA Administrator';
        $shareModel = $this->option('share_model');
        $shareValue = $this->option('share_value');

        $this->info("╔════════════════════════════════════════════════════════╗");
        $this->info("║       FlexCloud - Tenant Creation Wizard               ║");
        $this->info("╚════════════════════════════════════════════════════════╝");
        $this->newLine();

        // Validate inputs
        if (!$this->validateInputs($slug, $subdomain, $adminEmail)) {
            return Command::FAILURE;
        }

        // Check if tenant exists
        $existingTenant = Tenant::where('slug', $slug)
            ->orWhere('subdomain', $subdomain)
            ->first();

        if ($existingTenant && !$this->option('force')) {
            $this->error("❌ Tenant with slug '{$slug}' or subdomain '{$subdomain}' already exists.");
            $this->info("   Use --force to override (WARNING: This will delete existing data!)");
            return Command::FAILURE;
        }

        if ($existingTenant && $this->option('force')) {
            if (!$this->confirm("⚠️  This will DELETE the existing tenant and ALL its data. Continue?")) {
                return Command::FAILURE;
            }
            $this->deleteTenant($existingTenant);
        }

        $this->info("📋 Configuration:");
        $this->table(
            ['Property', 'Value'],
            [
                ['Slug', $slug],
                ['Name', $name],
                ['Subdomain', "{$subdomain}.flexcloud.ng"],
                ['Database', "{$slug}_tenant"],
                ['Admin Email', $adminEmail],
                ['Admin Password', $this->option('admin_password') ? '********' : $adminPassword . ' (auto-generated)'],
                ['Revenue Share', "{$shareModel}: {$shareValue}" . ($shareModel === 'percentage' ? '%' : '')],
            ]
        );

        if (!$this->confirm('Proceed with tenant creation?', true)) {
            return Command::FAILURE;
        }

        $this->newLine();
        $progressBar = $this->output->createProgressBar(6);
        $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %message%');

        try {
            // Step 1: Create tenant record
            $progressBar->setMessage('Creating tenant record...');
            $progressBar->start();
            
            $tenant = $this->createTenantRecord($slug, $name, $subdomain, $shareModel, $shareValue);
            $progressBar->advance();

            // Step 2: Create database
            $progressBar->setMessage('Creating database...');
            $dbName = "{$slug}_tenant";
            $this->createDatabase($dbName);
            $progressBar->advance();

            // Step 3: Update tenant with DB name
            $progressBar->setMessage('Configuring database...');
            $tenant->update(['db_name' => $dbName, 'status' => 'pending']);
            $progressBar->advance();

            // Step 4: Run migrations
            $progressBar->setMessage('Running migrations...');
            $this->runMigrations($dbName);
            $progressBar->advance();

            // Step 5: Seed data (if not skipped)
            if (!$this->option('skip-seed')) {
                $progressBar->setMessage('Seeding default data...');
                $this->seedTenantData($tenant);
            }
            $progressBar->advance();

            // Step 6: Create admin user
            $progressBar->setMessage('Creating admin user...');
            $adminUser = $this->createAdminUser($tenant, $adminName, $adminEmail, $adminPassword);
            $progressBar->advance();

            // Activate tenant
            $tenant->update(['status' => 'active']);

            $progressBar->finish();
            $this->newLine(2);

            $this->info("╔════════════════════════════════════════════════════════╗");
            $this->info("║         ✅ TENANT CREATED SUCCESSFULLY!                ║");
            $this->info("╚════════════════════════════════════════════════════════╝");
            $this->newLine();

            $this->table(
                ['Property', 'Value'],
                [
                    ['Tenant ID', $tenant->id],
                    ['Portal URL', "https://{$subdomain}.flexcloud.ng"],
                    ['Database', $dbName],
                    ['Admin Email', $adminEmail],
                    ['Admin Password', $adminPassword],
                    ['Status', 'Active'],
                ]
            );

            $this->newLine();
            $this->info("📧 Please save the admin credentials securely!");
            $this->info("🌐 The tenant portal is now accessible at: https://{$subdomain}.flexcloud.ng");

            // Log to platform audit
            $this->logTenantCreation($tenant, $adminUser);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $progressBar->finish();
            $this->newLine(2);
            $this->error("❌ Tenant creation failed: " . $e->getMessage());
            
            // Cleanup on failure
            if (isset($tenant)) {
                $this->warn("🧹 Cleaning up failed tenant...");
                $this->deleteTenant($tenant);
            }

            return Command::FAILURE;
        }
    }

    protected function validateInputs(string $slug, string $subdomain, string $email): bool
    {
        if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
            $this->error("❌ Slug must contain only lowercase letters, numbers, and hyphens.");
            return false;
        }

        if (!preg_match('/^[a-z0-9-]+$/', $subdomain)) {
            $this->error("❌ Subdomain must contain only lowercase letters, numbers, and hyphens.");
            return false;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error("❌ Invalid email address: {$email}");
            return false;
        }

        $reserved = ['www', 'api', 'admin', 'platform', 'app', 'mail', 'smtp', 'ftp'];
        if (in_array($subdomain, $reserved)) {
            $this->error("❌ '{$subdomain}' is a reserved subdomain.");
            return false;
        }

        return true;
    }

    protected function createTenantRecord(string $slug, string $name, string $subdomain, string $shareModel, string $shareValue): Tenant
    {
        return Tenant::create([
            'name' => $name,
            'slug' => $slug,
            'subdomain' => $subdomain,
            'domain' => "{$subdomain}.flexcloud.ng",
            'status' => 'pending',
            'revenue_share_model' => $shareModel,
            'share_value' => $shareValue,
            'metadata' => json_encode([
                'created_via' => 'cli',
                'created_at' => now()->toISOString(),
            ]),
        ]);
    }

    protected function createDatabase(string $dbName): void
    {
        $charset = config('database.connections.mysql.charset', 'utf8mb4');
        $collation = config('database.connections.mysql.collation', 'utf8mb4_unicode_ci');

        DB::statement("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET {$charset} COLLATE {$collation}");
    }

    protected function runMigrations(string $dbName): void
    {
        // Configure tenant connection
        config([
            'database.connections.tenant.database' => $dbName,
        ]);

        DB::purge('tenant');

        // Run tenant migrations
        $migrationPath = database_path('migrations/tenant');
        
        $this->callSilent('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);
    }

    protected function seedTenantData(Tenant $tenant): void
    {
        // Seed default wards
        $this->seedDefaultWards($tenant);

        // Seed default departments
        $this->seedDefaultDepartments($tenant);

        // Seed default revenue categories
        $this->seedDefaultRevenueCategories($tenant);

        // Seed default roles
        $this->seedDefaultRoles($tenant);

        // Seed default settings
        $this->seedDefaultSettings($tenant);
    }

    protected function seedDefaultWards(Tenant $tenant): void
    {
        $wards = [
            ['name' => 'Ward 1 - Central', 'code' => 'W01'],
            ['name' => 'Ward 2 - North', 'code' => 'W02'],
            ['name' => 'Ward 3 - South', 'code' => 'W03'],
            ['name' => 'Ward 4 - East', 'code' => 'W04'],
            ['name' => 'Ward 5 - West', 'code' => 'W05'],
        ];

        foreach ($wards as $ward) {
            DB::connection('tenant')->table('wards')->insert([
                'name' => $ward['name'],
                'code' => $ward['code'],
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function seedDefaultDepartments(Tenant $tenant): void
    {
        $departments = [
            ['name' => 'Revenue & Taxation', 'code' => 'REV'],
            ['name' => 'Works & Infrastructure', 'code' => 'WRK'],
            ['name' => 'Health & Environment', 'code' => 'HLT'],
            ['name' => 'Education', 'code' => 'EDU'],
            ['name' => 'Administration', 'code' => 'ADM'],
        ];

        foreach ($departments as $dept) {
            DB::connection('tenant')->table('departments')->insert([
                'name' => $dept['name'],
                'code' => $dept['code'],
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function seedDefaultRevenueCategories(Tenant $tenant): void
    {
        $categories = [
            ['name' => 'Business Permits & Licenses', 'code' => 'BPL'],
            ['name' => 'Market Fees', 'code' => 'MKT'],
            ['name' => 'Property Tax', 'code' => 'PTX'],
            ['name' => 'Motor Park Fees', 'code' => 'MPK'],
            ['name' => 'Sanitation & Waste', 'code' => 'SAN'],
        ];

        foreach ($categories as $cat) {
            DB::connection('tenant')->table('revenue_categories')->insert([
                'name' => $cat['name'],
                'code' => $cat['code'],
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function seedDefaultRoles(Tenant $tenant): void
    {
        $roles = [
            ['name' => 'LGA Administrator', 'slug' => 'lga_admin'],
            ['name' => 'Chairman', 'slug' => 'chairman'],
            ['name' => 'Treasurer', 'slug' => 'treasurer'],
            ['name' => 'Head of Department', 'slug' => 'hod'],
            ['name' => 'Consultant Admin', 'slug' => 'consultant_admin'],
            ['name' => 'Consultant', 'slug' => 'consultant'],
            ['name' => 'Collector', 'slug' => 'collector'],
            ['name' => 'Finance Auditor', 'slug' => 'auditor_finance'],
            ['name' => 'Business User', 'slug' => 'business_user'],
        ];

        foreach ($roles as $role) {
            DB::connection('tenant')->table('roles')->insert([
                'name' => $role['name'],
                'slug' => $role['slug'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function seedDefaultSettings(Tenant $tenant): void
    {
        $settings = [
            ['key' => 'tenant_name', 'value' => $tenant->name],
            ['key' => 'currency', 'value' => 'NGN'],
            ['key' => 'timezone', 'value' => 'Africa/Lagos'],
            ['key' => 'fiscal_year_start', 'value' => '01-01'],
            ['key' => 'invoice_prefix', 'value' => strtoupper(substr($tenant->slug, 0, 3)) . '-'],
            ['key' => 'ticket_prefix', 'value' => 'TKT-'],
            ['key' => 'enable_sms', 'value' => 'false'],
            ['key' => 'enable_email', 'value' => 'false'],
        ];

        foreach ($settings as $setting) {
            DB::connection('tenant')->table('tenant_settings')->insert([
                'key' => $setting['key'],
                'value' => $setting['value'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function createAdminUser(Tenant $tenant, string $name, string $email, string $password): object
    {
        $userId = DB::connection('tenant')->table('users')->insertGetId([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'lga_admin',
            'status' => 'active',
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return (object) [
            'id' => $userId,
            'name' => $name,
            'email' => $email,
        ];
    }

    protected function deleteTenant(Tenant $tenant): void
    {
        // Drop database if exists
        if ($tenant->db_name) {
            try {
                DB::statement("DROP DATABASE IF EXISTS `{$tenant->db_name}`");
            } catch (\Exception $e) {
                $this->warn("Could not drop database: " . $e->getMessage());
            }
        }

        // Delete tenant record
        $tenant->delete();
    }

    protected function logTenantCreation(Tenant $tenant, object $adminUser): void
    {
        DB::connection('platform')->table('platform_audit_logs')->insert([
            'user_id' => null,
            'user_type' => 'system',
            'action' => 'tenant_created',
            'entity_type' => 'Tenant',
            'entity_id' => $tenant->id,
            'new_values' => json_encode([
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'subdomain' => $tenant->subdomain,
                'admin_email' => $adminUser->email,
            ]),
            'ip_address' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

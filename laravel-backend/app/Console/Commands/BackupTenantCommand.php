<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;
use App\Models\Tenant;

class BackupTenantCommand extends Command
{
    protected $signature = 'backup:tenant {slug : The tenant slug to backup}';
    protected $description = 'Backup a specific tenant database';

    public function handle(BackupService $backupService): int
    {
        $slug = $this->argument('slug');

        // Verify tenant exists
        $tenant = Tenant::where('slug', $slug)->first();
        if (!$tenant) {
            $this->error("❌ Tenant with slug '{$slug}' not found.");
            return Command::FAILURE;
        }

        $this->info("Starting backup for tenant: {$tenant->name} ({$slug})...");

        try {
            $record = $backupService->backupTenant(
                slug: $slug,
                triggeredBy: null,
                triggerType: 'scheduled'
            );

            $this->info("✅ Tenant backup completed successfully!");
            $this->table(
                ['Property', 'Value'],
                [
                    ['Tenant', $tenant->name],
                    ['Filename', $record->filename],
                    ['Size', $record->size_human],
                    ['Duration', $record->duration_seconds . 's'],
                    ['Encrypted', $record->is_encrypted ? 'Yes' : 'No'],
                ]
            );

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Tenant backup failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

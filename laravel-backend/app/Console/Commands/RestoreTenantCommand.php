<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RestoreService;
use App\Models\Tenant;
use App\Models\BackupRecord;

class RestoreTenantCommand extends Command
{
    protected $signature = 'restore:tenant 
                            {slug : The tenant slug to restore}
                            {filename : The backup filename to restore from}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Restore a tenant database from backup (DANGER: This will overwrite all data!)';

    public function handle(RestoreService $restoreService): int
    {
        $slug = $this->argument('slug');
        $filename = $this->argument('filename');

        // Verify tenant exists
        $tenant = Tenant::where('slug', $slug)->first();
        if (!$tenant) {
            $this->error("❌ Tenant with slug '{$slug}' not found.");
            return Command::FAILURE;
        }

        // Find backup record
        $backup = BackupRecord::where('tenant_slug', $slug)
            ->where('filename', $filename)
            ->where('status', 'completed')
            ->first();

        if (!$backup) {
            $this->error("❌ Backup file '{$filename}' not found for tenant '{$slug}'.");
            return Command::FAILURE;
        }

        // Show warning
        $this->newLine();
        $this->warn('⚠️  WARNING: DANGEROUS OPERATION');
        $this->warn('This will PERMANENTLY OVERWRITE all current data for tenant:');
        $this->info("  Name: {$tenant->name}");
        $this->info("  Slug: {$tenant->slug}");
        $this->info("  Database: {$tenant->db_name}");
        $this->newLine();
        $this->info("Restoring from: {$backup->filename}");
        $this->info("Backup date: {$backup->created_at}");
        $this->info("Backup size: {$backup->size_human}");
        $this->newLine();

        if (!$this->option('force')) {
            // Require explicit confirmation
            $confirmation = $this->ask("Type the tenant slug '{$slug}' to confirm");
            
            if ($confirmation !== $slug) {
                $this->error('Confirmation failed. Restore cancelled.');
                return Command::FAILURE;
            }
        }

        $this->info('Starting restore process...');

        try {
            // Create restore record
            $restoreRecord = $restoreService->restoreTenant(
                slug: $slug,
                backupId: $backup->id,
                triggeredBy: null
            );

            // Execute restore
            $result = $restoreService->executeRestoreTenant(
                recordId: $restoreRecord->id,
                confirmationToken: $restoreRecord->confirmation_token
            );

            $this->newLine();
            $this->info("✅ Tenant restore completed successfully!");
            $this->table(
                ['Property', 'Value'],
                [
                    ['Tenant', $tenant->name],
                    ['Restored From', $backup->filename],
                    ['Duration', $result->duration_seconds . 's'],
                ]
            );

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Restore failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

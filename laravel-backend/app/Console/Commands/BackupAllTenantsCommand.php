<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;
use App\Jobs\BackupTenantJob;
use App\Models\Tenant;

class BackupAllTenantsCommand extends Command
{
    protected $signature = 'backup:all-tenants 
                            {--queue : Queue the backup jobs instead of running synchronously}
                            {--skip-suspended : Skip suspended tenants}';

    protected $description = 'Backup all tenant databases';

    public function handle(BackupService $backupService): int
    {
        $this->info('Starting backup for all tenants...');

        $query = Tenant::query();

        if ($this->option('skip-suspended')) {
            $query->where('status', '!=', 'suspended');
        }

        $tenants = $query->get();

        if ($tenants->isEmpty()) {
            $this->warn('No tenants found to backup.');
            return Command::SUCCESS;
        }

        $this->info("Found {$tenants->count()} tenants to backup.");

        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        $results = [
            'success' => 0,
            'failed' => 0,
            'queued' => 0,
        ];

        foreach ($tenants as $tenant) {
            try {
                if ($this->option('queue')) {
                    BackupTenantJob::dispatch($tenant->slug);
                    $results['queued']++;
                } else {
                    $backupService->backupTenant(
                        slug: $tenant->slug,
                        triggeredBy: null,
                        triggerType: 'scheduled'
                    );
                    $results['success']++;
                }
            } catch (\Exception $e) {
                $results['failed']++;
                $this->newLine();
                $this->error("Failed to backup {$tenant->name}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info('Backup process completed!');
        $this->table(
            ['Status', 'Count'],
            [
                ['Success', $results['success']],
                ['Failed', $results['failed']],
                ['Queued', $results['queued']],
            ]
        );

        return $results['failed'] > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;

class BackupCleanupCommand extends Command
{
    protected $signature = 'backup:cleanup';
    protected $description = 'Clean up old backups based on retention policy';

    public function handle(BackupService $backupService): int
    {
        $this->info('Starting backup cleanup...');

        try {
            $result = $backupService->cleanupOldBackups();

            $this->info("✅ Backup cleanup completed!");
            $this->table(
                ['Type', 'Deleted'],
                [
                    ['Platform', $result['platform']],
                    ['Tenant', $result['tenant']],
                ]
            );

            $totalDeleted = $result['platform'] + $result['tenant'];
            $this->info("Total backups deleted: {$totalDeleted}");

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Cleanup failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;

class BackupPlatformCommand extends Command
{
    protected $signature = 'backup:platform';
    protected $description = 'Backup the FlexCloud platform database';

    public function handle(BackupService $backupService): int
    {
        $this->info('Starting platform database backup...');

        try {
            $record = $backupService->backupPlatform(
                triggeredBy: null,
                triggerType: 'scheduled'
            );

            $this->info("✅ Platform backup completed successfully!");
            $this->table(
                ['Property', 'Value'],
                [
                    ['Filename', $record->filename],
                    ['Size', $record->size_human],
                    ['Duration', $record->duration_seconds . 's'],
                    ['Encrypted', $record->is_encrypted ? 'Yes' : 'No'],
                ]
            );

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Platform backup failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

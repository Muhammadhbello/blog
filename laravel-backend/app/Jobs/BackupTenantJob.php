<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\BackupService;
use Illuminate\Support\Facades\Log;

class BackupTenantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes
    public int $tries = 3;
    public array $backoff = [60, 120, 300]; // Retry delays

    protected string $slug;
    protected ?int $triggeredBy;
    protected string $triggerType;

    public function __construct(
        string $slug,
        ?int $triggeredBy = null,
        string $triggerType = 'scheduled'
    ) {
        $this->slug = $slug;
        $this->triggeredBy = $triggeredBy;
        $this->triggerType = $triggerType;
    }

    public function handle(BackupService $backupService): void
    {
        Log::info("BackupTenantJob: Starting backup for tenant {$this->slug}");

        try {
            $record = $backupService->backupTenant(
                slug: $this->slug,
                triggeredBy: $this->triggeredBy,
                triggerType: $this->triggerType
            );

            Log::info("BackupTenantJob: Completed backup for tenant {$this->slug}", [
                'filename' => $record->filename,
                'size' => $record->size_human,
            ]);

        } catch (\Exception $e) {
            Log::error("BackupTenantJob: Failed backup for tenant {$this->slug}", [
                'error' => $e->getMessage(),
            ]);

            throw $e; // Re-throw for retry mechanism
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("BackupTenantJob: Permanently failed for tenant {$this->slug}", [
            'error' => $exception->getMessage(),
        ]);
    }

    public function tags(): array
    {
        return ['backup', "tenant:{$this->slug}"];
    }
}

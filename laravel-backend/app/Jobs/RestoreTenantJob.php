<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\RestoreService;
use Illuminate\Support\Facades\Log;

class RestoreTenantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900; // 15 minutes
    public int $tries = 1; // No retries for restore
    public bool $failOnTimeout = true;

    protected int $recordId;
    protected string $confirmationToken;

    public function __construct(int $recordId, string $confirmationToken)
    {
        $this->recordId = $recordId;
        $this->confirmationToken = $confirmationToken;
    }

    public function handle(RestoreService $restoreService): void
    {
        Log::info("RestoreTenantJob: Starting restore for record {$this->recordId}");

        try {
            $result = $restoreService->executeRestoreTenant(
                recordId: $this->recordId,
                confirmationToken: $this->confirmationToken
            );

            Log::info("RestoreTenantJob: Completed restore", [
                'tenant_slug' => $result->tenant_slug,
                'duration' => $result->duration_seconds,
            ]);

        } catch (\Exception $e) {
            Log::error("RestoreTenantJob: Failed restore for record {$this->recordId}", [
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("RestoreTenantJob: Permanently failed for record {$this->recordId}", [
            'error' => $exception->getMessage(),
        ]);
    }

    public function tags(): array
    {
        return ['restore', "record:{$this->recordId}"];
    }
}

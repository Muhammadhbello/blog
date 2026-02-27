<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use App\Models\Tenant;
use App\Models\BackupRecord;
use App\Models\RestoreRecord;
use Carbon\Carbon;

/**
 * RestoreService - Handles all restore operations for FlexCloud
 * CRITICAL: Implements tenant-isolated restore with maintenance mode
 */
class RestoreService
{
    protected string $disk;
    protected string $basePath;

    public function __construct()
    {
        $this->disk = config('backup.disk', 'local');
        $this->basePath = config('backup.path', 'backups');
    }

    /**
     * Restore the Platform Database
     * DANGER: This will overwrite all platform data
     */
    public function restorePlatform(int $backupId, int $triggeredBy): RestoreRecord
    {
        $backup = BackupRecord::findOrFail($backupId);
        
        if ($backup->type !== 'platform') {
            throw new \InvalidArgumentException('Invalid backup type for platform restore');
        }

        $record = RestoreRecord::create([
            'type' => 'platform',
            'backup_record_id' => $backupId,
            'backup_filename' => $backup->filename,
            'status' => 'pending',
            'triggered_by' => $triggeredBy,
            'requires_confirmation' => true,
            'confirmation_token' => Str::random(32),
        ]);

        return $record;
    }

    /**
     * Execute Platform Restore (requires confirmation token)
     */
    public function executeRestorePlatform(int $recordId, string $confirmationToken): RestoreRecord
    {
        $record = RestoreRecord::findOrFail($recordId);

        if ($record->confirmation_token !== $confirmationToken) {
            throw new \InvalidArgumentException('Invalid confirmation token');
        }

        if ($record->type !== 'platform' || $record->status !== 'pending') {
            throw new \InvalidArgumentException('Invalid restore record state');
        }

        $backup = BackupRecord::findOrFail($record->backup_record_id);

        try {
            $record->update([
                'status' => 'running',
                'started_at' => now(),
                'current_step' => 'Preparing restore...',
                'progress_percent' => 10,
            ]);

            // Step 1: Verify backup file exists
            if (!Storage::disk($this->disk)->exists($backup->filepath)) {
                throw new \RuntimeException('Backup file not found');
            }

            $record->update([
                'current_step' => 'Verifying backup integrity...',
                'progress_percent' => 20,
            ]);

            // Step 2: Extract and decrypt if needed
            $sqlFile = $this->prepareBackupFile($backup);

            $record->update([
                'current_step' => 'Dropping existing tables...',
                'progress_percent' => 40,
            ]);

            // Step 3: Get database credentials
            $dbHost = config('database.connections.platform.host');
            $dbPort = config('database.connections.platform.port');
            $dbName = config('database.connections.platform.database');
            $dbUser = config('database.connections.platform.username');
            $dbPass = config('database.connections.platform.password');

            // Step 4: Drop and recreate database
            $this->recreateDatabase('platform', $dbHost, $dbPort, $dbName, $dbUser, $dbPass);

            $record->update([
                'current_step' => 'Importing backup data...',
                'progress_percent' => 60,
            ]);

            // Step 5: Import SQL file
            $this->importSqlFile($dbHost, $dbPort, $dbName, $dbUser, $dbPass, $sqlFile);

            // Step 6: Cleanup
            @unlink($sqlFile);

            $record->update([
                'current_step' => 'Restore completed',
                'status' => 'completed',
                'progress_percent' => 100,
                'completed_at' => now(),
                'duration_seconds' => now()->diffInSeconds($record->started_at),
            ]);

            $this->logAudit('restore_completed', 'platform', null, [
                'backup_filename' => $backup->filename,
                'duration' => $record->duration_seconds,
            ], $record->triggered_by);

        } catch (\Exception $e) {
            $record->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            $this->logAudit('restore_failed', 'platform', null, [
                'error' => $e->getMessage(),
            ], $record->triggered_by);

            Log::error("Platform restore failed: " . $e->getMessage());
            throw $e;
        }

        return $record;
    }

    /**
     * Restore a Tenant Database
     * SAFE: Only affects the specified tenant
     */
    public function restoreTenant(string $slug, int $backupId, int $triggeredBy): RestoreRecord
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        $backup = BackupRecord::findOrFail($backupId);

        if ($backup->type !== 'tenant' || $backup->tenant_slug !== $slug) {
            throw new \InvalidArgumentException('Invalid backup for this tenant');
        }

        $record = RestoreRecord::create([
            'type' => 'tenant',
            'tenant_slug' => $slug,
            'backup_record_id' => $backupId,
            'backup_filename' => $backup->filename,
            'status' => 'pending',
            'triggered_by' => $triggeredBy,
            'requires_confirmation' => true,
            'confirmation_token' => Str::random(32),
        ]);

        return $record;
    }

    /**
     * Execute Tenant Restore (requires confirmation token)
     */
    public function executeRestoreTenant(int $recordId, string $confirmationToken): RestoreRecord
    {
        $record = RestoreRecord::findOrFail($recordId);

        if ($record->confirmation_token !== $confirmationToken) {
            throw new \InvalidArgumentException('Invalid confirmation token');
        }

        if ($record->type !== 'tenant' || $record->status !== 'pending') {
            throw new \InvalidArgumentException('Invalid restore record state');
        }

        $tenant = Tenant::where('slug', $record->tenant_slug)->firstOrFail();
        $backup = BackupRecord::findOrFail($record->backup_record_id);

        try {
            // Step 1: Enable maintenance mode for this tenant
            $record->update([
                'status' => 'running',
                'started_at' => now(),
                'current_step' => 'Enabling maintenance mode...',
                'progress_percent' => 5,
            ]);

            $this->enableTenantMaintenance($tenant, 'Database restore in progress');

            // Step 2: Verify backup file exists
            $record->update([
                'current_step' => 'Verifying backup file...',
                'progress_percent' => 15,
            ]);

            if (!Storage::disk($this->disk)->exists($backup->filepath)) {
                throw new \RuntimeException('Backup file not found');
            }

            // Step 3: Extract and decrypt
            $record->update([
                'current_step' => 'Preparing backup file...',
                'progress_percent' => 25,
            ]);

            $sqlFile = $this->prepareBackupFile($backup);

            // Step 4: Get database credentials
            $dbHost = config('database.connections.tenant.host');
            $dbPort = config('database.connections.tenant.port');
            $dbName = $tenant->db_name ?? "{$tenant->slug}_tenant";
            $dbUser = config('database.connections.tenant.username');
            $dbPass = config('database.connections.tenant.password');

            // Step 5: Drop and recreate database
            $record->update([
                'current_step' => 'Recreating database...',
                'progress_percent' => 45,
            ]);

            $this->recreateDatabase('tenant', $dbHost, $dbPort, $dbName, $dbUser, $dbPass);

            // Step 6: Import SQL file
            $record->update([
                'current_step' => 'Importing backup data...',
                'progress_percent' => 65,
            ]);

            $this->importSqlFile($dbHost, $dbPort, $dbName, $dbUser, $dbPass, $sqlFile);

            // Step 7: Cleanup
            @unlink($sqlFile);

            // Step 8: Disable maintenance mode
            $record->update([
                'current_step' => 'Disabling maintenance mode...',
                'progress_percent' => 90,
            ]);

            $this->disableTenantMaintenance($tenant);

            $record->update([
                'current_step' => 'Restore completed',
                'status' => 'completed',
                'progress_percent' => 100,
                'completed_at' => now(),
                'duration_seconds' => now()->diffInSeconds($record->started_at),
            ]);

            $this->logAudit('restore_completed', 'tenant', $tenant->slug, [
                'backup_filename' => $backup->filename,
                'duration' => $record->duration_seconds,
            ], $record->triggered_by);

        } catch (\Exception $e) {
            // Ensure maintenance mode is disabled even on failure
            $this->disableTenantMaintenance($tenant);

            $record->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            $this->logAudit('restore_failed', 'tenant', $tenant->slug, [
                'error' => $e->getMessage(),
            ], $record->triggered_by);

            Log::error("Tenant restore failed for {$tenant->slug}: " . $e->getMessage());
            throw $e;
        }

        return $record;
    }

    /**
     * Get restore progress
     */
    public function getRestoreProgress(int $recordId): array
    {
        $record = RestoreRecord::findOrFail($recordId);

        return [
            'id' => $record->id,
            'type' => $record->type,
            'tenant_slug' => $record->tenant_slug,
            'status' => $record->status,
            'progress_percent' => $record->progress_percent,
            'current_step' => $record->current_step,
            'error_message' => $record->error_message,
            'started_at' => $record->started_at,
            'completed_at' => $record->completed_at,
            'duration_seconds' => $record->duration_seconds,
        ];
    }

    /**
     * Get list of available backups for restore
     */
    public function getAvailableBackupsForTenant(string $slug): array
    {
        return BackupRecord::where('type', 'tenant')
            ->where('tenant_slug', $slug)
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($backup) {
                return [
                    'id' => $backup->id,
                    'filename' => $backup->filename,
                    'size' => $backup->size_human,
                    'created_at' => $backup->created_at->format('Y-m-d H:i:s'),
                    'trigger_type' => $backup->trigger_type,
                ];
            })
            ->toArray();
    }

    // ===========================================
    // PRIVATE HELPER METHODS
    // ===========================================

    private function prepareBackupFile(BackupRecord $backup): string
    {
        $content = Storage::disk($this->disk)->get($backup->filepath);
        $tempFile = storage_path("app/restore_temp_{$backup->id}.sql");

        // Decrypt if encrypted
        if ($backup->is_encrypted) {
            $content = Crypt::decrypt($content);
        }

        // Decompress gzip
        if (str_contains($backup->filename, '.gz')) {
            $content = gzdecode($content);
        }

        file_put_contents($tempFile, $content);

        return $tempFile;
    }

    private function recreateDatabase(
        string $connection,
        string $host,
        string $port,
        string $database,
        string $username,
        string $password
    ): void {
        $mysqlPath = config('backup.mysql.path', '/usr/bin/mysql');

        // Drop existing database
        $dropCommand = sprintf(
            '%s --host=%s --port=%s --user=%s --password=%s -e %s',
            escapeshellcmd($mysqlPath),
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($password),
            escapeshellarg("DROP DATABASE IF EXISTS `{$database}`")
        );

        $this->executeCommand($dropCommand);

        // Create database
        $createCommand = sprintf(
            '%s --host=%s --port=%s --user=%s --password=%s -e %s',
            escapeshellcmd($mysqlPath),
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($password),
            escapeshellarg("CREATE DATABASE `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        );

        $this->executeCommand($createCommand);
    }

    private function importSqlFile(
        string $host,
        string $port,
        string $database,
        string $username,
        string $password,
        string $sqlFile
    ): void {
        $mysqlPath = config('backup.mysql.path', '/usr/bin/mysql');

        $command = sprintf(
            '%s --host=%s --port=%s --user=%s --password=%s %s < %s',
            escapeshellcmd($mysqlPath),
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($password),
            escapeshellarg($database),
            escapeshellarg($sqlFile)
        );

        $this->executeCommand($command);
    }

    private function executeCommand(string $command): void
    {
        $output = [];
        $returnVar = 0;

        exec($command . ' 2>&1', $output, $returnVar);

        if ($returnVar !== 0) {
            throw new \RuntimeException(
                "Command failed with exit code {$returnVar}: " . implode("\n", $output)
            );
        }
    }

    private function enableTenantMaintenance(Tenant $tenant, string $reason): void
    {
        $tenant->update([
            'is_in_maintenance' => true,
            'maintenance_reason' => $reason,
            'maintenance_started_at' => now(),
        ]);
    }

    private function disableTenantMaintenance(Tenant $tenant): void
    {
        $tenant->update([
            'is_in_maintenance' => false,
            'maintenance_reason' => null,
            'maintenance_started_at' => null,
        ]);
    }

    private function logAudit(
        string $action,
        string $type,
        ?string $tenantSlug,
        array $details,
        ?int $userId
    ): void {
        DB::connection('platform')->table('platform_audit_logs')->insert([
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => 'restore',
            'entity_id' => $tenantSlug ?? 'platform',
            'details' => json_encode($details),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

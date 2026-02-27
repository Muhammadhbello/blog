<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use App\Models\Tenant;
use App\Models\BackupRecord;
use Carbon\Carbon;

/**
 * BackupService - Handles all backup operations for FlexCloud
 */
class BackupService
{
    protected string $disk;
    protected string $basePath;
    protected array $mysqldumpOptions;

    public function __construct()
    {
        $this->disk = config('backup.disk', 'local');
        $this->basePath = config('backup.path', 'backups');
        $this->mysqldumpOptions = config('backup.mysqldump.extra_options', []);
    }

    /**
     * Backup the Platform Database
     */
    public function backupPlatform(?int $triggeredBy = null, string $triggerType = 'manual'): BackupRecord
    {
        $record = BackupRecord::create([
            'type' => 'platform',
            'tenant_slug' => null,
            'filename' => '',
            'filepath' => '',
            'status' => 'pending',
            'triggered_by' => $triggeredBy,
            'trigger_type' => $triggerType,
        ]);

        try {
            $record->update([
                'status' => 'running',
                'started_at' => now(),
            ]);

            $filename = $this->generateFilename('flexcloud_platform');
            $filepath = "{$this->basePath}/platform/{$filename}";
            
            // Ensure directory exists
            Storage::disk($this->disk)->makeDirectory("{$this->basePath}/platform");

            // Get database credentials
            $dbHost = config('database.connections.platform.host');
            $dbPort = config('database.connections.platform.port');
            $dbName = config('database.connections.platform.database');
            $dbUser = config('database.connections.platform.username');
            $dbPass = config('database.connections.platform.password');

            // Build mysqldump command
            $tempFile = storage_path("app/temp_platform_{$record->id}.sql");
            $command = $this->buildMysqldumpCommand($dbHost, $dbPort, $dbName, $dbUser, $dbPass, $tempFile);

            // Execute backup
            $this->executeCommand($command);

            // Compress the file
            $compressedFile = $this->compressFile($tempFile);

            // Encrypt if enabled
            if (config('backup.encryption.enabled', true)) {
                $compressedFile = $this->encryptFile($compressedFile);
            }

            // Move to final location
            $finalContent = file_get_contents($compressedFile);
            Storage::disk($this->disk)->put($filepath, $finalContent);

            // Cleanup temp files
            @unlink($tempFile);
            @unlink($compressedFile);

            $size = Storage::disk($this->disk)->size($filepath);
            $checksum = md5($finalContent);

            $record->update([
                'filename' => $filename,
                'filepath' => $filepath,
                'size_bytes' => $size,
                'size_human' => $this->formatBytes($size),
                'checksum' => $checksum,
                'is_encrypted' => config('backup.encryption.enabled', true),
                'status' => 'completed',
                'completed_at' => now(),
                'duration_seconds' => now()->diffInSeconds($record->started_at),
            ]);

            $this->logAudit('backup_completed', 'platform', null, [
                'filename' => $filename,
                'size' => $this->formatBytes($size),
            ], $triggeredBy);

        } catch (\Exception $e) {
            $record->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            $this->logAudit('backup_failed', 'platform', null, [
                'error' => $e->getMessage(),
            ], $triggeredBy);

            Log::error("Platform backup failed: " . $e->getMessage());
            throw $e;
        }

        return $record;
    }

    /**
     * Backup a specific Tenant Database
     */
    public function backupTenant(string $slug, ?int $triggeredBy = null, string $triggerType = 'manual'): BackupRecord
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $record = BackupRecord::create([
            'type' => 'tenant',
            'tenant_slug' => $slug,
            'filename' => '',
            'filepath' => '',
            'status' => 'pending',
            'triggered_by' => $triggeredBy,
            'trigger_type' => $triggerType,
        ]);

        try {
            $record->update([
                'status' => 'running',
                'started_at' => now(),
            ]);

            $filename = $this->generateFilename($slug);
            $filepath = "{$this->basePath}/tenants/{$slug}/db/{$filename}";
            
            // Ensure directory exists
            Storage::disk($this->disk)->makeDirectory("{$this->basePath}/tenants/{$slug}/db");

            // Get tenant database credentials
            $dbHost = config('database.connections.tenant.host');
            $dbPort = config('database.connections.tenant.port');
            $dbName = $tenant->db_name ?? "{$slug}_tenant";
            $dbUser = config('database.connections.tenant.username');
            $dbPass = config('database.connections.tenant.password');

            // Build mysqldump command
            $tempFile = storage_path("app/temp_tenant_{$slug}_{$record->id}.sql");
            $command = $this->buildMysqldumpCommand($dbHost, $dbPort, $dbName, $dbUser, $dbPass, $tempFile);

            // Execute backup
            $this->executeCommand($command);

            // Compress the file
            $compressedFile = $this->compressFile($tempFile);

            // Encrypt if enabled
            if (config('backup.encryption.enabled', true)) {
                $compressedFile = $this->encryptFile($compressedFile);
            }

            // Move to final location
            $finalContent = file_get_contents($compressedFile);
            Storage::disk($this->disk)->put($filepath, $finalContent);

            // Cleanup temp files
            @unlink($tempFile);
            @unlink($compressedFile);

            $size = Storage::disk($this->disk)->size($filepath);
            $checksum = md5($finalContent);

            $record->update([
                'filename' => $filename,
                'filepath' => $filepath,
                'size_bytes' => $size,
                'size_human' => $this->formatBytes($size),
                'checksum' => $checksum,
                'is_encrypted' => config('backup.encryption.enabled', true),
                'status' => 'completed',
                'completed_at' => now(),
                'duration_seconds' => now()->diffInSeconds($record->started_at),
            ]);

            // Update tenant record
            $tenant->update([
                'last_backup_at' => now(),
                'last_backup_status' => 'success',
                'last_backup_size' => $this->formatBytes($size),
            ]);

            $this->logAudit('backup_completed', 'tenant', $slug, [
                'filename' => $filename,
                'size' => $this->formatBytes($size),
            ], $triggeredBy);

        } catch (\Exception $e) {
            $record->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            $tenant->update([
                'last_backup_at' => now(),
                'last_backup_status' => 'failed',
            ]);

            $this->logAudit('backup_failed', 'tenant', $slug, [
                'error' => $e->getMessage(),
            ], $triggeredBy);

            Log::error("Tenant backup failed for {$slug}: " . $e->getMessage());
            throw $e;
        }

        return $record;
    }

    /**
     * Backup Tenant Files (Uploads, Documents)
     */
    public function backupTenantFiles(string $slug, ?int $triggeredBy = null): BackupRecord
    {
        $record = BackupRecord::create([
            'type' => 'tenant_files',
            'tenant_slug' => $slug,
            'filename' => '',
            'filepath' => '',
            'status' => 'pending',
            'triggered_by' => $triggeredBy,
            'trigger_type' => 'manual',
        ]);

        try {
            $record->update([
                'status' => 'running',
                'started_at' => now(),
            ]);

            $sourcePath = "tenants/{$slug}";
            $filename = "{$slug}_files_" . now()->format('Y-m-d_His') . ".zip";
            $filepath = "{$this->basePath}/tenants/{$slug}/files/{$filename}";

            // Create zip archive
            $tempZip = storage_path("app/temp_{$slug}_files.zip");
            $sourceFullPath = storage_path("app/{$sourcePath}");

            if (is_dir($sourceFullPath)) {
                $zip = new \ZipArchive();
                if ($zip->open($tempZip, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
                    $files = new \RecursiveIteratorIterator(
                        new \RecursiveDirectoryIterator($sourceFullPath),
                        \RecursiveIteratorIterator::LEAVES_ONLY
                    );

                    foreach ($files as $file) {
                        if (!$file->isDir()) {
                            $filePath = $file->getRealPath();
                            $relativePath = substr($filePath, strlen($sourceFullPath) + 1);
                            $zip->addFile($filePath, $relativePath);
                        }
                    }
                    $zip->close();
                }

                // Move to final location
                Storage::disk($this->disk)->makeDirectory("{$this->basePath}/tenants/{$slug}/files");
                $content = file_get_contents($tempZip);
                Storage::disk($this->disk)->put($filepath, $content);
                @unlink($tempZip);

                $size = Storage::disk($this->disk)->size($filepath);
            } else {
                $size = 0;
            }

            $record->update([
                'filename' => $filename,
                'filepath' => $filepath,
                'size_bytes' => $size,
                'size_human' => $this->formatBytes($size),
                'status' => 'completed',
                'completed_at' => now(),
                'duration_seconds' => now()->diffInSeconds($record->started_at),
            ]);

        } catch (\Exception $e) {
            $record->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
            throw $e;
        }

        return $record;
    }

    /**
     * Get list of backups for a tenant
     */
    public function getTenantBackups(string $slug): array
    {
        return BackupRecord::where('tenant_slug', $slug)
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->toArray();
    }

    /**
     * Get list of platform backups
     */
    public function getPlatformBackups(): array
    {
        return BackupRecord::where('type', 'platform')
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->toArray();
    }

    /**
     * Get backup statistics
     */
    public function getBackupStats(): array
    {
        $platformBackups = BackupRecord::where('type', 'platform');
        $tenantBackups = BackupRecord::where('type', 'tenant');

        $last24h = now()->subDay();

        return [
            'platform' => [
                'total' => $platformBackups->count(),
                'last_backup' => $platformBackups->where('status', 'completed')
                    ->latest()->first()?->created_at,
                'total_size' => $platformBackups->where('status', 'completed')
                    ->sum('size_bytes'),
            ],
            'tenants' => [
                'total' => $tenantBackups->count(),
                'last_backup' => $tenantBackups->where('status', 'completed')
                    ->latest()->first()?->created_at,
                'total_size' => $tenantBackups->where('status', 'completed')
                    ->sum('size_bytes'),
            ],
            'failed_24h' => BackupRecord::where('status', 'failed')
                ->where('created_at', '>=', $last24h)
                ->count(),
            'success_rate' => $this->calculateSuccessRate(),
            'total_storage_used' => $this->formatBytes(
                BackupRecord::where('status', 'completed')->sum('size_bytes')
            ),
        ];
    }

    /**
     * Clean up old backups based on retention policy
     */
    public function cleanupOldBackups(): array
    {
        $deleted = [
            'platform' => 0,
            'tenant' => 0,
        ];

        // Platform backups
        $platformRetention = config('backup.retention.platform.days', 30);
        $platformMaxCount = config('backup.retention.platform.max_count', 30);
        $keepMinimum = config('backup.retention.keep_minimum', 1);

        $platformBackups = BackupRecord::where('type', 'platform')
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get();

        $deleted['platform'] = $this->pruneBackups(
            $platformBackups, $platformRetention, $platformMaxCount, $keepMinimum
        );

        // Tenant backups
        $tenants = Tenant::where('status', 'active')->get();
        foreach ($tenants as $tenant) {
            $tenantRetention = $tenant->backup_retention_days ?? config('backup.retention.tenant.days', 14);
            $tenantMaxCount = config('backup.retention.tenant.max_count', 10);

            $tenantBackups = BackupRecord::where('type', 'tenant')
                ->where('tenant_slug', $tenant->slug)
                ->where('status', 'completed')
                ->orderByDesc('created_at')
                ->get();

            $deleted['tenant'] += $this->pruneBackups(
                $tenantBackups, $tenantRetention, $tenantMaxCount, $keepMinimum
            );
        }

        return $deleted;
    }

    /**
     * Download a backup file
     */
    public function downloadBackup(int $backupId): ?string
    {
        $backup = BackupRecord::findOrFail($backupId);
        
        if ($backup->status !== 'completed') {
            return null;
        }

        return Storage::disk($this->disk)->path($backup->filepath);
    }

    // ===========================================
    // PRIVATE HELPER METHODS
    // ===========================================

    private function generateFilename(string $name): string
    {
        $timestamp = now()->format('Y-m-d_His');
        $extension = config('backup.encryption.enabled', true) ? '.sql.gz.enc' : '.sql.gz';
        return "{$name}_{$timestamp}{$extension}";
    }

    private function buildMysqldumpCommand(
        string $host,
        string $port,
        string $database,
        string $username,
        string $password,
        string $outputFile
    ): string {
        $mysqldumpPath = config('backup.mysqldump.path', '/usr/bin/mysqldump');
        $options = implode(' ', $this->mysqldumpOptions);

        return sprintf(
            '%s --host=%s --port=%s --user=%s --password=%s %s %s > %s',
            escapeshellcmd($mysqldumpPath),
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($password),
            $options,
            escapeshellarg($database),
            escapeshellarg($outputFile)
        );
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

    private function compressFile(string $filepath): string
    {
        $compressedPath = $filepath . '.gz';
        
        $data = file_get_contents($filepath);
        $gzdata = gzencode($data, 9);
        file_put_contents($compressedPath, $gzdata);

        return $compressedPath;
    }

    private function encryptFile(string $filepath): string
    {
        $encryptedPath = $filepath . '.enc';
        
        $data = file_get_contents($filepath);
        $encrypted = Crypt::encrypt($data);
        file_put_contents($encryptedPath, $encrypted);

        @unlink($filepath); // Remove unencrypted file

        return $encryptedPath;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }

    private function calculateSuccessRate(): float
    {
        $total = BackupRecord::whereIn('status', ['completed', 'failed'])->count();
        if ($total === 0) return 100.0;

        $successful = BackupRecord::where('status', 'completed')->count();
        return round(($successful / $total) * 100, 2);
    }

    private function pruneBackups($backups, int $retentionDays, int $maxCount, int $keepMinimum): int
    {
        $deleted = 0;
        $retentionDate = now()->subDays($retentionDays);
        $count = 0;

        foreach ($backups as $backup) {
            $count++;

            // Always keep minimum backups
            if ($backups->count() - $deleted <= $keepMinimum) {
                break;
            }

            // Delete if older than retention OR exceeds max count
            if ($backup->created_at < $retentionDate || $count > $maxCount) {
                // Delete file
                if (Storage::disk($this->disk)->exists($backup->filepath)) {
                    Storage::disk($this->disk)->delete($backup->filepath);
                }
                
                $backup->delete();
                $deleted++;
            }
        }

        return $deleted;
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
            'entity_type' => 'backup',
            'entity_id' => $tenantSlug ?? 'platform',
            'details' => json_encode($details),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

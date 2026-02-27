<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\BackupService;
use App\Services\RestoreService;
use App\Services\CustomDomainService;
use App\Models\Tenant;
use App\Models\BackupRecord;
use App\Models\RestoreRecord;
use App\Jobs\BackupTenantJob;
use App\Jobs\RestoreTenantJob;

class BackupController extends Controller
{
    protected BackupService $backupService;
    protected RestoreService $restoreService;

    public function __construct(BackupService $backupService, RestoreService $restoreService)
    {
        $this->backupService = $backupService;
        $this->restoreService = $restoreService;
    }

    /**
     * Get backup dashboard statistics
     */
    public function getStats()
    {
        $stats = $this->backupService->getBackupStats();

        $lastPlatformBackup = BackupRecord::platform()
            ->completed()
            ->latest()
            ->first();

        return response()->json([
            'stats' => $stats,
            'last_platform_backup' => $lastPlatformBackup ? [
                'date' => $lastPlatformBackup->created_at,
                'status' => $lastPlatformBackup->status,
                'size' => $lastPlatformBackup->size_human,
            ] : null,
            'recent_backups' => BackupRecord::completed()
                ->latest()
                ->limit(10)
                ->get(),
            'failed_recent' => BackupRecord::failed()
                ->where('created_at', '>=', now()->subDay())
                ->get(),
        ]);
    }

    /**
     * Get all backup records with pagination
     */
    public function index(Request $request)
    {
        $query = BackupRecord::query();

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('tenant_slug')) {
            $query->where('tenant_slug', $request->tenant_slug);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $backups = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($backups);
    }

    /**
     * Trigger platform backup
     */
    public function backupPlatform(Request $request)
    {
        try {
            $record = $this->backupService->backupPlatform(
                triggeredBy: $request->user()->id,
                triggerType: 'manual'
            );

            return response()->json([
                'message' => 'Platform backup completed successfully',
                'backup' => $record,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Platform backup failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Trigger tenant backup
     */
    public function backupTenant(Request $request, string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $queue = $request->boolean('queue', false);

        if ($queue) {
            BackupTenantJob::dispatch(
                slug: $slug,
                triggeredBy: $request->user()->id,
                triggerType: 'manual'
            );

            return response()->json([
                'message' => 'Tenant backup job queued',
                'tenant' => $tenant->name,
            ]);
        }

        try {
            $record = $this->backupService->backupTenant(
                slug: $slug,
                triggeredBy: $request->user()->id,
                triggerType: 'manual'
            );

            return response()->json([
                'message' => 'Tenant backup completed successfully',
                'backup' => $record,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Tenant backup failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get tenant backup history
     */
    public function getTenantBackups(string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        $backups = BackupRecord::where('tenant_slug', $slug)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'tenant' => [
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'last_backup_at' => $tenant->last_backup_at,
                'last_backup_status' => $tenant->last_backup_status,
            ],
            'backups' => $backups,
        ]);
    }

    /**
     * Get available backups for restore
     */
    public function getAvailableRestores(string $slug)
    {
        $backups = $this->restoreService->getAvailableBackupsForTenant($slug);

        return response()->json([
            'backups' => $backups,
        ]);
    }

    /**
     * Initiate tenant restore (returns confirmation token)
     */
    public function initiateRestore(Request $request, string $slug)
    {
        $validated = $request->validate([
            'backup_id' => 'required|integer|exists:backup_records,id',
        ]);

        try {
            $record = $this->restoreService->restoreTenant(
                slug: $slug,
                backupId: $validated['backup_id'],
                triggeredBy: $request->user()->id
            );

            return response()->json([
                'message' => 'Restore initiated. Confirmation required.',
                'restore_id' => $record->id,
                'confirmation_required' => true,
                'backup_filename' => $record->backup_filename,
                'warning' => 'This will PERMANENTLY OVERWRITE all current data for this tenant.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to initiate restore',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Confirm and execute restore
     */
    public function confirmRestore(Request $request, int $restoreId)
    {
        $validated = $request->validate([
            'confirmation_token' => 'required|string',
            'confirmation_slug' => 'required|string', // User must type tenant slug
            'queue' => 'boolean',
        ]);

        $record = RestoreRecord::findOrFail($restoreId);

        // Verify user typed correct slug
        if ($validated['confirmation_slug'] !== $record->tenant_slug) {
            return response()->json([
                'message' => 'Confirmation slug does not match',
            ], 400);
        }

        // Queue or execute immediately
        if ($request->boolean('queue', true)) {
            RestoreTenantJob::dispatch(
                recordId: $restoreId,
                confirmationToken: $validated['confirmation_token']
            );

            return response()->json([
                'message' => 'Restore job queued',
                'restore_id' => $restoreId,
                'status' => 'queued',
            ]);
        }

        try {
            $result = $this->restoreService->executeRestoreTenant(
                recordId: $restoreId,
                confirmationToken: $validated['confirmation_token']
            );

            return response()->json([
                'message' => 'Restore completed successfully',
                'restore' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Restore failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get restore progress
     */
    public function getRestoreProgress(int $restoreId)
    {
        $progress = $this->restoreService->getRestoreProgress($restoreId);

        return response()->json($progress);
    }

    /**
     * Get all restore records
     */
    public function getRestoreHistory(Request $request)
    {
        $query = RestoreRecord::query();

        if ($request->has('tenant_slug')) {
            $query->where('tenant_slug', $request->tenant_slug);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $records = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($records);
    }

    /**
     * Download backup file
     */
    public function downloadBackup(int $backupId)
    {
        $backup = BackupRecord::findOrFail($backupId);

        $path = $this->backupService->downloadBackup($backupId);

        if (!$path) {
            return response()->json([
                'message' => 'Backup file not available',
            ], 404);
        }

        return response()->download($path, $backup->filename);
    }

    /**
     * Delete backup record
     */
    public function deleteBackup(int $backupId)
    {
        $backup = BackupRecord::findOrFail($backupId);

        // Delete file
        if (\Storage::disk($backup->disk)->exists($backup->filepath)) {
            \Storage::disk($backup->disk)->delete($backup->filepath);
        }

        $backup->delete();

        return response()->json([
            'message' => 'Backup deleted successfully',
        ]);
    }

    /**
     * Run cleanup job
     */
    public function runCleanup()
    {
        $result = $this->backupService->cleanupOldBackups();

        return response()->json([
            'message' => 'Cleanup completed',
            'deleted' => $result,
        ]);
    }
}

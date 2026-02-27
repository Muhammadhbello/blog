<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    /**
     * Log an audit entry for the current tenant
     */
    protected function auditLog(
        string $action,
        string $module,
        string $entityType,
        mixed $entityId = null,
        array $details = [],
        ?string $oldValues = null,
        ?string $newValues = null
    ): void {
        try {
            $user = Auth::user();
            
            DB::connection('tenant')->table('audit_logs')->insert([
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'user_email' => $user?->email,
                'user_role' => $user?->role,
                'action' => $action,
                'module' => $module,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'details' => json_encode($details),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'is_impersonation' => session()->get('is_impersonation', false),
                'impersonator_id' => session()->get('impersonator_id'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Silent fail - don't break the main operation for audit logging
            \Log::warning('Audit log failed: ' . $e->getMessage());
        }
    }

    /**
     * Log a create action
     */
    protected function auditCreate(string $module, string $entityType, mixed $entityId, array $data = []): void
    {
        $this->auditLog(
            'create',
            $module,
            $entityType,
            $entityId,
            ['action_description' => "Created {$entityType}"],
            null,
            json_encode($this->sanitizeForAudit($data))
        );
    }

    /**
     * Log an update action
     */
    protected function auditUpdate(string $module, string $entityType, mixed $entityId, array $oldData = [], array $newData = []): void
    {
        $changes = $this->getChanges($oldData, $newData);
        
        if (empty($changes['changed_fields'])) {
            return; // No actual changes
        }

        $this->auditLog(
            'update',
            $module,
            $entityType,
            $entityId,
            [
                'action_description' => "Updated {$entityType}",
                'changed_fields' => $changes['changed_fields'],
            ],
            json_encode($this->sanitizeForAudit($changes['old'])),
            json_encode($this->sanitizeForAudit($changes['new']))
        );
    }

    /**
     * Log a delete action
     */
    protected function auditDelete(string $module, string $entityType, mixed $entityId, array $data = []): void
    {
        $this->auditLog(
            'delete',
            $module,
            $entityType,
            $entityId,
            ['action_description' => "Deleted {$entityType}"],
            json_encode($this->sanitizeForAudit($data)),
            null
        );
    }

    /**
     * Log a view/access action (for sensitive data)
     */
    protected function auditAccess(string $module, string $entityType, mixed $entityId, string $description = ''): void
    {
        $this->auditLog(
            'access',
            $module,
            $entityType,
            $entityId,
            ['action_description' => $description ?: "Accessed {$entityType}"]
        );
    }

    /**
     * Log a bulk action
     */
    protected function auditBulk(string $action, string $module, string $entityType, array $entityIds, array $details = []): void
    {
        $this->auditLog(
            "bulk_{$action}",
            $module,
            $entityType,
            null,
            array_merge([
                'action_description' => "Bulk {$action} on {$entityType}",
                'affected_ids' => $entityIds,
                'affected_count' => count($entityIds),
            ], $details)
        );
    }

    /**
     * Get changes between old and new data
     */
    protected function getChanges(array $old, array $new): array
    {
        $changedFields = [];
        $oldChanges = [];
        $newChanges = [];

        foreach ($new as $key => $value) {
            if (!isset($old[$key]) || $old[$key] !== $value) {
                $changedFields[] = $key;
                $oldChanges[$key] = $old[$key] ?? null;
                $newChanges[$key] = $value;
            }
        }

        return [
            'changed_fields' => $changedFields,
            'old' => $oldChanges,
            'new' => $newChanges,
        ];
    }

    /**
     * Sanitize data for audit log (remove sensitive fields)
     */
    protected function sanitizeForAudit(array $data): array
    {
        $sensitiveFields = [
            'password',
            'password_confirmation',
            'secret_key',
            'api_key',
            'webhook_secret',
            'token',
            'access_token',
            'refresh_token',
        ];

        foreach ($sensitiveFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = '[REDACTED]';
            }
        }

        return $data;
    }
}

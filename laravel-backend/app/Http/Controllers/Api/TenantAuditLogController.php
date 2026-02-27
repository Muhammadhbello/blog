<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TenantAuditLogController extends Controller
{
    /**
     * Get paginated audit logs with filters
     */
    public function index(Request $request)
    {
        $query = DB::connection('tenant')->table('audit_logs');

        // Apply filters
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        if ($request->has('module') && $request->module) {
            $query->where('module', $request->module);
        }

        if ($request->has('entity_type') && $request->entity_type) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->where('created_at', '>=', Carbon::parse($request->date_from)->startOfDay());
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('created_at', '<=', Carbon::parse($request->date_to)->endOfDay());
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('entity_type', 'like', "%{$search}%")
                  ->orWhere('details', 'like', "%{$search}%");
            });
        }

        // Only show impersonation logs if requested
        if ($request->has('impersonation_only') && $request->impersonation_only) {
            $query->where('is_impersonation', true);
        }

        $perPage = $request->get('per_page', 50);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Parse JSON fields
        $logs->getCollection()->transform(function ($log) {
            $log->details = json_decode($log->details, true);
            $log->old_values = json_decode($log->old_values, true);
            $log->new_values = json_decode($log->new_values, true);
            return $log;
        });

        return response()->json($logs);
    }

    /**
     * Get audit log statistics
     */
    public function stats(Request $request)
    {
        $range = $request->get('range', 'week');
        $startDate = match($range) {
            'today' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => now()->startOfWeek(),
        };

        // Total counts by action type
        $actionCounts = DB::connection('tenant')
            ->table('audit_logs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw('action, COUNT(*) as count')
            ->groupBy('action')
            ->get()
            ->pluck('count', 'action');

        // Counts by module
        $moduleCounts = DB::connection('tenant')
            ->table('audit_logs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw('module, COUNT(*) as count')
            ->groupBy('module')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Most active users
        $activeUsers = DB::connection('tenant')
            ->table('audit_logs')
            ->where('created_at', '>=', $startDate)
            ->whereNotNull('user_id')
            ->selectRaw('user_id, user_name, user_email, COUNT(*) as activity_count')
            ->groupBy('user_id', 'user_name', 'user_email')
            ->orderByDesc('activity_count')
            ->limit(10)
            ->get();

        // Activity by hour
        $hourlyActivity = DB::connection('tenant')
            ->table('audit_logs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Impersonation events
        $impersonationCount = DB::connection('tenant')
            ->table('audit_logs')
            ->where('created_at', '>=', $startDate)
            ->where('is_impersonation', true)
            ->count();

        // Recent critical actions
        $criticalActions = DB::connection('tenant')
            ->table('audit_logs')
            ->where('created_at', '>=', $startDate)
            ->whereIn('action', ['delete', 'bulk_delete', 'update'])
            ->whereIn('module', ['settings', 'users', 'invoices', 'payments'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'action_counts' => $actionCounts,
            'module_counts' => $moduleCounts,
            'active_users' => $activeUsers,
            'hourly_activity' => $hourlyActivity,
            'impersonation_count' => $impersonationCount,
            'critical_actions' => $criticalActions->map(function($log) {
                $log->details = json_decode($log->details, true);
                return $log;
            }),
            'total_logs' => DB::connection('tenant')
                ->table('audit_logs')
                ->where('created_at', '>=', $startDate)
                ->count(),
            'date_range' => [
                'start' => $startDate->toDateTimeString(),
                'end' => now()->toDateTimeString(),
                'label' => $range,
            ],
        ]);
    }

    /**
     * Get available modules for filtering
     */
    public function modules()
    {
        $modules = DB::connection('tenant')
            ->table('audit_logs')
            ->distinct()
            ->pluck('module');

        return response()->json($modules);
    }

    /**
     * Get available actions for filtering
     */
    public function actions()
    {
        $actions = DB::connection('tenant')
            ->table('audit_logs')
            ->distinct()
            ->pluck('action');

        return response()->json($actions);
    }

    /**
     * Get audit logs for a specific entity
     */
    public function entityHistory(Request $request, string $entityType, string $entityId)
    {
        $logs = DB::connection('tenant')
            ->table('audit_logs')
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                $log->details = json_decode($log->details, true);
                $log->old_values = json_decode($log->old_values, true);
                $log->new_values = json_decode($log->new_values, true);
                return $log;
            });

        return response()->json($logs);
    }

    /**
     * Export audit logs
     */
    public function export(Request $request)
    {
        $query = DB::connection('tenant')->table('audit_logs');

        // Apply same filters as index
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->date_from));
        }
        if ($request->has('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($request->date_to));
        }
        if ($request->has('module')) {
            $query->where('module', $request->module);
        }
        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->orderBy('created_at', 'desc')->limit(10000)->get();

        // Convert to CSV format
        $csv = "ID,Timestamp,User,Email,Role,Action,Module,Entity Type,Entity ID,IP Address,Is Impersonation\n";
        
        foreach ($logs as $log) {
            $csv .= implode(',', [
                $log->id,
                $log->created_at,
                '"' . addslashes($log->user_name ?? 'System') . '"',
                $log->user_email ?? '',
                $log->user_role ?? '',
                $log->action,
                $log->module,
                $log->entity_type,
                $log->entity_id ?? '',
                $log->ip_address ?? '',
                $log->is_impersonation ? 'Yes' : 'No',
            ]) . "\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="audit_logs_' . now()->format('Y-m-d') . '.csv"');
    }
}

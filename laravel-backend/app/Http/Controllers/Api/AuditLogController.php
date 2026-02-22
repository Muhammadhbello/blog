<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AuditLog;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with(['user:id,name,email,role', 'tenant:id,name']);

        // Platform admin sees all logs
        if (auth()->user()->role !== 'super_admin') {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        // Filters
        if ($request->has('module')) {
            $query->where('module', $request->module);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('module', 'like', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $logs = $query->orderBy('created_at', 'desc')
                      ->paginate($request->per_page ?? 20);

        return response()->json($logs);
    }

    public function stats(Request $request)
    {
        $query = AuditLog::query();

        if (auth()->user()->role !== 'super_admin') {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $stats = [
            'total_logs' => $query->count(),
            'today_logs' => (clone $query)->whereDate('created_at', today())->count(),
            'this_week' => (clone $query)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'by_action' => (clone $query)->selectRaw('action, count(*) as count')
                                         ->groupBy('action')
                                         ->pluck('count', 'action'),
            'by_module' => (clone $query)->selectRaw('module, count(*) as count')
                                         ->whereNotNull('module')
                                         ->groupBy('module')
                                         ->pluck('count', 'module'),
            'recent_users' => (clone $query)->with('user:id,name')
                                            ->selectRaw('user_id, count(*) as count')
                                            ->groupBy('user_id')
                                            ->orderBy('count', 'desc')
                                            ->limit(5)
                                            ->get(),
        ];

        return response()->json($stats);
    }

    public function modules()
    {
        $modules = AuditLog::select('module')
                          ->whereNotNull('module')
                          ->distinct()
                          ->pluck('module');

        return response()->json($modules);
    }

    public function actions()
    {
        $actions = AuditLog::select('action')
                          ->distinct()
                          ->pluck('action');

        return response()->json($actions);
    }
}

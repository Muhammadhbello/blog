<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CollectorAssignment;
use App\Models\User;
use App\Models\AuditLog;

class CollectorAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;

        $query = CollectorAssignment::with([
            'collector:id,name,email,phone',
            'ward:id,name,code',
            'revenuePoint:id,name,code'
        ])->where('tenant_id', $tenantId);

        if ($request->has('collector_id')) {
            $query->where('collector_id', $request->collector_id);
        }

        if ($request->has('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $assignments = $query->orderBy('assigned_date', 'desc')
                            ->paginate($request->per_page ?? 20);

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $currentUser = auth()->user();
        
        $validated = $request->validate([
            'collector_id' => 'required|exists:users,id',
            'revenue_point_id' => 'nullable|exists:revenue_points,id',
            'ward_id' => 'nullable|exists:wards,id',
            'assigned_date' => 'required|date',
            'end_date' => 'nullable|date|after:assigned_date',
            'notes' => 'nullable|string',
        ]);

        // Verify collector belongs to same tenant and is a collector
        $collector = User::findOrFail($validated['collector_id']);
        if ($collector->tenant_id !== $currentUser->tenant_id || $collector->role !== 'collector') {
            return response()->json(['message' => 'Invalid collector'], 422);
        }

        $validated['tenant_id'] = $currentUser->tenant_id;
        $validated['status'] = 'active';

        $assignment = CollectorAssignment::create($validated);

        // Update collector's assigned wards/points
        $collector->update([
            'assigned_wards' => array_unique(array_merge(
                $collector->assigned_wards ?? [],
                $validated['ward_id'] ? [$validated['ward_id']] : []
            )),
            'assigned_revenue_points' => array_unique(array_merge(
                $collector->assigned_revenue_points ?? [],
                $validated['revenue_point_id'] ? [$validated['revenue_point_id']] : []
            )),
        ]);

        AuditLog::log(
            'create',
            'collector_assignments',
            'CollectorAssignment',
            $assignment->id,
            [
                'collector_name' => $collector->name,
                'ward_id' => $validated['ward_id'] ?? null,
                'revenue_point_id' => $validated['revenue_point_id'] ?? null,
            ]
        );

        return response()->json($assignment->load(['collector', 'ward', 'revenuePoint']), 201);
    }

    public function show(CollectorAssignment $collectorAssignment)
    {
        if ($collectorAssignment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($collectorAssignment->load(['collector', 'ward', 'revenuePoint']));
    }

    public function update(Request $request, CollectorAssignment $collectorAssignment)
    {
        if ($collectorAssignment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'end_date' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive,completed',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $collectorAssignment->toArray();
        $collectorAssignment->update($validated);

        AuditLog::log(
            'update',
            'collector_assignments',
            'CollectorAssignment',
            $collectorAssignment->id,
            null,
            $oldValues,
            $collectorAssignment->fresh()->toArray()
        );

        return response()->json($collectorAssignment);
    }

    public function destroy(CollectorAssignment $collectorAssignment)
    {
        if ($collectorAssignment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        AuditLog::log(
            'delete',
            'collector_assignments',
            'CollectorAssignment',
            $collectorAssignment->id,
            ['collector_id' => $collectorAssignment->collector_id]
        );

        $collectorAssignment->delete();

        return response()->json(['message' => 'Assignment deleted successfully']);
    }

    public function getCollectors()
    {
        $tenantId = auth()->user()->tenant_id;

        $collectors = User::where('tenant_id', $tenantId)
                         ->where('role', 'collector')
                         ->where('is_active', true)
                         ->withCount('collectorAssignments')
                         ->get(['id', 'name', 'email', 'phone']);

        return response()->json($collectors);
    }

    public function getMyAssignments()
    {
        $user = auth()->user();

        if ($user->role !== 'collector') {
            return response()->json(['message' => 'Not a collector'], 403);
        }

        $assignments = CollectorAssignment::with(['ward', 'revenuePoint'])
                                         ->where('collector_id', $user->id)
                                         ->where('status', 'active')
                                         ->get();

        return response()->json($assignments);
    }

    public function stats()
    {
        $tenantId = auth()->user()->tenant_id;

        $stats = [
            'total_collectors' => User::where('tenant_id', $tenantId)
                                      ->where('role', 'collector')
                                      ->count(),
            'active_assignments' => CollectorAssignment::where('tenant_id', $tenantId)
                                                       ->where('status', 'active')
                                                       ->count(),
            'by_ward' => CollectorAssignment::where('tenant_id', $tenantId)
                                            ->where('status', 'active')
                                            ->whereNotNull('ward_id')
                                            ->with('ward:id,name')
                                            ->selectRaw('ward_id, count(*) as count')
                                            ->groupBy('ward_id')
                                            ->get(),
        ];

        return response()->json($stats);
    }
}

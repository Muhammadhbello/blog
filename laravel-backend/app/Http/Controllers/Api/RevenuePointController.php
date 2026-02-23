<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;

class RevenuePointController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::connection('tenant')
            ->table('revenue_points')
            ->leftJoin('wards', 'revenue_points.ward_id', '=', 'wards.id')
            ->select('revenue_points.*', 'wards.name as ward_name');

        if ($request->has('ward_id')) {
            $query->where('revenue_points.ward_id', $request->ward_id);
        }

        if ($request->has('is_active')) {
            $query->where('revenue_points.is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('revenue_points.name', 'like', "%{$search}%")
                  ->orWhere('revenue_points.code', 'like', "%{$search}%")
                  ->orWhere('revenue_points.address', 'like', "%{$search}%");
            });
        }

        $points = $query->orderBy('revenue_points.name')->get();

        return response()->json($points);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'ward_id' => 'required|integer',
            'address' => 'nullable|string',
            'coordinates' => 'nullable|string',
            'type' => 'nullable|string|max:100',
            'closing_frequency' => 'required|in:daily,weekly',
            'description' => 'nullable|string',
        ]);

        // Check for duplicate code
        $existingCode = DB::connection('tenant')
            ->table('revenue_points')
            ->where('code', $validated['code'])
            ->first();

        if ($existingCode) {
            return response()->json(['message' => 'Revenue point code already exists'], 422);
        }

        $id = DB::connection('tenant')->table('revenue_points')->insertGetId([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'ward_id' => $validated['ward_id'],
            'address' => $validated['address'] ?? null,
            'coordinates' => $validated['coordinates'] ?? null,
            'type' => $validated['type'] ?? 'general',
            'closing_frequency' => $validated['closing_frequency'],
            'description' => $validated['description'] ?? null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->logAudit('create', 'revenue_points', $id, ['name' => $validated['name'], 'code' => $validated['code']]);

        return response()->json([
            'message' => 'Revenue point created successfully',
            'id' => $id,
        ], 201);
    }

    public function show($id)
    {
        $point = DB::connection('tenant')
            ->table('revenue_points')
            ->leftJoin('wards', 'revenue_points.ward_id', '=', 'wards.id')
            ->select('revenue_points.*', 'wards.name as ward_name')
            ->where('revenue_points.id', $id)
            ->first();

        if (!$point) {
            return response()->json(['message' => 'Revenue point not found'], 404);
        }

        // Get assigned collectors/consultants
        $assignments = DB::connection('tenant')
            ->table('ticket_batches')
            ->where('revenue_point_id', $id)
            ->where('status', 'active')
            ->get();

        $point->active_batches = $assignments;

        return response()->json($point);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50',
            'ward_id' => 'sometimes|integer',
            'address' => 'nullable|string',
            'coordinates' => 'nullable|string',
            'type' => 'nullable|string|max:100',
            'closing_frequency' => 'sometimes|in:daily,weekly',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $point = DB::connection('tenant')
            ->table('revenue_points')
            ->where('id', $id)
            ->first();

        if (!$point) {
            return response()->json(['message' => 'Revenue point not found'], 404);
        }

        // Check for duplicate code if changed
        if (isset($validated['code']) && $validated['code'] !== $point->code) {
            $existingCode = DB::connection('tenant')
                ->table('revenue_points')
                ->where('code', $validated['code'])
                ->where('id', '!=', $id)
                ->first();

            if ($existingCode) {
                return response()->json(['message' => 'Revenue point code already exists'], 422);
            }
            $validated['code'] = strtoupper($validated['code']);
        }

        $validated['updated_at'] = now();

        DB::connection('tenant')
            ->table('revenue_points')
            ->where('id', $id)
            ->update($validated);

        $this->logAudit('update', 'revenue_points', $id, $validated);

        return response()->json(['message' => 'Revenue point updated successfully']);
    }

    public function destroy($id)
    {
        $point = DB::connection('tenant')
            ->table('revenue_points')
            ->where('id', $id)
            ->first();

        if (!$point) {
            return response()->json(['message' => 'Revenue point not found'], 404);
        }

        // Check if has active batches
        $activeBatches = DB::connection('tenant')
            ->table('ticket_batches')
            ->where('revenue_point_id', $id)
            ->where('status', 'active')
            ->count();

        if ($activeBatches > 0) {
            return response()->json(['message' => 'Cannot delete revenue point with active ticket batches'], 422);
        }

        DB::connection('tenant')
            ->table('revenue_points')
            ->where('id', $id)
            ->delete();

        $this->logAudit('delete', 'revenue_points', $id, ['name' => $point->name]);

        return response()->json(['message' => 'Revenue point deleted successfully']);
    }

    public function stats()
    {
        $stats = [
            'total' => DB::connection('tenant')->table('revenue_points')->count(),
            'active' => DB::connection('tenant')->table('revenue_points')->where('is_active', true)->count(),
            'by_ward' => DB::connection('tenant')
                ->table('revenue_points')
                ->join('wards', 'revenue_points.ward_id', '=', 'wards.id')
                ->selectRaw('wards.name as ward, COUNT(*) as count')
                ->groupBy('wards.id', 'wards.name')
                ->get(),
            'by_type' => DB::connection('tenant')
                ->table('revenue_points')
                ->selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->get(),
        ];

        return response()->json($stats);
    }

    protected function logAudit(string $action, string $module, int $entityId, array $details): void
    {
        DB::connection('tenant')->table('tenant_audit_logs')->insert([
            'user_id' => auth()->id(),
            'user_type' => 'tenant_user',
            'action' => $action,
            'module' => $module,
            'entity_type' => 'RevenuePoint',
            'entity_id' => $entityId,
            'details' => json_encode($details),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Hash;

class TenantUserController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;

        $query = User::with(['department:id,name', 'roles:id,name'])
                     ->where('tenant_id', $tenantId);

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
                       ->paginate($request->per_page ?? 20);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $currentUser = auth()->user();
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:chairman,treasurer,hod,consultant,collector',
            'department_id' => 'nullable|exists:departments,id',
            'assigned_wards' => 'nullable|array',
            'assigned_revenue_points' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['tenant_id'] = $currentUser->tenant_id;

        $user = User::create($validated);

        // Assign role if provided
        if ($request->has('role_ids')) {
            $user->roles()->sync($request->role_ids);
        }

        AuditLog::log(
            'create',
            'tenant_users',
            'User',
            $user->id,
            ['user_name' => $user->name, 'role' => $user->role]
        );

        return response()->json($user->load(['department', 'roles']), 201);
    }

    public function show(User $user)
    {
        // Ensure user belongs to same tenant
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user->load(['department', 'roles', 'collectorAssignments.ward', 'collectorAssignments.revenuePoint']);
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        // Ensure user belongs to same tenant
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'sometimes|in:chairman,treasurer,hod,consultant,collector',
            'department_id' => 'nullable|exists:departments,id',
            'assigned_wards' => 'nullable|array',
            'assigned_revenue_points' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $oldValues = $user->toArray();

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        // Update roles if provided
        if ($request->has('role_ids')) {
            $user->roles()->sync($request->role_ids);
        }

        AuditLog::log(
            'update',
            'tenant_users',
            'User',
            $user->id,
            ['user_name' => $user->name],
            $oldValues,
            $user->fresh()->toArray()
        );

        return response()->json($user->load(['department', 'roles']));
    }

    public function destroy(User $user)
    {
        // Ensure user belongs to same tenant
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Prevent self-deletion
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        // Prevent deleting the last chairman
        if ($user->role === 'chairman') {
            $chairmanCount = User::where('tenant_id', $user->tenant_id)
                                 ->where('role', 'chairman')
                                 ->count();
            if ($chairmanCount <= 1) {
                return response()->json(['message' => 'Cannot delete the last chairman'], 403);
            }
        }

        AuditLog::log(
            'delete',
            'tenant_users',
            'User',
            $user->id,
            ['user_name' => $user->name, 'email' => $user->email, 'role' => $user->role]
        );

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function assignRoles(Request $request, User $user)
    {
        // Ensure user belongs to same tenant
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $user->roles()->sync($validated['role_ids']);

        AuditLog::log(
            'assign_roles',
            'tenant_users',
            'User',
            $user->id,
            ['user_name' => $user->name, 'role_count' => count($validated['role_ids'])]
        );

        return response()->json($user->load('roles'));
    }

    public function stats()
    {
        $tenantId = auth()->user()->tenant_id;

        $stats = [
            'total_users' => User::where('tenant_id', $tenantId)->count(),
            'active_users' => User::where('tenant_id', $tenantId)->where('is_active', true)->count(),
            'by_role' => User::where('tenant_id', $tenantId)
                            ->selectRaw('role, count(*) as count')
                            ->groupBy('role')
                            ->pluck('count', 'role'),
            'by_department' => User::where('tenant_id', $tenantId)
                                   ->whereNotNull('department_id')
                                   ->with('department:id,name')
                                   ->selectRaw('department_id, count(*) as count')
                                   ->groupBy('department_id')
                                   ->get(),
            'recent_logins' => User::where('tenant_id', $tenantId)
                                   ->whereNotNull('last_login_at')
                                   ->orderBy('last_login_at', 'desc')
                                   ->limit(5)
                                   ->get(['id', 'name', 'role', 'last_login_at']),
        ];

        return response()->json($stats);
    }
}

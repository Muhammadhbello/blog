<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Hash;

class PlatformUserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['tenant:id,name,slug']);

        // Only show platform users (no tenant) or all users for super admin
        if ($request->has('platform_only') && $request->platform_only) {
            $query->whereNull('tenant_id');
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:super_admin,support_admin',
            'is_active' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['tenant_id'] = null; // Platform users have no tenant

        $user = User::create($validated);

        AuditLog::log(
            'create',
            'platform_users',
            'User',
            $user->id,
            ['user_name' => $user->name, 'role' => $user->role]
        );

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load(['tenant:id,name,slug', 'roles']);
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'sometimes|in:super_admin,support_admin',
            'is_active' => 'boolean',
        ]);

        $oldValues = $user->toArray();

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        AuditLog::log(
            'update',
            'platform_users',
            'User',
            $user->id,
            ['user_name' => $user->name],
            $oldValues,
            $user->fresh()->toArray()
        );

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        // Prevent self-deletion
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        AuditLog::log(
            'delete',
            'platform_users',
            'User',
            $user->id,
            ['user_name' => $user->name, 'email' => $user->email]
        );

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function stats()
    {
        $stats = [
            'total_platform_users' => User::whereNull('tenant_id')->count(),
            'total_tenant_users' => User::whereNotNull('tenant_id')->count(),
            'active_users' => User::where('is_active', true)->count(),
            'by_role' => User::selectRaw('role, count(*) as count')
                            ->groupBy('role')
                            ->pluck('count', 'role'),
            'recent_logins' => User::whereNotNull('last_login_at')
                                   ->orderBy('last_login_at', 'desc')
                                   ->limit(10)
                                   ->get(['id', 'name', 'email', 'role', 'last_login_at']),
        ];

        return response()->json($stats);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Role;
use App\Models\AuditLog;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = Role::withCount('users');

        // Tenant admins only see their tenant's roles
        if ($user->tenant_id) {
            $query->where(function($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id)
                  ->orWhereNull('tenant_id'); // Also show system roles
            });
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        $roles = $query->orderBy('is_system', 'desc')
                       ->orderBy('name')
                       ->get();

        return response()->json($roles);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'required|array',
        ]);

        $validated['slug'] = \Str::slug($validated['name']) . '-' . uniqid();
        $validated['tenant_id'] = $user->tenant_id;
        $validated['is_system'] = false;

        $role = Role::create($validated);

        AuditLog::log(
            'create',
            'roles',
            'Role',
            $role->id,
            ['role_name' => $role->name, 'permissions_count' => count($validated['permissions'])]
        );

        return response()->json($role, 201);
    }

    public function show(Role $role)
    {
        $role->load('users:id,name,email');
        $role->loadCount('users');
        return response()->json($role);
    }

    public function update(Request $request, Role $role)
    {
        // Prevent editing system roles
        if ($role->is_system) {
            return response()->json(['message' => 'Cannot edit system roles'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'sometimes|array',
        ]);

        $oldValues = $role->toArray();
        $role->update($validated);

        AuditLog::log(
            'update',
            'roles',
            'Role',
            $role->id,
            ['role_name' => $role->name],
            $oldValues,
            $role->fresh()->toArray()
        );

        return response()->json($role);
    }

    public function destroy(Role $role)
    {
        // Prevent deleting system roles
        if ($role->is_system) {
            return response()->json(['message' => 'Cannot delete system roles'], 403);
        }

        // Prevent deleting roles with users
        if ($role->users()->count() > 0) {
            return response()->json(['message' => 'Cannot delete role with assigned users'], 403);
        }

        AuditLog::log(
            'delete',
            'roles',
            'Role',
            $role->id,
            ['role_name' => $role->name]
        );

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    public function permissions()
    {
        return response()->json(Role::getDefaultPermissions());
    }

    public function assignUsers(Request $request, Role $role)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $role->users()->sync($validated['user_ids']);

        AuditLog::log(
            'assign_users',
            'roles',
            'Role',
            $role->id,
            ['role_name' => $role->name, 'user_count' => count($validated['user_ids'])]
        );

        return response()->json(['message' => 'Users assigned successfully']);
    }

    public function initSystemRoles()
    {
        $systemRoles = [
            [
                'name' => 'Chairman',
                'slug' => 'chairman',
                'description' => 'Full access to all tenant features',
                'permissions' => ['*'],
                'is_system' => true,
            ],
            [
                'name' => 'Treasurer',
                'slug' => 'treasurer',
                'description' => 'Financial management and reporting',
                'permissions' => [
                    'dashboard.view', 'analytics.view',
                    'invoices.view', 'invoices.create', 'invoices.edit',
                    'businesses.view',
                    'transactions.view',
                    'defaulters.view', 'defaulters.remind',
                ],
                'is_system' => true,
            ],
            [
                'name' => 'HOD',
                'slug' => 'hod',
                'description' => 'Department head with scoped access',
                'permissions' => [
                    'dashboard.view',
                    'wards.view',
                    'revenue_items.view',
                    'businesses.view', 'businesses.create', 'businesses.edit',
                    'invoices.view', 'invoices.create',
                    'collectors.view', 'collectors.assign',
                ],
                'is_system' => true,
            ],
            [
                'name' => 'Consultant',
                'slug' => 'consultant',
                'description' => 'External consultant with limited access',
                'permissions' => [
                    'dashboard.view',
                    'businesses.view',
                    'invoices.view', 'invoices.create',
                    'analytics.view',
                ],
                'is_system' => true,
            ],
            [
                'name' => 'Collector',
                'slug' => 'collector',
                'description' => 'Field collector with collection access',
                'permissions' => [
                    'dashboard.view',
                    'businesses.view',
                    'tickets.view', 'tickets.sell', 'tickets.verify',
                    'invoices.view',
                ],
                'is_system' => true,
            ],
        ];

        foreach ($systemRoles as $roleData) {
            Role::firstOrCreate(
                ['slug' => $roleData['slug'], 'tenant_id' => null],
                $roleData
            );
        }

        return response()->json(['message' => 'System roles initialized']);
    }
}

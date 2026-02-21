<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Department;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::with(['tenant', 'headOfDept']);

        if (auth()->user()->tenant_id) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $departments = $query->orderBy('name')->get();

        return response()->json($departments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'name' => 'required|string|max:255',
            'head_of_dept_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
        ]);

        $department = Department::create($validated);

        return response()->json($department->load('headOfDept'), 201);
    }

    public function show(Department $department)
    {
        if (auth()->user()->tenant_id && $department->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($department->load(['tenant', 'headOfDept']));
    }

    public function update(Request $request, Department $department)
    {
        if (auth()->user()->tenant_id && $department->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'head_of_dept_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
        ]);

        $department->update($validated);

        return response()->json($department->load('headOfDept'));
    }

    public function destroy(Department $department)
    {
        if (auth()->user()->tenant_id && $department->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $department->delete();
        return response()->json(['message' => 'Department deleted successfully']);
    }
}

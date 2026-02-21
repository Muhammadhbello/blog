<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ward;

class WardController extends Controller
{
    public function index(Request $request)
    {
        $query = Ward::with('tenant');

        if (auth()->user()->tenant_id) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $wards = $query->orderBy('name')->get();

        return response()->json($wards);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:wards|max:20',
            'description' => 'nullable|string',
        ]);

        $ward = Ward::create($validated);

        return response()->json($ward, 201);
    }

    public function show(Ward $ward)
    {
        if (auth()->user()->tenant_id && $ward->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($ward->load(['tenant', 'revenuePoints']));
    }

    public function update(Request $request, Ward $ward)
    {
        if (auth()->user()->tenant_id && $ward->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $ward->update($validated);

        return response()->json($ward);
    }

    public function destroy(Ward $ward)
    {
        if (auth()->user()->tenant_id && $ward->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $ward->delete();
        return response()->json(['message' => 'Ward deleted successfully']);
    }
}

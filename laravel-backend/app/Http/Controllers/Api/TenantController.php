<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;

class TenantController extends Controller
{
    public function index()
    {
        $tenants = Tenant::all();
        return response()->json($tenants);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:tenants|max:255',
            'logo_url' => 'nullable|url',
            'brand_color' => 'nullable|string|max:7',
            'revenue_share_model' => 'required|in:percentage,fixed',
            'share_value' => 'required|numeric|min:0',
        ]);

        $tenant = Tenant::create($validated);

        return response()->json($tenant, 201);
    }

    public function show(Tenant $tenant)
    {
        return response()->json($tenant);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'logo_url' => 'nullable|url',
            'brand_color' => 'nullable|string|max:7',
            'revenue_share_model' => 'sometimes|in:percentage,fixed',
            'share_value' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:active,suspended,inactive',
        ]);

        $tenant->update($validated);

        return response()->json($tenant);
    }

    public function destroy(Tenant $tenant)
    {
        $tenant->delete();
        return response()->json(['message' => 'Tenant deleted successfully']);
    }
}

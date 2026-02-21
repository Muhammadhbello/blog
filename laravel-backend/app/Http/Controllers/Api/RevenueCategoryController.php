<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RevenueCategory;

class RevenueCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = RevenueCategory::with(['tenant', 'revenueItems']);

        if (auth()->user()->tenant_id) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $categories = $query->orderBy('name')->get();

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:revenue_categories|max:50',
        ]);

        $category = RevenueCategory::create($validated);

        return response()->json($category, 201);
    }

    public function show(RevenueCategory $revenueCategory)
    {
        if (auth()->user()->tenant_id && $revenueCategory->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($revenueCategory->load(['tenant', 'revenueItems']));
    }

    public function update(Request $request, RevenueCategory $revenueCategory)
    {
        if (auth()->user()->tenant_id && $revenueCategory->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
        ]);

        $revenueCategory->update($validated);

        return response()->json($revenueCategory);
    }

    public function destroy(RevenueCategory $revenueCategory)
    {
        if (auth()->user()->tenant_id && $revenueCategory->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $revenueCategory->delete();
        return response()->json(['message' => 'Category deleted successfully']);
    }
}

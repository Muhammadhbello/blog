<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RevenueItem;

class RevenueItemController extends Controller
{
    public function index(Request $request)
    {
        $query = RevenueItem::with(['tenant', 'category']);

        if (auth()->user()->tenant_id) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $items = $query->orderBy('name')->get();

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'category_id' => 'required|exists:revenue_categories,id',
            'name' => 'required|string|max:255',
            'type' => 'required|in:ticket,invoice,license,permit',
            'frequency' => 'required|in:daily,weekly,monthly,annual,one_time',
            'default_amount' => 'required|numeric|min:0',
        ]);

        $item = RevenueItem::create($validated);

        return response()->json($item->load('category'), 201);
    }

    public function show(RevenueItem $revenueItem)
    {
        if (auth()->user()->tenant_id && $revenueItem->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($revenueItem->load(['tenant', 'category']));
    }

    public function update(Request $request, RevenueItem $revenueItem)
    {
        if (auth()->user()->tenant_id && $revenueItem->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'sometimes|exists:revenue_categories,id',
            'type' => 'sometimes|in:ticket,invoice,license,permit',
            'frequency' => 'sometimes|in:daily,weekly,monthly,annual,one_time',
            'default_amount' => 'sometimes|numeric|min:0',
        ]);

        $revenueItem->update($validated);

        return response()->json($revenueItem->load('category'));
    }

    public function destroy(RevenueItem $revenueItem)
    {
        if (auth()->user()->tenant_id && $revenueItem->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $revenueItem->delete();
        return response()->json(['message' => 'Revenue item deleted successfully']);
    }
}

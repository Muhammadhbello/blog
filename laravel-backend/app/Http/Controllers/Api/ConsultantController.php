<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ConsultantAssignment;
use App\Models\User;
use App\Models\RevenueItem;
use App\Models\RevenuePoint;

class ConsultantController extends Controller
{
    public function assignConsultant(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'consultant_id' => 'required|exists:users,id',
            'revenue_item_id' => 'nullable|exists:revenue_items,id',
            'revenue_point_id' => 'nullable|exists:revenue_points,id',
            'commission_rate' => 'required|numeric|min:0|max:100',
        ]);

        // Verify consultant role
        $consultant = User::find($validated['consultant_id']);
        if ($consultant->role !== 'consultant') {
            return response()->json(['message' => 'User is not a consultant'], 400);
        }

        $assignment = ConsultantAssignment::create([
            ...$validated,
            'status' => 'active',
        ]);

        return response()->json([
            'assignment' => $assignment->load(['consultant', 'revenueItem', 'revenuePoint']),
            'message' => 'Consultant assigned successfully',
        ], 201);
    }

    public function getAssignments(Request $request)
    {
        $query = ConsultantAssignment::with(['consultant', 'revenueItem', 'revenuePoint'])
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($request->has('consultant_id')) {
            $query->where('consultant_id', $request->consultant_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $assignments = $query->orderBy('created_at', 'desc')->get();

        return response()->json($assignments);
    }

    public function getConsultants()
    {
        $consultants = User::where('tenant_id', auth()->user()->tenant_id)
            ->where('role', 'consultant')
            ->where('is_active', true)
            ->get();

        return response()->json($consultants);
    }

    public function getScopedData(Request $request)
    {
        $user = auth()->user();

        if ($user->role !== 'consultant') {
            return response()->json(['message' => 'Not a consultant'], 403);
        }

        $assignments = ConsultantAssignment::where('consultant_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->where('status', 'active')
            ->with(['revenueItem', 'revenuePoint'])
            ->get();

        $revenueItemIds = $assignments->pluck('revenue_item_id')->filter()->toArray();
        $revenuePointIds = $assignments->pluck('revenue_point_id')->filter()->toArray();

        // Get scoped invoices
        $invoices = \App\Models\Invoice::where('tenant_id', $user->tenant_id)
            ->whereIn('revenue_item_id', $revenueItemIds)
            ->with(['business', 'revenueItem'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        // Get scoped transactions
        $transactions = \App\Models\Transaction::where('tenant_id', $user->tenant_id)
            ->whereHas('invoice', function($q) use ($revenueItemIds) {
                $q->whereIn('revenue_item_id', $revenueItemIds);
            })
            ->sum('amount_gross');

        return response()->json([
            'assignments' => $assignments,
            'invoices' => $invoices,
            'total_revenue' => $transactions,
            'assigned_items_count' => count($revenueItemIds),
            'assigned_points_count' => count($revenuePointIds),
        ]);
    }
}

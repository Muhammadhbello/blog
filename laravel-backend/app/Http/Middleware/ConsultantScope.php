<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ConsultantScope
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = auth()->user();

        // Only apply scoping to consultants
        if ($user->role !== 'consultant') {
            return $next($request);
        }

        // Get consultant's assignments
        $assignments = \App\Models\ConsultantAssignment::where('consultant_id', $user->id)
            ->where('status', 'active')
            ->get();

        $assignedRevenueItemIds = $assignments->pluck('revenue_item_id')->filter()->toArray();
        $assignedRevenuePointIds = $assignments->pluck('revenue_point_id')->filter()->toArray();

        // Store in request for use in controllers
        $request->merge([
            'consultant_scope' => [
                'revenue_item_ids' => $assignedRevenueItemIds,
                'revenue_point_ids' => $assignedRevenuePointIds,
            ]
        ]);

        return $next($request);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\ConsultantAssignment;
use App\Models\User;
use App\Models\RevenueItem;
use App\Models\RevenuePoint;

class ConsultantController extends Controller
{
    /**
     * Get consultant dashboard data
     */
    public function getDashboard(Request $request)
    {
        $userId = auth()->id();
        
        // Check if logged in as consultant
        $isConsultantLogin = str_starts_with($userId, 'consultant_');
        $consultantId = $isConsultantLogin ? str_replace('consultant_', '', $userId) : null;
        
        if (!$consultantId) {
            // Regular user with consultant role
            $user = auth()->user();
            if ($user->role !== 'consultant') {
                return response()->json(['message' => 'Not a consultant'], 403);
            }
            $consultantId = $user->id;
        }

        // Get consultant info from tenant DB
        $consultant = DB::connection('tenant')
            ->table('consultants')
            ->where('id', $consultantId)
            ->first();

        if (!$consultant) {
            return response()->json(['message' => 'Consultant not found'], 404);
        }

        // Get assignments with batch info
        $assignments = DB::connection('tenant')
            ->table('consultant_assignments as ca')
            ->join('revenue_points as rp', 'ca.revenue_point_id', '=', 'rp.id')
            ->leftJoin('ticket_batches as tb', function($join) use ($consultantId) {
                $join->on('tb.revenue_point_id', '=', 'rp.id')
                     ->where('tb.assigned_to', '=', $consultantId)
                     ->whereIn('tb.status', ['assigned', 'in_use']);
            })
            ->where('ca.consultant_id', $consultantId)
            ->where('ca.is_active', true)
            ->select(
                'ca.*',
                'rp.name as revenue_point_name',
                'rp.code as revenue_point_code',
                'tb.id as batch_id',
                'tb.batch_number',
                'tb.unit_price',
                DB::raw('(SELECT COUNT(*) FROM tickets WHERE batch_id = tb.id AND status = "available") as available_tickets')
            )
            ->get();

        // Get today's tickets sold
        $todayStart = now()->startOfDay();
        $weekStart = now()->startOfWeek();

        $todayTickets = DB::connection('tenant')
            ->table('tickets')
            ->where('sold_by', $consultantId)
            ->where('sold_at', '>=', $todayStart)
            ->select(
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(amount) as total')
            )
            ->first();

        $weekTickets = DB::connection('tenant')
            ->table('tickets')
            ->where('sold_by', $consultantId)
            ->where('sold_at', '>=', $weekStart)
            ->sum('amount');

        // Get pending closings
        $pendingClosings = DB::connection('tenant')
            ->table('closings')
            ->where('submitted_by', $consultantId)
            ->whereIn('status', ['pending', 'submitted'])
            ->count();

        // Recent tickets
        $recentTickets = DB::connection('tenant')
            ->table('tickets')
            ->join('revenue_points', 'tickets.revenue_point_id', '=', 'revenue_points.id')
            ->where('tickets.sold_by', $consultantId)
            ->where('tickets.status', 'sold')
            ->select('tickets.*', 'revenue_points.name as revenue_point_name')
            ->orderBy('tickets.sold_at', 'desc')
            ->limit(20)
            ->get();

        // Recent closings
        $recentClosings = DB::connection('tenant')
            ->table('closings')
            ->join('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->where('closings.submitted_by', $consultantId)
            ->select('closings.*', 'revenue_points.name as revenue_point_name')
            ->orderBy('closings.created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'consultant' => [
                'id' => $consultant->id,
                'name' => $consultant->name,
                'email' => $consultant->email,
                'phone' => $consultant->phone,
                'company_name' => $consultant->company_name,
                'commission_rate' => $consultant->commission_rate ?? 10,
                'total_collected' => $consultant->total_collected ?? 0,
                'total_commission' => $consultant->total_commission ?? 0,
            ],
            'stats' => [
                'today_collections' => $todayTickets->total ?? 0,
                'today_tickets' => $todayTickets->count ?? 0,
                'week_collections' => $weekTickets ?? 0,
                'pending_closings' => $pendingClosings,
                'assigned_points' => $assignments->pluck('revenue_point_id')->unique()->count(),
            ],
            'assignments' => $assignments,
            'recent_tickets' => $recentTickets,
            'recent_closings' => $recentClosings,
        ]);
    }

    /**
     * Get my assignments
     */
    public function getMyAssignments(Request $request)
    {
        $userId = auth()->id();
        $isConsultantLogin = str_starts_with($userId, 'consultant_');
        $consultantId = $isConsultantLogin ? str_replace('consultant_', '', $userId) : auth()->id();

        $assignments = DB::connection('tenant')
            ->table('consultant_assignments as ca')
            ->join('revenue_points as rp', 'ca.revenue_point_id', '=', 'rp.id')
            ->leftJoin('wards', 'rp.ward_id', '=', 'wards.id')
            ->where('ca.consultant_id', $consultantId)
            ->where('ca.is_active', true)
            ->select(
                'ca.*',
                'rp.name as revenue_point_name',
                'rp.code as revenue_point_code',
                'rp.address as revenue_point_address',
                'wards.name as ward_name'
            )
            ->get();

        return response()->json($assignments);
    }

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

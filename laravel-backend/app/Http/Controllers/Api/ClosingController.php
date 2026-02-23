<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\ClosingService;

class ClosingController extends Controller
{
    protected ClosingService $closingService;

    public function __construct(ClosingService $closingService)
    {
        $this->closingService = $closingService;
    }

    /**
     * List closings with filters
     */
    public function index(Request $request)
    {
        $query = DB::connection('tenant')
            ->table('closings')
            ->leftJoin('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->leftJoin('tenant_users as submitter', 'closings.submitted_by', '=', 'submitter.id')
            ->leftJoin('tenant_users as approver', 'closings.approved_by', '=', 'approver.id')
            ->select(
                'closings.*',
                'revenue_points.name as revenue_point_name',
                'revenue_points.code as revenue_point_code',
                'submitter.name as submitted_by_name',
                'approver.name as approved_by_name'
            );

        // Filter by status
        if ($request->has('status')) {
            $query->where('closings.status', $request->status);
        }

        // Filter by revenue point
        if ($request->has('revenue_point_id')) {
            $query->where('closings.revenue_point_id', $request->revenue_point_id);
        }

        // Filter by collector
        if ($request->has('submitted_by')) {
            $query->where('closings.submitted_by', $request->submitted_by);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('closings.period_start', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('closings.period_end', '<=', $request->end_date);
        }

        // Filter by period type
        if ($request->has('period_type')) {
            $query->where('closings.period_type', $request->period_type);
        }

        $closings = $query->orderBy('closings.created_at', 'desc')->get();

        return response()->json($closings);
    }

    /**
     * Create/submit a new closing
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'revenue_point_id' => 'required|integer',
            'period_type' => 'required|in:daily,weekly',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'remitted_amount' => 'required|numeric|min:0',
            'cash_collected' => 'nullable|numeric|min:0',
            'transfer_collected' => 'nullable|numeric|min:0',
            'pos_collected' => 'nullable|numeric|min:0',
            'remittance_method' => 'required|in:cash,transfer,cheque,pos',
            'remittance_reference' => 'nullable|string',
            'proof_url' => 'nullable|url',
            'notes' => 'nullable|string',
        ]);

        $validated['submitted_by'] = auth()->id();
        $validated['submitted_by_type'] = 'user';

        $result = $this->closingService->createClosing($validated);

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json($result, 201);
    }

    /**
     * Get a specific closing
     */
    public function show($id)
    {
        $closing = DB::connection('tenant')
            ->table('closings')
            ->leftJoin('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->leftJoin('tenant_users as submitter', 'closings.submitted_by', '=', 'submitter.id')
            ->leftJoin('tenant_users as approver', 'closings.approved_by', '=', 'approver.id')
            ->select(
                'closings.*',
                'revenue_points.name as revenue_point_name',
                'revenue_points.code as revenue_point_code',
                'submitter.name as submitted_by_name',
                'approver.name as approved_by_name'
            )
            ->where('closings.id', $id)
            ->first();

        if (!$closing) {
            return response()->json(['message' => 'Closing not found'], 404);
        }

        // Get tickets sold in this period for this revenue point
        $tickets = DB::connection('tenant')
            ->table('tickets')
            ->join('ticket_batches', 'tickets.batch_id', '=', 'ticket_batches.id')
            ->where('ticket_batches.revenue_point_id', $closing->revenue_point_id)
            ->where('tickets.status', 'sold')
            ->whereBetween('tickets.sold_at', [$closing->period_start . ' 00:00:00', $closing->period_end . ' 23:59:59'])
            ->select('tickets.*')
            ->get();

        $closing->tickets = $tickets;

        return response()->json($closing);
    }

    /**
     * Approve a closing
     */
    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $result = $this->closingService->approveClosing($id, $validated);

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json($result);
    }

    /**
     * Reject a closing
     */
    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $result = $this->closingService->rejectClosing($id, $validated);

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json($result);
    }

    /**
     * Get pending closings for approval
     */
    public function pending()
    {
        $closings = DB::connection('tenant')
            ->table('closings')
            ->leftJoin('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->leftJoin('tenant_users', 'closings.submitted_by', '=', 'tenant_users.id')
            ->whereIn('closings.status', ['submitted', 'variance_flagged'])
            ->select(
                'closings.*',
                'revenue_points.name as revenue_point_name',
                'tenant_users.name as submitted_by_name'
            )
            ->orderBy('closings.created_at', 'asc')
            ->get();

        return response()->json($closings);
    }

    /**
     * Get closings with variance issues
     */
    public function flagged()
    {
        $closings = DB::connection('tenant')
            ->table('closings')
            ->leftJoin('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->leftJoin('tenant_users', 'closings.submitted_by', '=', 'tenant_users.id')
            ->where('closings.status', 'variance_flagged')
            ->select(
                'closings.*',
                'revenue_points.name as revenue_point_name',
                'tenant_users.name as submitted_by_name'
            )
            ->orderByRaw('ABS(closings.variance_percentage) DESC')
            ->get();

        return response()->json($closings);
    }

    /**
     * Get closing summary statistics
     */
    public function stats(Request $request)
    {
        $startDate = $request->get('start_date', date('Y-m-01'));
        $endDate = $request->get('end_date', date('Y-m-d'));
        $wardId = $request->get('ward_id');

        $summary = $this->closingService->getSummary($startDate, $endDate, $wardId);

        // Add recent closings
        $summary['recent'] = DB::connection('tenant')
            ->table('closings')
            ->leftJoin('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->select(
                'closings.id',
                'closings.status',
                'closings.remitted_amount',
                'closings.variance_percentage',
                'closings.created_at',
                'revenue_points.name as revenue_point_name'
            )
            ->orderBy('closings.created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json($summary);
    }

    /**
     * Get collector-specific closings (for collectors)
     */
    public function myClosings(Request $request)
    {
        $query = DB::connection('tenant')
            ->table('closings')
            ->leftJoin('revenue_points', 'closings.revenue_point_id', '=', 'revenue_points.id')
            ->where('closings.submitted_by', auth()->id())
            ->select(
                'closings.*',
                'revenue_points.name as revenue_point_name',
                'revenue_points.code as revenue_point_code'
            );

        if ($request->has('status')) {
            $query->where('closings.status', $request->status);
        }

        $closings = $query->orderBy('closings.created_at', 'desc')->get();

        return response()->json($closings);
    }

    /**
     * Get my closing performance
     */
    public function myPerformance(Request $request)
    {
        $startDate = $request->get('start_date', date('Y-m-01'));
        $endDate = $request->get('end_date', date('Y-m-d'));

        $performance = $this->closingService->getCollectorPerformance(auth()->id(), $startDate, $endDate);

        return response()->json($performance);
    }

    /**
     * Calculate expected amount before submission
     */
    public function calculateExpected(Request $request)
    {
        $validated = $request->validate([
            'revenue_point_id' => 'required|integer',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $expected = $this->closingService->calculateExpectedAmount(
            $validated['revenue_point_id'],
            $validated['period_start'],
            $validated['period_end']
        );

        return response()->json($expected);
    }
}

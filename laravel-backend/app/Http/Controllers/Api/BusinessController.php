<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Business;
use App\Services\VirtualAccountService;

class BusinessController extends Controller
{
    public function __construct(protected VirtualAccountService $virtualAccountService)
    {
    }

    public function index(Request $request)
    {
        $query = Business::with('tenant');

        if (auth()->user()->tenant_id) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $businesses = $query->paginate(20);

        return response()->json($businesses);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'owner_name' => 'required|string|max:255',
            'phone' => 'required|string',
            'address' => 'nullable|string',
            'rc_number' => 'nullable|string',
        ]);

        $business = Business::create($validated);

        try {
            $vaResponse = $this->virtualAccountService->provisionAccount($business, 'paymentpoint');

            if (isset($vaResponse['data'])) {
                $business->update([
                    'virtual_account_number' => $vaResponse['data']['account_number'],
                    'virtual_account_bank' => $vaResponse['data']['bank_name'],
                    'provider_ref' => $vaResponse['data']['provider_ref'],
                    'is_account_active' => true,
                ]);
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to create virtual account', ['error' => $e->getMessage()]);
        }

        return response()->json($business->fresh(), 201);
    }

    public function show(Business $business)
    {
        if (auth()->user()->tenant_id && $business->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($business->load('tenant'));
    }

    public function update(Request $request, Business $business)
    {
        if (auth()->user()->tenant_id && $business->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'owner_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string',
            'address' => 'nullable|string',
            'rc_number' => 'nullable|string',
        ]);

        $business->update($validated);

        return response()->json($business);
    }

    public function destroy(Business $business)
    {
        if (auth()->user()->tenant_id && $business->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $business->delete();
        return response()->json(['message' => 'Business deleted successfully']);
    }

    /**
     * Business Portal: Get dashboard data for logged in business user
     */
    public function portalDashboard(Request $request)
    {
        // Extract business ID from the user ID (format: business_123)
        $userId = auth()->id();
        $businessId = str_replace('business_', '', $userId);

        $business = DB::connection('tenant')
            ->table('businesses')
            ->where('id', $businessId)
            ->first();

        if (!$business) {
            return response()->json(['message' => 'Business not found'], 404);
        }

        // Get invoices
        $invoices = DB::connection('tenant')
            ->table('invoices')
            ->where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->get();

        $totalInvoiced = $invoices->sum('total_amount');
        $totalPaid = $invoices->sum('amount_paid');
        $totalBalance = $invoices->sum('balance');

        $pendingInvoices = $invoices->where('status', '!=', 'paid')->count();
        $overdueInvoices = $invoices->where('status', 'overdue')->count();

        // Recent payments
        $recentPayments = DB::connection('tenant')
            ->table('invoice_payments')
            ->whereIn('invoice_id', $invoices->pluck('id'))
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'business' => [
                'id' => $business->id,
                'name' => $business->business_name,
                'registration_number' => $business->registration_number,
                'owner_name' => $business->owner_name,
                'owner_email' => $business->owner_email,
                'owner_phone' => $business->owner_phone,
                'address' => $business->address,
                'business_type' => $business->business_type,
                'size' => $business->size,
                'virtual_account_number' => $business->virtual_account_number,
                'virtual_account_bank' => $business->virtual_account_bank,
            ],
            'stats' => [
                'total_invoiced' => $totalInvoiced,
                'total_paid' => $totalPaid,
                'total_balance' => $totalBalance,
                'pending_invoices' => $pendingInvoices,
                'overdue_invoices' => $overdueInvoices,
            ],
            'recent_invoices' => $invoices->take(5)->values(),
            'recent_payments' => $recentPayments,
        ]);
    }

    /**
     * Business Portal: Get profile information
     */
    public function portalProfile(Request $request)
    {
        $userId = auth()->id();
        $businessId = str_replace('business_', '', $userId);

        $business = DB::connection('tenant')
            ->table('businesses')
            ->where('id', $businessId)
            ->first();

        if (!$business) {
            return response()->json(['message' => 'Business not found'], 404);
        }

        // Get ward and department info
        $ward = DB::connection('tenant')
            ->table('wards')
            ->where('id', $business->ward_id)
            ->first();

        return response()->json([
            'id' => $business->id,
            'business_name' => $business->business_name,
            'registration_number' => $business->registration_number,
            'owner_name' => $business->owner_name,
            'owner_email' => $business->owner_email,
            'owner_phone' => $business->owner_phone,
            'address' => $business->address,
            'business_type' => $business->business_type,
            'size' => $business->size,
            'status' => $business->status,
            'ward' => $ward ? ['id' => $ward->id, 'name' => $ward->name] : null,
            'virtual_account' => [
                'number' => $business->virtual_account_number,
                'bank' => $business->virtual_account_bank,
            ],
            'created_at' => $business->created_at,
        ]);
    }
}

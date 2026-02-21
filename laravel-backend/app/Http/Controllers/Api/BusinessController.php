<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
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
}

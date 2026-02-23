<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\InvoiceService;

class BulkInvoiceController extends Controller
{
    protected InvoiceService $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    /**
     * Get businesses for bulk invoice generation with filters
     */
    public function getBusinessesForBulk(Request $request)
    {
        $query = DB::connection('tenant')
            ->table('businesses')
            ->leftJoin('wards', 'businesses.ward_id', '=', 'wards.id')
            ->leftJoin('departments', 'businesses.department_id', '=', 'departments.id')
            ->where('businesses.status', 'active')
            ->select(
                'businesses.id',
                'businesses.business_name',
                'businesses.registration_number',
                'businesses.owner_name',
                'businesses.business_type',
                'businesses.business_category',
                'businesses.size',
                'businesses.ward_id',
                'businesses.department_id',
                'wards.name as ward_name',
                'departments.name as department_name'
            );

        // Apply filters
        if ($request->has('ward_id') && $request->ward_id) {
            $query->where('businesses.ward_id', $request->ward_id);
        }

        if ($request->has('department_id') && $request->department_id) {
            $query->where('businesses.department_id', $request->department_id);
        }

        if ($request->has('size') && $request->size) {
            $query->where('businesses.size', $request->size);
        }

        if ($request->has('business_type') && $request->business_type) {
            $query->where('businesses.business_type', $request->business_type);
        }

        if ($request->has('business_category') && $request->business_category) {
            $query->where('businesses.business_category', $request->business_category);
        }

        // Exclude businesses with pending invoices for same period (optional)
        if ($request->has('exclude_pending') && $request->exclude_pending) {
            $query->whereNotExists(function ($q) use ($request) {
                $q->select(DB::raw(1))
                    ->from('invoices')
                    ->whereRaw('invoices.business_id = businesses.id')
                    ->whereIn('invoices.status', ['issued', 'pending', 'partially_paid']);
            });
        }

        $businesses = $query->orderBy('businesses.business_name')->get();

        // Get summary counts
        $summary = [
            'total' => $businesses->count(),
            'by_size' => $businesses->groupBy('size')->map->count(),
            'by_ward' => $businesses->groupBy('ward_name')->map->count(),
            'by_type' => $businesses->groupBy('business_type')->map->count(),
        ];

        return response()->json([
            'businesses' => $businesses,
            'summary' => $summary,
        ]);
    }

    /**
     * Generate bulk invoices
     */
    public function generateBulk(Request $request)
    {
        $validated = $request->validate([
            'business_ids' => 'required|array|min:1',
            'business_ids.*' => 'required|integer',
            'revenue_items' => 'required|array|min:1',
            'revenue_items.*.revenue_item_id' => 'required|integer',
            'revenue_items.*.amount' => 'required|numeric|min:0',
            'revenue_items.*.description' => 'nullable|string',
            'due_date' => 'required|date|after:today',
            'apply_tariff_by_size' => 'boolean',
            'tariff_rules' => 'nullable|array',
            'tariff_rules.small' => 'nullable|numeric',
            'tariff_rules.medium' => 'nullable|numeric',
            'tariff_rules.large' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'auto_send_sms' => 'boolean',
        ]);

        $results = [
            'success' => [],
            'failed' => [],
        ];

        $userId = auth()->id();

        foreach ($validated['business_ids'] as $businessId) {
            try {
                $business = DB::connection('tenant')
                    ->table('businesses')
                    ->where('id', $businessId)
                    ->first();

                if (!$business) {
                    $results['failed'][] = [
                        'business_id' => $businessId,
                        'message' => 'Business not found',
                    ];
                    continue;
                }

                // Calculate items with tariff adjustments
                $invoiceItems = [];
                $totalAmount = 0;

                foreach ($validated['revenue_items'] as $item) {
                    $amount = $item['amount'];

                    // Apply tariff by size if enabled
                    if ($validated['apply_tariff_by_size'] ?? false) {
                        $tariffRules = $validated['tariff_rules'] ?? [];
                        $size = $business->size ?? 'small';
                        if (isset($tariffRules[$size])) {
                            $amount = $tariffRules[$size];
                        }
                    }

                    $revenueItem = DB::connection('tenant')
                        ->table('revenue_items')
                        ->where('id', $item['revenue_item_id'])
                        ->first();

                    $invoiceItems[] = [
                        'revenue_item_id' => $item['revenue_item_id'],
                        'description' => $item['description'] ?? $revenueItem->name ?? 'Revenue Item',
                        'quantity' => 1,
                        'unit_price' => $amount,
                        'amount' => $amount,
                    ];

                    $totalAmount += $amount;
                }

                // Generate invoice number
                $year = date('Y');
                $count = DB::connection('tenant')
                    ->table('invoices')
                    ->whereRaw("invoice_number LIKE 'INV-{$year}-%'")
                    ->count();
                $invoiceNumber = sprintf('INV-%s-%06d', $year, $count + 1);

                // Create invoice
                $invoiceId = DB::connection('tenant')
                    ->table('invoices')
                    ->insertGetId([
                        'invoice_number' => $invoiceNumber,
                        'business_id' => $businessId,
                        'ward_id' => $business->ward_id,
                        'status' => 'issued',
                        'subtotal' => $totalAmount,
                        'tax_amount' => 0,
                        'total_amount' => $totalAmount,
                        'amount_paid' => 0,
                        'balance' => $totalAmount,
                        'due_date' => $validated['due_date'],
                        'issued_at' => now(),
                        'notes' => $validated['notes'],
                        'created_by' => $userId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                // Create invoice items
                foreach ($invoiceItems as $invoiceItem) {
                    DB::connection('tenant')
                        ->table('invoice_items')
                        ->insert([
                            'invoice_id' => $invoiceId,
                            'revenue_item_id' => $invoiceItem['revenue_item_id'],
                            'description' => $invoiceItem['description'],
                            'quantity' => $invoiceItem['quantity'],
                            'unit_price' => $invoiceItem['unit_price'],
                            'amount' => $invoiceItem['amount'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                }

                // Update business balance
                DB::connection('tenant')
                    ->table('businesses')
                    ->where('id', $businessId)
                    ->increment('total_invoiced', $totalAmount);

                DB::connection('tenant')
                    ->table('businesses')
                    ->where('id', $businessId)
                    ->increment('balance', $totalAmount);

                $results['success'][] = [
                    'business_id' => $businessId,
                    'business_name' => $business->business_name,
                    'invoice_id' => $invoiceId,
                    'invoice_number' => $invoiceNumber,
                    'amount' => $totalAmount,
                ];

            } catch (\Exception $e) {
                $results['failed'][] = [
                    'business_id' => $businessId,
                    'message' => 'Error: ' . $e->getMessage(),
                ];
            }
        }

        // Send SMS notifications if enabled
        if (($validated['auto_send_sms'] ?? false) && count($results['success']) > 0) {
            // Queue SMS sending (can be done async)
            foreach ($results['success'] as $success) {
                // $this->invoiceService->sendInvoiceNotification($success['invoice_id']);
            }
        }

        // Log audit
        DB::connection('tenant')->table('tenant_audit_logs')->insert([
            'user_id' => $userId,
            'user_type' => 'tenant_user',
            'action' => 'bulk_invoice_generation',
            'module' => 'invoices',
            'entity_type' => 'Invoice',
            'entity_id' => null,
            'details' => json_encode([
                'total_attempted' => count($validated['business_ids']),
                'success_count' => count($results['success']),
                'failed_count' => count($results['failed']),
                'total_amount' => collect($results['success'])->sum('amount'),
            ]),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Bulk invoice generation completed',
            'summary' => [
                'total_attempted' => count($validated['business_ids']),
                'success' => count($results['success']),
                'failed' => count($results['failed']),
                'total_amount' => collect($results['success'])->sum('amount'),
            ],
            'results' => $results,
        ]);
    }

    /**
     * Preview bulk invoice before generation
     */
    public function previewBulk(Request $request)
    {
        $validated = $request->validate([
            'business_ids' => 'required|array|min:1',
            'revenue_items' => 'required|array|min:1',
            'revenue_items.*.revenue_item_id' => 'required|integer',
            'revenue_items.*.amount' => 'required|numeric|min:0',
            'apply_tariff_by_size' => 'boolean',
            'tariff_rules' => 'nullable|array',
        ]);

        $businesses = DB::connection('tenant')
            ->table('businesses')
            ->whereIn('id', $validated['business_ids'])
            ->get();

        $preview = [];
        $totalAmount = 0;

        foreach ($businesses as $business) {
            $itemsTotal = 0;

            foreach ($validated['revenue_items'] as $item) {
                $amount = $item['amount'];

                if ($validated['apply_tariff_by_size'] ?? false) {
                    $tariffRules = $validated['tariff_rules'] ?? [];
                    $size = $business->size ?? 'small';
                    if (isset($tariffRules[$size])) {
                        $amount = $tariffRules[$size];
                    }
                }

                $itemsTotal += $amount;
            }

            $preview[] = [
                'business_id' => $business->id,
                'business_name' => $business->business_name,
                'size' => $business->size,
                'amount' => $itemsTotal,
            ];

            $totalAmount += $itemsTotal;
        }

        return response()->json([
            'preview' => $preview,
            'summary' => [
                'total_businesses' => count($preview),
                'total_amount' => $totalAmount,
                'by_size' => collect($preview)->groupBy('size')->map(function ($items) {
                    return [
                        'count' => $items->count(),
                        'amount' => $items->sum('amount'),
                    ];
                }),
            ],
        ]);
    }

    /**
     * Get bulk generation history
     */
    public function getBulkHistory(Request $request)
    {
        $history = DB::connection('tenant')
            ->table('tenant_audit_logs')
            ->where('action', 'bulk_invoice_generation')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($log) {
                $log->details = json_decode($log->details);
                return $log;
            });

        return response()->json($history);
    }
}

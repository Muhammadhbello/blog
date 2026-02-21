<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Business;
use App\Models\RevenueItem;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['business', 'revenueItem', 'tenant']);

        if (auth()->user()->tenant_id) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $invoices = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($invoices);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'business_id' => 'required|exists:businesses,id',
            'revenue_item_id' => 'required|exists:revenue_items,id',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'projected_target' => 'boolean',
        ]);

        $validated['invoice_number'] = 'INV-' . strtoupper(uniqid());
        $validated['status'] = 'pending';

        $invoice = Invoice::create($validated);

        return response()->json($invoice->load(['business', 'revenueItem']), 201);
    }

    public function show(Invoice $invoice)
    {
        if (auth()->user()->tenant_id && $invoice->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($invoice->load(['business', 'revenueItem', 'tenant']));
    }

    public function update(Request $request, Invoice $invoice)
    {
        if (auth()->user()->tenant_id && $invoice->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:pending,paid,overdue,cancelled',
            'amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|date',
        ]);

        $invoice->update($validated);

        return response()->json($invoice);
    }

    public function destroy(Invoice $invoice)
    {
        if (auth()->user()->tenant_id && $invoice->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted successfully']);
    }
}

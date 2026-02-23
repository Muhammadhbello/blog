<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrintController extends Controller
{
    /**
     * Get printable ticket data
     */
    public function getTicketPrintData(Request $request, int $id)
    {
        $ticket = DB::connection('tenant')
            ->table('tickets')
            ->join('ticket_batches', 'tickets.batch_id', '=', 'ticket_batches.id')
            ->join('revenue_points', 'ticket_batches.revenue_point_id', '=', 'revenue_points.id')
            ->join('revenue_items', 'ticket_batches.revenue_item_id', '=', 'revenue_items.id')
            ->leftJoin('users as seller', 'tickets.sold_by', '=', 'seller.id')
            ->where('tickets.id', $id)
            ->select(
                'tickets.*',
                'ticket_batches.batch_number',
                'ticket_batches.unit_price',
                'ticket_batches.validity_days',
                'revenue_points.name as revenue_point_name',
                'revenue_points.code as revenue_point_code',
                'revenue_items.name as revenue_item_name',
                'seller.name as seller_name'
            )
            ->first();

        if (!$ticket) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        // Get tenant info
        $tenant = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', ['tenant_name', 'tenant_address', 'tenant_phone', 'tenant_logo'])
            ->pluck('value', 'key');

        return response()->json([
            'ticket' => $ticket,
            'tenant' => $tenant,
            'print_config' => $this->getPrintConfig(),
        ]);
    }

    /**
     * Get batch tickets for bulk printing
     */
    public function getBatchTicketsPrintData(Request $request, int $batchId)
    {
        $batch = DB::connection('tenant')
            ->table('ticket_batches')
            ->join('revenue_points', 'ticket_batches.revenue_point_id', '=', 'revenue_points.id')
            ->join('revenue_items', 'ticket_batches.revenue_item_id', '=', 'revenue_items.id')
            ->where('ticket_batches.id', $batchId)
            ->select(
                'ticket_batches.*',
                'revenue_points.name as revenue_point_name',
                'revenue_points.code as revenue_point_code',
                'revenue_items.name as revenue_item_name'
            )
            ->first();

        if (!$batch) {
            return response()->json(['message' => 'Batch not found'], 404);
        }

        $tickets = DB::connection('tenant')
            ->table('tickets')
            ->where('batch_id', $batchId)
            ->where('status', 'available')
            ->select('id', 'ticket_number', 'status')
            ->orderBy('ticket_number')
            ->get();

        $tenant = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', ['tenant_name', 'tenant_address', 'tenant_phone', 'tenant_logo'])
            ->pluck('value', 'key');

        return response()->json([
            'batch' => $batch,
            'tickets' => $tickets,
            'tenant' => $tenant,
            'print_config' => $this->getPrintConfig(),
        ]);
    }

    /**
     * Get printable receipt data for invoice payment
     */
    public function getPaymentReceiptData(Request $request, int $paymentId)
    {
        $payment = DB::connection('tenant')
            ->table('invoice_payments')
            ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->leftJoin('users as receiver', 'invoice_payments.received_by', '=', 'receiver.id')
            ->where('invoice_payments.id', $paymentId)
            ->select(
                'invoice_payments.*',
                'invoices.invoice_number',
                'invoices.total_amount',
                'invoices.balance as remaining_balance',
                'businesses.business_name',
                'businesses.owner_name',
                'businesses.owner_phone',
                'businesses.address as business_address',
                'receiver.name as receiver_name'
            )
            ->first();

        if (!$payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        $tenant = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', ['tenant_name', 'tenant_address', 'tenant_phone', 'tenant_logo'])
            ->pluck('value', 'key');

        return response()->json([
            'payment' => $payment,
            'tenant' => $tenant,
            'print_config' => $this->getPrintConfig(),
        ]);
    }

    /**
     * Get printable invoice data
     */
    public function getInvoicePrintData(Request $request, int $invoiceId)
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->leftJoin('wards', 'businesses.ward_id', '=', 'wards.id')
            ->where('invoices.id', $invoiceId)
            ->select(
                'invoices.*',
                'businesses.business_name',
                'businesses.owner_name',
                'businesses.owner_phone',
                'businesses.owner_email',
                'businesses.address as business_address',
                'businesses.registration_number',
                'wards.name as ward_name'
            )
            ->first();

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found'], 404);
        }

        $items = DB::connection('tenant')
            ->table('invoice_items')
            ->leftJoin('revenue_items', 'invoice_items.revenue_item_id', '=', 'revenue_items.id')
            ->where('invoice_items.invoice_id', $invoiceId)
            ->select('invoice_items.*', 'revenue_items.name as item_name')
            ->get();

        $payments = DB::connection('tenant')
            ->table('invoice_payments')
            ->where('invoice_id', $invoiceId)
            ->orderBy('created_at')
            ->get();

        $tenant = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', ['tenant_name', 'tenant_address', 'tenant_phone', 'tenant_logo', 'tenant_email', 'bank_name', 'bank_account_number', 'bank_account_name'])
            ->pluck('value', 'key');

        return response()->json([
            'invoice' => $invoice,
            'items' => $items,
            'payments' => $payments,
            'tenant' => $tenant,
            'print_config' => $this->getPrintConfig(),
        ]);
    }

    /**
     * Get closing receipt data
     */
    public function getClosingReceiptData(Request $request, int $closingId)
    {
        $closing = DB::connection('tenant')
            ->table('closings')
            ->join('users as collector', 'closings.collector_id', '=', 'collector.id')
            ->leftJoin('users as reviewer', 'closings.reviewed_by', '=', 'reviewer.id')
            ->where('closings.id', $closingId)
            ->select(
                'closings.*',
                'collector.name as collector_name',
                'reviewer.name as reviewer_name'
            )
            ->first();

        if (!$closing) {
            return response()->json(['message' => 'Closing not found'], 404);
        }

        // Get tickets in this closing
        $ticketIds = json_decode($closing->ticket_ids ?? '[]', true);
        $tickets = [];
        if (!empty($ticketIds)) {
            $tickets = DB::connection('tenant')
                ->table('tickets')
                ->whereIn('id', $ticketIds)
                ->select('ticket_number', 'amount')
                ->get();
        }

        // Get invoice payments in this closing
        $paymentIds = json_decode($closing->invoice_payment_ids ?? '[]', true);
        $invoicePayments = [];
        if (!empty($paymentIds)) {
            $invoicePayments = DB::connection('tenant')
                ->table('invoice_payments')
                ->join('invoices', 'invoice_payments.invoice_id', '=', 'invoices.id')
                ->whereIn('invoice_payments.id', $paymentIds)
                ->select('invoices.invoice_number', 'invoice_payments.amount', 'invoice_payments.reference')
                ->get();
        }

        $tenant = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', ['tenant_name', 'tenant_address', 'tenant_phone', 'tenant_logo'])
            ->pluck('value', 'key');

        return response()->json([
            'closing' => $closing,
            'tickets' => $tickets,
            'invoice_payments' => $invoicePayments,
            'tenant' => $tenant,
            'print_config' => $this->getPrintConfig(),
        ]);
    }

    /**
     * Get print configuration
     */
    protected function getPrintConfig(): array
    {
        $config = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', [
                'print_paper_size',
                'print_show_logo',
                'print_show_qr',
                'print_thermal_width',
                'print_footer_text',
            ])
            ->pluck('value', 'key');

        return [
            'paper_size' => $config['print_paper_size'] ?? '80mm',
            'show_logo' => ($config['print_show_logo'] ?? 'true') === 'true',
            'show_qr' => ($config['print_show_qr'] ?? 'true') === 'true',
            'thermal_width' => $config['print_thermal_width'] ?? '80',
            'footer_text' => $config['print_footer_text'] ?? 'Thank you for your payment',
        ];
    }

    /**
     * Update print settings
     */
    public function updatePrintSettings(Request $request)
    {
        $validated = $request->validate([
            'paper_size' => 'required|in:58mm,80mm,a4',
            'show_logo' => 'boolean',
            'show_qr' => 'boolean',
            'thermal_width' => 'in:58,80',
            'footer_text' => 'nullable|string|max:255',
        ]);

        $settings = [
            'print_paper_size' => $validated['paper_size'],
            'print_show_logo' => $validated['show_logo'] ? 'true' : 'false',
            'print_show_qr' => $validated['show_qr'] ? 'true' : 'false',
            'print_thermal_width' => $validated['thermal_width'] ?? '80',
            'print_footer_text' => $validated['footer_text'] ?? '',
        ];

        foreach ($settings as $key => $value) {
            DB::connection('tenant')
                ->table('tenant_settings')
                ->updateOrInsert(
                    ['key' => $key],
                    ['value' => $value, 'updated_at' => now()]
                );
        }

        return response()->json(['message' => 'Print settings updated successfully']);
    }
}

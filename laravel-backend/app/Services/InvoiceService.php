<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceService
{
    protected SMSService $smsService;
    protected PaymentGatewayService $paymentService;

    public function __construct(SMSService $smsService, PaymentGatewayService $paymentService)
    {
        $this->smsService = $smsService;
        $this->paymentService = $paymentService;
    }

    /**
     * Generate unique invoice number
     */
    public function generateInvoiceNumber(): string
    {
        $prefix = $this->getSetting('invoice_prefix', 'INV');
        $year = date('Y');
        
        $lastInvoice = DB::connection('tenant')
            ->table('invoices')
            ->where('invoice_number', 'like', "{$prefix}-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) Str::afterLast($lastInvoice->invoice_number, '-');
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf('%s-%s-%06d', $prefix, $year, $newNumber);
    }

    /**
     * Create a new invoice
     */
    public function createInvoice(array $data): array
    {
        $business = DB::connection('tenant')
            ->table('businesses')
            ->where('id', $data['business_id'])
            ->first();

        if (!$business) {
            return ['success' => false, 'message' => 'Business not found'];
        }

        $revenueItem = DB::connection('tenant')
            ->table('revenue_items')
            ->where('id', $data['revenue_item_id'])
            ->first();

        if (!$revenueItem) {
            return ['success' => false, 'message' => 'Revenue item not found'];
        }

        // Calculate amount based on tariff rules
        $amount = $this->calculateAmount($revenueItem->id, $business);
        if (isset($data['amount'])) {
            $amount = $data['amount']; // Allow override
        }

        // Calculate revenue share
        $tenant = app('current_tenant');
        $platformFee = $this->calculatePlatformFee($amount, $tenant);
        $netLgaAmount = $amount - $platformFee;

        $invoiceNumber = $this->generateInvoiceNumber();
        $dueDate = $data['due_date'] ?? date('Y-m-d', strtotime('+' . $this->getSetting('default_due_days', 30) . ' days'));

        $invoiceId = DB::connection('tenant')->table('invoices')->insertGetId([
            'invoice_number' => $invoiceNumber,
            'business_id' => $business->id,
            'revenue_item_id' => $revenueItem->id,
            'created_by' => $data['created_by'] ?? null,
            'subtotal' => $amount,
            'tax_amount' => 0,
            'total_amount' => $amount,
            'amount_paid' => 0,
            'balance' => $amount,
            'platform_fee' => $platformFee,
            'net_lga_amount' => $netLgaAmount,
            'description' => $data['description'] ?? $revenueItem->name,
            'issue_date' => $data['issue_date'] ?? date('Y-m-d'),
            'due_date' => $dueDate,
            'period' => $data['period'] ?? $revenueItem->frequency,
            'fiscal_year' => date('Y'),
            'status' => 'draft',
            'delivery_status' => 'not_sent',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create invoice item
        DB::connection('tenant')->table('invoice_items')->insert([
            'invoice_id' => $invoiceId,
            'revenue_item_id' => $revenueItem->id,
            'description' => $revenueItem->name,
            'quantity' => 1,
            'unit_price' => $amount,
            'amount' => $amount,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Log audit
        $this->logAudit('create', 'invoices', 'Invoice', $invoiceId, [
            'invoice_number' => $invoiceNumber,
            'business_name' => $business->name,
            'amount' => $amount,
        ]);

        return [
            'success' => true,
            'invoice_id' => $invoiceId,
            'invoice_number' => $invoiceNumber,
        ];
    }

    /**
     * Issue an invoice (change status from draft to issued)
     */
    public function issueInvoice(int $invoiceId, bool $sendSMS = true): array
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->where('id', $invoiceId)
            ->first();

        if (!$invoice) {
            return ['success' => false, 'message' => 'Invoice not found'];
        }

        // Generate payment link and QR code
        $paymentLink = $this->generatePaymentLink($invoice);

        DB::connection('tenant')->table('invoices')
            ->where('id', $invoiceId)
            ->update([
                'status' => 'issued',
                'payment_link' => $paymentLink,
                'updated_at' => now(),
            ]);

        // Send SMS notification
        if ($sendSMS && $this->getSetting('auto_send_invoice_sms', true)) {
            $this->sendInvoiceIssuedSMS($invoiceId);
        }

        $this->logAudit('issue', 'invoices', 'Invoice', $invoiceId, [
            'invoice_number' => $invoice->invoice_number,
        ]);

        return ['success' => true, 'message' => 'Invoice issued successfully'];
    }

    /**
     * Bulk generate invoices
     */
    public function bulkGenerateInvoices(array $criteria, int $revenueItemId, array $options = []): array
    {
        $query = DB::connection('tenant')
            ->table('businesses')
            ->where('status', 'active');

        if (!empty($criteria['ward_id'])) {
            $query->where('ward_id', $criteria['ward_id']);
        }

        if (!empty($criteria['department_id'])) {
            $query->where('department_id', $criteria['department_id']);
        }

        if (!empty($criteria['business_size'])) {
            $query->where('business_size', $criteria['business_size']);
        }

        if (!empty($criteria['business_category'])) {
            $query->where('business_category', $criteria['business_category']);
        }

        $businesses = $query->get();
        $results = [];

        foreach ($businesses as $business) {
            // Check if invoice already exists for this period
            $existingInvoice = DB::connection('tenant')
                ->table('invoices')
                ->where('business_id', $business->id)
                ->where('revenue_item_id', $revenueItemId)
                ->where('fiscal_year', date('Y'))
                ->whereNotIn('status', ['cancelled'])
                ->first();

            if ($existingInvoice && !($options['force_create'] ?? false)) {
                $results[$business->id] = [
                    'success' => false,
                    'message' => 'Invoice already exists',
                    'invoice_id' => $existingInvoice->id,
                ];
                continue;
            }

            $result = $this->createInvoice([
                'business_id' => $business->id,
                'revenue_item_id' => $revenueItemId,
                'created_by' => $options['created_by'] ?? null,
                'due_date' => $options['due_date'] ?? null,
            ]);

            $results[$business->id] = $result;

            // Auto-issue if requested
            if ($result['success'] && ($options['auto_issue'] ?? false)) {
                $this->issueInvoice($result['invoice_id'], $options['send_sms'] ?? true);
            }
        }

        return [
            'success' => true,
            'total_processed' => count($businesses),
            'created' => count(array_filter($results, fn($r) => $r['success'])),
            'failed' => count(array_filter($results, fn($r) => !$r['success'])),
            'results' => $results,
        ];
    }

    /**
     * Record a payment for an invoice
     */
    public function recordPayment(int $invoiceId, array $data): array
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->where('id', $invoiceId)
            ->first();

        if (!$invoice) {
            return ['success' => false, 'message' => 'Invoice not found'];
        }

        $amount = $data['amount'];
        if ($amount > $invoice->balance) {
            return ['success' => false, 'message' => 'Payment amount exceeds balance'];
        }

        $paymentId = DB::connection('tenant')->table('invoice_payments')->insertGetId([
            'invoice_id' => $invoiceId,
            'amount' => $amount,
            'payment_method' => $data['payment_method'] ?? 'cash',
            'payment_reference' => $data['payment_reference'] ?? $this->generatePaymentReference(),
            'status' => 'success',
            'received_by' => $data['received_by'] ?? null,
            'notes' => $data['notes'] ?? null,
            'paid_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $newAmountPaid = $invoice->amount_paid + $amount;
        $newBalance = $invoice->total_amount - $newAmountPaid;
        $newStatus = $newBalance <= 0 ? 'paid' : 'partial';

        DB::connection('tenant')->table('invoices')
            ->where('id', $invoiceId)
            ->update([
                'amount_paid' => $newAmountPaid,
                'balance' => max(0, $newBalance),
                'status' => $newStatus,
                'updated_at' => now(),
            ]);

        // Update defaulter status
        if ($newStatus === 'paid') {
            DB::connection('tenant')->table('defaulters')
                ->where('invoice_id', $invoiceId)
                ->update(['status' => 'resolved', 'updated_at' => now()]);
        }

        // Send payment receipt SMS
        $this->sendPaymentReceiptSMS($invoiceId, $amount, $data['payment_reference'] ?? '');

        $this->logAudit('payment_recorded', 'invoices', 'Invoice', $invoiceId, [
            'amount' => $amount,
            'payment_method' => $data['payment_method'] ?? 'cash',
        ]);

        return [
            'success' => true,
            'payment_id' => $paymentId,
            'new_balance' => $newBalance,
            'invoice_status' => $newStatus,
        ];
    }

    /**
     * Calculate amount based on tariff rules
     */
    protected function calculateAmount(int $revenueItemId, object $business): float
    {
        // First check for specific tariff rule
        $tariff = DB::connection('tenant')
            ->table('tariff_rules')
            ->where('revenue_item_id', $revenueItemId)
            ->where('is_active', true)
            ->where(function ($query) use ($business) {
                $query->where(function ($q) use ($business) {
                    $q->where('business_size', $business->business_size)
                      ->where('business_category', $business->business_category);
                })->orWhere(function ($q) use ($business) {
                    $q->where('business_size', $business->business_size)
                      ->whereNull('business_category');
                })->orWhere(function ($q) use ($business) {
                    $q->whereNull('business_size')
                      ->where('business_category', $business->business_category);
                });
            })
            ->orderByRaw('CASE WHEN business_size IS NOT NULL AND business_category IS NOT NULL THEN 1 
                              WHEN business_size IS NOT NULL THEN 2 
                              WHEN business_category IS NOT NULL THEN 3 
                              ELSE 4 END')
            ->first();

        if ($tariff) {
            return $tariff->amount;
        }

        // Fall back to base amount
        $revenueItem = DB::connection('tenant')
            ->table('revenue_items')
            ->where('id', $revenueItemId)
            ->first();

        return $revenueItem?->base_amount ?? 0;
    }

    /**
     * Calculate platform fee
     */
    protected function calculatePlatformFee(float $amount, ?object $tenant): float
    {
        if (!$tenant) return 0;

        if ($tenant->revenue_share_model === 'percentage') {
            return round($amount * ($tenant->share_value / 100), 2);
        }

        return $tenant->share_value;
    }

    protected function generatePaymentLink(object $invoice): string
    {
        $baseUrl = config('app.url');
        return "{$baseUrl}/pay/{$invoice->invoice_number}";
    }

    protected function generatePaymentReference(): string
    {
        return 'PAY-' . strtoupper(Str::random(10));
    }

    protected function sendInvoiceIssuedSMS(int $invoiceId): void
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->where('invoices.id', $invoiceId)
            ->select('invoices.*', 'businesses.owner_phone', 'businesses.name as business_name')
            ->first();

        if (!$invoice) return;

        $tenant = app('current_tenant');
        
        $this->smsService->sendTemplate('invoice_issued', $invoice->owner_phone, [
            'business_name' => $invoice->business_name,
            'invoice_no' => $invoice->invoice_number,
            'amount' => number_format($invoice->total_amount, 2),
            'due_date' => date('d/m/Y', strtotime($invoice->due_date)),
            'payment_link' => $invoice->payment_link ?? '',
            'tenant_name' => $tenant->name ?? 'LGA',
        ], 'Invoice', $invoiceId);
    }

    protected function sendPaymentReceiptSMS(int $invoiceId, float $amount, string $reference): void
    {
        $invoice = DB::connection('tenant')
            ->table('invoices')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->where('invoices.id', $invoiceId)
            ->select('invoices.*', 'businesses.owner_phone', 'businesses.name as business_name')
            ->first();

        if (!$invoice) return;

        $tenant = app('current_tenant');
        
        $this->smsService->sendTemplate('invoice_paid', $invoice->owner_phone, [
            'business_name' => $invoice->business_name,
            'invoice_no' => $invoice->invoice_number,
            'amount' => number_format($amount, 2),
            'reference' => $reference,
            'tenant_name' => $tenant->name ?? 'LGA',
        ], 'Invoice', $invoiceId);
    }

    protected function getSetting(string $key, $default = null)
    {
        $setting = DB::connection('tenant')
            ->table('tenant_settings')
            ->where('key', $key)
            ->first();

        if (!$setting) return $default;

        return match($setting->type) {
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $setting->value,
            default => $setting->value,
        };
    }

    protected function logAudit(string $action, string $module, string $entityType, int $entityId, array $details): void
    {
        DB::connection('tenant')->table('tenant_audit_logs')->insert([
            'user_id' => auth()->id(),
            'user_type' => 'tenant_user',
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'details' => json_encode($details),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

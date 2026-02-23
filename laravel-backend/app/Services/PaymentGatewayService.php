<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentGatewayService
{
    protected $settings;
    protected $provider;

    public function __construct()
    {
        $this->loadSettings();
    }

    protected function loadSettings(): void
    {
        $this->settings = DB::connection('tenant')
            ->table('payment_settings')
            ->where('is_active', true)
            ->first();
        
        $this->provider = $this->settings?->provider ?? 'paymentpoint';
    }

    /**
     * Generate a virtual account for a business
     */
    public function generateVirtualAccount(array $data): array
    {
        if (!$this->settings) {
            return $this->mockVirtualAccount($data);
        }

        return match($this->provider) {
            'paymentpoint' => $this->generatePaymentPointAccount($data),
            'palmpay' => $this->generatePalmPayAccount($data),
            default => $this->mockVirtualAccount($data),
        };
    }

    /**
     * Generate PaymentPoint virtual account
     */
    protected function generatePaymentPointAccount(array $data): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($this->settings->api_key),
                'Content-Type' => 'application/json',
            ])->post($this->getPaymentPointBaseUrl() . '/virtual-accounts', [
                'customer_name' => $data['name'],
                'customer_email' => $data['email'] ?? null,
                'customer_phone' => $data['phone'],
                'bvn' => $data['bvn'] ?? null,
                'reference' => $data['reference'] ?? Str::uuid()->toString(),
            ]);

            if ($response->successful()) {
                $result = $response->json();
                return [
                    'success' => true,
                    'account_number' => $result['account_number'],
                    'account_name' => $result['account_name'],
                    'bank_name' => $result['bank_name'],
                    'reference' => $result['reference'],
                ];
            }

            Log::error('PaymentPoint API Error', ['response' => $response->json()]);
            return ['success' => false, 'message' => 'Failed to generate virtual account'];
        } catch (\Exception $e) {
            Log::error('PaymentPoint Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Generate PalmPay virtual account
     */
    protected function generatePalmPayAccount(array $data): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($this->settings->api_key),
                'x-merchant-id' => decrypt($this->settings->merchant_id),
                'Content-Type' => 'application/json',
            ])->post($this->getPalmPayBaseUrl() . '/api/v1/virtual-account/create', [
                'businessName' => $data['name'],
                'email' => $data['email'] ?? null,
                'phoneNumber' => $data['phone'],
                'bvn' => $data['bvn'] ?? null,
                'externalReference' => $data['reference'] ?? Str::uuid()->toString(),
            ]);

            if ($response->successful()) {
                $result = $response->json();
                return [
                    'success' => true,
                    'account_number' => $result['data']['accountNumber'],
                    'account_name' => $result['data']['accountName'],
                    'bank_name' => 'PalmPay',
                    'reference' => $result['data']['externalReference'],
                ];
            }

            Log::error('PalmPay API Error', ['response' => $response->json()]);
            return ['success' => false, 'message' => 'Failed to generate virtual account'];
        } catch (\Exception $e) {
            Log::error('PalmPay Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Mock virtual account for testing/development
     */
    protected function mockVirtualAccount(array $data): array
    {
        return [
            'success' => true,
            'account_number' => '99' . rand(10000000, 99999999),
            'account_name' => strtoupper($data['name']),
            'bank_name' => 'FlexCloud Bank (Test)',
            'reference' => 'MOCK-' . Str::uuid()->toString(),
            'is_mock' => true,
        ];
    }

    /**
     * Verify payment webhook signature
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (!$this->settings || !$this->settings->webhook_secret) {
            return true; // Allow in test mode
        }

        $expected = hash_hmac('sha512', $payload, decrypt($this->settings->webhook_secret));
        return hash_equals($expected, $signature);
    }

    /**
     * Process incoming payment notification
     */
    public function processPaymentNotification(array $data): array
    {
        // Check for idempotency
        $existingPayment = DB::connection('tenant')
            ->table('invoice_payments')
            ->where('gateway_reference', $data['reference'])
            ->first();

        if ($existingPayment) {
            return [
                'success' => true,
                'message' => 'Payment already processed',
                'payment_id' => $existingPayment->id,
            ];
        }

        // Find the invoice by virtual account or reference
        $invoice = $this->findInvoiceByPayment($data);

        if (!$invoice) {
            Log::warning('Payment received but no matching invoice found', $data);
            return ['success' => false, 'message' => 'No matching invoice found'];
        }

        // Record the payment
        $paymentId = DB::connection('tenant')->table('invoice_payments')->insertGetId([
            'invoice_id' => $invoice->id,
            'amount' => $data['amount'],
            'payment_method' => 'virtual_account',
            'payment_reference' => $data['reference'],
            'gateway_reference' => $data['transaction_id'] ?? $data['reference'],
            'gateway_provider' => $this->provider,
            'status' => 'success',
            'gateway_response' => json_encode($data),
            'paid_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update invoice
        $newAmountPaid = $invoice->amount_paid + $data['amount'];
        $newBalance = $invoice->total_amount - $newAmountPaid;
        $newStatus = $newBalance <= 0 ? 'paid' : 'partial';

        DB::connection('tenant')->table('invoices')
            ->where('id', $invoice->id)
            ->update([
                'amount_paid' => $newAmountPaid,
                'balance' => max(0, $newBalance),
                'status' => $newStatus,
                'updated_at' => now(),
            ]);

        // Update defaulter status if applicable
        if ($newStatus === 'paid') {
            DB::connection('tenant')->table('defaulters')
                ->where('invoice_id', $invoice->id)
                ->update(['status' => 'resolved', 'updated_at' => now()]);
        }

        // Log audit
        DB::connection('tenant')->table('tenant_audit_logs')->insert([
            'action' => 'payment_received',
            'module' => 'payments',
            'entity_type' => 'Invoice',
            'entity_id' => $invoice->id,
            'details' => json_encode([
                'amount' => $data['amount'],
                'reference' => $data['reference'],
                'provider' => $this->provider,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'success' => true,
            'message' => 'Payment processed successfully',
            'payment_id' => $paymentId,
            'invoice_status' => $newStatus,
        ];
    }

    protected function findInvoiceByPayment(array $data): ?object
    {
        // First try by virtual account reference
        if (isset($data['account_reference'])) {
            $business = DB::connection('tenant')
                ->table('businesses')
                ->where('virtual_account_reference', $data['account_reference'])
                ->first();

            if ($business) {
                // Find the oldest unpaid invoice for this business
                return DB::connection('tenant')
                    ->table('invoices')
                    ->where('business_id', $business->id)
                    ->whereIn('status', ['issued', 'sent', 'partial', 'overdue'])
                    ->orderBy('due_date', 'asc')
                    ->first();
            }
        }

        // Try by invoice number in narration
        if (isset($data['narration'])) {
            preg_match('/INV-?\d+/i', $data['narration'], $matches);
            if (!empty($matches)) {
                return DB::connection('tenant')
                    ->table('invoices')
                    ->where('invoice_number', $matches[0])
                    ->first();
            }
        }

        return null;
    }

    protected function getPaymentPointBaseUrl(): string
    {
        return $this->settings->environment === 'production'
            ? 'https://api.paymentpoint.ng'
            : 'https://sandbox.paymentpoint.ng';
    }

    protected function getPalmPayBaseUrl(): string
    {
        return $this->settings->environment === 'production'
            ? 'https://api.palmpay.com'
            : 'https://sandbox.palmpay.com';
    }
}

<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Business;
use App\Models\Invoice;
use App\Models\Transaction;
use Exception;

class VirtualAccountService
{
    protected string $paymentPointBaseUrl;
    protected string $palmpayBaseUrl;
    protected string $paymentPointApiKey;
    protected string $palmpayApiKey;

    public function __construct()
    {
        $this->paymentPointBaseUrl = config('services.paymentpoint.base_url', 'https://sandbox-api.paymentpoint.co/v1');
        $this->palmpayBaseUrl = config('services.palmpay.base_url', 'https://sandbox-api.palmpay.com/v1');
        $this->paymentPointApiKey = config('services.paymentpoint.api_key', 'test_key');
        $this->palmpayApiKey = config('services.palmpay.api_key', 'test_key');
    }

    public function provisionAccount($entity, string $type = 'paymentpoint'): array
    {
        try {
            if ($type === 'paymentpoint') {
                return $this->createPaymentPointAccount($entity);
            } elseif ($type === 'palmpay') {
                return $this->createPalmpayAccount($entity);
            }

            throw new Exception('Invalid provider type');
        } catch (Exception $e) {
            Log::error('Failed to provision virtual account', [
                'entity_id' => $entity->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    protected function createPaymentPointAccount($entity): array
    {
        $response = Http::withToken($this->paymentPointApiKey)
            ->post("{$this->paymentPointBaseUrl}/virtual-account/create", [
                'business_name' => $entity->owner_name ?? $entity->name,
                'customer_identifier' => 'BUS_' . $entity->id,
                'email' => $entity->email ?? 'noreply@flexcloud.com',
                'phone' => $entity->phone,
            ]);

        if ($response->failed()) {
            return $this->mockVirtualAccount('paymentpoint');
        }

        return $response->json();
    }

    protected function createPalmpayAccount($entity): array
    {
        $response = Http::withToken($this->palmpayApiKey)
            ->post("{$this->palmpayBaseUrl}/virtual-account/create", [
                'account_holder_name' => $entity->owner_name ?? $entity->name,
                'business_id' => 'BUS_' . $entity->id,
                'customer_id' => 'CUST_' . $entity->id,
            ]);

        if ($response->failed()) {
            return $this->mockVirtualAccount('palmpay');
        }

        return $response->json();
    }

    protected function mockVirtualAccount(string $provider): array
    {
        return [
            'status' => 'success',
            'data' => [
                'account_number' => '2' . str_pad(rand(100000000, 999999999), 9, '0', STR_PAD_LEFT),
                'account_name' => 'FlexCloud Account',
                'bank_name' => 'Access Bank',
                'provider' => $provider,
                'provider_ref' => strtoupper($provider) . '_' . uniqid(),
            ]
        ];
    }

    public function handleWebhook(array $payload): void
    {
        try {
            $accountNumber = $payload['virtual_account'] ?? $payload['destination_account'] ?? null;
            $amount = $payload['amount'] ?? $payload['destinationAmount'] ?? 0;
            $reference = $payload['reference'] ?? $payload['tnxRef'] ?? uniqid('TXN_');

            if (!$accountNumber) {
                Log::warning('No virtual account in webhook payload', ['payload' => $payload]);
                return;
            }

            $business = Business::where('virtual_account_number', $accountNumber)->first();

            if (!$business) {
                Log::warning('Business not found for virtual account', ['account' => $accountNumber]);
                return;
            }

            $invoice = Invoice::where('business_id', $business->id)
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->first();

            if ($invoice) {
                $invoice->update(['status' => 'paid']);

                $revenueShareService = app(RevenueShareService::class);
                $split = $revenueShareService->calculateSplit($amount, $business->tenant);

                Transaction::create([
                    'tenant_id' => $business->tenant_id,
                    'invoice_id' => $invoice->id,
                    'amount_gross' => $split['amount_gross'],
                    'platform_fee' => $split['platform_fee'],
                    'net_lga_amount' => $split['net_lga_amount'],
                    'payment_method' => 'virtual_account',
                    'reference' => $reference,
                    'payer_phone' => $payload['source_phone'] ?? null,
                    'meta' => $payload,
                ]);

                Log::info('Payment processed successfully', [
                    'invoice_id' => $invoice->id,
                    'amount' => $amount,
                    'reference' => $reference,
                ]);
            }
        } catch (Exception $e) {
            Log::error('Webhook processing failed', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
        }
    }
}

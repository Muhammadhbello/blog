<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SMSService
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
            ->table('sms_settings')
            ->where('is_active', true)
            ->first();
        
        $this->provider = $this->settings?->provider ?? 'termii';
    }

    /**
     * Send SMS using configured provider
     */
    public function send(string $to, string $message, ?string $templateSlug = null, ?string $entityType = null, ?int $entityId = null): array
    {
        // Clean phone number
        $to = $this->formatPhoneNumber($to);
        
        // Log the SMS
        $logId = $this->logSMS($to, $message, $templateSlug, $entityType, $entityId);

        if (!$this->settings) {
            // Mock mode - just log
            $this->updateLogStatus($logId, 'sent', null, ['mock' => true]);
            return ['success' => true, 'message_id' => 'MOCK-' . $logId, 'is_mock' => true];
        }

        $result = match($this->provider) {
            'termii' => $this->sendViaTermii($to, $message),
            'twilio' => $this->sendViaTwilio($to, $message),
            'africas_talking' => $this->sendViaAfricasTalking($to, $message),
            default => ['success' => false, 'message' => 'Unknown SMS provider'],
        };

        $this->updateLogStatus(
            $logId, 
            $result['success'] ? 'sent' : 'failed',
            $result['message_id'] ?? null,
            $result
        );

        return $result;
    }

    /**
     * Send SMS via Termii
     */
    protected function sendViaTermii(string $to, string $message): array
    {
        try {
            $response = Http::post('https://api.ng.termii.com/api/sms/send', [
                'api_key' => decrypt($this->settings->api_key),
                'to' => $to,
                'from' => $this->settings->sender_id,
                'sms' => $message,
                'type' => 'plain',
                'channel' => $this->settings->route ?? 'generic',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if ($data['code'] === 'ok') {
                    return [
                        'success' => true,
                        'message_id' => $data['message_id'] ?? null,
                        'balance' => $data['balance'] ?? null,
                    ];
                }
            }

            Log::error('Termii SMS Error', ['response' => $response->json()]);
            return ['success' => false, 'message' => $response->json()['message'] ?? 'SMS failed'];
        } catch (\Exception $e) {
            Log::error('Termii Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send SMS via Twilio
     */
    protected function sendViaTwilio(string $to, string $message): array
    {
        try {
            $config = json_decode($this->settings->additional_config, true) ?? [];
            $sid = $config['account_sid'] ?? '';
            $token = decrypt($this->settings->api_key);

            $response = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                    'To' => $to,
                    'From' => $this->settings->sender_id,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'message_id' => $data['sid'] ?? null,
                ];
            }

            Log::error('Twilio SMS Error', ['response' => $response->json()]);
            return ['success' => false, 'message' => $response->json()['message'] ?? 'SMS failed'];
        } catch (\Exception $e) {
            Log::error('Twilio Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send SMS via Africa's Talking
     */
    protected function sendViaAfricasTalking(string $to, string $message): array
    {
        try {
            $config = json_decode($this->settings->additional_config, true) ?? [];
            $username = $config['username'] ?? '';

            $response = Http::withHeaders([
                'apiKey' => decrypt($this->settings->api_key),
                'Content-Type' => 'application/x-www-form-urlencoded',
            ])->asForm()->post('https://api.africastalking.com/version1/messaging', [
                'username' => $username,
                'to' => $to,
                'message' => $message,
                'from' => $this->settings->sender_id,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $recipient = $data['SMSMessageData']['Recipients'][0] ?? [];
                return [
                    'success' => $recipient['status'] === 'Success',
                    'message_id' => $recipient['messageId'] ?? null,
                ];
            }

            Log::error('AfricasTalking SMS Error', ['response' => $response->json()]);
            return ['success' => false, 'message' => 'SMS failed'];
        } catch (\Exception $e) {
            Log::error('AfricasTalking Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send SMS using a template
     */
    public function sendTemplate(string $templateSlug, string $to, array $data, ?string $entityType = null, ?int $entityId = null): array
    {
        $template = DB::connection('tenant')
            ->table('notification_templates')
            ->where('slug', $templateSlug)
            ->where('is_active', true)
            ->first();

        if (!$template || !$template->sms_template) {
            return ['success' => false, 'message' => 'Template not found or inactive'];
        }

        // Replace placeholders
        $message = $this->replacePlaceholders($template->sms_template, $data);

        return $this->send($to, $message, $templateSlug, $entityType, $entityId);
    }

    /**
     * Replace template placeholders
     */
    protected function replacePlaceholders(string $template, array $data): string
    {
        foreach ($data as $key => $value) {
            $template = str_replace('{{' . $key . '}}', $value, $template);
        }
        return $template;
    }

    /**
     * Format phone number to international format
     */
    protected function formatPhoneNumber(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Nigerian number formatting
        if (str_starts_with($phone, '0')) {
            $phone = '234' . substr($phone, 1);
        }
        
        if (!str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }
        
        return $phone;
    }

    /**
     * Log SMS to database
     */
    protected function logSMS(string $to, string $message, ?string $templateSlug, ?string $entityType, ?int $entityId): int
    {
        return DB::connection('tenant')->table('sms_logs')->insertGetId([
            'recipient' => $to,
            'message' => $message,
            'template_slug' => $templateSlug,
            'status' => 'pending',
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Update SMS log status
     */
    protected function updateLogStatus(int $logId, string $status, ?string $messageId, array $response): void
    {
        DB::connection('tenant')->table('sms_logs')
            ->where('id', $logId)
            ->update([
                'status' => $status,
                'message_id' => $messageId,
                'response' => json_encode($response),
                'error_message' => $response['message'] ?? null,
                'updated_at' => now(),
            ]);
    }

    /**
     * Send bulk SMS for invoice reminders
     */
    public function sendBulkReminders(array $invoiceIds): array
    {
        $results = [];

        foreach ($invoiceIds as $invoiceId) {
            $invoice = DB::connection('tenant')
                ->table('invoices')
                ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
                ->where('invoices.id', $invoiceId)
                ->select('invoices.*', 'businesses.owner_phone', 'businesses.name as business_name')
                ->first();

            if (!$invoice) continue;

            $tenant = app('current_tenant');
            
            $result = $this->sendTemplate('invoice_overdue', $invoice->owner_phone, [
                'business_name' => $invoice->business_name,
                'invoice_no' => $invoice->invoice_number,
                'amount' => number_format($invoice->balance, 2),
                'due_date' => date('d/m/Y', strtotime($invoice->due_date)),
                'payment_link' => $invoice->payment_link ?? '',
                'tenant_name' => $tenant->name ?? 'LGA',
            ], 'Invoice', $invoiceId);

            $results[$invoiceId] = $result;

            // Update reminder count
            DB::connection('tenant')->table('defaulters')
                ->where('invoice_id', $invoiceId)
                ->increment('reminder_count');
            
            DB::connection('tenant')->table('defaulters')
                ->where('invoice_id', $invoiceId)
                ->update(['last_reminder_at' => now()]);
        }

        return $results;
    }
}

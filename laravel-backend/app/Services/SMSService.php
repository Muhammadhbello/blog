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

    /**
     * Send bulk SMS to multiple recipients
     */
    public function sendBulk(array $recipients, string $message): array
    {
        $results = [
            'success' => true,
            'total' => count($recipients),
            'sent' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($recipients as $recipient) {
            $phone = $recipient['phone'] ?? $recipient;
            $personalizedMessage = $this->personalizeMessage($message, $recipient);
            
            $result = $this->send($phone, $personalizedMessage);
            
            if ($result['success']) {
                $results['sent']++;
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'phone' => $phone,
                    'error' => $result['message'] ?? 'Unknown error',
                ];
            }
        }

        $results['success'] = $results['failed'] === 0;
        return $results;
    }

    /**
     * Personalize message with recipient placeholders
     */
    protected function personalizeMessage(string $message, $recipient): string
    {
        if (!is_array($recipient)) {
            return $message;
        }

        $placeholders = [
            '{name}' => $recipient['name'] ?? $recipient['business_name'] ?? $recipient['owner_name'] ?? 'Customer',
            '{business_name}' => $recipient['business_name'] ?? '',
            '{owner_name}' => $recipient['owner_name'] ?? '',
            '{amount}' => isset($recipient['amount']) ? number_format($recipient['amount'], 0) : '',
            '{outstanding}' => isset($recipient['outstanding']) ? number_format($recipient['outstanding'], 0) : '',
            '{due_date}' => $recipient['due_date'] ?? '',
            '{invoice_number}' => $recipient['invoice_number'] ?? '',
            '{tenant_name}' => $recipient['tenant_name'] ?? '',
        ];

        return str_replace(array_keys($placeholders), array_values($placeholders), $message);
    }

    /**
     * Send bulk defaulter reminders with personalized messages
     */
    public function sendBulkDefaulterReminders(array $defaulterIds, ?string $customMessage = null): array
    {
        $defaulters = DB::connection('tenant')
            ->table('defaulters')
            ->join('invoices', 'defaulters.invoice_id', '=', 'invoices.id')
            ->join('businesses', 'invoices.business_id', '=', 'businesses.id')
            ->whereIn('defaulters.id', $defaulterIds)
            ->select(
                'defaulters.id',
                'defaulters.invoice_id',
                'businesses.name as business_name',
                'businesses.owner_name',
                'businesses.phone',
                'businesses.owner_phone',
                'invoices.invoice_number',
                'invoices.total_amount',
                'invoices.amount_paid',
                'invoices.due_date'
            )
            ->get();

        if ($defaulters->isEmpty()) {
            return [
                'success' => false,
                'message' => 'No defaulters found',
                'total' => 0,
                'sent' => 0,
                'failed' => 0,
            ];
        }

        // Get template or use custom message
        $template = $customMessage ?? $this->getTemplate('defaulter_reminder');
        if (!$template) {
            $template = "Dear {name}, you have an outstanding balance of NGN{outstanding} for invoice #{invoice_number}. Please make payment to avoid penalties. - {tenant_name}";
        }

        $results = [
            'success' => true,
            'total' => $defaulters->count(),
            'sent' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($defaulters as $defaulter) {
            $phone = $defaulter->owner_phone ?? $defaulter->phone;
            if (!$phone) {
                $results['failed']++;
                $results['errors'][] = [
                    'defaulter_id' => $defaulter->id,
                    'error' => 'No phone number available',
                ];
                continue;
            }

            $outstanding = $defaulter->total_amount - $defaulter->amount_paid;
            $message = $this->personalizeMessage($template, [
                'name' => $defaulter->owner_name ?? $defaulter->business_name,
                'business_name' => $defaulter->business_name,
                'owner_name' => $defaulter->owner_name,
                'outstanding' => $outstanding,
                'amount' => $defaulter->total_amount,
                'invoice_number' => $defaulter->invoice_number,
                'due_date' => $defaulter->due_date,
                'tenant_name' => config('app.name', 'FlexCloud'),
            ]);

            $result = $this->send($phone, $message, 'defaulter_reminder', 'defaulter', $defaulter->id);

            if ($result['success']) {
                $results['sent']++;
                
                // Update reminder count
                DB::connection('tenant')->table('defaulters')
                    ->where('id', $defaulter->id)
                    ->increment('reminder_count');
                    
                DB::connection('tenant')->table('defaulters')
                    ->where('id', $defaulter->id)
                    ->update(['last_reminder_at' => now()]);
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'defaulter_id' => $defaulter->id,
                    'phone' => $phone,
                    'error' => $result['message'] ?? 'Unknown error',
                ];
            }
        }

        $results['success'] = $results['failed'] < $results['total'];
        return $results;
    }

    /**
     * Get SMS template by slug
     */
    public function getTemplate(string $slug): ?string
    {
        try {
            $template = DB::connection('tenant')
                ->table('sms_templates')
                ->where('slug', $slug)
                ->where('is_active', true)
                ->first();

            return $template?->content;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Send reminder to a specific defaulter
     */
    public function sendDefaulterReminder($defaulter, ?string $customMessage = null): array
    {
        $phone = $defaulter->business->owner_phone ?? $defaulter->business->phone;
        
        if (!$phone) {
            return ['success' => false, 'error' => 'No phone number available'];
        }

        // Get template or use custom message
        $template = $customMessage ?? $this->getTemplate('defaulter_reminder');
        if (!$template) {
            $template = "Dear {name}, you have an outstanding balance of NGN{amount} due {days_overdue} days ago. Please make payment to avoid penalties. - {tenant_name}";
        }

        // Personalize message
        $message = str_replace(
            ['{name}', '{business_name}', '{amount}', '{days_overdue}', '{tenant_name}'],
            [
                $defaulter->business->owner_name ?? $defaulter->business->name,
                $defaulter->business->name,
                number_format($defaulter->amount_due, 0),
                $defaulter->days_overdue,
                config('app.name', 'FlexCloud'),
            ],
            $template
        );

        return $this->send($phone, $message, 'defaulter_reminder', 'defaulter', $defaulter->id);
    }

    /**
     * Get SMS balance from provider
     */
    public function getBalance(): array
    {
        if (!$this->settings) {
            return ['success' => true, 'balance' => 'N/A (Mock Mode)', 'is_mock' => true];
        }

        try {
            $result = match($this->provider) {
                'termii' => $this->getTermiiBalance(),
                'twilio' => $this->getTwilioBalance(),
                'africas_talking' => $this->getAfricasTalkingBalance(),
                default => ['success' => false, 'message' => 'Unknown provider'],
            };

            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Get Termii balance
     */
    protected function getTermiiBalance(): array
    {
        try {
            $response = Http::get('https://api.ng.termii.com/api/get-balance', [
                'api_key' => decrypt($this->settings->api_key),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'balance' => $data['balance'] ?? 0,
                    'currency' => $data['currency'] ?? 'NGN',
                ];
            }

            return ['success' => false, 'message' => 'Failed to fetch balance'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Get Twilio balance
     */
    protected function getTwilioBalance(): array
    {
        try {
            $config = json_decode($this->settings->additional_config, true) ?? [];
            $sid = $config['account_sid'] ?? '';
            $token = decrypt($this->settings->api_key);

            $response = Http::withBasicAuth($sid, $token)
                ->get("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Balance.json");

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'balance' => $data['balance'] ?? 0,
                    'currency' => $data['currency'] ?? 'USD',
                ];
            }

            return ['success' => false, 'message' => 'Failed to fetch balance'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Get Africa's Talking balance
     */
    protected function getAfricasTalkingBalance(): array
    {
        try {
            $config = json_decode($this->settings->additional_config, true) ?? [];
            $username = $config['username'] ?? '';

            $response = Http::withHeaders([
                'apiKey' => decrypt($this->settings->api_key),
            ])->get("https://api.africastalking.com/version1/user?username={$username}");

            if ($response->successful()) {
                $data = $response->json();
                $balance = $data['UserData']['balance'] ?? '0';
                // Parse balance string like "KES 10.00"
                preg_match('/([A-Z]{3})\s*([\d.]+)/', $balance, $matches);
                return [
                    'success' => true,
                    'balance' => $matches[2] ?? 0,
                    'currency' => $matches[1] ?? 'KES',
                ];
            }

            return ['success' => false, 'message' => 'Failed to fetch balance'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}

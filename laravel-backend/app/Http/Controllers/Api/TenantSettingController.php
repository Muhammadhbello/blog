<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\MessageTemplate;

class TenantSettingController extends Controller
{
    // ==========================================
    // PAYMENT SETTINGS
    // ==========================================

    /**
     * Get all payment gateway settings
     */
    public function getPaymentSettings()
    {
        $settings = DB::connection('tenant')
            ->table('payment_settings')
            ->get();

        $providers = [];
        $activeProvider = null;

        foreach ($settings as $setting) {
            $providers[$setting->provider] = [
                'id' => $setting->id,
                'provider' => $setting->provider,
                'mode' => $setting->mode ?? 'test',
                'merchant_id' => $setting->merchant_id ?? '',
                'public_key' => $setting->public_key ?? '',
                'secret_key_masked' => $setting->secret_key ? $this->maskSecret($setting->secret_key) : null,
                'base_url' => $setting->base_url ?? '',
                'webhook_secret_masked' => $setting->webhook_secret ? $this->maskSecret($setting->webhook_secret) : null,
                'is_enabled' => (bool) ($setting->is_enabled ?? false),
                'last_tested_at' => $setting->last_tested_at ?? null,
                'last_test_status' => $setting->last_test_status ?? null,
                'last_test_message' => $setting->last_test_message ?? null,
                'has_secret_key' => !empty($setting->secret_key),
                'has_webhook_secret' => !empty($setting->webhook_secret),
            ];
            
            if ($setting->is_enabled ?? false) {
                $activeProvider = $setting->provider;
            }
        }

        // Fill in missing providers with defaults
        foreach (['paymentpoint', 'palmpay'] as $provider) {
            if (!isset($providers[$provider])) {
                $providers[$provider] = $this->getDefaultPaymentConfig($provider);
            }
        }

        return response()->json([
            'providers' => $providers,
            'active_provider' => $activeProvider,
        ]);
    }

    protected function getDefaultPaymentConfig(string $provider): array
    {
        $baseUrls = [
            'paymentpoint' => [
                'test' => 'https://sandbox.paymentpoint.ng/api/v1',
                'live' => 'https://api.paymentpoint.ng/api/v1',
            ],
            'palmpay' => [
                'test' => 'https://sandbox.palmpay.com/api',
                'live' => 'https://api.palmpay.com/api',
            ],
        ];

        return [
            'id' => null,
            'provider' => $provider,
            'mode' => 'test',
            'merchant_id' => '',
            'public_key' => '',
            'secret_key_masked' => null,
            'base_url' => $baseUrls[$provider]['test'] ?? '',
            'webhook_secret_masked' => null,
            'is_enabled' => false,
            'last_tested_at' => null,
            'last_test_status' => null,
            'last_test_message' => null,
            'has_secret_key' => false,
            'has_webhook_secret' => false,
        ];
    }

    /**
     * Save payment gateway settings for a specific provider
     */
    public function savePaymentSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:paymentpoint,palmpay',
            'mode' => 'required|in:test,live',
            'merchant_id' => 'nullable|string|max:255',
            'public_key' => 'nullable|string|max:500',
            'secret_key' => 'nullable|string|max:500',
            'base_url' => 'nullable|url|max:500',
            'webhook_secret' => 'nullable|string|max:500',
            'is_enabled' => 'required|boolean',
        ]);

        $existing = DB::connection('tenant')
            ->table('payment_settings')
            ->where('provider', $validated['provider'])
            ->first();

        $data = [
            'provider' => $validated['provider'],
            'mode' => $validated['mode'],
            'merchant_id' => $validated['merchant_id'] ?? null,
            'public_key' => $validated['public_key'] ?? null,
            'base_url' => $validated['base_url'] ?? null,
            'is_enabled' => $validated['is_enabled'],
            'updated_by' => auth()->id(),
            'updated_at' => now(),
        ];

        // Only update secrets if new values provided
        if (!empty($validated['secret_key']) && !str_contains($validated['secret_key'], '***')) {
            $data['secret_key'] = Crypt::encryptString($validated['secret_key']);
        }
        if (!empty($validated['webhook_secret']) && !str_contains($validated['webhook_secret'], '***')) {
            $data['webhook_secret'] = Crypt::encryptString($validated['webhook_secret']);
        }

        // If enabling this provider, disable others
        if ($validated['is_enabled']) {
            DB::connection('tenant')
                ->table('payment_settings')
                ->where('provider', '!=', $validated['provider'])
                ->update(['is_enabled' => false]);
        }

        if ($existing) {
            DB::connection('tenant')
                ->table('payment_settings')
                ->where('id', $existing->id)
                ->update($data);
        } else {
            $data['id'] = Str::uuid();
            $data['created_at'] = now();
            DB::connection('tenant')
                ->table('payment_settings')
                ->insert($data);
        }

        $this->logAudit('update_payment_settings', [
            'provider' => $validated['provider'],
            'mode' => $validated['mode'],
            'is_enabled' => $validated['is_enabled'],
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($validated['provider']) . ' settings saved successfully',
        ]);
    }

    /**
     * Test payment gateway connection
     */
    public function testPaymentConnection(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:paymentpoint,palmpay',
        ]);

        $setting = DB::connection('tenant')
            ->table('payment_settings')
            ->where('provider', $validated['provider'])
            ->first();

        if (!$setting || !$setting->secret_key) {
            return response()->json([
                'success' => false,
                'status' => 'failed',
                'message' => 'No credentials configured for ' . $validated['provider'],
                'steps' => [
                    ['step' => 'Validating Configuration', 'status' => 'failed', 'message' => 'Missing credentials'],
                ],
            ], 400);
        }

        $steps = [];
        
        // Step 1: Validate format
        $steps[] = ['step' => 'Validating Format', 'status' => 'success', 'message' => 'Credentials format valid'];

        // Step 2: Test API connection
        try {
            $secretKey = Crypt::decryptString($setting->secret_key);
            $baseUrl = $setting->base_url ?? $this->getProviderBaseUrl($validated['provider'], $setting->mode);
            
            $response = match($validated['provider']) {
                'paymentpoint' => $this->testPaymentPointConnection($baseUrl, $secretKey, $setting->merchant_id),
                'palmpay' => $this->testPalmPayConnection($baseUrl, $secretKey, $setting->merchant_id),
                default => ['success' => false, 'message' => 'Unknown provider'],
            };

            if ($response['success']) {
                $steps[] = ['step' => 'Connecting to API', 'status' => 'success', 'message' => 'Connected successfully'];
                $steps[] = ['step' => 'Verifying Credentials', 'status' => 'success', 'message' => $response['message'] ?? 'Credentials verified'];
                
                // Update test status
                DB::connection('tenant')
                    ->table('payment_settings')
                    ->where('id', $setting->id)
                    ->update([
                        'last_tested_at' => now(),
                        'last_test_status' => 'success',
                        'last_test_message' => $response['message'] ?? 'Connection successful',
                    ]);

                return response()->json([
                    'success' => true,
                    'status' => 'success',
                    'message' => 'Connection test successful',
                    'steps' => $steps,
                    'details' => $response['details'] ?? null,
                ]);
            } else {
                $steps[] = ['step' => 'Connecting to API', 'status' => 'failed', 'message' => $response['message'] ?? 'Connection failed'];
                
                DB::connection('tenant')
                    ->table('payment_settings')
                    ->where('id', $setting->id)
                    ->update([
                        'last_tested_at' => now(),
                        'last_test_status' => 'failed',
                        'last_test_message' => $response['message'] ?? 'Connection failed',
                    ]);

                return response()->json([
                    'success' => false,
                    'status' => 'failed',
                    'message' => $response['message'] ?? 'Connection test failed',
                    'steps' => $steps,
                ], 400);
            }
        } catch (\Exception $e) {
            $steps[] = ['step' => 'Connecting to API', 'status' => 'failed', 'message' => $e->getMessage()];
            
            DB::connection('tenant')
                ->table('payment_settings')
                ->where('id', $setting->id)
                ->update([
                    'last_tested_at' => now(),
                    'last_test_status' => 'failed',
                    'last_test_message' => $e->getMessage(),
                ]);

            return response()->json([
                'success' => false,
                'status' => 'failed',
                'message' => 'Connection error: ' . $e->getMessage(),
                'steps' => $steps,
            ], 500);
        }
    }

    protected function testPaymentPointConnection(string $baseUrl, string $secretKey, ?string $merchantId): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $secretKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->get($baseUrl . '/merchant/balance');

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'message' => 'Connected! Balance: ' . ($data['balance'] ?? 'N/A'),
                    'details' => $data,
                ];
            }

            return [
                'success' => false,
                'message' => $response->json()['message'] ?? 'API request failed with status ' . $response->status(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
        }
    }

    protected function testPalmPayConnection(string $baseUrl, string $secretKey, ?string $merchantId): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $secretKey,
                'X-Merchant-ID' => $merchantId ?? '',
                'Content-Type' => 'application/json',
            ])->timeout(10)->get($baseUrl . '/merchant/info');

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'message' => 'Connected! Merchant verified.',
                    'details' => $data,
                ];
            }

            return [
                'success' => false,
                'message' => $response->json()['message'] ?? 'API request failed with status ' . $response->status(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
        }
    }

    protected function getProviderBaseUrl(string $provider, ?string $mode): string
    {
        $urls = [
            'paymentpoint' => [
                'test' => 'https://sandbox.paymentpoint.ng/api/v1',
                'live' => 'https://api.paymentpoint.ng/api/v1',
            ],
            'palmpay' => [
                'test' => 'https://sandbox.palmpay.com/api',
                'live' => 'https://api.palmpay.com/api',
            ],
        ];

        return $urls[$provider][$mode ?? 'test'] ?? '';
    }

    // ==========================================
    // SMS SETTINGS
    // ==========================================

    /**
     * Get SMS gateway settings
     */
    public function getSmsSettings()
    {
        $settings = DB::connection('tenant')
            ->table('sms_settings')
            ->get();

        $providers = [];
        $activeProvider = null;

        foreach ($settings as $setting) {
            $providers[$setting->provider] = [
                'id' => $setting->id,
                'provider' => $setting->provider,
                'mode' => $setting->mode ?? 'test',
                'api_key_masked' => $setting->api_key ? $this->maskSecret($setting->api_key) : null,
                'sender_id' => $setting->sender_id ?? '',
                'route' => $setting->route ?? 'generic',
                'additional_config' => json_decode($setting->additional_config ?? '{}', true),
                'is_enabled' => (bool) ($setting->is_enabled ?? false),
                'last_tested_at' => $setting->last_tested_at ?? null,
                'last_test_status' => $setting->last_test_status ?? null,
                'last_test_message' => $setting->last_test_message ?? null,
                'has_api_key' => !empty($setting->api_key),
            ];
            
            if ($setting->is_enabled ?? false) {
                $activeProvider = $setting->provider;
            }
        }

        // Fill in missing providers with defaults
        foreach (['termii', 'twilio', 'africas_talking'] as $provider) {
            if (!isset($providers[$provider])) {
                $providers[$provider] = $this->getDefaultSmsConfig($provider);
            }
        }

        return response()->json([
            'providers' => $providers,
            'active_provider' => $activeProvider,
        ]);
    }

    protected function getDefaultSmsConfig(string $provider): array
    {
        return [
            'id' => null,
            'provider' => $provider,
            'mode' => 'test',
            'api_key_masked' => null,
            'sender_id' => '',
            'route' => $provider === 'termii' ? 'generic' : 'transactional',
            'additional_config' => [],
            'is_enabled' => false,
            'last_tested_at' => null,
            'last_test_status' => null,
            'last_test_message' => null,
            'has_api_key' => false,
        ];
    }

    /**
     * Save SMS gateway settings
     */
    public function saveSmsSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:termii,twilio,africas_talking',
            'mode' => 'required|in:test,live',
            'api_key' => 'nullable|string|max:500',
            'sender_id' => 'nullable|string|max:11',
            'route' => 'nullable|string|in:generic,transactional,promotional,dnd',
            'additional_config' => 'nullable|array',
            'is_enabled' => 'required|boolean',
        ]);

        $existing = DB::connection('tenant')
            ->table('sms_settings')
            ->where('provider', $validated['provider'])
            ->first();

        $data = [
            'provider' => $validated['provider'],
            'mode' => $validated['mode'],
            'sender_id' => $validated['sender_id'] ?? null,
            'route' => $validated['route'] ?? 'generic',
            'additional_config' => json_encode($validated['additional_config'] ?? []),
            'is_enabled' => $validated['is_enabled'],
            'updated_by' => auth()->id(),
            'updated_at' => now(),
        ];

        // Only update API key if new value provided
        if (!empty($validated['api_key']) && !str_contains($validated['api_key'], '***')) {
            $data['api_key'] = Crypt::encryptString($validated['api_key']);
        }

        // If enabling this provider, disable others
        if ($validated['is_enabled']) {
            DB::connection('tenant')
                ->table('sms_settings')
                ->where('provider', '!=', $validated['provider'])
                ->update(['is_enabled' => false]);
        }

        if ($existing) {
            DB::connection('tenant')
                ->table('sms_settings')
                ->where('id', $existing->id)
                ->update($data);
        } else {
            $data['id'] = Str::uuid();
            $data['created_at'] = now();
            DB::connection('tenant')
                ->table('sms_settings')
                ->insert($data);
        }

        $this->logAudit('update_sms_settings', [
            'provider' => $validated['provider'],
            'mode' => $validated['mode'],
            'is_enabled' => $validated['is_enabled'],
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($validated['provider']) . ' settings saved successfully',
        ]);
    }

    /**
     * Test SMS gateway connection
     */
    public function testSmsConnection(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:termii,twilio,africas_talking',
            'test_phone' => 'nullable|string', // Optional: send actual test SMS
        ]);

        $setting = DB::connection('tenant')
            ->table('sms_settings')
            ->where('provider', $validated['provider'])
            ->first();

        if (!$setting || !$setting->api_key) {
            return response()->json([
                'success' => false,
                'status' => 'failed',
                'message' => 'No API key configured for ' . $validated['provider'],
                'steps' => [
                    ['step' => 'Validating Configuration', 'status' => 'failed', 'message' => 'Missing API key'],
                ],
            ], 400);
        }

        $steps = [];
        $steps[] = ['step' => 'Validating Format', 'status' => 'success', 'message' => 'API key format valid'];

        try {
            $apiKey = Crypt::decryptString($setting->api_key);
            
            $response = match($validated['provider']) {
                'termii' => $this->testTermiiConnection($apiKey),
                'twilio' => $this->testTwilioConnection($apiKey, json_decode($setting->additional_config ?? '{}', true)),
                'africas_talking' => $this->testAfricasTalkingConnection($apiKey, json_decode($setting->additional_config ?? '{}', true)),
                default => ['success' => false, 'message' => 'Unknown provider'],
            };

            if ($response['success']) {
                $steps[] = ['step' => 'Connecting to API', 'status' => 'success', 'message' => 'Connected successfully'];
                $steps[] = ['step' => 'Verifying Credentials', 'status' => 'success', 'message' => $response['message']];
                
                DB::connection('tenant')
                    ->table('sms_settings')
                    ->where('id', $setting->id)
                    ->update([
                        'last_tested_at' => now(),
                        'last_test_status' => 'success',
                        'last_test_message' => $response['message'],
                    ]);

                return response()->json([
                    'success' => true,
                    'status' => 'success',
                    'message' => 'Connection test successful',
                    'steps' => $steps,
                    'balance' => $response['balance'] ?? null,
                ]);
            } else {
                $steps[] = ['step' => 'Connecting to API', 'status' => 'failed', 'message' => $response['message']];
                
                DB::connection('tenant')
                    ->table('sms_settings')
                    ->where('id', $setting->id)
                    ->update([
                        'last_tested_at' => now(),
                        'last_test_status' => 'failed',
                        'last_test_message' => $response['message'],
                    ]);

                return response()->json([
                    'success' => false,
                    'status' => 'failed',
                    'message' => $response['message'],
                    'steps' => $steps,
                ], 400);
            }
        } catch (\Exception $e) {
            $steps[] = ['step' => 'Connecting to API', 'status' => 'failed', 'message' => $e->getMessage()];
            
            return response()->json([
                'success' => false,
                'status' => 'failed',
                'message' => 'Connection error: ' . $e->getMessage(),
                'steps' => $steps,
            ], 500);
        }
    }

    protected function testTermiiConnection(string $apiKey): array
    {
        try {
            $response = Http::timeout(10)->get('https://api.ng.termii.com/api/get-balance', [
                'api_key' => $apiKey,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'message' => 'Connected! Balance: ' . ($data['balance'] ?? '0') . ' ' . ($data['currency'] ?? 'NGN'),
                    'balance' => $data['balance'] ?? 0,
                ];
            }

            return [
                'success' => false,
                'message' => $response->json()['message'] ?? 'API request failed',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
        }
    }

    protected function testTwilioConnection(string $apiKey, array $config): array
    {
        try {
            $sid = $config['account_sid'] ?? '';
            if (!$sid) {
                return ['success' => false, 'message' => 'Account SID not configured'];
            }

            $response = Http::withBasicAuth($sid, $apiKey)
                ->timeout(10)
                ->get("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Balance.json");

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'message' => 'Connected! Balance: ' . ($data['balance'] ?? '0') . ' ' . ($data['currency'] ?? 'USD'),
                    'balance' => $data['balance'] ?? 0,
                ];
            }

            return [
                'success' => false,
                'message' => $response->json()['message'] ?? 'API request failed',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
        }
    }

    protected function testAfricasTalkingConnection(string $apiKey, array $config): array
    {
        try {
            $username = $config['username'] ?? '';
            if (!$username) {
                return ['success' => false, 'message' => 'Username not configured'];
            }

            $response = Http::withHeaders([
                'apiKey' => $apiKey,
            ])->timeout(10)->get("https://api.africastalking.com/version1/user?username={$username}");

            if ($response->successful()) {
                $data = $response->json();
                $balance = $data['UserData']['balance'] ?? '0';
                return [
                    'success' => true,
                    'message' => 'Connected! Balance: ' . $balance,
                    'balance' => $balance,
                ];
            }

            return [
                'success' => false,
                'message' => 'API request failed',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
        }
    }

    // ==========================================
    // MESSAGE TEMPLATES
    // ==========================================

    /**
     * Get all message templates
     */
    public function getTemplates()
    {
        $templates = DB::connection('tenant')
            ->table('message_templates')
            ->orderBy('channel')
            ->orderBy('key')
            ->get();

        // Get placeholders for each template
        $templatesWithPlaceholders = $templates->map(function ($template) {
            return [
                'id' => $template->id,
                'channel' => $template->channel,
                'key' => $template->key,
                'name' => $template->name,
                'subject' => $template->subject,
                'body' => $template->body,
                'is_active' => (bool) $template->is_active,
                'placeholders' => MessageTemplate::getPlaceholders($template->key),
                'updated_at' => $template->updated_at,
            ];
        });

        return response()->json([
            'templates' => $templatesWithPlaceholders,
            'channels' => ['sms', 'email', 'payment_notification'],
        ]);
    }

    /**
     * Update a message template
     */
    public function updateTemplate(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'subject' => 'nullable|string|max:500',
            'body' => 'required|string',
            'is_active' => 'required|boolean',
        ]);

        $template = DB::connection('tenant')
            ->table('message_templates')
            ->where('id', $id)
            ->first();

        if (!$template) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        DB::connection('tenant')
            ->table('message_templates')
            ->where('id', $id)
            ->update([
                'name' => $validated['name'] ?? $template->name,
                'subject' => $validated['subject'] ?? $template->subject,
                'body' => $validated['body'],
                'is_active' => $validated['is_active'],
                'updated_at' => now(),
            ]);

        $this->logAudit('update_template', ['template' => $template->name, 'key' => $template->key]);

        return response()->json([
            'success' => true,
            'message' => 'Template updated successfully',
        ]);
    }

    /**
     * Preview a template with sample data
     */
    public function previewTemplate(Request $request)
    {
        $validated = $request->validate([
            'body' => 'required|string',
            'key' => 'required|string',
        ]);

        // Sample data for preview
        $sampleData = [
            'business_name' => 'ABC Ventures Ltd',
            'invoice_number' => 'INV-2025-001234',
            'amount' => '₦125,000.00',
            'due_date' => '15 Jan 2025',
            'payment_link' => 'https://pay.flexcloud.ng/inv/abc123',
            'receipt_number' => 'RCP-2025-005678',
            'payment_date' => '10 Jan 2025',
            'days_overdue' => '15',
            'ticket_number' => 'TKT-2025-00100',
            'item_name' => 'Market Stall Fee',
            'tenant_name' => 'Potiskum LGA Revenue Office',
        ];

        $preview = $validated['body'];
        foreach ($sampleData as $key => $value) {
            $preview = str_replace('{{' . $key . '}}', $value, $preview);
        }

        return response()->json([
            'original' => $validated['body'],
            'preview' => $preview,
            'sample_data' => $sampleData,
            'character_count' => strlen($preview),
            'sms_segments' => ceil(strlen($preview) / 160),
        ]);
    }

    // ==========================================
    // GENERAL SETTINGS
    // ==========================================

    /**
     * Get general tenant settings
     */
    public function getGeneralSettings()
    {
        $settings = DB::connection('tenant')
            ->table('tenant_settings')
            ->get()
            ->keyBy('key');

        return response()->json($settings);
    }

    /**
     * Update general tenant settings
     */
    public function updateGeneralSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
        ]);

        foreach ($validated['settings'] as $setting) {
            DB::connection('tenant')
                ->table('tenant_settings')
                ->updateOrInsert(
                    ['key' => $setting['key']],
                    [
                        'value' => $setting['value'],
                        'updated_at' => now(),
                    ]
                );
        }

        $this->logAudit('update_general_settings', ['count' => count($validated['settings'])]);

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
        ]);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    protected function maskSecret(?string $encrypted): ?string
    {
        if (!$encrypted) return null;
        
        try {
            $decrypted = Crypt::decryptString($encrypted);
            if (strlen($decrypted) <= 8) {
                return str_repeat('*', strlen($decrypted));
            }
            return substr($decrypted, 0, 4) . str_repeat('*', strlen($decrypted) - 8) . substr($decrypted, -4);
        } catch (\Exception $e) {
            return '****encrypted****';
        }
    }

    protected function logAudit(string $action, array $details): void
    {
        try {
            DB::connection('tenant')->table('audit_logs')->insert([
                'user_id' => auth()->id(),
                'action' => $action,
                'module' => 'settings',
                'entity_type' => 'Settings',
                'entity_id' => null,
                'details' => json_encode($details),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Silent fail for audit logging
        }
    }
}

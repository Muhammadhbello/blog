<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\PaymentSetting;
use App\Models\SmsSetting;
use App\Models\MessageTemplate;

class TenantSettingController extends Controller
{
    /**
     * Get all payment gateway settings (supports multiple providers)
     */
    public function getPaymentSettings()
    {
        $settings = DB::connection('tenant')
            ->table('payment_settings')
            ->get();

        if ($settings->isEmpty()) {
            // Return default structure for both providers
            return response()->json([
                'providers' => [
                    'paymentpoint' => $this->getDefaultPaymentConfig('paymentpoint'),
                    'palmpay' => $this->getDefaultPaymentConfig('palmpay'),
                ],
                'active_provider' => null,
            ]);
        }

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
                'is_enabled' => (bool) $setting->is_enabled,
                'last_tested_at' => $setting->last_tested_at,
                'last_test_status' => $setting->last_test_status,
                'last_test_message' => $setting->last_test_message,
                'has_secret_key' => !empty($setting->secret_key),
                'has_webhook_secret' => !empty($setting->webhook_secret),
            ];
            
            if ($setting->is_enabled) {
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
        return [
            'id' => null,
            'provider' => $provider,
            'mode' => 'test',
            'merchant_id' => '',
            'public_key' => '',
            'secret_key_masked' => null,
            'base_url' => '',
            'webhook_secret_masked' => null,
            'is_enabled' => false,
            'last_tested_at' => null,
            'last_test_status' => null,
            'last_test_message' => null,
            'has_secret_key' => false,
            'has_webhook_secret' => false,
        ];
    }

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

    /**
     * Save payment gateway settings
     */
    public function savePaymentSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:paymentpoint,palmpay',
            'is_active' => 'required|boolean',
            'api_key' => 'nullable|string',
            'secret_key' => 'nullable|string',
            'merchant_id' => 'nullable|string',
            'webhook_secret' => 'nullable|string',
            'environment' => 'required|in:sandbox,production',
        ]);

        $existing = DB::connection('tenant')
            ->table('payment_settings')
            ->first();

        $data = [
            'provider' => $validated['provider'],
            'is_active' => $validated['is_active'],
            'environment' => $validated['environment'],
            'updated_at' => now(),
        ];

        // Only update sensitive fields if provided (not masked)
        if (!empty($validated['api_key']) && $validated['api_key'] !== '••••••••') {
            $data['api_key'] = Crypt::encryptString($validated['api_key']);
        }
        if (!empty($validated['secret_key']) && $validated['secret_key'] !== '••••••••') {
            $data['secret_key'] = Crypt::encryptString($validated['secret_key']);
        }
        if (!empty($validated['merchant_id'])) {
            $data['merchant_id'] = $validated['merchant_id'];
        }
        if (!empty($validated['webhook_secret']) && $validated['webhook_secret'] !== '••••••••') {
            $data['webhook_secret'] = Crypt::encryptString($validated['webhook_secret']);
        }

        if ($existing) {
            DB::connection('tenant')
                ->table('payment_settings')
                ->where('id', $existing->id)
                ->update($data);
        } else {
            $data['created_at'] = now();
            DB::connection('tenant')
                ->table('payment_settings')
                ->insert($data);
        }

        $this->logAudit('update_payment_settings', ['provider' => $validated['provider']]);

        return response()->json(['message' => 'Payment settings saved successfully']);
    }

    /**
     * Get SMS gateway settings
     */
    public function getSmsSettings()
    {
        $settings = DB::connection('tenant')
            ->table('sms_settings')
            ->first();

        if (!$settings) {
            return response()->json([
                'provider' => 'termii',
                'is_active' => false,
                'api_key' => '',
                'sender_id' => '',
                'route' => 'transactional',
            ]);
        }

        return response()->json([
            'id' => $settings->id,
            'provider' => $settings->provider,
            'is_active' => (bool) $settings->is_active,
            'api_key' => $settings->api_key ? '••••••••' : '',
            'sender_id' => $settings->sender_id ?? '',
            'route' => $settings->route ?? 'transactional',
        ]);
    }

    /**
     * Save SMS gateway settings
     */
    public function saveSmsSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|in:termii,twilio,africas_talking',
            'is_active' => 'required|boolean',
            'api_key' => 'nullable|string',
            'sender_id' => 'nullable|string|max:11',
            'route' => 'nullable|in:transactional,promotional',
        ]);

        $existing = DB::connection('tenant')
            ->table('sms_settings')
            ->first();

        $data = [
            'provider' => $validated['provider'],
            'is_active' => $validated['is_active'],
            'route' => $validated['route'] ?? 'transactional',
            'updated_at' => now(),
        ];

        if (!empty($validated['api_key']) && $validated['api_key'] !== '••••••••') {
            $data['api_key'] = Crypt::encryptString($validated['api_key']);
        }
        if (!empty($validated['sender_id'])) {
            $data['sender_id'] = $validated['sender_id'];
        }

        if ($existing) {
            DB::connection('tenant')
                ->table('sms_settings')
                ->where('id', $existing->id)
                ->update($data);
        } else {
            $data['created_at'] = now();
            DB::connection('tenant')
                ->table('sms_settings')
                ->insert($data);
        }

        $this->logAudit('update_sms_settings', ['provider' => $validated['provider']]);

        return response()->json(['message' => 'SMS settings saved successfully']);
    }

    /**
     * Get notification templates
     */
    public function getTemplates()
    {
        $templates = DB::connection('tenant')
            ->table('notification_templates')
            ->orderBy('name')
            ->get();

        return response()->json($templates);
    }

    /**
     * Update a notification template
     */
    public function updateTemplate(Request $request, $id)
    {
        $validated = $request->validate([
            'sms_template' => 'required|string|max:500',
            'is_active' => 'required|boolean',
        ]);

        $template = DB::connection('tenant')
            ->table('notification_templates')
            ->where('id', $id)
            ->first();

        if (!$template) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        DB::connection('tenant')
            ->table('notification_templates')
            ->where('id', $id)
            ->update([
                'sms_template' => $validated['sms_template'],
                'is_active' => $validated['is_active'],
                'updated_at' => now(),
            ]);

        $this->logAudit('update_template', ['template' => $template->name]);

        return response()->json(['message' => 'Template updated successfully']);
    }

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

        return response()->json(['message' => 'Settings updated successfully']);
    }

    protected function logAudit(string $action, array $details): void
    {
        DB::connection('tenant')->table('tenant_audit_logs')->insert([
            'user_id' => auth()->id(),
            'user_type' => 'tenant_user',
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
    }
}

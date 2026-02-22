<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PlatformSetting;
use App\Models\AuditLog;

class PlatformSettingController extends Controller
{
    public function index(Request $request)
    {
        $query = PlatformSetting::query();

        if ($request->has('group')) {
            $query->where('group', $request->group);
        }

        $settings = $query->orderBy('group')->orderBy('key')->get();

        // Group by category
        $grouped = $settings->groupBy('group');

        return response()->json($grouped);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string|unique:platform_settings',
            'value' => 'required',
            'type' => 'required|in:string,boolean,integer,float,array,json',
            'group' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $setting = PlatformSetting::create($validated);

        AuditLog::log(
            'create',
            'platform_settings',
            'PlatformSetting',
            $setting->id,
            ['key' => $setting->key, 'value' => $setting->value]
        );

        return response()->json($setting, 201);
    }

    public function update(Request $request, PlatformSetting $platformSetting)
    {
        $validated = $request->validate([
            'value' => 'required',
            'description' => 'nullable|string',
        ]);

        $oldValue = $platformSetting->value;

        $platformSetting->update($validated);

        AuditLog::log(
            'update',
            'platform_settings',
            'PlatformSetting',
            $platformSetting->id,
            ['key' => $platformSetting->key],
            ['value' => $oldValue],
            ['value' => $platformSetting->value]
        );

        return response()->json($platformSetting);
    }

    public function destroy(PlatformSetting $platformSetting)
    {
        AuditLog::log(
            'delete',
            'platform_settings',
            'PlatformSetting',
            $platformSetting->id,
            ['key' => $platformSetting->key]
        );

        $platformSetting->delete();

        return response()->json(['message' => 'Setting deleted successfully']);
    }

    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
        ]);

        $updated = [];
        foreach ($validated['settings'] as $setting) {
            $existing = PlatformSetting::where('key', $setting['key'])->first();
            if ($existing) {
                $existing->update(['value' => $setting['value']]);
                $updated[] = $existing;
            }
        }

        AuditLog::log(
            'bulk_update',
            'platform_settings',
            null,
            null,
            ['updated_keys' => collect($updated)->pluck('key')->toArray()]
        );

        return response()->json(['message' => 'Settings updated', 'updated' => count($updated)]);
    }

    public function initDefaults()
    {
        $defaults = [
            ['key' => 'platform_name', 'value' => 'FlexCloud', 'type' => 'string', 'group' => 'general', 'description' => 'Platform display name'],
            ['key' => 'platform_email', 'value' => 'support@flexcloud.ng', 'type' => 'string', 'group' => 'general', 'description' => 'Platform support email'],
            ['key' => 'default_revenue_share', 'value' => '5.00', 'type' => 'float', 'group' => 'billing', 'description' => 'Default revenue share percentage'],
            ['key' => 'enable_sms', 'value' => 'true', 'type' => 'boolean', 'group' => 'features', 'description' => 'Enable SMS notifications'],
            ['key' => 'enable_virtual_accounts', 'value' => 'true', 'type' => 'boolean', 'group' => 'features', 'description' => 'Enable virtual account generation'],
            ['key' => 'max_users_per_tenant', 'value' => '100', 'type' => 'integer', 'group' => 'limits', 'description' => 'Maximum users per tenant'],
            ['key' => 'sms_provider', 'value' => 'twilio', 'type' => 'string', 'group' => 'integrations', 'description' => 'SMS provider'],
            ['key' => 'payment_provider', 'value' => 'palmpay', 'type' => 'string', 'group' => 'integrations', 'description' => 'Payment provider'],
        ];

        foreach ($defaults as $default) {
            PlatformSetting::firstOrCreate(
                ['key' => $default['key']],
                $default
            );
        }

        return response()->json(['message' => 'Default settings initialized']);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SmsSetting extends Model
{
    use HasUuids;

    protected $connection = 'tenant';
    protected $table = 'sms_settings';
    
    protected $fillable = [
        'provider',
        'mode',
        'api_key',
        'sender_id',
        'route',
        'additional_config',
        'is_enabled',
        'last_tested_at',
        'last_test_status',
        'last_test_message',
        'updated_by',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'additional_config' => 'array',
        'is_enabled' => 'boolean',
        'last_tested_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
    ];

    /**
     * Get masked API key for display
     */
    public function getMaskedApiKeyAttribute(): ?string
    {
        if (!$this->attributes['api_key']) {
            return null;
        }
        
        $decrypted = $this->api_key;
        if (strlen($decrypted) <= 8) {
            return str_repeat('*', strlen($decrypted));
        }
        
        return substr($decrypted, 0, 4) . str_repeat('*', strlen($decrypted) - 8) . substr($decrypted, -4);
    }

    /**
     * Get the base URL for the provider
     */
    public function getProviderBaseUrl(): string
    {
        $urls = [
            'termii' => 'https://api.ng.termii.com/api',
            'twilio' => 'https://api.twilio.com/2010-04-01',
            'africas_talking' => 'https://api.africastalking.com/version1',
        ];

        return $urls[$this->provider] ?? '';
    }

    /**
     * Convert to safe array for API response
     */
    public function toSafeArray(): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'mode' => $this->mode,
            'api_key_masked' => $this->masked_api_key,
            'sender_id' => $this->sender_id,
            'route' => $this->route,
            'additional_config' => $this->additional_config,
            'is_enabled' => $this->is_enabled,
            'last_tested_at' => $this->last_tested_at?->toISOString(),
            'last_test_status' => $this->last_test_status,
            'last_test_message' => $this->last_test_message,
            'has_api_key' => !empty($this->attributes['api_key']),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

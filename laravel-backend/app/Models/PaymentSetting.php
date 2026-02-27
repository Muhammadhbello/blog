<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PaymentSetting extends Model
{
    use HasUuids;

    protected $connection = 'tenant';
    
    protected $fillable = [
        'provider',
        'mode',
        'merchant_id',
        'public_key',
        'secret_key',
        'base_url',
        'webhook_secret',
        'is_enabled',
        'last_tested_at',
        'last_test_status',
        'last_test_message',
        'updated_by',
    ];

    protected $casts = [
        'secret_key' => 'encrypted',
        'webhook_secret' => 'encrypted',
        'is_enabled' => 'boolean',
        'last_tested_at' => 'datetime',
    ];

    protected $hidden = [
        'secret_key',
        'webhook_secret',
    ];

    /**
     * Get masked secret key for display
     */
    public function getMaskedSecretKeyAttribute(): ?string
    {
        if (!$this->attributes['secret_key']) {
            return null;
        }
        
        $decrypted = $this->secret_key;
        if (strlen($decrypted) <= 8) {
            return str_repeat('*', strlen($decrypted));
        }
        
        return substr($decrypted, 0, 4) . str_repeat('*', strlen($decrypted) - 8) . substr($decrypted, -4);
    }

    /**
     * Get masked webhook secret for display
     */
    public function getMaskedWebhookSecretAttribute(): ?string
    {
        if (!$this->attributes['webhook_secret']) {
            return null;
        }
        
        $decrypted = $this->webhook_secret;
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
            'paymentpoint' => [
                'test' => 'https://sandbox.paymentpoint.ng/api/v1',
                'live' => 'https://api.paymentpoint.ng/api/v1',
            ],
            'palmpay' => [
                'test' => 'https://sandbox.palmpay.com/api',
                'live' => 'https://api.palmpay.com/api',
            ],
        ];

        return $this->base_url ?? $urls[$this->provider][$this->mode] ?? '';
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
            'merchant_id' => $this->merchant_id,
            'public_key' => $this->public_key,
            'secret_key_masked' => $this->masked_secret_key,
            'base_url' => $this->base_url,
            'webhook_secret_masked' => $this->masked_webhook_secret,
            'is_enabled' => $this->is_enabled,
            'last_tested_at' => $this->last_tested_at?->toISOString(),
            'last_test_status' => $this->last_test_status,
            'last_test_message' => $this->last_test_message,
            'has_secret_key' => !empty($this->attributes['secret_key']),
            'has_webhook_secret' => !empty($this->attributes['webhook_secret']),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

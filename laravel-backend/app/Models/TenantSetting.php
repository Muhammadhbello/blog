<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSetting extends Model
{
    protected $fillable = [
        'tenant_id',
        'key',
        'value',
        'type',
        'group',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public static function getForTenant(int $tenantId, string $key, $default = null)
    {
        $setting = self::where('tenant_id', $tenantId)->where('key', $key)->first();
        if (!$setting) {
            return $default;
        }
        
        return self::castValue($setting->value, $setting->type);
    }

    public static function setForTenant(int $tenantId, string $key, $value, string $type = 'string', string $group = 'general'): self
    {
        return self::updateOrCreate(
            ['tenant_id' => $tenantId, 'key' => $key],
            ['value' => $value, 'type' => $type, 'group' => $group]
        );
    }

    protected static function castValue($value, string $type)
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $value,
            'float' => (float) $value,
            'array', 'json' => json_decode($value, true),
            default => $value,
        };
    }
}

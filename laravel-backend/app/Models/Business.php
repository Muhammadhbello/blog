<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Business extends Model
{
    protected $fillable = [
        'tenant_id',
        'owner_name',
        'phone',
        'address',
        'rc_number',
        'virtual_account_number',
        'virtual_account_bank',
        'provider_ref',
        'is_account_active',
        'metadata',
    ];

    protected $casts = [
        'is_account_active' => 'boolean',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

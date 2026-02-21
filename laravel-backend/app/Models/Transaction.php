<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'ticket_id',
        'amount_gross',
        'platform_fee',
        'net_lga_amount',
        'payment_method',
        'reference',
        'payer_phone',
        'meta',
    ];

    protected $casts = [
        'amount_gross' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'net_lga_amount' => 'decimal:2',
        'meta' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

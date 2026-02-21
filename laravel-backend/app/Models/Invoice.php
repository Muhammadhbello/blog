<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'tenant_id',
        'business_id',
        'revenue_item_id',
        'invoice_number',
        'amount',
        'due_date',
        'status',
        'projected_target',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'projected_target' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function revenueItem(): BelongsTo
    {
        return $this->belongsTo(RevenueItem::class);
    }
}

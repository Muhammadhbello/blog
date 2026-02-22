<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketBatch extends Model
{
    protected $fillable = [
        'tenant_id',
        'revenue_item_id',
        'batch_number',
        'start_serial',
        'end_serial',
        'total_tickets',
        'status',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function revenueItem(): BelongsTo
    {
        return $this->belongsTo(RevenueItem::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'batch_id');
    }
}

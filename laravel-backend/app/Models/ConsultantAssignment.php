<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultantAssignment extends Model
{
    protected $fillable = [
        'tenant_id',
        'consultant_id',
        'revenue_item_id',
        'revenue_point_id',
        'commission_rate',
        'status',
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'consultant_id');
    }

    public function revenueItem(): BelongsTo
    {
        return $this->belongsTo(RevenueItem::class);
    }

    public function revenuePoint(): BelongsTo
    {
        return $this->belongsTo(RevenuePoint::class);
    }
}

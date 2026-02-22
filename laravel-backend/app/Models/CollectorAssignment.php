<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectorAssignment extends Model
{
    protected $fillable = [
        'tenant_id',
        'collector_id',
        'revenue_point_id',
        'ward_id',
        'assigned_date',
        'end_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'assigned_date' => 'date',
        'end_date' => 'date',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function revenuePoint(): BelongsTo
    {
        return $this->belongsTo(RevenuePoint::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }
}

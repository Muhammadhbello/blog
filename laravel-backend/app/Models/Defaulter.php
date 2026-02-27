<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Defaulter extends Model
{
    protected $fillable = [
        'tenant_id',
        'business_id',
        'amount_due',
        'days_overdue',
        'last_reminder_sent',
        'reminder_count',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount_due' => 'decimal:2',
        'last_reminder_sent' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'active',
        'reminder_count' => 0,
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}

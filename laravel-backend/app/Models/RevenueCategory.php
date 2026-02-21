<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RevenueCategory extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'code',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function revenueItems(): HasMany
    {
        return $this->hasMany(RevenueItem::class, 'category_id');
    }
}

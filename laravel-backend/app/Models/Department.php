<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Department extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'head_of_dept_id',
        'description',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function headOfDept(): BelongsTo
    {
        return $this->belongsTo(User::class, 'head_of_dept_id');
    }
}

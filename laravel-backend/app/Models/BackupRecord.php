<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupRecord extends Model
{
    protected $connection = 'platform';

    protected $fillable = [
        'type',
        'tenant_slug',
        'filename',
        'filepath',
        'disk',
        'size_bytes',
        'size_human',
        'status',
        'error_message',
        'checksum',
        'is_encrypted',
        'started_at',
        'completed_at',
        'duration_seconds',
        'triggered_by',
        'trigger_type',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'is_encrypted' => 'boolean',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'duration_seconds' => 'integer',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_slug', 'slug');
    }

    public function triggeredBy()
    {
        return $this->belongsTo(PlatformUser::class, 'triggered_by');
    }

    public function restoreRecords()
    {
        return $this->hasMany(RestoreRecord::class);
    }

    public function scopePlatform($query)
    {
        return $query->where('type', 'platform');
    }

    public function scopeTenant($query)
    {
        return $query->where('type', 'tenant');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }
}

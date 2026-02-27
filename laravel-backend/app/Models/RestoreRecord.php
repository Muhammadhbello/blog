<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RestoreRecord extends Model
{
    protected $connection = 'platform';

    protected $fillable = [
        'type',
        'tenant_slug',
        'backup_record_id',
        'backup_filename',
        'status',
        'error_message',
        'progress_percent',
        'current_step',
        'started_at',
        'completed_at',
        'duration_seconds',
        'triggered_by',
        'requires_confirmation',
        'confirmation_token',
    ];

    protected $casts = [
        'progress_percent' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'duration_seconds' => 'integer',
        'requires_confirmation' => 'boolean',
    ];

    public function backupRecord()
    {
        return $this->belongsTo(BackupRecord::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_slug', 'slug');
    }

    public function triggeredBy()
    {
        return $this->belongsTo(PlatformUser::class, 'triggered_by');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeRunning($query)
    {
        return $query->where('status', 'running');
    }
}

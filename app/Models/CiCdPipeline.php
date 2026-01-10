<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CiCdPipeline extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'branch_id',
        'pipeline_name',
        'pipeline_type',
        'config_file_path',
        'status',
        'last_run_at',
        'last_success_at',
    ];

    protected $casts = [
        'last_run_at' => 'datetime',
        'last_success_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the pipeline.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the branch associated with the pipeline.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Scope a query to only include successful pipelines.
     */
    public function scopeSuccess($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope a query to only include failed pipelines.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope a query to filter pipelines by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('pipeline_type', $type);
    }
}

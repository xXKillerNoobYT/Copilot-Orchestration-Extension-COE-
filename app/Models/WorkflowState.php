<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowState extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'task_id',
        'workflow_type',
        'state',
        'previous_state',
        'metadata',
        'transitioned_at',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'transitioned_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /**
     * Get the project that owns the workflow state.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the task associated with the workflow state.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Scope a query to filter workflow states by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('workflow_type', $type);
    }

    /**
     * Scope a query to filter workflow states by current state.
     */
    public function scopeInState($query, string $state)
    {
        return $query->where('state', $state);
    }

    /**
     * Scope a query to get recent transitions.
     */
    public function scopeRecent($query, int $hours = 24)
    {
        return $query->where('transitioned_at', '>=', now()->subHours($hours));
    }
}

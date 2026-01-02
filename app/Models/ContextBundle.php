<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContextBundle extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'task_id',
        'agent_id',
        'bundle_type',
        'files_included',
        'architecture_notes',
        'constraints',
        'test_failures',
        'created_at',
    ];

    protected $casts = [
        'files_included' => 'array',
        'constraints' => 'array',
        'test_failures' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Get the task associated with the context bundle.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the agent that created the context bundle.
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * Scope a query to filter bundles by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('bundle_type', $type);
    }

    /**
     * Scope a query to only include task context bundles.
     */
    public function scopeTaskContext($query)
    {
        return $query->where('bundle_type', 'task_context');
    }
}

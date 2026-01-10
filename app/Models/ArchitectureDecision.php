<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchitectureDecision extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'task_id',
        'title',
        'decision',
        'rationale',
        'alternatives_considered',
        'consequences',
        'status',
        'superseded_by_id',
        'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the architecture decision.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the task associated with the architecture decision.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the decision that superseded this decision.
     */
    public function supersededBy(): BelongsTo
    {
        return $this->belongsTo(ArchitectureDecision::class, 'superseded_by_id');
    }

    /**
     * Get the decisions that this decision supersedes.
     */
    public function supersedes(): HasMany
    {
        return $this->hasMany(ArchitectureDecision::class, 'superseded_by_id');
    }

    /**
     * Scope a query to only include accepted decisions.
     */
    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    /**
     * Scope a query to only include proposed decisions.
     */
    public function scopeProposed($query)
    {
        return $query->where('status', 'proposed');
    }

    /**
     * Scope a query to exclude superseded decisions.
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['superseded']);
    }
}

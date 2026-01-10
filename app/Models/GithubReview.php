<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubReview extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'task_id',
        'branch_id',
        'pr_number',
        'reviewer_username',
        'review_state',
        'review_body',
        'comments',
        'reviewed_at',
    ];

    protected $casts = [
        'pr_number' => 'integer',
        'comments' => 'array',
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the GitHub review.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the task associated with the review.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the branch associated with the review.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Scope a query to only include approved reviews.
     */
    public function scopeApproved($query)
    {
        return $query->where('review_state', 'approved');
    }

    /**
     * Scope a query to only include reviews requesting changes.
     */
    public function scopeChangesRequested($query)
    {
        return $query->where('review_state', 'changes_requested');
    }

    /**
     * Scope a query to only include pending reviews.
     */
    public function scopePending($query)
    {
        return $query->where('review_state', 'pending');
    }
}

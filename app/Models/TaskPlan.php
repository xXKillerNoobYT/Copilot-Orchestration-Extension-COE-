<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskPlan extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'created_by_user_id',
        'approved_by_user_id',
        'requirement',
        'parsed_requirement',
        'generated_tasks',
        'dependencies',
        'architecture_design',
        'status',
        'complexity',
        'estimated_hours',
        'version',
        'rejection_reason',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'parsed_requirement' => 'array',
        'generated_tasks' => 'array',
        'dependencies' => 'array',
        'architecture_design' => 'array',
        'estimated_hours' => 'integer',
        'version' => 'integer',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project this plan belongs to
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user who created this plan
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Get the user who approved this plan
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    /**
     * Check if plan is approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if plan is rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if plan is pending approval
     */
    public function isPending(): bool
    {
        return $this->status === 'pending_approval' || $this->status === 'draft';
    }

    /**
     * Get task count
     */
    public function getTaskCountAttribute(): int
    {
        return count($this->generated_tasks ?? []);
    }
}

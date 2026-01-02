<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'project_id',
        'parent_task_id',
        'github_issue_id',
        'github_issue_url',
        'name',
        'description',
        'task_type',
        'priority',
        'status',
        'assigned_agent',
        'assigned_github_agent',
        'branch_name',
        'context_bundle_path',
        'estimated_effort',
        'actual_effort',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'github_issue_id' => 'integer',
        'estimated_effort' => 'integer',
        'actual_effort' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the project that owns the task.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the parent task.
     */
    public function parentTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    /**
     * Get the subtasks.
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    /**
     * Get the task dependencies (tasks this task depends on).
     */
    public function dependencies(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'task_id');
    }

    /**
     * Get the tasks that depend on this task.
     */
    public function dependents(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'depends_on_task_id');
    }

    /**
     * Get the task executions.
     */
    public function executions(): HasMany
    {
        return $this->hasMany(TaskExecution::class);
    }

    /**
     * Get the branch associated with the task.
     */
    public function branch(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    /**
     * Get the context bundles for this task.
     */
    public function contextBundles(): HasMany
    {
        return $this->hasMany(ContextBundle::class);
    }

    /**
     * Get the workflow states for this task.
     */
    public function workflowStates(): HasMany
    {
        return $this->hasMany(WorkflowState::class);
    }

    /**
     * Get the notifications for this task.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get the audit logs for this task.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Get the architecture decisions for this task.
     */
    public function architectureDecisions(): HasMany
    {
        return $this->hasMany(ArchitectureDecision::class);
    }

    /**
     * Get the GitHub reviews for this task.
     */
    public function githubReviews(): HasMany
    {
        return $this->hasMany(GithubReview::class);
    }

    /**
     * Scope a query to only include tasks with a specific status.
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to only include tasks with a specific priority.
     */
    public function scopePriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope a query to only include pending tasks.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include in-progress tasks.
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    /**
     * Scope a query to only include completed tasks.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include high priority tasks.
     */
    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', ['critical', 'high']);
    }
}

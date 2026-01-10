<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubIssue extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'task_id',
        'project_id',
        'github_issue_number',
        'github_issue_id',
        'repository_owner',
        'repository_name',
        'title',
        'body',
        'state',
        'labels',
        'milestone',
        'assignees',
        'github_url',
        'issue_url',
        'synced_at',
        'last_synced_at',
        'sync_metadata',
    ];

    protected $casts = [
        'github_issue_number' => 'integer',
        'github_issue_id' => 'integer',
        'labels' => 'array',
        'assignees' => 'array',
        'sync_metadata' => 'array',
        'synced_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the task linked to this GitHub issue
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the project that owns the GitHub issue
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the full repository name (owner/repo)
     */
    public function getFullRepositoryNameAttribute(): string
    {
        return "{$this->repository_owner}/{$this->repository_name}";
    }

    /**
     * Check if this issue needs syncing
     */
    public function needsSync(): bool
    {
        if (!$this->last_synced_at) {
            return true;
        }

        if ($this->task) {
            return $this->task->updated_at->gt($this->last_synced_at);
        }

        return false;
    }

    /**
     * Update sync timestamp
     */
    public function markAsSynced(): void
    {
        $this->update(['last_synced_at' => now()]);
    }

    /**
     * Store sync metadata
     */
    public function updateSyncMetadata(array $data): void
    {
        $this->update([
            'sync_metadata' => array_merge($this->sync_metadata ?? [], $data),
        ]);
    }

    /**
     * Scope a query to only include open issues.
     */
    public function scopeOpen($query)
    {
        return $query->where('state', 'open');
    }

    /**
     * Scope a query to only include closed issues.
     */
    public function scopeClosed($query)
    {
        return $query->where('state', 'closed');
    }

    /**
     * Scope a query to filter issues by label.
     */
    public function scopeWithLabel($query, string $label)
    {
        return $query->whereJsonContains('labels', $label);
    }
}

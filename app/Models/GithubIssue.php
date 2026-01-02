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
        'project_id',
        'github_issue_number',
        'github_issue_id',
        'title',
        'body',
        'state',
        'labels',
        'milestone',
        'assignees',
        'github_url',
        'synced_at',
    ];

    protected $casts = [
        'github_issue_number' => 'integer',
        'github_issue_id' => 'integer',
        'labels' => 'array',
        'assignees' => 'array',
        'synced_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the GitHub issue.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
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

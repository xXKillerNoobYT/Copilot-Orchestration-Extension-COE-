<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'project_id',
        'task_id',
        'branch_name',
        'branch_type',
        'base_branch',
        'status',
        'ci_status',
        'merged_at',
    ];

    protected $casts = [
        'merged_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the project that owns the branch.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the task associated with the branch.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the CI/CD pipelines for this branch.
     */
    public function ciCdPipelines(): HasMany
    {
        return $this->hasMany(CiCdPipeline::class);
    }

    /**
     * Get the GitHub reviews for this branch.
     */
    public function githubReviews(): HasMany
    {
        return $this->hasMany(GithubReview::class);
    }

    /**
     * Scope a query to only include active branches.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include merged branches.
     */
    public function scopeMerged($query)
    {
        return $query->where('status', 'merged');
    }

    /**
     * Scope a query to filter branches by CI status.
     */
    public function scopeCiStatus($query, string $status)
    {
        return $query->where('ci_status', $status);
    }
}

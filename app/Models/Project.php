<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Project extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'repository_type',
        'repository_url',
        'github_owner',
        'github_repo',
        'architecture_document',
        'base_document',
        'status',
        'skill_level',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_users')
            ->withPivot(['role', 'permissions'])
            ->withTimestamps();
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function architectureDecisions(): HasMany
    {
        return $this->hasMany(ArchitectureDecision::class);
    }

    public function dependencies(): HasMany
    {
        return $this->hasMany(Dependency::class);
    }

    public function moduleDependencies(): HasMany
    {
        return $this->hasMany(ModuleDependency::class);
    }

    public function ciCdPipelines(): HasMany
    {
        return $this->hasMany(CiCdPipeline::class);
    }

    public function githubIssues(): HasMany
    {
        return $this->hasMany(GithubIssue::class);
    }

    public function githubReviews(): HasMany
    {
        return $this->hasMany(GithubReview::class);
    }

    public function projectMemories(): HasMany
    {
        return $this->hasMany(ProjectMemory::class);
    }

    public function workflowStates(): HasMany
    {
        return $this->hasMany(WorkflowState::class);
    }

    public function healthMetrics(): HasMany
    {
        return $this->hasMany(RepositoryHealthMetric::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}

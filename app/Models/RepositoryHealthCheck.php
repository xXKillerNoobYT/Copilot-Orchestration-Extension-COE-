<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RepositoryHealthCheck extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'repository_id',
        'health_score',
        'health_status',
        'test_coverage',
        'ci_success_rate',
        'dependency_vulnerabilities',
        'outdated_dependencies',
        'days_since_last_commit',
        'issues',
        'recommendations',
        'checked_at',
        'last_issue_detected',
    ];

    protected $casts = [
        'issues' => 'array',
        'recommendations' => 'array',
        'checked_at' => 'datetime',
        'last_issue_detected' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the repository this health check belongs to.
     */
    public function repository(): BelongsTo
    {
        return $this->belongsTo(Repository::class);
    }

    /**
     * Check if repository health is excellent.
     */
    public function isExcellent(): bool
    {
        return $this->health_status === 'excellent';
    }

    /**
     * Check if repository has critical issues.
     */
    public function isCritical(): bool
    {
        return $this->health_status === 'critical';
    }

    /**
     * Get number of issues detected.
     */
    public function getIssueCount(): int
    {
        return count($this->issues ?? []);
    }

    /**
     * Has security vulnerabilities.
     */
    public function hasSecurityIssues(): bool
    {
        return $this->dependency_vulnerabilities > 0;
    }

    /**
     * Has outdated dependencies.
     */
    public function hasOutdatedDependencies(): bool
    {
        return $this->outdated_dependencies > 0;
    }

    /**
     * Is repository stale (no commits).
     */
    public function isStale(): bool
    {
        return $this->days_since_last_commit > 30;
    }

    /**
     * Get health score percentage.
     */
    public function getHealthPercentage(): int
    {
        return max(0, min(100, $this->health_score));
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RepositoryHealthMetric extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'metric_date',
        'commit_count',
        'pr_count',
        'test_coverage_percent',
        'dependency_freshness_score',
        'ci_stability_percent',
        'architecture_drift_score',
        'technical_debt_items',
        'created_at',
    ];

    protected $casts = [
        'metric_date' => 'date',
        'commit_count' => 'integer',
        'pr_count' => 'integer',
        'test_coverage_percent' => 'float',
        'dependency_freshness_score' => 'float',
        'ci_stability_percent' => 'float',
        'architecture_drift_score' => 'float',
        'technical_debt_items' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * Get the project that owns the health metric.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Scope a query to filter metrics by date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('metric_date', [$startDate, $endDate]);
    }

    /**
     * Scope a query to get recent metrics.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('metric_date', '>=', now()->subDays($days));
    }

    /**
     * Scope a query to filter metrics with low test coverage.
     */
    public function scopeLowTestCoverage($query, float $threshold = 70.0)
    {
        return $query->where('test_coverage_percent', '<', $threshold);
    }
}

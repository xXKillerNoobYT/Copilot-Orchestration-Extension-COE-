<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetricsEvent extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'metrics_events';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'event_type',
        'metric_name',
        'value',
        'user_id',
        'project_id',
        'task_id',
        'agent_id',
        'context_key',
        'context_value',
        'metadata',
        'recorded_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'value' => 'decimal:2',
        'metadata' => 'json',
        'recorded_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * Scopes
     */
    public function scopeByEventType($query, string $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    public function scopeByMetricName($query, string $metricName)
    {
        return $query->where('metric_name', $metricName);
    }

    public function scopeInDateRange($query, $from, $to)
    {
        return $query->whereBetween('recorded_at', [$from, $to]);
    }

    public function scopeLastNDays($query, int $days = 30)
    {
        return $query->where('recorded_at', '>=', now()->subDays($days));
    }
}

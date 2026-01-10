<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agent extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'type',
        'description',
        'capabilities',
        'configuration',
        'llm_provider',
        'is_active',
    ];

    protected $casts = [
        'capabilities' => 'array',
        'configuration' => 'array',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the task executions performed by this agent.
     */
    public function taskExecutions(): HasMany
    {
        return $this->hasMany(TaskExecution::class);
    }

    /**
     * Get the context bundles created by this agent.
     */
    public function contextBundles(): HasMany
    {
        return $this->hasMany(ContextBundle::class);
    }

    /**
     * Get the audit logs for this agent.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Scope a query to only include active agents.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to filter agents by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}

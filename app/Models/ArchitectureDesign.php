<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchitectureDesign extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'task_plan_id',
        'project_id',
        'pattern',
        'layers',
        'components',
        'relationships',
        'database_schema',
        'api_contracts',
        'diagrams',
        'version',
    ];

    protected $casts = [
        'layers' => 'array',
        'components' => 'array',
        'relationships' => 'array',
        'database_schema' => 'array',
        'api_contracts' => 'array',
        'diagrams' => 'array',
        'version' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the task plan this design belongs to
     */
    public function taskPlan(): BelongsTo
    {
        return $this->belongsTo(TaskPlan::class);
    }

    /**
     * Get the project this design belongs to
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get architecture decisions for this design
     */
    public function decisions(): HasMany
    {
        return $this->hasMany(ArchitectureDecision::class);
    }

    /**
     * Get component count
     */
    public function getComponentCountAttribute(): int
    {
        return count($this->components ?? []);
    }

    /**
     * Get layer count
     */
    public function getLayerCountAttribute(): int
    {
        return count($this->layers ?? []);
    }
}

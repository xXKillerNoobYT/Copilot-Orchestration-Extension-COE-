<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModuleDependency extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'source_module',
        'target_module',
        'dependency_type',
        'is_circular',
        'is_allowed',
        'detected_at',
    ];

    protected $casts = [
        'is_circular' => 'boolean',
        'is_allowed' => 'boolean',
        'detected_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the module dependency.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Scope a query to only include circular dependencies.
     */
    public function scopeCircular($query)
    {
        return $query->where('is_circular', true);
    }

    /**
     * Scope a query to only include disallowed dependencies.
     */
    public function scopeDisallowed($query)
    {
        return $query->where('is_allowed', false);
    }

    /**
     * Scope a query to filter dependencies by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('dependency_type', $type);
    }
}

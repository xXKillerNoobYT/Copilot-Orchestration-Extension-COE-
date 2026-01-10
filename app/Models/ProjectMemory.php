<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMemory extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'memory_type',
        'title',
        'content',
        'context',
        'confidence',
        'usage_count',
        'last_used_at',
    ];

    protected $casts = [
        'context' => 'array',
        'confidence' => 'float',
        'usage_count' => 'integer',
        'last_used_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the memory.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Scope a query to filter memories by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('memory_type', $type);
    }

    /**
     * Scope a query to only include high confidence memories.
     */
    public function scopeHighConfidence($query, float $threshold = 0.7)
    {
        return $query->where('confidence', '>=', $threshold);
    }

    /**
     * Scope a query to order by most frequently used.
     */
    public function scopeMostUsed($query)
    {
        return $query->orderBy('usage_count', 'desc');
    }
}

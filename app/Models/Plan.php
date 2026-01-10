<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Plan Model
 * 
 * Stores wizard state and project plans for persistence across sessions
 * 
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property array $wizard_state
 * @property array|null $metadata
 * @property string $status
 * @property int|null $user_id
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property \Carbon\Carbon|null $deleted_at
 */
class Plan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'wizard_state',
        'metadata',
        'status',
        'user_id',
    ];

    protected $casts = [
        'wizard_state' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'draft',
    ];

    /**
     * Get the user that owns the plan
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope query to active plans
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope query to draft plans
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Check if plan is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if plan is draft
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Activate the plan
     */
    public function activate(): void
    {
        $this->update(['status' => 'active']);
    }

    /**
     * Archive the plan
     */
    public function archive(): void
    {
        $this->update(['status' => 'archived']);
    }
}

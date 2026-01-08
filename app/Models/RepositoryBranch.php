<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RepositoryBranch extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'repository_branches';

    protected $fillable = [
        'id',
        'repository_id',
        'name',
        'type',
        'task_id',
        'created_at',
        'last_commit_at',
        'last_ci_status',
        'protected',
        'updated_at',
    ];

    protected $casts = [
        'last_commit_at' => 'datetime',
        'last_ci_status' => 'string',
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
     * Get the repository this branch belongs to.
     */
    public function repository(): BelongsTo
    {
        return $this->belongsTo(Repository::class);
    }

    /**
     * Get the task this branch is linked to.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Check if branch is stale (no commits for >30 days).
     */
    public function isStale(int $daysThreshold = 30): bool
    {
        if (!$this->last_commit_at) {
            return true;
        }

        return $this->last_commit_at->addDays($daysThreshold)->isPast();
    }

    /**
     * Check if branch is protected (main or release).
     */
    public function isProtected(): bool
    {
        return $this->protected || in_array($this->type, ['main', 'release']);
    }

    /**
     * Check if CI passed.
     */
    public function ciPassed(): bool
    {
        return $this->last_ci_status === 'success';
    }
}

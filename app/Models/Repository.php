<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Repository extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'project_id',
        'name',
        'url',
        'type',
        'initialized_at',
        'status',
        'config',
    ];

    protected $casts = [
        'config' => 'array',
        'initialized_at' => 'datetime',
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
     * Get the branches for this repository.
     */
    public function branches(): HasMany
    {
        return $this->hasMany(RepositoryBranch::class);
    }

    /**
     * Get active branches.
     */
    public function activeBranches()
    {
        return $this->branches()->where('type', '!=', 'main')->orderBy('created_at', 'desc');
    }

    /**
     * Check if repository is initialized.
     */
    public function isInitialized(): bool
    {
        return $this->status === 'active' && $this->initialized_at !== null;
    }

    /**
     * Check if repository is archived.
     */
    public function isArchived(): bool
    {
        return $this->status === 'archived';
    }
}

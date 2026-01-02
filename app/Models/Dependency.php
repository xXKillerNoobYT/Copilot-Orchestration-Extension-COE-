<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Dependency extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'package_name',
        'package_manager',
        'current_version',
        'latest_version',
        'is_outdated',
        'has_security_issue',
        'dependency_type',
        'last_checked_at',
    ];

    protected $casts = [
        'is_outdated' => 'boolean',
        'has_security_issue' => 'boolean',
        'last_checked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that owns the dependency.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Scope a query to only include outdated dependencies.
     */
    public function scopeOutdated($query)
    {
        return $query->where('is_outdated', true);
    }

    /**
     * Scope a query to only include dependencies with security issues.
     */
    public function scopeWithSecurityIssues($query)
    {
        return $query->where('has_security_issue', true);
    }

    /**
     * Scope a query to filter dependencies by package manager.
     */
    public function scopePackageManager($query, string $manager)
    {
        return $query->where('package_manager', $manager);
    }
}

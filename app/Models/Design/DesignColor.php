<?php

namespace App\Models\Design;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DesignColor extends Model
{
    protected $table = 'design_colors';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'hex_value',
        'category',
        'description',
        'usage_count',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }
}

<?php

namespace App\Models\Design;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DesignComponent extends Model
{
    protected $table = 'design_components';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'category',
        'description',
        'template_path',
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

    public function props()
    {
        return $this->hasMany(DesignComponentProp::class, 'component_id');
    }

    public function variants()
    {
        return $this->hasMany(DesignComponentVariant::class, 'component_id');
    }
}

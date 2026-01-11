<?php

namespace App\Models\Design;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DesignComponentProp extends Model
{
    protected $table = 'design_component_props';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'component_id',
        'prop_name',
        'prop_type',
        'default_value',
        'required',
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

    public function component()
    {
        return $this->belongsTo(DesignComponent::class, 'component_id');
    }
}

<?php

namespace App\Models\Design;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DesignTypography extends Model
{
    protected $table = 'design_typography';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'font_family',
        'font_weight',
        'font_size',
        'line_height',
        'letter_spacing',
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

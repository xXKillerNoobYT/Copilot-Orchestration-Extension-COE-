<?php

namespace App\Models\Design;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class DesignComponentVariant extends Model
{
    use HasFactory;
    protected $table = 'design_component_variants';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'component_id',
        'variant_name',
        'props',
        'preview_image_url',
    ];

    protected $casts = [
        'props' => 'array',
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

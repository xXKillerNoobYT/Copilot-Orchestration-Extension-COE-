<?php

namespace Database\Factories\Design;

use App\Models\Design\DesignComponent;
use App\Models\Design\DesignComponentVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

class DesignComponentVariantFactory extends Factory
{
    protected $model = DesignComponentVariant::class;

    public function definition(): array
    {
        return [
            'component_id' => DesignComponent::factory(),
            'variant_name' => $this->faker->unique()->lexify('variant_????'),
            'props' => $this->faker->optional()->boolean() ? [
                'size' => $this->faker->randomElement(['sm','md','lg']),
                'color' => $this->faker->safeColorName(),
            ] : null,
            'preview_image_url' => $this->faker->optional()->imageUrl(),
        ];
    }
}

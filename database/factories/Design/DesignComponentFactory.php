<?php

namespace Database\Factories\Design;

use App\Models\Design\DesignComponent;
use Illuminate\Database\Eloquent\Factories\Factory;

class DesignComponentFactory extends Factory
{
    protected $model = DesignComponent::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->words(2, true),
            'category' => $this->faker->randomElement(['atoms', 'molecules', 'organisms']),
            'description' => $this->faker->optional()->sentence(),
            'template_path' => $this->faker->optional()->filePath(),
        ];
    }
}

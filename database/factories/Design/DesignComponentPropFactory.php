<?php

namespace Database\Factories\Design;

use App\Models\Design\DesignComponent;
use App\Models\Design\DesignComponentProp;
use Illuminate\Database\Eloquent\Factories\Factory;

class DesignComponentPropFactory extends Factory
{
    protected $model = DesignComponentProp::class;

    public function definition(): array
    {
        return [
            'component_id' => DesignComponent::factory(),
            'prop_name' => $this->faker->unique()->lexify('prop_????'),
            'prop_type' => $this->faker->randomElement(['string','number','boolean','enum','array','object','color','typography','spacing']),
            'default_value' => $this->faker->optional()->word(),
            'required' => $this->faker->boolean(30),
        ];
    }
}

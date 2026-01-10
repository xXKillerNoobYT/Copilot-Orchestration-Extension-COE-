<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignCascadingDeletesTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function deleting_component_cascades_to_props_and_variants(): void
    {
        $component = $this->postJson('/api/v1/design/components', [
            'name' => 'Dropdown',
        ])->json();

        $prop = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', [
            'prop_name' => 'open',
            'prop_type' => 'boolean',
            'default_value' => false,
        ])->json();

        $variant = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', [
            'variant_name' => 'basic',
        ])->json();

        // Ensure created
        $this->getJson('/api/v1/design/components/' . $component['id'] . '/props/' . $prop['id'])->assertStatus(200);
        $this->getJson('/api/v1/design/components/' . $component['id'] . '/variants/' . $variant['id'])->assertStatus(200);

        // Delete component
        $this->deleteJson('/api/v1/design/components/' . $component['id'])->assertStatus(200);

        // Now nested entities should be gone
        $this->getJson('/api/v1/design/components/' . $component['id'] . '/props/' . $prop['id'])->assertStatus(404);
        $this->getJson('/api/v1/design/components/' . $component['id'] . '/variants/' . $variant['id'])->assertStatus(404);
    }
}

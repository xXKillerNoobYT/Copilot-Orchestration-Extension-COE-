<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignComponentPropControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function createComponent(): array
    {
        return $this->postJson('/api/v1/design/components', [
            'name' => 'Button',
            'category' => 'controls',
        ])->json();
    }

    /** @test */
    public function it_lists_props(): void
    {
        $component = $this->createComponent();

        $response = $this->getJson('/api/v1/design/components/' . $component['id'] . '/props');

        $response->assertStatus(200);
        $response->assertJsonIsArray();
    }

    /** @test */
    public function it_creates_a_prop(): void
    {
        $component = $this->createComponent();

        $payload = [
            'prop_name' => 'size',
            'prop_type' => 'enum',
            'default_value' => 'md',
            'required' => false,
        ];

        $response = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', $payload);

        $response->assertStatus(201);
        $response->assertJsonFragment([
            'prop_name' => 'size',
            'prop_type' => 'enum',
        ]);
    }

    /** @test */
    public function it_shows_a_prop(): void
    {
        $component = $this->createComponent();
        $prop = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', [
            'prop_name' => 'variant',
            'prop_type' => 'string',
        ])->json();

        $response = $this->getJson('/api/v1/design/components/' . $component['id'] . '/props/' . $prop['id']);

        $response->assertStatus(200);
        $response->assertJsonFragment(['prop_name' => 'variant']);
    }

    /** @test */
    public function it_updates_a_prop(): void
    {
        $component = $this->createComponent();
        $prop = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', [
            'prop_name' => 'disabled',
            'prop_type' => 'boolean',
        ])->json();

        $response = $this->patchJson('/api/v1/design/components/' . $component['id'] . '/props/' . $prop['id'], [
            'prop_name' => 'isDisabled',
            'required' => true,
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'prop_name' => 'isDisabled',
            'required' => true,
        ]);
    }

    /** @test */
    public function it_deletes_a_prop(): void
    {
        $component = $this->createComponent();
        $prop = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', [
            'prop_name' => 'icon',
            'prop_type' => 'string',
        ])->json();

        $response = $this->deleteJson('/api/v1/design/components/' . $component['id'] . '/props/' . $prop['id']);

        $response->assertStatus(200);
        $response->assertJsonFragment(['status' => 'deleted']);

        $this->getJson('/api/v1/design/components/' . $component['id'] . '/props/' . $prop['id'])->assertStatus(404);
    }

    /** @test */
    public function prop_validation_errors(): void
    {
        $component = $this->createComponent();

        $response = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', [
            'prop_type' => 'string',
        ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['prop_name']]);
    }

    /** @test */
    public function prop_type_must_be_valid(): void
    {
        $component = $this->createComponent();

        $response = $this->postJson('/api/v1/design/components/' . $component['id'] . '/props', [
            'prop_name' => 'invalid',
            'prop_type' => 'not-a-type',
        ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['prop_type']]);
    }
}

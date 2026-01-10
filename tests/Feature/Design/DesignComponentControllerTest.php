<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignComponentControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_lists_components(): void
    {
        $response = $this->getJson('/api/v1/design/components');
        $response->assertStatus(200);
        $response->assertJsonIsArray();
    }

    /** @test */
    public function it_creates_a_component(): void
    {
        $payload = [
            'name' => 'Button',
            'category' => 'atoms',
            'description' => 'Clickable button component',
        ];
        $response = $this->postJson('/api/v1/design/components', $payload);
        $response->assertStatus(201);
        $response->assertJsonFragment(['name' => 'Button', 'category' => 'atoms']);
    }

    /** @test */
    public function it_shows_a_component(): void
    {
        $create = $this->postJson('/api/v1/design/components', [
            'name' => 'Card',
            'category' => 'molecules',
        ])->json();

        $response = $this->getJson('/api/v1/design/components/' . $create['id']);
        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Card']);
    }

    /** @test */
    public function it_updates_a_component(): void
    {
        $create = $this->postJson('/api/v1/design/components', [
            'name' => 'Badge',
        ])->json();

        $response = $this->patchJson('/api/v1/design/components/' . $create['id'], [
            'name' => 'Badge Updated',
            'template_path' => 'resources/views/components/badge.blade.php',
        ]);
        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Badge Updated']);
    }

    /** @test */
    public function it_deletes_a_component(): void
    {
        $create = $this->postJson('/api/v1/design/components', [
            'name' => 'Alert',
        ])->json();

        $response = $this->deleteJson('/api/v1/design/components/' . $create['id']);
        $response->assertStatus(200);
        $response->assertJsonFragment(['status' => 'deleted']);

        $this->getJson('/api/v1/design/components/' . $create['id'])->assertStatus(404);
    }

    /** @test */
    public function component_validation_errors(): void
    {
        // Missing name
        $response = $this->postJson('/api/v1/design/components', [
            'category' => 'atoms',
        ]);
        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['name']]);
    }
}

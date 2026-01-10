<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignColorControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_lists_colors(): void
    {
        $response = $this->getJson('/api/v1/design/colors');
        $response->assertStatus(200);
        $response->assertJsonIsArray();
    }

    /** @test */
    public function it_creates_a_color(): void
    {
        $payload = [
            'name' => 'Primary',
            'hex_value' => '#3366FF',
            'category' => 'brand',
            'description' => 'Primary brand color',
        ];
        $response = $this->postJson('/api/v1/design/colors', $payload);
        $response->assertStatus(201);
        $response->assertJsonFragment(['name' => 'Primary', 'hex_value' => '#3366FF']);
    }

    /** @test */
    public function it_shows_a_color(): void
    {
        $create = $this->postJson('/api/v1/design/colors', [
            'name' => 'Secondary',
            'hex_value' => '#FF3366',
        ])->json();

        $response = $this->getJson('/api/v1/design/colors/' . $create['id']);
        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Secondary']);
    }

    /** @test */
    public function it_updates_a_color(): void
    {
        $create = $this->postJson('/api/v1/design/colors', [
            'name' => 'Accent',
            'hex_value' => '#00AA88',
        ])->json();

        $response = $this->patchJson('/api/v1/design/colors/' . $create['id'], [
            'name' => 'Accent Updated',
            'hex_value' => '#00BB99',
        ]);
        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Accent Updated', 'hex_value' => '#00BB99']);
    }

    /** @test */
    public function it_deletes_a_color(): void
    {
        $create = $this->postJson('/api/v1/design/colors', [
            'name' => 'Danger',
            'hex_value' => '#CC0000',
        ])->json();

        $response = $this->deleteJson('/api/v1/design/colors/' . $create['id']);
        $response->assertStatus(200);
        $response->assertJsonFragment(['status' => 'deleted']);

        $this->getJson('/api/v1/design/colors/' . $create['id'])->assertStatus(404);
    }
}

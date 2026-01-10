<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignSpacingControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_lists_spacing(): void
    {
        $response = $this->getJson('/api/v1/design/spacing');
        $response->assertStatus(200);
        $response->assertJsonIsArray();
    }

    /** @test */
    public function it_creates_spacing(): void
    {
        $payload = [
            'key' => 'md',
            'value' => 16,
            'label' => 'Medium',
        ];
        $response = $this->postJson('/api/v1/design/spacing', $payload);
        $response->assertStatus(201);
        $response->assertJsonFragment(['key' => 'md', 'value' => 16]);
    }

    /** @test */
    public function it_updates_spacing(): void
    {
        $create = $this->postJson('/api/v1/design/spacing', [
            'key' => 'lg',
            'value' => 24,
        ])->json();

        $response = $this->patchJson('/api/v1/design/spacing/' . $create['id'], [
            'value' => 28,
        ]);
        $response->assertStatus(200);
        $response->assertJsonFragment(['value' => 28]);
    }

    /** @test */
    public function it_deletes_spacing(): void
    {
        $create = $this->postJson('/api/v1/design/spacing', [
            'key' => 'xs',
            'value' => 4,
        ])->json();

        $response = $this->deleteJson('/api/v1/design/spacing/' . $create['id']);
        $response->assertStatus(200);
        $response->assertJsonFragment(['status' => 'deleted']);
    }
}

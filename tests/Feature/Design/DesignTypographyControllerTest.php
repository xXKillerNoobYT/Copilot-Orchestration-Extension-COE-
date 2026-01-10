<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignTypographyControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_lists_typography(): void
    {
        $response = $this->getJson('/api/v1/design/typography');
        $response->assertStatus(200);
        $response->assertJsonIsArray();
    }

    /** @test */
    public function it_creates_typography(): void
    {
        $payload = [
            'name' => 'Body',
            'font_family' => 'Inter',
            'font_weight' => 400,
            'font_size' => 16,
            'line_height' => 1.5,
        ];
        $response = $this->postJson('/api/v1/design/typography', $payload);
        $response->assertStatus(201);
        $response->assertJsonFragment(['name' => 'Body', 'font_family' => 'Inter']);
    }

    /** @test */
    public function it_updates_typography(): void
    {
        $create = $this->postJson('/api/v1/design/typography', [
            'name' => 'Heading',
            'font_family' => 'Inter',
            'font_weight' => 700,
            'font_size' => 32,
        ])->json();

        $response = $this->patchJson('/api/v1/design/typography/' . $create['id'], [
            'font_size' => 36,
        ]);
        $response->assertStatus(200);
        $response->assertJsonFragment(['font_size' => 36]);
    }

    /** @test */
    public function it_deletes_typography(): void
    {
        $create = $this->postJson('/api/v1/design/typography', [
            'name' => 'Caption',
            'font_family' => 'Inter',
            'font_weight' => 300,
            'font_size' => 12,
        ])->json();

        $response = $this->deleteJson('/api/v1/design/typography/' . $create['id']);
        $response->assertStatus(200);
        $response->assertJsonFragment(['status' => 'deleted']);
    }
}

<?php

namespace Tests\Feature\Design;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignComponentVariantControllerTest extends TestCase
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
    public function it_lists_variants(): void
    {
        $component = $this->createComponent();

        $response = $this->getJson('/api/v1/design/components/' . $component['id'] . '/variants');

        $response->assertStatus(200);
        $response->assertJsonIsArray();
    }

    /** @test */
    public function it_creates_a_variant(): void
    {
        $component = $this->createComponent();

        $payload = [
            'variant_name' => 'Primary',
            'props' => ['size' => 'md', 'tone' => 'primary'],
            'preview_image_url' => 'https://example.com/button-primary.png',
        ];

        $response = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', $payload);

        $response->assertStatus(201);
        $response->assertJsonFragment(['variant_name' => 'Primary']);
    }

    /** @test */
    public function it_shows_a_variant(): void
    {
        $component = $this->createComponent();
        $variant = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', [
            'variant_name' => 'Secondary',
        ])->json();

        $response = $this->getJson('/api/v1/design/components/' . $component['id'] . '/variants/' . $variant['id']);

        $response->assertStatus(200);
        $response->assertJsonFragment(['variant_name' => 'Secondary']);
    }

    /** @test */
    public function it_updates_a_variant(): void
    {
        $component = $this->createComponent();
        $variant = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', [
            'variant_name' => 'Ghost',
        ])->json();

        $response = $this->patchJson('/api/v1/design/components/' . $component['id'] . '/variants/' . $variant['id'], [
            'variant_name' => 'Ghost Outline',
            'preview_image_url' => 'https://example.com/button-ghost.png',
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'variant_name' => 'Ghost Outline',
            'preview_image_url' => 'https://example.com/button-ghost.png',
        ]);
    }

    /** @test */
    public function it_deletes_a_variant(): void
    {
        $component = $this->createComponent();
        $variant = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', [
            'variant_name' => 'Danger',
        ])->json();

        $response = $this->deleteJson('/api/v1/design/components/' . $component['id'] . '/variants/' . $variant['id']);

        $response->assertStatus(200);
        $response->assertJsonFragment(['status' => 'deleted']);

        $this->getJson('/api/v1/design/components/' . $component['id'] . '/variants/' . $variant['id'])->assertStatus(404);
    }

    /** @test */
    public function variant_validation_errors(): void
    {
        $component = $this->createComponent();

        $response = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', [
            // missing variant_name
            'preview_image_url' => 'not-a-url',
        ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['variant_name']]);

        $response = $this->postJson('/api/v1/design/components/' . $component['id'] . '/variants', [
            'variant_name' => 'Preview',
            'preview_image_url' => 'not-a-url',
        ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['preview_image_url']]);
    }
}

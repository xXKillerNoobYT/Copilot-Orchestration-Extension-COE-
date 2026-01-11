<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AskQuestionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test successful askQuestion with valid payload
     */
    public function test_ask_question_with_valid_payload(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'How should I implement responsive design?',
            'currentTaskId' => 'TASK-123',
            'searchInPlan' => 'responsive-design',
            'context' => ['page' => 'wizard', 'step' => 3],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'question',
                'answerFromPlan',
                'confidence',
                'evidence',
                'guidance',
                'relatedDesignChoices',
            ]);
    }

    /**
     * Test askQuestion with minimal payload (only question required)
     */
    public function test_ask_question_with_minimal_payload(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'What architecture should I use?',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * Test askQuestion fails when question is missing
     */
    public function test_ask_question_fails_without_question(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'currentTaskId' => 'TASK-123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['question']);
    }

    /**
     * Test askQuestion validates searchInPlan format
     */
    public function test_ask_question_validates_search_in_plan_format(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'Test question?',
            'searchInPlan' => 'invalid section with spaces!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['searchInPlan']);
    }

    /**
     * Test askQuestion accepts valid searchInPlan formats
     */
    public function test_ask_question_accepts_valid_search_in_plan(): void
    {
        $validFormats = [
            'responsive-design',
            'architecture_pattern',
            'feature123',
            'SECTION_NAME',
        ];

        foreach ($validFormats as $format) {
            $response = $this->postJson('/api/mcp/askQuestion', [
                'question' => 'Test question?',
                'searchInPlan' => $format,
            ]);

            $response->assertStatus(200);
        }
    }

    /**
     * Test askQuestion with array context
     */
    public function test_ask_question_with_array_context(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'How to structure components?',
            'context' => [
                'currentPage' => 'architecture',
                'selectedPattern' => 'microservices',
                'features' => ['auth', 'api'],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * Test askQuestion validates question length
     */
    public function test_ask_question_validates_question_length(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => str_repeat('a', 501), // Exceeds 500 char limit
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['question']);
    }

    /**
     * Test askQuestion validates currentTaskId length
     */
    public function test_ask_question_validates_task_id_length(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'Valid question?',
            'currentTaskId' => str_repeat('a', 101), // Exceeds 100 char limit
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['currentTaskId']);
    }

    /**
     * Test askQuestion evidence shape is stable
     */
    public function test_ask_question_evidence_shape_is_stable(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'Test question?',
            'searchInPlan' => 'test-section',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'evidence' => [
                    'source',
                    'section',
                ],
            ]);

        $evidence = $response->json('evidence');
        $this->assertIsString($evidence['source']);
        $this->assertIsString($evidence['section']);
        $this->assertEquals('test-section', $evidence['section']);
    }

    /**
     * Test askQuestion with null context (should work)
     */
    public function test_ask_question_with_null_context(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'Test question?',
            'context' => null,
        ]);

        $response->assertStatus(200);
    }

    /**
     * Test askQuestion rejects non-array context
     */
    public function test_ask_question_rejects_string_context(): void
    {
        $response = $this->postJson('/api/mcp/askQuestion', [
            'question' => 'Test question?',
            'context' => 'string context',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['context']);
    }
}

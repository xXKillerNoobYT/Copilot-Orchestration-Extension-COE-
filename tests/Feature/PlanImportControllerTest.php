<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

class PlanImportControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create and authenticate a user for all tests
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);
    }

    /** @test */
    public function it_analyzes_api_only_context()
    {
        $content = 'Build a REST API with GraphQL endpoints for handling HTTP requests and responses.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'suggestedTemplate',
                'topics',
                'summary',
                'estimatedDuration',
                'recommendedTeamSize',
                'confidence'
            ])
            ->assertJson([
                'success' => true,
                'suggestedTemplate' => 'core-api-service'
            ]);
        
        // Verify topics contain 'api'
        $data = $response->json();
        $this->assertContains('api', $data['topics']);
    }

    /** @test */
    public function it_analyzes_frontend_context()
    {
        $content = 'Create a React web application with Vue components and user interface elements.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'suggestedTemplate' => 'core-web-app'
            ]);
        
        $data = $response->json();
        $this->assertContains('frontend', $data['topics']);
    }

    /** @test */
    public function it_analyzes_full_stack_context()
    {
        $content = 'Build a full-stack application with React frontend, REST API backend, PostgreSQL database, and Docker deployment.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'suggestedTemplate' => 'core-web-app'
            ]);
        
        $data = $response->json();
        $this->assertContains('frontend', $data['topics']);
        $this->assertContains('api', $data['topics']);
        $this->assertContains('database', $data['topics']);
        $this->assertContains('devops', $data['topics']);
    }

    /** @test */
    public function it_extracts_multiple_topics()
    {
        $content = 'Create authentication with JWT, database with MongoDB, and testing with Jest.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('authentication', $data['topics']);
        $this->assertContains('database', $data['topics']);
        $this->assertContains('testing', $data['topics']);
        $this->assertGreaterThan(2, count($data['topics']));
    }

    /** @test */
    public function it_handles_empty_content()
    {
        $content = 'A generic project with no specific technology.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'suggestedTemplate' => 'core-blank'
            ]);
        
        $data = $response->json();
        $this->assertEquals('core-blank', $data['suggestedTemplate']);
        // Should be 0.5 when no topics are detected
        $this->assertSame(0.5, $data['confidence']);
    }

    /** @test */
    public function it_generates_summary_from_content()
    {
        $content = 'First sentence about the project. Second sentence with more details. Third sentence with additional information. Fourth sentence that should not appear in summary.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertNotEmpty($data['summary']);
        $this->assertStringContainsString('First sentence', $data['summary']);
        $this->assertLessThanOrEqual(203, strlen($data['summary'])); // 200 + "..."
    }

    /** @test */
    public function it_estimates_duration_for_simple_projects()
    {
        $content = 'Simple authentication system.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals('2-4 weeks', $data['estimatedDuration']);
    }

    /** @test */
    public function it_estimates_duration_for_moderate_projects()
    {
        $content = 'API with database, authentication, testing, and monitoring capabilities.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals('1-3 months', $data['estimatedDuration']);
    }

    /** @test */
    public function it_estimates_duration_for_complex_projects()
    {
        $content = 'Full-stack application with React frontend, GraphQL API, PostgreSQL database, authentication, testing, monitoring, and Docker deployment.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals('3-6 months', $data['estimatedDuration']);
    }

    /** @test */
    public function it_estimates_team_size_for_simple_projects()
    {
        $content = 'Simple backend service.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals(1, $data['recommendedTeamSize']);
    }

    /** @test */
    public function it_estimates_team_size_for_full_stack_projects()
    {
        $content = 'Full-stack application with React frontend and REST API backend.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals(3, $data['recommendedTeamSize']);
    }

    /** @test */
    public function it_estimates_team_size_for_devops_projects()
    {
        $content = 'Setup Docker and Kubernetes infrastructure with CI/CD pipeline.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals(2, $data['recommendedTeamSize']);
    }

    /** @test */
    public function it_validates_required_content_field()
    {
        $response = $this->postJson('/api/v1/plans/analyze-context', []);
        
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['content']);
    }

    /** @test */
    public function it_validates_content_max_length()
    {
        $content = str_repeat('a', 1000001); // Over 1MB limit
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['content']);
    }

    /** @test */
    public function it_returns_confidence_score()
    {
        $content = 'Build a REST API with authentication and database.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertArrayHasKey('confidence', $data);
        // Should be 0.8 when topics are detected
        $this->assertSame(0.8, $data['confidence']);
    }

    /** @test */
    public function it_detects_devops_keywords()
    {
        $content = 'Deploy application using Docker containers on AWS with Kubernetes orchestration.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('devops', $data['topics']);
    }

    /** @test */
    public function it_detects_authentication_keywords()
    {
        $content = 'Implement user login with OAuth and JWT session management.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('authentication', $data['topics']);
    }

    /** @test */
    public function it_detects_testing_keywords()
    {
        $content = 'Write unit tests with Jest and integration tests for quality assurance.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('testing', $data['topics']);
    }

    /** @test */
    public function it_detects_monitoring_keywords()
    {
        $content = 'Setup monitoring with logging, metrics, and Sentry for alerting.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('monitoring', $data['topics']);
    }

    /** @test */
    public function it_detects_documentation_keywords()
    {
        $content = 'Create API documentation using OpenAPI and Swagger with comprehensive README.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('documentation', $data['topics']);
    }

    /** @test */
    public function it_handles_case_insensitive_keyword_matching()
    {
        $content = 'Build a REST API with GRAPHQL endpoints and PostgreSQL DATABASE.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('api', $data['topics']);
        $this->assertContains('database', $data['topics']);
    }

    /** @test */
    public function it_returns_unique_topics()
    {
        $content = 'API with API endpoints and more API functionality.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $uniqueTopics = array_unique($data['topics']);
        $this->assertEquals(count($uniqueTopics), count($data['topics']));
    }

    /** @test */
    public function it_validates_content_must_be_string()
    {
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => 12345 // Non-string value
        ]);
        
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['content']);
    }

    /** @test */
    public function it_estimates_duration_for_zero_topics()
    {
        $content = 'This is a very generic description without any technology keywords.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals('1-2 weeks', $data['estimatedDuration']);
        $this->assertEquals(0, count($data['topics']));
    }

    /** @test */
    public function it_estimates_team_size_for_complex_projects_without_devops()
    {
        $content = 'Build system with API, database, frontend, authentication, and monitoring.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        // Should have >4 topics without DevOps
        $this->assertGreaterThan(4, count($data['topics']));
        $this->assertNotContains('devops', $data['topics']);
        $this->assertEquals(2, $data['recommendedTeamSize']);
    }

    /** @test */
    public function it_generates_summary_without_sentence_delimiters()
    {
        $content = str_repeat('A long continuous text without any sentence delimiters ', 10);
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertNotEmpty($data['summary']);
        $this->assertLessThanOrEqual(203, strlen($data['summary'])); // 200 + "..."
    }

    /** @test */
    public function it_generates_summary_for_truly_empty_content()
    {
        $content = '   '; // Whitespace only
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertEquals('No content provided', $data['summary']);
    }

    /** @test */
    public function it_suggests_web_app_template_for_mobile_only_projects()
    {
        $content = 'Build iOS and Android mobile application with React Native.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('mobile', $data['topics']);
        $this->assertNotContains('frontend', $data['topics']);
        $this->assertEquals('core-web-app', $data['suggestedTemplate']);
    }

    /** @test */
    public function it_suggests_api_service_template_for_devops_only_projects()
    {
        $content = 'Setup Docker containers with Kubernetes orchestration and CI/CD pipeline deployment.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('devops', $data['topics']);
        $this->assertNotContains('api', $data['topics']);
        $this->assertNotContains('frontend', $data['topics']);
        $this->assertEquals('core-api-service', $data['suggestedTemplate']);
    }

    /** @test */
    public function it_detects_backend_keywords()
    {
        $content = 'Build a backend service with Node.js server and Python microservices.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('backend', $data['topics']);
    }

    /** @test */
    public function it_detects_mobile_keywords()
    {
        $content = 'Develop mobile app for iOS and Android using Flutter framework.';
        
        $response = $this->postJson('/api/v1/plans/analyze-context', [
            'content' => $content
        ]);
        
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertContains('mobile', $data['topics']);
    }
}

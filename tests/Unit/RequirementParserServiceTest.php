<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\RequirementParserService;
use App\Services\LoggingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;

class RequirementParserServiceTest extends TestCase
{
    use RefreshDatabase;

    private RequirementParserService $parserService;
    private $logging;

    protected function setUp(): void
    {
        parent::setUp();

        $this->logging = Mockery::mock(LoggingService::class);
        $this->parserService = new RequirementParserService($this->logging);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_extracts_entities_from_requirement()
    {
        $requirement = 'Create a User model with name, email, and password. Build a Product entity with title, price, and description.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertContains('User', $parsed['entities']);
        $this->assertContains('Product', $parsed['entities']);
    }

    /** @test */
    public function it_identifies_crud_intents()
    {
        $requirement = 'Build a REST API to create, read, update, and delete users. Include authentication.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertContains('crud', $parsed['intents']);
        $this->assertContains('api', $parsed['intents']);
        $this->assertContains('authentication', $parsed['intents']);
    }

    /** @test */
    public function it_extracts_performance_constraints()
    {
        $requirement = 'Build a high-performance user search with caching. The system must handle 1000 requests per second and ensure secure authentication.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertContains('performance', $parsed['constraints']);
        $this->assertContains('security', $parsed['constraints']);
    }

    /** @test */
    public function it_parses_user_stories()
    {
        $requirement = 'As an admin, I want to manage users, so that I can control access. As a user, I want to reset my password, so that I can recover my account.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertCount(2, $parsed['user_stories']);
        $this->assertEquals('admin', $parsed['user_stories'][0]['role']);
        $this->assertStringContainsString('manage users', $parsed['user_stories'][0]['feature']);
    }

    /** @test */
    public function it_calculates_complexity_score()
    {
        $simpleRequirement = 'Create a User model.';
        $complexRequirement = 'Build a comprehensive e-commerce platform with User, Product, Order, Payment, Inventory, Shipping, Review, and Wishlist models. Include CRUD operations, REST API, authentication, authorization, search, reporting, notifications, payment integration, email notifications, and real-time updates. Ensure high performance, security, scalability, and compliance with PCI-DSS.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $simpleParsed = $this->parserService->parseRequirement($simpleRequirement);
        $complexParsed = $this->parserService->parseRequirement($complexRequirement);

        $this->assertEquals('simple', $simpleParsed['complexity']);
        $this->assertContains($complexParsed['complexity'], ['complex', 'very_complex']);
    }

    /** @test */
    public function it_estimates_scope_based_on_entities_and_intents()
    {
        $requirement = 'Build User, Product, and Order models with CRUD API and authentication.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertArrayHasKey('estimated_scope', $parsed);
        $this->assertGreaterThan(0, $parsed['estimated_scope']['days']);
        $this->assertGreaterThan(0, $parsed['estimated_scope']['features']);
    }

    /** @test */
    public function it_suggests_clarifications_for_vague_requirements()
    {
        $requirement = 'Build a system.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertArrayHasKey('clarifications', $parsed);
        $this->assertNotEmpty($parsed['clarifications']);
    }

    /** @test */
    public function it_handles_acceptance_criteria()
    {
        $requirement = 'Given a logged-in user, when they click the profile button, then they should see their profile page. Given invalid credentials, when login is attempted, then an error message should be displayed.';

        $this->logging->shouldReceive('info')->atLeast()->once();

        $parsed = $this->parserService->parseRequirement($requirement);

        $this->assertArrayHasKey('acceptance_criteria', $parsed);
        $this->assertCount(2, $parsed['acceptance_criteria']);
    }
}

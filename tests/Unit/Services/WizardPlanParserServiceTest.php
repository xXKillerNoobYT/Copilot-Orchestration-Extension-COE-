<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\WizardPlanParserService;
use InvalidArgumentException;
use Illuminate\Support\Collection;

class WizardPlanParserServiceTest extends TestCase
{
    private WizardPlanParserService $parser;
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->parser = new WizardPlanParserService();
        $this->tempDir = sys_get_temp_dir() . '/wizard_plan_parser_test_' . uniqid();
        
        if (!is_dir($this->tempDir)) {
            mkdir($this->tempDir, 0777, true);
        }
    }

    protected function tearDown(): void
    {
        // Clean up temporary files
        if (is_dir($this->tempDir)) {
            $files = glob($this->tempDir . '/*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            rmdir($this->tempDir);
        }
        
        parent::tearDown();
    }

    /** @test */
    public function it_throws_exception_when_file_not_found()
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Plan file not found:');
        
        $this->parser->parsePlanFile('/nonexistent/plan.json');
    }

    /** @test */
    public function it_throws_exception_for_invalid_json()
    {
        $filePath = $this->tempDir . '/invalid.json';
        file_put_contents($filePath, '{invalid json}');
        
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON in plan file:');
        
        $this->parser->parsePlanFile($filePath);
    }

    /** @test */
    public function it_throws_exception_for_non_object_json()
    {
        $filePath = $this->tempDir . '/array.json';
        file_put_contents($filePath, '["not", "an", "object"]');
        
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Plan file must contain a JSON object');
        
        $this->parser->parsePlanFile($filePath);
    }

    /** @test */
    public function it_parses_valid_plan_file()
    {
        $planData = [
            'projectName' => 'Test Project',
            'description' => 'A test project',
        ];
        
        $filePath = $this->tempDir . '/valid.json';
        file_put_contents($filePath, json_encode($planData));
        
        $result = $this->parser->parsePlanFile($filePath);
        
        $this->assertIsArray($result);
        $this->assertEquals('Test Project', $result['projectName']);
        $this->assertEquals('A test project', $result['description']);
    }

    /** @test */
    public function it_extracts_features_correctly()
    {
        $plan = [
            'features' => [
                [
                    'id' => 'feat-1',
                    'name' => 'User Authentication',
                    'description' => 'Login and registration',
                    'priority' => 'high',
                    'dependencies' => ['feat-0'],
                    'status' => 'pending',
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Dashboard',
                    'description' => 'Main dashboard view',
                    'priority' => 'medium',
                ],
            ],
        ];
        
        $features = $this->parser->extractFeatures($plan);
        
        $this->assertInstanceOf(Collection::class, $features);
        $this->assertCount(2, $features);
        
        $first = $features->first();
        $this->assertEquals('feat-1', $first['id']);
        $this->assertEquals('User Authentication', $first['name']);
        $this->assertEquals('high', $first['priority']);
        $this->assertEquals(['feat-0'], $first['dependencies']);
        
        $second = $features->last();
        $this->assertEquals('feat-2', $second['id']);
        $this->assertEquals('medium', $second['priority']);
        $this->assertEquals([], $second['dependencies']); // Default empty array
    }

    /** @test */
    public function it_handles_missing_features()
    {
        $plan = [];
        
        $features = $this->parser->extractFeatures($plan);
        
        $this->assertInstanceOf(Collection::class, $features);
        $this->assertCount(0, $features);
    }

    /** @test */
    public function it_extracts_timeline_correctly()
    {
        $plan = [
            'timeline' => [
                [
                    'milestone' => 'Alpha Release',
                    'date' => '2026-03-01',
                    'phase' => 'Phase 1',
                    'description' => 'Initial feature set',
                ],
                [
                    'milestone' => 'Beta Release',
                    'date' => '2026-06-01',
                    'phase' => 'Phase 2',
                ],
            ],
        ];
        
        $timeline = $this->parser->extractTimeline($plan);
        
        $this->assertIsArray($timeline);
        $this->assertCount(2, $timeline);
        
        $this->assertEquals('Alpha Release', $timeline[0]['milestone']);
        $this->assertEquals('2026-03-01', $timeline[0]['date']);
        $this->assertEquals('Phase 1', $timeline[0]['phase']);
        $this->assertEquals('Initial feature set', $timeline[0]['description']);
        
        $this->assertEquals('', $timeline[1]['description']); // Default empty string
    }

    /** @test */
    public function it_handles_missing_timeline()
    {
        $plan = [];
        
        $timeline = $this->parser->extractTimeline($plan);
        
        $this->assertIsArray($timeline);
        $this->assertCount(0, $timeline);
    }

    /** @test */
    public function it_extracts_architecture_as_string()
    {
        $plan = [
            'architecture' => 'microservices',
            'constraints' => ['scalability', 'security'],
            'techStack' => ['Laravel', 'Vue.js'],
            'integrations' => ['Stripe', 'AWS S3'],
        ];
        
        $architecture = $this->parser->extractArchitecture($plan);
        
        $this->assertEquals('microservices', $architecture['pattern']);
        $this->assertEquals(['scalability', 'security'], $architecture['constraints']);
        $this->assertEquals(['Laravel', 'Vue.js'], $architecture['tech_stack']);
        $this->assertEquals(['Stripe', 'AWS S3'], $architecture['integrations']);
    }

    /** @test */
    public function it_extracts_architecture_as_object()
    {
        $plan = [
            'architecture' => [
                'pattern' => 'mvc',
                'layers' => ['presentation', 'business', 'data'],
            ],
        ];
        
        $architecture = $this->parser->extractArchitecture($plan);
        
        $this->assertEquals('mvc', $architecture['pattern']);
    }

    /** @test */
    public function it_handles_missing_architecture()
    {
        $plan = [];
        
        $architecture = $this->parser->extractArchitecture($plan);
        
        $this->assertEquals('mvc', $architecture['pattern']); // Default
        $this->assertEquals([], $architecture['constraints']);
        $this->assertEquals([], $architecture['tech_stack']);
    }

    /** @test */
    public function it_extracts_team_correctly()
    {
        $plan = [
            'team' => [
                [
                    'role' => 'Backend Developer',
                    'skills' => ['PHP', 'Laravel', 'MySQL'],
                    'agent' => 'Auto Zen',
                    'responsibilities' => ['API development', 'Database design'],
                ],
                [
                    'role' => 'Frontend Developer',
                    'skills' => ['Vue.js', 'TypeScript'],
                ],
            ],
        ];
        
        $team = $this->parser->extractTeam($plan);
        
        $this->assertIsArray($team);
        $this->assertCount(2, $team);
        
        $this->assertEquals('Backend Developer', $team[0]['role']);
        $this->assertEquals(['PHP', 'Laravel', 'MySQL'], $team[0]['skills']);
        $this->assertEquals('Auto Zen', $team[0]['agent']);
        
        $this->assertEquals('Frontend Developer', $team[1]['role']);
        $this->assertNull($team[1]['agent']); // Default null
        $this->assertEquals([], $team[1]['responsibilities']); // Default empty array
    }

    /** @test */
    public function it_handles_missing_team()
    {
        $plan = [];
        
        $team = $this->parser->extractTeam($plan);
        
        $this->assertIsArray($team);
        $this->assertCount(0, $team);
    }

    /** @test */
    public function it_extracts_metadata_correctly()
    {
        $plan = [
            'projectName' => 'E-Commerce Platform',
            'description' => 'Full-featured online store',
            'createdAt' => '2026-01-11T10:00:00Z',
            'version' => '2.0',
            'wizardVersion' => '1.5.0',
        ];
        
        $metadata = $this->parser->extractMetadata($plan);
        
        $this->assertEquals('E-Commerce Platform', $metadata['project_name']);
        $this->assertEquals('Full-featured online store', $metadata['description']);
        $this->assertEquals('2026-01-11T10:00:00Z', $metadata['created_at']);
        $this->assertEquals('2.0', $metadata['version']);
        $this->assertEquals('1.5.0', $metadata['wizard_version']);
    }

    /** @test */
    public function it_handles_missing_metadata_fields()
    {
        $plan = [];
        
        $metadata = $this->parser->extractMetadata($plan);
        
        $this->assertEquals('Unnamed Project', $metadata['project_name']);
        $this->assertEquals('', $metadata['description']);
        $this->assertNull($metadata['created_at']);
        $this->assertEquals('1.0', $metadata['version']);
        $this->assertNull($metadata['wizard_version']);
    }

    /** @test */
    public function it_gets_normalized_plan_structure()
    {
        $planData = [
            'projectName' => 'Test Project',
            'description' => 'A comprehensive test',
            'architecture' => 'microservices',
            'features' => [
                ['id' => 'f1', 'name' => 'Auth', 'priority' => 'high'],
            ],
            'timeline' => [
                ['milestone' => 'MVP', 'date' => '2026-02-01'],
            ],
            'team' => [
                ['role' => 'Developer', 'skills' => ['PHP']],
            ],
        ];
        
        $filePath = $this->tempDir . '/complete.json';
        file_put_contents($filePath, json_encode($planData));
        
        $normalized = $this->parser->getNormalizedPlan($filePath);
        
        $this->assertIsArray($normalized);
        $this->assertArrayHasKey('metadata', $normalized);
        $this->assertArrayHasKey('features', $normalized);
        $this->assertArrayHasKey('timeline', $normalized);
        $this->assertArrayHasKey('architecture', $normalized);
        $this->assertArrayHasKey('team', $normalized);
        $this->assertArrayHasKey('raw', $normalized);
        
        $this->assertEquals('Test Project', $normalized['metadata']['project_name']);
        $this->assertInstanceOf(Collection::class, $normalized['features']);
        $this->assertCount(1, $normalized['features']);
        $this->assertCount(1, $normalized['timeline']);
        $this->assertCount(1, $normalized['team']);
        $this->assertEquals($planData, $normalized['raw']);
    }
}

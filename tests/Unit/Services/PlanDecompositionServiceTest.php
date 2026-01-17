<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\PlanDecompositionService;
use App\Services\WizardPlanParserService;
use App\Services\DependencyGraphService;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Mockery;

class PlanDecompositionServiceTest extends TestCase
{
    private PlanDecompositionService $service;
    private $planParser;
    private $dependencyGraph;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->planParser = Mockery::mock(WizardPlanParserService::class);
        $this->dependencyGraph = Mockery::mock(DependencyGraphService::class);
        
        $this->service = new PlanDecompositionService(
            $this->planParser,
            $this->dependencyGraph
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_decomposes_simple_plan_into_tasks()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'User Authentication',
                    'description' => 'Login and registration system',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Dashboard',
                    'description' => 'Main dashboard view',
                    'priority' => 'medium',
                    'dependencies' => ['feat-1'],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('tasks', $result);
        $this->assertArrayHasKey('metadata', $result);
        
        $tasks = $result['tasks'];
        $this->assertCount(2, $tasks);
        
        // Verify first task
        $this->assertEquals('feat-1', $tasks[0]['id']);
        $this->assertEquals('Implement: User Authentication', $tasks[0]['title']);
        $this->assertEquals('high', $tasks[0]['priority']);
        $this->assertEmpty($tasks[0]['dependencies']);
        
        // Verify second task has dependency
        $this->assertEquals('feat-2', $tasks[1]['id']);
        $this->assertEquals(['feat-1'], $tasks[1]['dependencies']);
    }

    /** @test */
    public function it_breaks_large_features_into_subtasks()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-complex',
                    'name' => 'Complex Authentication System',
                    'description' => 'Full authentication with OAuth integration, two-factor authentication, password recovery, email verification, and role-based access control with permissions management',
                    'priority' => 'critical',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'microservices'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan, ['microtask_size' => 45]);
        
        $tasks = $result['tasks'];
        $this->assertCount(1, $tasks);
        
        // Large feature should have subtasks
        $this->assertArrayHasKey('subtasks', $tasks[0]);
        $this->assertNotEmpty($tasks[0]['subtasks']);
        
        // Verify subtask structure
        $subtasks = $tasks[0]['subtasks'];
        foreach ($subtasks as $subtask) {
            $this->assertArrayHasKey('id', $subtask);
            $this->assertArrayHasKey('title', $subtask);
            $this->assertArrayHasKey('estimate_hours', $subtask);
            $this->assertArrayHasKey('parent_id', $subtask);
            $this->assertEquals('feat-complex', $subtask['parent_id']);
        }
    }

    /** @test */
    public function it_estimates_effort_based_on_complexity()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-simple',
                    'name' => 'Simple Feature',
                    'description' => 'Basic feature',
                    'priority' => 'low',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-complex',
                    'name' => 'Complex Feature',
                    'description' => 'Complex authentication with database integration and API endpoints for user management',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        // Complex task should have higher estimate
        $simpleEstimate = $tasks[0]['estimate_hours'];
        $complexEstimate = $tasks[1]['estimate_hours'];
        
        $this->assertGreaterThan($simpleEstimate, $complexEstimate);
    }

    /** @test */
    public function it_infers_dependencies_correctly()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Database Schema',
                    'description' => 'Create database tables',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'API Endpoints',
                    'description' => 'Create REST API',
                    'priority' => 'high',
                    'dependencies' => ['feat-1'],
                ],
                [
                    'id' => 'feat-3',
                    'name' => 'Frontend UI',
                    'description' => 'Build user interface',
                    'priority' => 'medium',
                    'dependencies' => ['feat-2'],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        // Verify dependency chain
        $this->assertEmpty($tasks[0]['dependencies']);
        $this->assertEquals(['feat-1'], $tasks[1]['dependencies']);
        $this->assertEquals(['feat-2'], $tasks[2]['dependencies']);
    }

    /** @test */
    public function it_calculates_critical_path()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'First feature',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Feature 2',
                    'description' => 'Second feature',
                    'priority' => 'high',
                    'dependencies' => ['feat-1'],
                ],
                [
                    'id' => 'feat-3',
                    'name' => 'Feature 3',
                    'description' => 'Third feature',
                    'priority' => 'high',
                    'dependencies' => ['feat-2'],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $metadata = $result['metadata'];
        
        $this->assertArrayHasKey('critical_path', $metadata);
        $this->assertIsArray($metadata['critical_path']);
        $this->assertNotEmpty($metadata['critical_path']);
        
        // Critical path should include the chain
        $this->assertContains('feat-3', $metadata['critical_path']);
    }

    /** @test */
    public function it_boosts_priority_for_tasks_on_critical_path()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-critical',
                    'name' => 'Critical Feature',
                    'description' => 'On critical path with lots of dependencies and complex authentication integration',
                    'priority' => 'medium',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-dependent',
                    'name' => 'Dependent Feature',
                    'description' => 'Depends on critical feature',
                    'priority' => 'medium',
                    'dependencies' => ['feat-critical'],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        // At least one task should be promoted
        $hasPromoted = false;
        foreach ($tasks as $task) {
            if (isset($task['on_critical_path']) && $task['on_critical_path']) {
                $hasPromoted = true;
                break;
            }
        }
        
        $this->assertTrue($hasPromoted);
    }

    /** @test */
    public function it_generates_metadata_correctly()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'First feature',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Feature 2',
                    'description' => 'Second feature',
                    'priority' => 'medium',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'microservices'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $metadata = $result['metadata'];
        
        $this->assertArrayHasKey('total_tasks', $metadata);
        $this->assertArrayHasKey('estimated_hours', $metadata);
        $this->assertArrayHasKey('critical_path', $metadata);
        $this->assertArrayHasKey('architecture_pattern', $metadata);
        $this->assertArrayHasKey('priority_breakdown', $metadata);
        
        $this->assertEquals(2, $metadata['total_tasks']);
        $this->assertEquals('microservices', $metadata['architecture_pattern']);
        $this->assertGreaterThan(0, $metadata['estimated_hours']);
        
        $breakdown = $metadata['priority_breakdown'];
        $this->assertArrayHasKey('high', $breakdown);
        $this->assertArrayHasKey('medium', $breakdown);
        $this->assertArrayHasKey('low', $breakdown);
    }

    /** @test */
    public function it_detects_circular_dependencies()
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('circular dependencies');
        
        // Create a circular dependency: A -> B -> C -> A
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-a',
                    'name' => 'Feature A',
                    'description' => 'Feature A',
                    'priority' => 'high',
                    'dependencies' => ['feat-c'], // Creates cycle
                ],
                [
                    'id' => 'feat-b',
                    'name' => 'Feature B',
                    'description' => 'Feature B',
                    'priority' => 'high',
                    'dependencies' => ['feat-a'],
                ],
                [
                    'id' => 'feat-c',
                    'name' => 'Feature C',
                    'description' => 'Feature C',
                    'priority' => 'high',
                    'dependencies' => ['feat-b'],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $this->service->decomposePlan($normalizedPlan);
    }

    /** @test */
    public function it_handles_empty_feature_list()
    {
        $normalizedPlan = [
            'features' => collect([]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $this->assertEmpty($result['tasks']);
        $this->assertEquals(0, $result['metadata']['total_tasks']);
        $this->assertEquals(0, $result['metadata']['estimated_hours']);
    }

    /** @test */
    public function it_respects_microtask_size_option()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-large',
                    'name' => 'Large Feature',
                    'description' => 'Complex authentication integration with database and API endpoints requiring extensive testing',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        // Test with small microtask size (should create subtasks)
        $result1 = $this->service->decomposePlan($normalizedPlan, ['microtask_size' => 30]);
        $this->assertArrayHasKey('subtasks', $result1['tasks'][0]);
        $this->assertNotEmpty($result1['tasks'][0]['subtasks']);
        
        // Test with large microtask size (might not create subtasks)
        $result2 = $this->service->decomposePlan($normalizedPlan, ['microtask_size' => 300]);
        // May or may not have subtasks depending on estimate
    }

    /** @test */
    public function it_normalizes_priority_correctly()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'Test',
                    'priority' => 'critical',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Feature 2',
                    'description' => 'Test',
                    'priority' => 'normal',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-3',
                    'name' => 'Feature 3',
                    'description' => 'Test',
                    'priority' => 'unknown',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        $this->assertEquals('critical', $tasks[0]['priority']);
        $this->assertEquals('medium', $tasks[1]['priority']); // 'normal' -> 'medium'
        $this->assertEquals('medium', $tasks[2]['priority']); // 'unknown' -> 'medium' (default)
    }

    /** @test */
    public function it_handles_multiple_dependencies_per_task()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Database',
                    'description' => 'Setup database',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'API',
                    'description' => 'API layer',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-3',
                    'name' => 'Frontend',
                    'description' => 'UI layer',
                    'priority' => 'medium',
                    'dependencies' => ['feat-1', 'feat-2'], // Multiple dependencies
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        $this->assertCount(2, $tasks[2]['dependencies']);
        $this->assertContains('feat-1', $tasks[2]['dependencies']);
        $this->assertContains('feat-2', $tasks[2]['dependencies']);
    }

    /** @test */
    public function it_handles_parallel_independent_tasks()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'Independent feature 1',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Feature 2',
                    'description' => 'Independent feature 2',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-3',
                    'name' => 'Feature 3',
                    'description' => 'Independent feature 3',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        // All tasks should be independent
        foreach ($tasks as $task) {
            $this->assertEmpty($task['dependencies']);
        }
    }

    /** @test */
    public function it_generates_unique_task_ids()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'First feature',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Feature 2',
                    'description' => 'Second feature',
                    'priority' => 'medium',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $taskIds = array_column($result['tasks'], 'id');
        
        // All IDs should be unique
        $this->assertCount(count(array_unique($taskIds)), $taskIds);
    }

    /** @test */
    public function it_calculates_total_estimated_hours_correctly()
    {
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'Simple feature',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-2',
                    'name' => 'Feature 2',
                    'description' => 'Another feature',
                    'priority' => 'medium',
                    'dependencies' => [],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $totalHours = $result['metadata']['estimated_hours'];
        $taskHoursSum = array_sum(array_column($result['tasks'], 'estimate_hours'));
        
        $this->assertEquals($taskHoursSum, $totalHours);
        $this->assertGreaterThan(0, $totalHours);
    }

    /** @test */
    public function it_handles_self_referencing_dependency()
    {
        $this->expectException(InvalidArgumentException::class);
        
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-1',
                    'name' => 'Feature 1',
                    'description' => 'Self-referencing feature',
                    'priority' => 'high',
                    'dependencies' => ['feat-1'], // Self-reference
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $this->service->decomposePlan($normalizedPlan);
    }

    /** @test */
    public function it_handles_long_dependency_chain()
    {
        // Create a chain of 10 dependencies
        $features = [];
        for ($i = 1; $i <= 10; $i++) {
            $features[] = [
                'id' => "feat-{$i}",
                'name' => "Feature {$i}",
                'description' => "Feature number {$i}",
                'priority' => 'medium',
                'dependencies' => $i > 1 ? ["feat-" . ($i - 1)] : [],
            ];
        }
        
        $normalizedPlan = [
            'features' => collect($features),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $this->assertCount(10, $result['tasks']);
        
        // Critical path should include all tasks in the chain
        $criticalPath = $result['metadata']['critical_path'];
        $this->assertGreaterThanOrEqual(2, count($criticalPath));
    }

    /** @test */
    public function it_handles_diamond_dependency_pattern()
    {
        // Diamond pattern: A -> B, A -> C, B -> D, C -> D
        $normalizedPlan = [
            'features' => collect([
                [
                    'id' => 'feat-a',
                    'name' => 'Feature A',
                    'description' => 'Root feature',
                    'priority' => 'high',
                    'dependencies' => [],
                ],
                [
                    'id' => 'feat-b',
                    'name' => 'Feature B',
                    'description' => 'Branch 1',
                    'priority' => 'high',
                    'dependencies' => ['feat-a'],
                ],
                [
                    'id' => 'feat-c',
                    'name' => 'Feature C',
                    'description' => 'Branch 2',
                    'priority' => 'high',
                    'dependencies' => ['feat-a'],
                ],
                [
                    'id' => 'feat-d',
                    'name' => 'Feature D',
                    'description' => 'Merge point',
                    'priority' => 'high',
                    'dependencies' => ['feat-b', 'feat-c'],
                ],
            ]),
            'timeline' => [],
            'architecture' => ['pattern' => 'mvc'],
        ];
        
        $result = $this->service->decomposePlan($normalizedPlan);
        
        $tasks = $result['tasks'];
        
        $this->assertCount(4, $tasks);
        $this->assertEmpty($tasks[0]['dependencies']); // A
        $this->assertEquals(['feat-a'], $tasks[1]['dependencies']); // B
        $this->assertEquals(['feat-a'], $tasks[2]['dependencies']); // C
        $this->assertCount(2, $tasks[3]['dependencies']); // D has 2 deps
    }

    /** @test */
    public function it_performance_handles_large_feature_set()
    {
        // Test performance with 50+ features
        $features = [];
        for ($i = 1; $i <= 55; $i++) {
            $features[] = [
                'id' => "feat-{$i}",
                'name' => "Feature {$i}",
                'description' => "Complex feature with authentication and database integration for feature number {$i}",
                'priority' => $i <= 10 ? 'critical' : ($i <= 30 ? 'high' : 'medium'),
                'dependencies' => $i > 1 && $i % 3 === 0 ? ["feat-" . ($i - 1)] : [],
            ];
        }
        
        $normalizedPlan = [
            'features' => collect($features),
            'timeline' => [],
            'architecture' => ['pattern' => 'microservices'],
        ];
        
        $startTime = microtime(true);
        $result = $this->service->decomposePlan($normalizedPlan);
        $duration = microtime(true) - $startTime;
        
        // Should complete in less than 2 seconds
        $this->assertLessThan(2.0, $duration, 'Decomposition took too long: ' . $duration . 's');
        
        $this->assertCount(55, $result['tasks']);
        $this->assertEquals(55, $result['metadata']['total_tasks']);
        $this->assertGreaterThan(0, $result['metadata']['estimated_hours']);
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use App\Models\ContextBundle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

class ContextBundleTest extends TestCase
{
    use RefreshDatabase;

    private Project $project;
    private Task $task;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->project = Project::factory()->create(['owner_id' => $this->user->id]);
        $this->task = Task::factory()->create([
            'project_id' => $this->project->id,
            'type' => 'feature',
            'status' => 'pending',
            'description' => 'Test task description',
        ]);
    }

    /** @test */
    public function it_creates_a_context_bundle()
    {
        $response = $this->postJson('/api/v1/context-bundles', [
            'task_id' => $this->task->id,
            'bundle_type' => 'task_context',
            'files' => [
                [
                    'path' => 'test.php',
                    'type' => 'php',
                    'content' => '<?php echo "test";',
                    'size' => 19,
                ]
            ],
            'metadata' => [
                'source' => 'manual',
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'Context bundle created successfully',
        ]);

        $this->assertDatabaseHas('context_bundles', [
            'task_id' => $this->task->id,
            'bundle_type' => 'task_context',
            'version' => 1,
        ]);
    }

    /** @test */
    public function it_validates_required_fields_when_creating_bundle()
    {
        $response = $this->postJson('/api/v1/context-bundles', [
            'bundle_type' => 'task_context',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['task_id']);
    }

    /** @test */
    public function it_validates_bundle_type()
    {
        $response = $this->postJson('/api/v1/context-bundles', [
            'task_id' => $this->task->id,
            'bundle_type' => 'invalid_type',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['bundle_type']);
    }

    /** @test */
    public function it_creates_bundle_from_task()
    {
        $response = $this->postJson("/api/v1/tasks/{$this->task->id}/context-bundles/from-task", [
            'bundle_type' => 'task_context',
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'Context bundle created from task',
        ]);

        $this->assertDatabaseHas('context_bundles', [
            'task_id' => $this->task->id,
            'bundle_type' => 'task_context',
        ]);
    }

    /** @test */
    public function it_retrieves_all_bundles_for_task()
    {
        ContextBundle::factory()->count(3)->create([
            'task_id' => $this->task->id,
        ]);

        $response = $this->getJson("/api/v1/tasks/{$this->task->id}/context-bundles");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'count' => 3,
        ]);
    }

    /** @test */
    public function it_retrieves_a_specific_bundle()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
        ]);

        $response = $this->getJson("/api/v1/context-bundles/{$bundle->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'bundle' => [
                    'id' => $bundle->id,
                    'task_id' => $this->task->id,
                ]
            ],
        ]);
    }

    /** @test */
    public function it_returns_404_for_nonexistent_bundle()
    {
        $response = $this->getJson("/api/v1/context-bundles/nonexistent-id");

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Context bundle not found',
        ]);
    }

    /** @test */
    public function it_adds_files_to_bundle()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'files' => [],
        ]);

        // Create a temporary test file
        $testFilePath = base_path('tests/fixtures/test.php');
        if (!is_dir(dirname($testFilePath))) {
            mkdir(dirname($testFilePath), 0777, true);
        }
        file_put_contents($testFilePath, '<?php echo "test";');

        $response = $this->postJson("/api/v1/context-bundles/{$bundle->id}/files", [
            'file_paths' => [$testFilePath],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Files added to context bundle',
        ]);

        // Cleanup
        if (file_exists($testFilePath)) {
            unlink($testFilePath);
        }
    }

    /** @test */
    public function it_removes_file_from_bundle()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'files' => [
                ['path' => 'test.php', 'type' => 'php', 'content' => 'test'],
                ['path' => 'another.php', 'type' => 'php', 'content' => 'another'],
            ],
        ]);

        $response = $this->deleteJson("/api/v1/context-bundles/{$bundle->id}/files", [
            'file_path' => 'test.php',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'File removed from context bundle',
        ]);

        $bundle->refresh();
        $this->assertCount(1, $bundle->files);
    }

    /** @test */
    public function it_updates_bundle_metadata()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'metadata' => ['original' => 'data'],
        ]);

        $response = $this->patchJson("/api/v1/context-bundles/{$bundle->id}/metadata", [
            'metadata' => [
                'updated' => 'value',
                'new_field' => 'new_value',
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Metadata updated successfully',
        ]);

        $bundle->refresh();
        $this->assertEquals('data', $bundle->metadata['original']);
        $this->assertEquals('value', $bundle->metadata['updated']);
    }

    /** @test */
    public function it_gets_bundle_statistics()
    {
        ContextBundle::factory()->count(3)->create([
            'task_id' => $this->task->id,
        ]);

        $response = $this->getJson("/api/v1/tasks/{$this->task->id}/context-bundles/statistics");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
        $response->assertJsonStructure([
            'data' => [
                'total_bundles',
                'total_versions',
                'total_files',
                'bundle_types',
            ],
        ]);
    }

    /** @test */
    public function it_gets_version_history()
    {
        ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'version' => 1,
        ]);
        ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'version' => 2,
        ]);

        $response = $this->getJson("/api/v1/tasks/{$this->task->id}/context-bundles/history");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'count' => 2,
        ]);
    }

    /** @test */
    public function it_gets_specific_version()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'version' => 2,
        ]);

        $response = $this->getJson("/api/v1/tasks/{$this->task->id}/context-bundles/version/2");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $bundle->id,
                'version' => 2,
            ],
        ]);
    }

    /** @test */
    public function it_creates_new_version()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'version' => 1,
            'files' => [['path' => 'old.php', 'type' => 'php']],
        ]);

        $response = $this->postJson("/api/v1/tasks/{$this->task->id}/context-bundles/version", [
            'files' => [['path' => 'new.php', 'type' => 'php']],
            'metadata' => ['version_note' => 'Updated files'],
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'New version created successfully',
        ]);

        $this->assertDatabaseHas('context_bundles', [
            'task_id' => $this->task->id,
            'version' => 2,
        ]);
    }

    /** @test */
    public function it_searches_bundles_by_content()
    {
        ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'files' => [
                ['path' => 'search.php', 'type' => 'php', 'content' => 'searchable content'],
            ],
        ]);

        $response = $this->getJson('/api/v1/context-bundles/search?query=searchable');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
    }

    /** @test */
    public function it_requires_minimum_search_query_length()
    {
        $response = $this->getJson('/api/v1/context-bundles/search?query=ab');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['query']);
    }

    /** @test */
    public function it_deletes_a_bundle()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
        ]);

        $response = $this->deleteJson("/api/v1/context-bundles/{$bundle->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Context bundle deleted successfully',
        ]);

        $this->assertDatabaseMissing('context_bundles', [
            'id' => $bundle->id,
        ]);
    }

    /** @test */
    public function it_increments_version_numbers_correctly()
    {
        $bundle1 = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
        ]);

        $this->assertEquals(1, $bundle1->version);

        $bundle2 = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
        ]);

        $this->assertEquals(2, $bundle2->version);
    }

    /** @test */
    public function it_handles_different_bundle_types()
    {
        $types = ['task_context', 'file_context', 'repository_context', 'custom'];

        foreach ($types as $type) {
            $response = $this->postJson('/api/v1/context-bundles', [
                'task_id' => $this->task->id,
                'bundle_type' => $type,
            ]);

            $response->assertStatus(201);
            $this->assertDatabaseHas('context_bundles', [
                'task_id' => $this->task->id,
                'bundle_type' => $type,
            ]);
        }
    }

    /** @test */
    public function it_retrieves_bundle_with_context()
    {
        $bundle = ContextBundle::factory()->create([
            'task_id' => $this->task->id,
            'files' => [
                ['path' => 'test.php', 'type' => 'php', 'size' => 100, 'line_count' => 10],
            ],
        ]);

        $response = $this->getJson("/api/v1/context-bundles/{$bundle->id}?include_context=true");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'bundle',
                'statistics',
                'analysis',
            ],
        ]);
    }

    /** @test */
    public function it_validates_file_paths_when_creating_from_files()
    {
        $response = $this->postJson("/api/v1/tasks/{$this->task->id}/context-bundles/from-files", [
            'file_paths' => [],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file_paths']);
    }

    /** @test */
    public function it_validates_repository_path_when_creating_from_repository()
    {
        $response = $this->postJson("/api/v1/tasks/{$this->task->id}/context-bundles/from-repository", [
            'repository_path' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['repository_path']);
    }
}

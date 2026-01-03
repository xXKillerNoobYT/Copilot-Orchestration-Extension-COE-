<?php

namespace Database\Factories;

use App\Models\ContextBundle;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ContextBundleFactory extends Factory
{
    protected $model = ContextBundle::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'task_id' => Task::factory(),
            'bundle_type' => $this->faker->randomElement(['task_context', 'file_context', 'repository_context', 'custom']),
            'version' => 1,
            'files' => [
                [
                    'path' => 'example.php',
                    'type' => 'php',
                    'content' => '<?php echo "test";',
                    'size' => 19,
                    'line_count' => 1,
                ],
            ],
            'metadata' => [
                'created_by' => 'factory',
                'source' => 'test',
            ],
        ];
    }

    public function withFiles(array $files): static
    {
        return $this->state(fn (array $attributes) => [
            'files' => $files,
        ]);
    }

    public function withMetadata(array $metadata): static
    {
        return $this->state(fn (array $attributes) => [
            'metadata' => $metadata,
        ]);
    }

    public function version(int $version): static
    {
        return $this->state(fn (array $attributes) => [
            'version' => $version,
        ]);
    }

    public function taskContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'task_context',
        ]);
    }

    public function fileContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'file_context',
        ]);
    }

    public function repositoryContext(): static
    {
        return $this->state(fn (array $attributes) => [
            'bundle_type' => 'repository_context',
        ]);
    }
}

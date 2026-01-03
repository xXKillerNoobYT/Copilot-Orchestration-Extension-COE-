<?php

namespace App\Services;

use App\Models\ContextBundle;
use App\Models\Task;
use App\Repositories\ContextBundleRepository;
use App\Events\ContextBundleCreated;
use App\Events\ContextBundleUpdated;
use App\Exceptions\ContextBundleException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class ContextBundleService
{
    public function __construct(
        private ContextBundleRepository $repository,
        private DocumentParserService $documentParser,
        private CodeAnalysisService $codeAnalysis
    ) {}

    /**
     * Create a new context bundle
     */
    public function createBundle(array $data): ContextBundle
    {
        $this->validateBundleData($data);

        $bundleData = [
            'id' => Str::uuid()->toString(),
            'task_id' => $data['task_id'],
            'bundle_type' => $data['bundle_type'],
            'files' => $data['files'] ?? [],
            'metadata' => $data['metadata'] ?? [],
        ];

        $bundle = $this->repository->create($bundleData);

        event(new ContextBundleCreated($bundle));

        return $bundle;
    }

    /**
     * Create context bundle from task
     */
    public function createFromTask(Task $task, string $bundleType = 'task_context'): ContextBundle
    {
        $contextData = $this->extractTaskContext($task);

        $bundleData = [
            'task_id' => $task->id,
            'bundle_type' => $bundleType,
            'files' => $contextData['files'],
            'metadata' => [
                'task_type' => $task->type,
                'task_title' => $task->title,
                'task_description' => $task->description,
                'dependencies' => $task->dependencies->pluck('id')->toArray(),
                'extracted_at' => now()->toIso8601String(),
                ...$contextData['metadata'],
            ],
        ];

        return $this->createBundle($bundleData);
    }

    /**
     * Create context bundle from file paths
     */
    public function createFromFiles(string $taskId, array $filePaths, string $bundleType = 'file_context'): ContextBundle
    {
        $files = [];
        $metadata = [
            'total_files' => count($filePaths),
            'file_types' => [],
        ];

        foreach ($filePaths as $filePath) {
            if (!file_exists($filePath)) {
                continue;
            }

            $fileData = $this->analyzeFile($filePath);
            $files[] = $fileData;

            // Track file types
            $extension = pathinfo($filePath, PATHINFO_EXTENSION);
            $metadata['file_types'][$extension] = ($metadata['file_types'][$extension] ?? 0) + 1;
        }

        $bundleData = [
            'task_id' => $taskId,
            'bundle_type' => $bundleType,
            'files' => $files,
            'metadata' => $metadata,
        ];

        return $this->createBundle($bundleData);
    }

    /**
     * Create context bundle from code repository
     */
    public function createFromRepository(
        string $taskId,
        string $repositoryPath,
        array $options = []
    ): ContextBundle {
        $includePatterns = $options['include'] ?? ['**/*.php', '**/*.ts', '**/*.js'];
        $excludePatterns = $options['exclude'] ?? ['vendor/**', 'node_modules/**', 'storage/**'];

        $files = [];
        $metadata = [
            'repository_path' => $repositoryPath,
            'analyzed_at' => now()->toIso8601String(),
            'file_count' => 0,
            'total_lines' => 0,
        ];

        // Scan repository
        $scannedFiles = $this->scanRepository($repositoryPath, $includePatterns, $excludePatterns);

        foreach ($scannedFiles as $filePath) {
            $fileData = $this->analyzeFile($filePath);
            $files[] = $fileData;

            $metadata['file_count']++;
            $metadata['total_lines'] += $fileData['line_count'] ?? 0;
        }

        $bundleData = [
            'task_id' => $taskId,
            'bundle_type' => 'repository_context',
            'files' => $files,
            'metadata' => $metadata,
        ];

        return $this->createBundle($bundleData);
    }

    /**
     * Add files to existing bundle
     */
    public function addFiles(string $bundleId, array $filePaths): ContextBundle
    {
        $bundle = $this->repository->findById($bundleId, false);
        
        if (!$bundle) {
            throw new ContextBundleException("Context bundle not found: {$bundleId}");
        }

        foreach ($filePaths as $filePath) {
            if (!file_exists($filePath)) {
                continue;
            }

            $fileData = $this->analyzeFile($filePath);
            $bundle = $this->repository->addFile($bundleId, $fileData);
        }

        event(new ContextBundleUpdated($bundle));

        return $bundle;
    }

    /**
     * Remove file from bundle
     */
    public function removeFile(string $bundleId, string $filePath): ContextBundle
    {
        $bundle = $this->repository->removeFile($bundleId, $filePath);
        
        event(new ContextBundleUpdated($bundle));

        return $bundle;
    }

    /**
     * Update bundle metadata
     */
    public function updateMetadata(string $bundleId, array $metadata): ContextBundle
    {
        $bundle = $this->repository->updateMetadata($bundleId, $metadata);
        
        event(new ContextBundleUpdated($bundle));

        return $bundle;
    }

    /**
     * Get bundle with enriched context
     */
    public function getBundleWithContext(string $bundleId): array
    {
        $bundle = $this->repository->findWithContext($bundleId);
        
        if (!$bundle) {
            throw new ContextBundleException("Context bundle not found: {$bundleId}");
        }

        return [
            'bundle' => $bundle,
            'statistics' => $this->getBundleStatistics($bundle),
            'analysis' => $this->analyzeBundleContent($bundle),
        ];
    }

    /**
     * Create new version of bundle
     */
    public function createVersion(string $taskId, array $updates): ContextBundle
    {
        $latestBundle = $this->repository->getLatestVersion($taskId);

        if (!$latestBundle) {
            throw new ContextBundleException("No existing bundle found for task: {$taskId}");
        }

        $bundleData = [
            'task_id' => $taskId,
            'bundle_type' => $latestBundle->bundle_type,
            'files' => $updates['files'] ?? $latestBundle->files,
            'metadata' => array_merge(
                $latestBundle->metadata ?? [],
                $updates['metadata'] ?? [],
                ['previous_version' => $latestBundle->version]
            ),
        ];

        return $this->createBundle($bundleData);
    }

    /**
     * Extract context from task
     */
    private function extractTaskContext(Task $task): array
    {
        $files = [];
        $metadata = [];

        // Extract task description as markdown
        if ($task->description) {
            $files[] = [
                'path' => 'task_description.md',
                'type' => 'markdown',
                'content' => $task->description,
                'size' => strlen($task->description),
                'line_count' => substr_count($task->description, "\n") + 1,
            ];
        }

        // Extract acceptance criteria
        if ($task->acceptance_criteria) {
            $files[] = [
                'path' => 'acceptance_criteria.md',
                'type' => 'markdown',
                'content' => json_encode($task->acceptance_criteria, JSON_PRETTY_PRINT),
                'size' => strlen(json_encode($task->acceptance_criteria)),
            ];
        }

        // Add dependency information
        if ($task->dependencies->isNotEmpty()) {
            $metadata['has_dependencies'] = true;
            $metadata['dependency_count'] = $task->dependencies->count();
            $metadata['dependency_titles'] = $task->dependencies->pluck('title')->toArray();
        }

        return [
            'files' => $files,
            'metadata' => $metadata,
        ];
    }

    /**
     * Analyze a single file
     */
    private function analyzeFile(string $filePath): array
    {
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $relativePath = $this->getRelativePath($filePath);

        $fileData = [
            'path' => $relativePath,
            'absolute_path' => $filePath,
            'type' => $this->getFileType($extension),
            'size' => filesize($filePath),
            'modified_at' => date('Y-m-d H:i:s', filemtime($filePath)),
        ];

        // Parse based on file type
        if (in_array($extension, ['md', 'txt'])) {
            $parsed = $this->documentParser->parse($filePath);
            $fileData['content'] = $parsed['content'];
            $fileData['metadata'] = $parsed['metadata'];
            $fileData['line_count'] = $parsed['line_count'];
        } elseif (in_array($extension, ['php', 'ts', 'js', 'py'])) {
            $analyzed = $this->codeAnalysis->analyze($filePath);
            $fileData['analysis'] = $analyzed;
            $fileData['line_count'] = $analyzed['line_count'];
        } else {
            $fileData['content'] = file_get_contents($filePath);
            $fileData['line_count'] = count(file($filePath));
        }

        return $fileData;
    }

    /**
     * Scan repository for files
     */
    private function scanRepository(string $path, array $include, array $exclude): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $filePath = $file->getPathname();
                
                // Check if file matches include patterns and doesn't match exclude
                if ($this->matchesPatterns($filePath, $include) && !$this->matchesPatterns($filePath, $exclude)) {
                    $files[] = $filePath;
                }
            }
        }

        return $files;
    }

    /**
     * Check if path matches glob patterns
     */
    private function matchesPatterns(string $path, array $patterns): bool
    {
        foreach ($patterns as $pattern) {
            if (fnmatch($pattern, $path) || str_contains($path, str_replace('**/', '', $pattern))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get relative path from workspace root
     */
    private function getRelativePath(string $absolutePath): string
    {
        $workspaceRoot = base_path();
        return str_replace($workspaceRoot . DIRECTORY_SEPARATOR, '', $absolutePath);
    }

    /**
     * Determine file type from extension
     */
    private function getFileType(string $extension): string
    {
        return match ($extension) {
            'php' => 'php',
            'ts' => 'typescript',
            'js' => 'javascript',
            'py' => 'python',
            'md' => 'markdown',
            'json' => 'json',
            'yml', 'yaml' => 'yaml',
            'xml' => 'xml',
            'html' => 'html',
            'css' => 'css',
            default => 'text',
        };
    }

    /**
     * Get bundle statistics
     */
    private function getBundleStatistics(ContextBundle $bundle): array
    {
        $files = $bundle->files ?? [];

        return [
            'total_files' => count($files),
            'total_size' => array_sum(array_column($files, 'size')),
            'total_lines' => array_sum(array_column($files, 'line_count')),
            'file_types' => collect($files)->groupBy('type')->map->count()->toArray(),
        ];
    }

    /**
     * Analyze bundle content
     */
    private function analyzeBundleContent(ContextBundle $bundle): array
    {
        $files = $bundle->files ?? [];
        
        return [
            'has_code' => collect($files)->contains('type', 'php') || 
                         collect($files)->contains('type', 'typescript') ||
                         collect($files)->contains('type', 'javascript'),
            'has_documentation' => collect($files)->contains('type', 'markdown'),
            'has_config' => collect($files)->contains('type', 'json') ||
                           collect($files)->contains('type', 'yaml'),
            'complexity_estimate' => $this->estimateComplexity($files),
        ];
    }

    /**
     * Estimate complexity based on file count and size
     */
    private function estimateComplexity(array $files): string
    {
        $totalLines = array_sum(array_column($files, 'line_count'));
        
        return match (true) {
            $totalLines > 5000 => 'very_high',
            $totalLines > 2000 => 'high',
            $totalLines > 500 => 'medium',
            $totalLines > 100 => 'low',
            default => 'very_low',
        };
    }

    /**
     * Validate bundle data
     */
    private function validateBundleData(array $data): void
    {
        if (empty($data['task_id'])) {
            throw new ContextBundleException('Task ID is required');
        }

        if (empty($data['bundle_type'])) {
            throw new ContextBundleException('Bundle type is required');
        }

        $validTypes = ['task_context', 'file_context', 'repository_context', 'custom'];
        if (!in_array($data['bundle_type'], $validTypes)) {
            throw new ContextBundleException("Invalid bundle type. Must be one of: " . implode(', ', $validTypes));
        }
    }
}

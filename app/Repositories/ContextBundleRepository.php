<?php

namespace App\Repositories;

use App\Models\ContextBundle;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ContextBundleRepository
{
    private const CACHE_TTL = 900; // 15 minutes
    private const VERSION_CACHE_TTL = 3600; // 1 hour
    private const STATS_CACHE_TTL = 600; // 10 minutes

    /**
     * Find context bundle by ID
     */
    public function findById(string $id, bool $useCache = true): ?ContextBundle
    {
        if (!$useCache) {
            return ContextBundle::find($id);
        }

        return Cache::tags(['context_bundles', "bundle:{$id}"])
            ->remember(
                "bundle:{$id}",
                self::CACHE_TTL,
                fn() => ContextBundle::find($id)
            );
    }

    /**
     * Find context bundle with full context (files, metadata, versions)
     */
    public function findWithContext(string $id): ?ContextBundle
    {
        return Cache::tags(['context_bundles', "bundle:{$id}"])
            ->remember(
                "bundle:{$id}:full",
                self::CACHE_TTL,
                fn() => ContextBundle::with([
                    'task',
                    'task.dependencies',
                    'task.assignedAgent'
                ])->find($id)
            );
    }

    /**
     * Get all context bundles for a task
     */
    public function getByTaskId(string $taskId): Collection
    {
        return Cache::tags(['context_bundles', "task:{$taskId}"])
            ->remember(
                "bundles:task:{$taskId}",
                self::CACHE_TTL,
                fn() => ContextBundle::where('task_id', $taskId)
                    ->orderBy('version', 'desc')
                    ->get()
            );
    }

    /**
     * Get latest version of a context bundle for a task
     */
    public function getLatestVersion(string $taskId): ?ContextBundle
    {
        return Cache::tags(['context_bundles', "task:{$taskId}"])
            ->remember(
                "bundle:latest:{$taskId}",
                self::CACHE_TTL,
                fn() => ContextBundle::where('task_id', $taskId)
                    ->orderBy('version', 'desc')
                    ->first()
            );
    }

    /**
     * Get bundles by type
     */
    public function getByType(string $type): Collection
    {
        return Cache::tags(['context_bundles', "type:{$type}"])
            ->remember(
                "bundles:type:{$type}",
                self::CACHE_TTL,
                fn() => ContextBundle::where('bundle_type', $type)
                    ->orderBy('created_at', 'desc')
                    ->get()
            );
    }

    /**
     * Search bundles by content
     */
    public function searchByContent(string $query, ?string $bundleType = null): Collection
    {
        $queryBuilder = ContextBundle::query();

        // JSON search in files array
        $queryBuilder->where(function ($q) use ($query) {
            $q->whereRaw("JSON_SEARCH(files, 'one', ?) IS NOT NULL", ["%{$query}%"])
              ->orWhereRaw("JSON_SEARCH(metadata, 'one', ?) IS NOT NULL", ["%{$query}%"]);
        });

        if ($bundleType) {
            $queryBuilder->where('bundle_type', $bundleType);
        }

        return $queryBuilder->orderBy('created_at', 'desc')->get();
    }

    /**
     * Create a new context bundle
     */
    public function create(array $data): ContextBundle
    {
        DB::beginTransaction();
        try {
            // Get next version number for the task
            $version = $this->getNextVersion($data['task_id']);
            $data['version'] = $version;

            $bundle = ContextBundle::create($data);

            $this->invalidateCache($bundle->task_id, $bundle->id);
            
            DB::commit();
            return $bundle;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update context bundle
     */
    public function update(string $id, array $data): ContextBundle
    {
        DB::beginTransaction();
        try {
            $bundle = ContextBundle::findOrFail($id);
            $bundle->update($data);

            $this->invalidateCache($bundle->task_id, $id);
            
            DB::commit();
            return $bundle->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Add file to context bundle
     */
    public function addFile(string $id, array $fileData): ContextBundle
    {
        DB::beginTransaction();
        try {
            $bundle = ContextBundle::findOrFail($id);
            
            $files = $bundle->files ?? [];
            $files[] = $fileData;
            
            $bundle->files = $files;
            $bundle->save();

            $this->invalidateCache($bundle->task_id, $id);
            
            DB::commit();
            return $bundle->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Remove file from context bundle
     */
    public function removeFile(string $id, string $filePath): ContextBundle
    {
        DB::beginTransaction();
        try {
            $bundle = ContextBundle::findOrFail($id);
            
            $files = collect($bundle->files ?? [])
                ->filter(fn($file) => $file['path'] !== $filePath)
                ->values()
                ->toArray();
            
            $bundle->files = $files;
            $bundle->save();

            $this->invalidateCache($bundle->task_id, $id);
            
            DB::commit();
            return $bundle->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update metadata
     */
    public function updateMetadata(string $id, array $metadata): ContextBundle
    {
        DB::beginTransaction();
        try {
            $bundle = ContextBundle::findOrFail($id);
            
            $currentMetadata = $bundle->metadata ?? [];
            $bundle->metadata = array_merge($currentMetadata, $metadata);
            $bundle->save();

            $this->invalidateCache($bundle->task_id, $id);
            
            DB::commit();
            return $bundle->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get bundle statistics
     */
    public function getStatistics(string $taskId): array
    {
        return Cache::tags(['context_bundles', "task:{$taskId}"])
            ->remember(
                "bundle:stats:{$taskId}",
                self::STATS_CACHE_TTL,
                function () use ($taskId) {
                    $bundles = ContextBundle::where('task_id', $taskId)->get();

                    return [
                        'total_bundles' => $bundles->count(),
                        'total_versions' => $bundles->max('version') ?? 0,
                        'total_files' => $bundles->sum(fn($b) => count($b->files ?? [])),
                        'bundle_types' => $bundles->groupBy('bundle_type')->map->count()->toArray(),
                        'latest_version' => $bundles->max('version'),
                        'created_at' => $bundles->min('created_at'),
                        'updated_at' => $bundles->max('updated_at'),
                    ];
                }
            );
    }

    /**
     * Get all versions of a bundle for a task
     */
    public function getVersionHistory(string $taskId): Collection
    {
        return Cache::tags(['context_bundles', "task:{$taskId}"])
            ->remember(
                "bundle:history:{$taskId}",
                self::VERSION_CACHE_TTL,
                fn() => ContextBundle::where('task_id', $taskId)
                    ->orderBy('version', 'desc')
                    ->get()
            );
    }

    /**
     * Get specific version
     */
    public function getVersion(string $taskId, int $version): ?ContextBundle
    {
        return Cache::tags(['context_bundles', "task:{$taskId}"])
            ->remember(
                "bundle:{$taskId}:v{$version}",
                self::VERSION_CACHE_TTL,
                fn() => ContextBundle::where('task_id', $taskId)
                    ->where('version', $version)
                    ->first()
            );
    }

    /**
     * Delete context bundle
     */
    public function delete(string $id): bool
    {
        DB::beginTransaction();
        try {
            $bundle = ContextBundle::findOrFail($id);
            $taskId = $bundle->task_id;
            
            $bundle->delete();

            $this->invalidateCache($taskId, $id);
            
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get next version number for a task
     */
    private function getNextVersion(string $taskId): int
    {
        $latestVersion = ContextBundle::where('task_id', $taskId)
            ->max('version');

        return ($latestVersion ?? 0) + 1;
    }

    /**
     * Invalidate cache for bundle and related entities
     */
    private function invalidateCache(string $taskId, string $bundleId): void
    {
        Cache::tags(["bundle:{$bundleId}"])->flush();
        Cache::tags(["task:{$taskId}"])->flush();
        Cache::tags(['context_bundles'])->flush();
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Services\ContextBundleService;
use App\Repositories\ContextBundleRepository;
use App\Exceptions\ContextBundleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ContextBundleController
{
    public function __construct(
        private ContextBundleService $service,
        private ContextBundleRepository $repository
    ) {}

    /**
     * Get all context bundles for a task
     * 
     * GET /tasks/{taskId}/context-bundles
     */
    public function index(string $taskId, Request $request): JsonResponse
    {
        try {
            $bundles = $this->repository->getByTaskId($taskId);

            return response()->json([
                'success' => true,
                'data' => $bundles,
                'count' => $bundles->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve context bundles',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific context bundle
     * 
     * GET /context-bundles/{id}
     */
    public function show(string $id, Request $request): JsonResponse
    {
        try {
            $includeContext = $request->boolean('include_context', false);

            if ($includeContext) {
                $data = $this->service->getBundleWithContext($id);
            } else {
                $bundle = $this->repository->findWithContext($id);
                
                if (!$bundle) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Context bundle not found',
                    ], 404);
                }

                $data = ['bundle' => $bundle];
            }

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (ContextBundleException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve context bundle',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new context bundle
     * 
     * POST /context-bundles
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'task_id' => 'required|uuid|exists:tasks,id',
            'bundle_type' => ['required', Rule::in(['task_context', 'file_context', 'repository_context', 'custom'])],
            'files' => 'array',
            'files.*.path' => 'required|string',
            'files.*.type' => 'required|string',
            'files.*.content' => 'string',
            'metadata' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $bundle = $this->service->createBundle($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Context bundle created successfully',
                'data' => $bundle,
            ], 201);
        } catch (ContextBundleException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create context bundle',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create context bundle from task
     * 
     * POST /tasks/{taskId}/context-bundles/from-task
     */
    public function createFromTask(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'bundle_type' => ['string', Rule::in(['task_context', 'file_context', 'repository_context', 'custom'])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $task = \App\Models\Task::findOrFail($taskId);
            $bundleType = $request->input('bundle_type', 'task_context');
            
            $bundle = $this->service->createFromTask($task, $bundleType);

            return response()->json([
                'success' => true,
                'message' => 'Context bundle created from task',
                'data' => $bundle,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create context bundle from task',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create context bundle from files
     * 
     * POST /tasks/{taskId}/context-bundles/from-files
     */
    public function createFromFiles(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_paths' => 'required|array|min:1',
            'file_paths.*' => 'required|string',
            'bundle_type' => ['string', Rule::in(['file_context', 'repository_context', 'custom'])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filePaths = $request->input('file_paths');
            $bundleType = $request->input('bundle_type', 'file_context');
            
            $bundle = $this->service->createFromFiles($taskId, $filePaths, $bundleType);

            return response()->json([
                'success' => true,
                'message' => 'Context bundle created from files',
                'data' => $bundle,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create context bundle from files',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create context bundle from repository
     * 
     * POST /tasks/{taskId}/context-bundles/from-repository
     */
    public function createFromRepository(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'repository_path' => 'required|string',
            'include' => 'array',
            'include.*' => 'string',
            'exclude' => 'array',
            'exclude.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $repositoryPath = $request->input('repository_path');
            $options = [
                'include' => $request->input('include', ['**/*.php', '**/*.ts', '**/*.js']),
                'exclude' => $request->input('exclude', ['vendor/**', 'node_modules/**', 'storage/**']),
            ];
            
            $bundle = $this->service->createFromRepository($taskId, $repositoryPath, $options);

            return response()->json([
                'success' => true,
                'message' => 'Context bundle created from repository',
                'data' => $bundle,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create context bundle from repository',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add files to context bundle
     * 
     * POST /context-bundles/{id}/files
     */
    public function addFiles(string $id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_paths' => 'required|array|min:1',
            'file_paths.*' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filePaths = $request->input('file_paths');
            $bundle = $this->service->addFiles($id, $filePaths);

            return response()->json([
                'success' => true,
                'message' => 'Files added to context bundle',
                'data' => $bundle,
            ]);
        } catch (ContextBundleException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add files to context bundle',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove file from context bundle
     * 
     * DELETE /context-bundles/{id}/files
     */
    public function removeFile(string $id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filePath = $request->input('file_path');
            $bundle = $this->service->removeFile($id, $filePath);

            return response()->json([
                'success' => true,
                'message' => 'File removed from context bundle',
                'data' => $bundle,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove file from context bundle',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update context bundle metadata
     * 
     * PATCH /context-bundles/{id}/metadata
     */
    public function updateMetadata(string $id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'metadata' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $metadata = $request->input('metadata');
            $bundle = $this->service->updateMetadata($id, $metadata);

            return response()->json([
                'success' => true,
                'message' => 'Metadata updated successfully',
                'data' => $bundle,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update metadata',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get context bundle statistics
     * 
     * GET /tasks/{taskId}/context-bundles/statistics
     */
    public function statistics(string $taskId): JsonResponse
    {
        try {
            $statistics = $this->repository->getStatistics($taskId);

            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get version history
     * 
     * GET /tasks/{taskId}/context-bundles/history
     */
    public function history(string $taskId): JsonResponse
    {
        try {
            $history = $this->repository->getVersionHistory($taskId);

            return response()->json([
                'success' => true,
                'data' => $history,
                'count' => $history->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve version history',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get specific version
     * 
     * GET /tasks/{taskId}/context-bundles/version/{version}
     */
    public function version(string $taskId, int $version): JsonResponse
    {
        try {
            $bundle = $this->repository->getVersion($taskId, $version);

            if (!$bundle) {
                return response()->json([
                    'success' => false,
                    'message' => 'Version not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $bundle,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve version',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new version
     * 
     * POST /tasks/{taskId}/context-bundles/version
     */
    public function createVersion(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'files' => 'array',
            'metadata' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updates = [
                'files' => $request->input('files'),
                'metadata' => $request->input('metadata'),
            ];

            $bundle = $this->service->createVersion($taskId, $updates);

            return response()->json([
                'success' => true,
                'message' => 'New version created successfully',
                'data' => $bundle,
            ], 201);
        } catch (ContextBundleException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create new version',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Search bundles by content
     * 
     * GET /context-bundles/search
     */
    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:3',
            'bundle_type' => ['nullable', Rule::in(['task_context', 'file_context', 'repository_context', 'custom'])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $query = $request->input('query');
            $bundleType = $request->input('bundle_type');
            
            $results = $this->repository->searchByContent($query, $bundleType);

            return response()->json([
                'success' => true,
                'data' => $results,
                'count' => $results->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Search failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete context bundle
     * 
     * DELETE /context-bundles/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $this->repository->delete($id);

            return response()->json([
                'success' => true,
                'message' => 'Context bundle deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete context bundle',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

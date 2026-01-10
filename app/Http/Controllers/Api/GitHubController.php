<?php

namespace App\Http\Controllers\Api;

use App\Services\GitHubSyncService;
use App\Services\GitHubWebhookService;
use App\Services\GitHubApiClient;
use App\Models\Task;
use App\Exceptions\GitHubSyncException;
use App\Exceptions\GitHubWebhookException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GitHubController
{
    public function __construct(
        private GitHubSyncService $syncService,
        private GitHubWebhookService $webhookService,
        private GitHubApiClient $apiClient
    ) {}

    /**
     * Sync a GitHub issue to task
     * 
     * POST /github/sync/issue
     */
    public function syncIssue(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'owner' => 'required|string',
            'repo' => 'required|string',
            'issue_number' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $task = $this->syncService->syncIssueToTask(
                $request->input('owner'),
                $request->input('repo'),
                $request->input('issue_number')
            );

            return response()->json([
                'success' => true,
                'message' => 'Issue synced successfully',
                'data' => $task,
            ]);
        } catch (GitHubSyncException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync issue',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync task to GitHub issue
     * 
     * POST /tasks/{taskId}/sync-to-github
     */
    public function syncTaskToGitHub(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'owner' => 'required|string',
            'repo' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $task = Task::findOrFail($taskId);

            $issueData = $this->syncService->syncTaskToIssue(
                $task,
                $request->input('owner'),
                $request->input('repo')
            );

            return response()->json([
                'success' => true,
                'message' => 'Task synced to GitHub successfully',
                'data' => [
                    'task' => $task,
                    'github_issue' => $issueData,
                ],
            ]);
        } catch (GitHubSyncException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync task to GitHub',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync entire repository
     * 
     * POST /github/sync/repository
     */
    public function syncRepository(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'owner' => 'required|string',
            'repo' => 'required|string',
            'project_id' => 'nullable|uuid',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $tasks = $this->syncService->syncRepository(
                $request->input('owner'),
                $request->input('repo'),
                $request->input('project_id')
            );

            return response()->json([
                'success' => true,
                'message' => 'Repository synced successfully',
                'data' => [
                    'tasks' => $tasks,
                    'count' => count($tasks),
                ],
            ]);
        } catch (GitHubSyncException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync repository',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle GitHub webhook
     * 
     * POST /github/webhook
     */
    public function webhook(Request $request): JsonResponse
    {
        $event = $request->header('X-GitHub-Event');
        $signature = $request->header('X-Hub-Signature-256');
        $payload = $request->all();

        try {
            $result = $this->webhookService->handleWebhook($event, $payload, $signature);

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (GitHubWebhookException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Webhook processing failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get GitHub issue details
     * 
     * GET /github/issues/{owner}/{repo}/{number}
     */
    public function getIssue(string $owner, string $repo, int $number): JsonResponse
    {
        try {
            $issue = $this->apiClient->getIssue($owner, $repo, $number);

            return response()->json([
                'success' => true,
                'data' => $issue,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch issue',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * List GitHub issues
     * 
     * GET /github/issues/{owner}/{repo}
     */
    public function listIssues(string $owner, string $repo, Request $request): JsonResponse
    {
        try {
            $params = [
                'state' => $request->input('state', 'open'),
                'per_page' => $request->input('per_page', 100),
                'page' => $request->input('page', 1),
            ];

            $issues = $this->apiClient->listIssues($owner, $repo, $params);

            return response()->json([
                'success' => true,
                'data' => $issues,
                'count' => count($issues),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to list issues',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create GitHub issue from task
     * 
     * POST /tasks/{taskId}/create-github-issue
     */
    public function createIssueFromTask(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'owner' => 'required|string',
            'repo' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $task = Task::findOrFail($taskId);

            $issueData = $this->syncService->syncTaskToIssue(
                $task,
                $request->input('owner'),
                $request->input('repo')
            );

            return response()->json([
                'success' => true,
                'message' => 'GitHub issue created successfully',
                'data' => $issueData,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create GitHub issue',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync comments for a task
     * 
     * POST /tasks/{taskId}/sync-comments
     */
    public function syncComments(string $taskId): JsonResponse
    {
        try {
            $task = Task::with('githubIssue')->findOrFail($taskId);

            if (!$task->githubIssue) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task is not linked to a GitHub issue',
                ], 404);
            }

            $comments = $this->syncService->syncComments(
                $task,
                $task->githubIssue->repository_owner,
                $task->githubIssue->repository_name,
                $task->githubIssue->github_issue_id
            );

            return response()->json([
                'success' => true,
                'message' => 'Comments synced successfully',
                'data' => [
                    'comments' => $comments,
                    'count' => count($comments),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync comments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Post task update to GitHub
     * 
     * POST /tasks/{taskId}/post-update
     */
    public function postUpdate(string $taskId, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'update' => 'required|string|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $task = Task::with('githubIssue')->findOrFail($taskId);

            if (!$task->githubIssue) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task is not linked to a GitHub issue',
                ], 404);
            }

            $comment = $this->syncService->postTaskUpdate($task, $request->input('update'));

            return response()->json([
                'success' => true,
                'message' => 'Update posted to GitHub',
                'data' => $comment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to post update',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check sync status
     * 
     * GET /tasks/{taskId}/github-sync-status
     */
    public function syncStatus(string $taskId): JsonResponse
    {
        try {
            $task = Task::with('githubIssue')->findOrFail($taskId);

            if (!$task->githubIssue) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'linked' => false,
                        'needs_sync' => false,
                    ],
                ]);
            }

            $needsSync = $this->syncService->needsSync($task);

            return response()->json([
                'success' => true,
                'data' => [
                    'linked' => true,
                    'github_issue_id' => $task->githubIssue->github_issue_id,
                    'issue_url' => $task->githubIssue->issue_url,
                    'last_synced_at' => $task->githubIssue->last_synced_at,
                    'needs_sync' => $needsSync,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check sync status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Parse repository URL
     * 
     * POST /github/parse-repo-url
     */
    public function parseRepoUrl(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'url' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $parsed = GitHubApiClient::parseRepositoryUrl($request->input('url'));

            return response()->json([
                'success' => true,
                'data' => $parsed,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}

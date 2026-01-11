<?php

namespace App\Services;

use App\Models\Task;
use App\Exceptions\GitHubSyncException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class GitHubZenTasksSyncService
{
    // Status mapping: Zen Task -> GitHub Issue State
    private const STATUS_TO_GITHUB = [
        'pending' => 'open',
        'approved' => 'open',
        'in-progress' => 'open',
        'in_progress' => 'open',
        'testing' => 'open',
        'review' => 'open',
        'completed' => 'closed',
        'done' => 'closed',
        'failed' => 'open',
        'blocked' => 'open',
        'cancelled' => 'closed',
    ];

    // Task type to GitHub label mapping
    private const TYPE_TO_LABEL = [
        'feature' => 'enhancement',
        'bug' => 'bug',
        'refactor' => 'refactor',
        'maintenance' => 'maintenance',
        'architecture' => 'architecture',
        'testing' => 'testing',
        'documentation' => 'documentation',
    ];

    public function __construct(
        private GitHubApiClient $githubClient,
        private ZenTasksFileService $fileService
    ) {}

    /**
     * Sync all tasks from tasks.json to GitHub issues
     */
    public function syncTasksToGitHub(string $owner, string $repo): array
    {
        Log::info('Starting sync: Tasks -> GitHub Issues');

        $tasks = $this->fileService->loadTasksFromFile();
        $metadata = $this->fileService->loadSyncMetadata();
        
        $synced = 0;
        $errors = 0;
        $results = [];

        foreach ($tasks as $task) {
            try {
                $issueNumber = $metadata['task_to_issue'][$task['id']] ?? null;
                
                $issueData = $this->prepareIssueDataFromTask($task);
                $state = self::STATUS_TO_GITHUB[$task['status'] ?? 'pending'] ?? 'open';
                
                if ($issueNumber) {
                    // Update existing issue
                    Log::info("Updating issue #{$issueNumber} for task {$task['id']}");
                    $issue = $this->githubClient->updateIssue(
                        $owner,
                        $repo,
                        $issueNumber,
                        array_merge($issueData, ['state' => $state])
                    );
                } else {
                    // Create new issue
                    Log::info("Creating new issue for task {$task['id']}");
                    $issue = $this->githubClient->createIssue($owner, $repo, $issueData);
                    $issueNumber = $issue['number'];
                    
                    // Store mapping
                    $metadata['task_to_issue'][$task['id']] = $issueNumber;
                    $metadata['issue_to_task'][(string)$issueNumber] = $task['id'];
                }
                
                $synced++;
                $results[] = [
                    'task_id' => $task['id'],
                    'issue_number' => $issueNumber,
                    'action' => $issueNumber ? 'updated' : 'created',
                ];
                
            } catch (\Exception $e) {
                Log::error("Failed to sync task {$task['id']}: " . $e->getMessage());
                $errors++;
                $results[] = [
                    'task_id' => $task['id'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        $this->fileService->saveSyncMetadata($metadata);

        Log::info("Synced {$synced} tasks to GitHub, {$errors} errors");

        return [
            'synced' => $synced,
            'errors' => $errors,
            'results' => $results,
        ];
    }

    /**
     * Sync all GitHub issues to tasks
     */
    public function syncIssuesToTasks(string $owner, string $repo): array
    {
        Log::info('Starting sync: GitHub Issues -> Tasks');

        $issues = $this->githubClient->listIssues($owner, $repo, ['state' => 'all']);
        $metadata = $this->fileService->loadSyncMetadata();
        $tasks = $this->fileService->loadTasksFromFile();
        
        $synced = 0;
        $errors = 0;
        $results = [];

        foreach ($issues as $issue) {
            try {
                // Skip pull requests
                if (isset($issue['pull_request'])) {
                    continue;
                }

                $taskId = $this->extractTaskIdFromIssue($issue) 
                    ?? $metadata['issue_to_task'][(string)$issue['number']] ?? null;

                $taskData = $this->prepareTaskDataFromIssue($issue);

                $existingTaskIndex = null;
                if ($taskId) {
                    foreach ($tasks as $index => $task) {
                        if ($task['id'] === $taskId) {
                            $existingTaskIndex = $index;
                            break;
                        }
                    }
                }

                if ($existingTaskIndex !== null) {
                    // Update existing task
                    Log::info("Updating task {$taskId} from issue #{$issue['number']}");
                    $tasks[$existingTaskIndex] = array_merge($tasks[$existingTaskIndex], $taskData);
                    $tasks[$existingTaskIndex]['updatedAt'] = now()->toIso8601String();
                } else {
                    // Create new task
                    Log::info("Creating new task from issue #{$issue['number']}");
                    $taskId = $this->fileService->generateTaskId();
                    $taskData['id'] = $taskId;
                    $taskData['createdAt'] = now()->toIso8601String();
                    $taskData['updatedAt'] = $taskData['createdAt'];
                    $taskData['dependencies'] = [];
                    $tasks[] = $taskData;

                    // Create markdown file
                    $mdContent = $this->fileService->createTaskMarkdownFromIssue($taskId, $issue, $taskData);
                    $this->fileService->saveTaskMarkdown($taskId, $mdContent);

                    // Store mapping
                    $metadata['issue_to_task'][(string)$issue['number']] = $taskId;
                    $metadata['task_to_issue'][$taskId] = $issue['number'];
                }

                $synced++;
                $results[] = [
                    'issue_number' => $issue['number'],
                    'task_id' => $taskId,
                    'action' => $existingTaskIndex !== null ? 'updated' : 'created',
                ];

            } catch (\Exception $e) {
                Log::error("Failed to sync issue #{$issue['number']}: " . $e->getMessage());
                $errors++;
                $results[] = [
                    'issue_number' => $issue['number'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        $this->fileService->saveTasksToFile($tasks);
        $this->fileService->saveSyncMetadata($metadata);

        Log::info("Synced {$synced} issues to tasks, {$errors} errors");

        return [
            'synced' => $synced,
            'errors' => $errors,
            'results' => $results,
        ];
    }

    /**
     * Two-way sync
     */
    public function syncBothWays(string $owner, string $repo): array
    {
        Log::info('Starting two-way sync');

        // First sync issues to tasks (import new issues)
        $issuesResult = $this->syncIssuesToTasks($owner, $repo);

        // Then sync tasks to GitHub (export task updates)
        $tasksResult = $this->syncTasksToGitHub($owner, $repo);

        return [
            'issues_to_tasks' => $issuesResult,
            'tasks_to_issues' => $tasksResult,
        ];
    }

    /**
     * Prepare issue data from task
     */
    private function prepareIssueDataFromTask(array $task): array
    {
        $labels = $this->getTaskLabels($task);

        return [
            'title' => $task['title'],
            'body' => $this->fileService->formatTaskAsIssueBody($task),
            'labels' => $labels,
        ];
    }

    /**
     * Get GitHub labels for a task
     */
    private function getTaskLabels(array $task): array
    {
        $labels = [];

        // Add type label
        $taskType = $task['type'] ?? 'feature';
        if (isset(self::TYPE_TO_LABEL[$taskType])) {
            $labels[] = self::TYPE_TO_LABEL[$taskType];
        }

        // Add priority label
        $priority = $task['priority'] ?? 'medium';
        $labels[] = "priority:{$priority}";

        // Add status label if blocked
        if (($task['status'] ?? '') === 'blocked') {
            $labels[] = 'blocked';
        }

        return $labels;
    }

    /**
     * Prepare task data from issue
     */
    private function prepareTaskDataFromIssue(array $issue): array
    {
        return [
            'title' => $issue['title'],
            'description' => $issue['body'] ?? '',
            'status' => $this->mapGitHubStateToStatus($issue),
            'priority' => $this->extractPriorityFromLabels($issue['labels'] ?? []),
            'type' => $this->extractTypeFromLabels($issue['labels'] ?? []),
        ];
    }

    /**
     * Map GitHub state to task status
     */
    private function mapGitHubStateToStatus(array $issue): string
    {
        if ($issue['state'] === 'closed') {
            return 'completed';
        }

        // Check if assigned (indicates in progress)
        if (!empty($issue['assignee']) || !empty($issue['assignees'])) {
            return 'in_progress';
        }

        return 'pending';
    }

    /**
     * Extract priority from labels
     */
    private function extractPriorityFromLabels(array $labels): string
    {
        foreach ($labels as $label) {
            $name = is_array($label) ? ($label['name'] ?? '') : $label;
            if (str_starts_with($name, 'priority:')) {
                $priority = substr($name, 9);
                if (in_array($priority, ['critical', 'high', 'medium', 'low'])) {
                    return $priority;
                }
            }
        }

        return 'medium';
    }

    /**
     * Extract type from labels
     */
    private function extractTypeFromLabels(array $labels): string
    {
        $labelToType = array_flip(self::TYPE_TO_LABEL);

        foreach ($labels as $label) {
            $name = is_array($label) ? ($label['name'] ?? '') : $label;
            if (isset($labelToType[$name])) {
                return $labelToType[$name];
            }
        }

        return 'feature';
    }

    /**
     * Extract task ID from issue body
     */
    private function extractTaskIdFromIssue(array $issue): ?string
    {
        $body = $issue['body'] ?? '';
        
        // Look for task ID in metadata section
        if (preg_match('/Task ID.*?`(TASK-[^`]+)`/', $body, $matches)) {
            return $matches[1];
        }

        return null;
    }
}

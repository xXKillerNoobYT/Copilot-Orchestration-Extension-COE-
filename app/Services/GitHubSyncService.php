<?php

namespace App\Services;

use App\Models\Task;
use App\Models\Project;
use App\Models\GithubIssue;
use App\Repositories\TaskRepository;
use App\Events\TaskSyncedFromGitHub;
use App\Events\TaskSyncedToGitHub;
use App\Exceptions\GitHubSyncException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class GitHubSyncService
{
    public function __construct(
        private GitHubApiClient $githubClient,
        private TaskRepository $taskRepository,
        private TaskOrchestrationService $taskService
    ) {}

    /**
     * Sync a GitHub issue to a task
     */
    public function syncIssueToTask(string $owner, string $repo, int $issueNumber): Task
    {
        DB::beginTransaction();
        try {
            // Fetch issue from GitHub
            $issueData = $this->githubClient->getIssue($owner, $repo, $issueNumber);

            // Check if task already exists for this issue
            $githubIssue = GithubIssue::where('github_issue_id', $issueNumber)
                ->where('repository_owner', $owner)
                ->where('repository_name', $repo)
                ->first();

            if ($githubIssue && $githubIssue->task) {
                // Update existing task
                $task = $this->updateTaskFromIssue($githubIssue->task, $issueData);
            } else {
                // Create new task
                $task = $this->createTaskFromIssue($owner, $repo, $issueData);
            }

            // Update or create GitHub issue record
            $this->upsertGithubIssue($task, $owner, $repo, $issueData);

            event(new TaskSyncedFromGitHub($task, $issueData));

            DB::commit();
            return $task;
        } catch (\Exception $e) {
            DB::rollBack();
            throw new GitHubSyncException("Failed to sync issue to task: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Sync a task to GitHub issue
     */
    public function syncTaskToIssue(Task $task, string $owner, string $repo): array
    {
        try {
            $githubIssue = $task->githubIssue;

            $issueData = $this->prepareIssueData($task);

            if ($githubIssue && $githubIssue->github_issue_id) {
                // Update existing issue
                $result = $this->githubClient->updateIssue(
                    $owner,
                    $repo,
                    $githubIssue->github_issue_id,
                    $issueData
                );
            } else {
                // Create new issue
                $result = $this->githubClient->createIssue($owner, $repo, $issueData);
                
                // Store GitHub issue reference
                $this->upsertGithubIssue($task, $owner, $repo, $result);
            }

            event(new TaskSyncedToGitHub($task, $result));

            return $result;
        } catch (\Exception $e) {
            throw new GitHubSyncException("Failed to sync task to issue: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Sync all issues from a repository
     */
    public function syncRepository(string $owner, string $repo, ?string $projectId = null): array
    {
        try {
            $issues = $this->githubClient->listIssues($owner, $repo, [
                'state' => 'all',
                'per_page' => 100,
            ]);

            $syncedTasks = [];

            foreach ($issues as $issueData) {
                // Skip pull requests (they appear in issues API)
                if (isset($issueData['pull_request'])) {
                    continue;
                }

                try {
                    $task = $this->syncIssueToTask($owner, $repo, $issueData['number']);
                    
                    // Associate with project if specified
                    if ($projectId && !$task->project_id) {
                        $task->update(['project_id' => $projectId]);
                    }

                    $syncedTasks[] = $task;
                } catch (\Exception $e) {
                    \Log::error("Failed to sync issue #{$issueData['number']}: " . $e->getMessage());
                }
            }

            return $syncedTasks;
        } catch (\Exception $e) {
            throw new GitHubSyncException("Failed to sync repository: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Create a task from GitHub issue data
     */
    private function createTaskFromIssue(string $owner, string $repo, array $issueData): Task
    {
        $taskData = [
            'id' => Str::uuid()->toString(),
            'project_id' => $this->findOrCreateProject($owner, $repo)->id,
            'title' => $issueData['title'],
            'description' => $issueData['body'] ?? '',
            'type' => $this->mapIssueType($issueData),
            'priority' => $this->mapIssuePriority($issueData),
            'status' => $this->mapIssueStatus($issueData),
            'labels' => $this->extractLabels($issueData),
        ];

        return $this->taskService->createTask($taskData);
    }

    /**
     * Update a task from GitHub issue data
     */
    private function updateTaskFromIssue(Task $task, array $issueData): Task
    {
        $updates = [
            'title' => $issueData['title'],
            'description' => $issueData['body'] ?? '',
            'status' => $this->mapIssueStatus($issueData),
            'labels' => $this->extractLabels($issueData),
        ];

        $task->update($updates);

        return $task->fresh();
    }

    /**
     * Prepare issue data from task
     */
    private function prepareIssueData(Task $task): array
    {
        $data = [
            'title' => $task->title,
            'body' => $this->formatTaskDescription($task),
        ];

        // Map task status to GitHub state
        $data['state'] = in_array($task->status, ['completed', 'cancelled']) ? 'closed' : 'open';

        // Add labels
        if (!empty($task->labels)) {
            $data['labels'] = array_merge(
                $task->labels,
                [$task->type, "priority:{$task->priority}"]
            );
        }

        return $data;
    }

    /**
     * Format task description for GitHub
     */
    private function formatTaskDescription(Task $task): string
    {
        $description = $task->description . "\n\n";

        $description .= "---\n\n";
        $description .= "**Task Details**\n\n";
        $description .= "- **Type**: {$task->type}\n";
        $description .= "- **Priority**: {$task->priority}\n";
        $description .= "- **Status**: {$task->status}\n";

        if ($task->assigned_agent) {
            $description .= "- **Assigned Agent**: {$task->assigned_agent}\n";
        }

        if ($task->estimate) {
            $description .= "- **Estimate**: {$task->estimate}\n";
        }

        if (!empty($task->acceptance_criteria)) {
            $description .= "\n**Acceptance Criteria**\n\n";
            foreach ($task->acceptance_criteria as $criterion) {
                $description .= "- [ ] {$criterion}\n";
            }
        }

        $description .= "\n*Synced from Copilot Orchestration Extension*";

        return $description;
    }

    /**
     * Map GitHub issue type to task type
     */
    private function mapIssueType(array $issueData): string
    {
        $labels = array_column($issueData['labels'] ?? [], 'name');

        // Check for explicit type labels
        $typeMapping = [
            'bug' => 'bug',
            'feature' => 'feature',
            'enhancement' => 'feature',
            'documentation' => 'documentation',
            'refactor' => 'refactor',
            'test' => 'testing',
        ];

        foreach ($labels as $label) {
            $labelLower = strtolower($label);
            if (isset($typeMapping[$labelLower])) {
                return $typeMapping[$labelLower];
            }
        }

        // Default based on issue content
        return str_contains(strtolower($issueData['title']), 'bug') ? 'bug' : 'feature';
    }

    /**
     * Map GitHub issue priority to task priority
     */
    private function mapIssuePriority(array $issueData): string
    {
        $labels = array_column($issueData['labels'] ?? [], 'name');

        foreach ($labels as $label) {
            if (preg_match('/priority[:\s]*(\w+)/i', $label, $matches)) {
                $priority = strtolower($matches[1]);
                if (in_array($priority, ['critical', 'high', 'medium', 'low'])) {
                    return $priority;
                }
            }
        }

        // Default priority
        return 'medium';
    }

    /**
     * Map GitHub issue status to task status
     */
    private function mapIssueStatus(array $issueData): string
    {
        $state = $issueData['state'];

        if ($state === 'closed') {
            return 'completed';
        }

        // Check if assigned
        if (!empty($issueData['assignee'])) {
            return 'in_progress';
        }

        return 'pending';
    }

    /**
     * Extract labels from GitHub issue
     */
    private function extractLabels(array $issueData): array
    {
        return array_map(
            fn($label) => $label['name'],
            $issueData['labels'] ?? []
        );
    }

    /**
     * Find or create project for repository
     */
    private function findOrCreateProject(string $owner, string $repo): Project
    {
        $projectName = "{$owner}/{$repo}";

        return Project::firstOrCreate(
            ['repository_url' => "https://github.com/{$owner}/{$repo}"],
            [
                'id' => Str::uuid()->toString(),
                'name' => $projectName,
                'description' => "GitHub repository: {$projectName}",
                'owner_id' => 1, // Default user - should be configurable
            ]
        );
    }

    /**
     * Upsert GitHub issue record
     */
    private function upsertGithubIssue(Task $task, string $owner, string $repo, array $issueData): void
    {
        GithubIssue::updateOrCreate(
            [
                'task_id' => $task->id,
            ],
            [
                'id' => Str::uuid()->toString(),
                'github_issue_id' => $issueData['number'],
                'repository_owner' => $owner,
                'repository_name' => $repo,
                'issue_url' => $issueData['html_url'],
                'last_synced_at' => now(),
                'sync_metadata' => [
                    'github_id' => $issueData['id'],
                    'github_created_at' => $issueData['created_at'],
                    'github_updated_at' => $issueData['updated_at'],
                    'assignees' => $issueData['assignees'] ?? [],
                ],
            ]
        );
    }

    /**
     * Sync issue comments to task
     */
    public function syncComments(Task $task, string $owner, string $repo, int $issueNumber): array
    {
        try {
            $comments = $this->githubClient->listIssueComments($owner, $repo, $issueNumber);

            // Store comments in task metadata or separate table
            $task->update([
                'metadata' => array_merge($task->metadata ?? [], [
                    'github_comments' => $comments,
                    'comments_synced_at' => now()->toIso8601String(),
                ]),
            ]);

            return $comments;
        } catch (\Exception $e) {
            throw new GitHubSyncException("Failed to sync comments: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Post task update as GitHub comment
     */
    public function postTaskUpdate(Task $task, string $update): ?array
    {
        $githubIssue = $task->githubIssue;

        if (!$githubIssue) {
            return null;
        }

        try {
            $comment = $this->githubClient->createComment(
                $githubIssue->repository_owner,
                $githubIssue->repository_name,
                $githubIssue->github_issue_id,
                $update . "\n\n*Posted by Copilot Orchestration Extension*"
            );

            return $comment;
        } catch (\Exception $e) {
            \Log::error("Failed to post task update to GitHub: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Check if task needs sync with GitHub
     */
    public function needsSync(Task $task): bool
    {
        $githubIssue = $task->githubIssue;

        if (!$githubIssue) {
            return false;
        }

        // Check if task was updated after last sync
        return $task->updated_at > $githubIssue->last_synced_at;
    }
}

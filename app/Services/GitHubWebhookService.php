<?php

namespace App\Services;

use App\Models\Task;
use App\Services\GitHubSyncService;
use App\Exceptions\GitHubWebhookException;
use Illuminate\Support\Facades\Log;

class GitHubWebhookService
{
    public function __construct(
        private GitHubSyncService $syncService,
        private GitHubApiClient $githubClient
    ) {}

    /**
     * Handle incoming webhook
     */
    public function handleWebhook(string $event, array $payload, string $signature): array
    {
        // Verify signature
        $this->verifySignature($payload, $signature);

        Log::info("GitHub webhook received", [
            'event' => $event,
            'action' => $payload['action'] ?? null,
        ]);

        return match ($event) {
            'issues' => $this->handleIssuesEvent($payload),
            'issue_comment' => $this->handleIssueCommentEvent($payload),
            'pull_request' => $this->handlePullRequestEvent($payload),
            'push' => $this->handlePushEvent($payload),
            'ping' => $this->handlePingEvent($payload),
            default => $this->handleUnsupportedEvent($event, $payload),
        };
    }

    /**
     * Handle issues event
     */
    private function handleIssuesEvent(array $payload): array
    {
        $action = $payload['action'];
        $issue = $payload['issue'];
        $repository = $payload['repository'];

        $owner = $repository['owner']['login'];
        $repo = $repository['name'];
        $issueNumber = $issue['number'];

        Log::info("Processing issue event", [
            'action' => $action,
            'issue' => $issueNumber,
            'repo' => "{$owner}/{$repo}",
        ]);

        return match ($action) {
            'opened', 'reopened' => $this->handleIssueOpened($owner, $repo, $issueNumber),
            'edited' => $this->handleIssueEdited($owner, $repo, $issueNumber),
            'closed' => $this->handleIssueClosed($owner, $repo, $issueNumber),
            'assigned', 'unassigned' => $this->handleIssueAssignment($owner, $repo, $issueNumber, $action),
            'labeled', 'unlabeled' => $this->handleIssueLabeled($owner, $repo, $issueNumber),
            default => ['status' => 'ignored', 'action' => $action],
        };
    }

    /**
     * Handle issue opened
     */
    private function handleIssueOpened(string $owner, string $repo, int $issueNumber): array
    {
        try {
            $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);

            return [
                'status' => 'success',
                'action' => 'created',
                'task_id' => $task->id,
            ];
        } catch (\Exception $e) {
            Log::error("Failed to handle issue opened", [
                'error' => $e->getMessage(),
                'issue' => $issueNumber,
            ]);

            throw new GitHubWebhookException("Failed to create task from issue: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Handle issue edited
     */
    private function handleIssueEdited(string $owner, string $repo, int $issueNumber): array
    {
        try {
            $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);

            return [
                'status' => 'success',
                'action' => 'updated',
                'task_id' => $task->id,
            ];
        } catch (\Exception $e) {
            Log::error("Failed to handle issue edited", [
                'error' => $e->getMessage(),
                'issue' => $issueNumber,
            ]);

            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle issue closed
     */
    private function handleIssueClosed(string $owner, string $repo, int $issueNumber): array
    {
        try {
            $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);

            // Update task status to completed
            if ($task->status !== 'completed') {
                $task->update(['status' => 'completed']);
            }

            return [
                'status' => 'success',
                'action' => 'closed',
                'task_id' => $task->id,
            ];
        } catch (\Exception $e) {
            Log::error("Failed to handle issue closed", [
                'error' => $e->getMessage(),
                'issue' => $issueNumber,
            ]);

            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle issue assignment
     */
    private function handleIssueAssignment(string $owner, string $repo, int $issueNumber, string $action): array
    {
        try {
            $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);

            if ($action === 'assigned' && $task->status === 'pending') {
                $task->update(['status' => 'in_progress']);
            }

            return [
                'status' => 'success',
                'action' => $action,
                'task_id' => $task->id,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle issue labeled
     */
    private function handleIssueLabeled(string $owner, string $repo, int $issueNumber): array
    {
        try {
            $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);

            return [
                'status' => 'success',
                'action' => 'labels_updated',
                'task_id' => $task->id,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle issue comment event
     */
    private function handleIssueCommentEvent(array $payload): array
    {
        $action = $payload['action'];
        $comment = $payload['comment'];
        $issue = $payload['issue'];
        $repository = $payload['repository'];

        $owner = $repository['owner']['login'];
        $repo = $repository['name'];
        $issueNumber = $issue['number'];

        if ($action === 'created') {
            try {
                $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);
                
                // Sync comments
                $this->syncService->syncComments($task, $owner, $repo, $issueNumber);

                return [
                    'status' => 'success',
                    'action' => 'comment_synced',
                    'task_id' => $task->id,
                ];
            } catch (\Exception $e) {
                return [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ];
            }
        }

        return ['status' => 'ignored', 'action' => $action];
    }

    /**
     * Handle pull request event
     */
    private function handlePullRequestEvent(array $payload): array
    {
        $action = $payload['action'];
        $pr = $payload['pull_request'];
        $repository = $payload['repository'];

        $owner = $repository['owner']['login'];
        $repo = $repository['name'];
        $prNumber = $pr['number'];

        Log::info("Processing pull request event", [
            'action' => $action,
            'pr' => $prNumber,
            'repo' => "{$owner}/{$repo}",
        ]);

        // Extract linked issue numbers from PR body
        $linkedIssues = $this->extractLinkedIssues($pr['body'] ?? '');

        $results = [];
        foreach ($linkedIssues as $issueNumber) {
            try {
                $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);
                
                // Update task metadata with PR info
                $task->update([
                    'metadata' => array_merge($task->metadata ?? [], [
                        'pull_request' => [
                            'number' => $prNumber,
                            'url' => $pr['html_url'],
                            'state' => $pr['state'],
                            'merged' => $pr['merged'] ?? false,
                        ],
                    ]),
                ]);

                $results[] = [
                    'task_id' => $task->id,
                    'issue_number' => $issueNumber,
                    'status' => 'linked',
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'issue_number' => $issueNumber,
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ];
            }
        }

        return [
            'status' => 'success',
            'action' => $action,
            'linked_issues' => $results,
        ];
    }

    /**
     * Handle push event
     */
    private function handlePushEvent(array $payload): array
    {
        $repository = $payload['repository'];
        $commits = $payload['commits'] ?? [];

        $owner = $repository['owner']['login'] ?? $repository['owner']['name'];
        $repo = $repository['name'];

        // Extract issue references from commit messages
        $referencedIssues = [];
        foreach ($commits as $commit) {
            $issues = $this->extractIssueReferences($commit['message']);
            $referencedIssues = array_merge($referencedIssues, $issues);
        }

        $referencedIssues = array_unique($referencedIssues);

        $results = [];
        foreach ($referencedIssues as $issueNumber) {
            try {
                $task = $this->syncService->syncIssueToTask($owner, $repo, $issueNumber);
                
                $results[] = [
                    'task_id' => $task->id,
                    'issue_number' => $issueNumber,
                    'status' => 'synced',
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'issue_number' => $issueNumber,
                    'status' => 'error',
                ];
            }
        }

        return [
            'status' => 'success',
            'commits_processed' => count($commits),
            'referenced_issues' => $results,
        ];
    }

    /**
     * Handle ping event
     */
    private function handlePingEvent(array $payload): array
    {
        return [
            'status' => 'success',
            'message' => 'Webhook ping received',
            'zen' => $payload['zen'] ?? null,
        ];
    }

    /**
     * Handle unsupported event
     */
    private function handleUnsupportedEvent(string $event, array $payload): array
    {
        Log::info("Unsupported webhook event", ['event' => $event]);

        return [
            'status' => 'ignored',
            'message' => "Event type '{$event}' is not supported",
        ];
    }

    /**
     * Extract linked issues from PR body
     */
    private function extractLinkedIssues(string $body): array
    {
        $issues = [];

        // Match patterns: Fixes #123, Closes #123, Resolves #123
        $patterns = [
            '/(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)\s+#(\d+)/i',
            '/#(\d+)/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $body, $matches)) {
                $issues = array_merge($issues, $matches[1]);
            }
        }

        return array_unique(array_map('intval', $issues));
    }

    /**
     * Extract issue references from commit message
     */
    private function extractIssueReferences(string $message): array
    {
        $issues = [];

        // Match #123 pattern
        if (preg_match_all('/#(\d+)/', $message, $matches)) {
            $issues = $matches[1];
        }

        return array_map('intval', $issues);
    }

    /**
     * Verify webhook signature
     */
    private function verifySignature(array $payload, string $signature): void
    {
        $secret = config('services.github.webhook_secret');

        if (!$secret) {
            throw new GitHubWebhookException('GitHub webhook secret not configured');
        }

        $payloadJson = json_encode($payload);

        if (!$this->githubClient->verifyWebhookSignature($payloadJson, $signature, $secret)) {
            throw new GitHubWebhookException('Invalid webhook signature');
        }
    }

    /**
     * Register webhook with GitHub
     */
    public function registerWebhook(string $owner, string $repo, string $callbackUrl): array
    {
        // Note: This would require additional GitHub API permissions
        // Placeholder for webhook registration logic
        return [
            'status' => 'pending',
            'message' => 'Webhook registration requires admin permissions',
            'callback_url' => $callbackUrl,
        ];
    }
}

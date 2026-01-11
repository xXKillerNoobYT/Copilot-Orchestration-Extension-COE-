<?php

namespace App\Console\Commands;

use App\Services\GitHubZenTasksSyncService;
use Illuminate\Console\Command;

class SyncZenTasksWithGitHub extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'zentasks:sync-github
                            {--direction=both : Sync direction: both, to-github, from-github}
                            {--owner= : GitHub repository owner}
                            {--repo= : GitHub repository name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Zen tasks with GitHub issues (two-way)';

    /**
     * Execute the console command.
     */
    public function handle(GitHubZenTasksSyncService $syncService): int
    {
        $direction = $this->option('direction');
        
        // Validate and resolve configuration
        $owner = trim($this->option('owner') ?? config('services.github.owner') ?? env('GITHUB_OWNER') ?? '');
        $repo = trim($this->option('repo') ?? config('services.github.repo') ?? env('GITHUB_REPO') ?? '');
        $token = config('services.github.token') ?? env('GITHUB_TOKEN');

        // Validate required configuration
        if (empty($owner) || empty($repo)) {
            $this->error('GitHub repository configuration is missing.');
            $this->error('Please provide --owner and --repo options, or set GITHUB_OWNER and GITHUB_REPO environment variables.');
            return Command::FAILURE;
        }

        if (empty($token)) {
            $this->error('GitHub token is not configured.');
            $this->error('Please set GITHUB_TOKEN environment variable in your .env file.');
            return Command::FAILURE;
        }

        $this->info("═══════════════════════════════════════════════════════════");
        $this->info("  Zen Tasks ↔ GitHub Issues Sync");
        $this->info("═══════════════════════════════════════════════════════════");
        $this->newLine();
        $this->info("Repository: {$owner}/{$repo}");
        $this->info("Direction: {$direction}");
        $this->newLine();

        try {
            $result = match ($direction) {
                'to-github' => $this->syncToGitHub($syncService, $owner, $repo),
                'from-github' => $this->syncFromGitHub($syncService, $owner, $repo),
                'both' => $this->syncBothWays($syncService, $owner, $repo),
                default => throw new \InvalidArgumentException("Invalid direction: {$direction}"),
            };

            $this->displayResults($result, $direction);

            $this->newLine();
            $this->info("✓ Sync completed successfully!");

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->newLine();
            $this->error("✗ Sync failed: " . $e->getMessage());
            $this->error($e->getTraceAsString());

            return Command::FAILURE;
        }
    }

    private function syncToGitHub(GitHubZenTasksSyncService $syncService, string $owner, string $repo): array
    {
        $this->info("→ Syncing tasks TO GitHub issues...");
        $this->newLine();

        $result = $syncService->syncTasksToGitHub($owner, $repo);

        return ['tasks_to_issues' => $result];
    }

    private function syncFromGitHub(GitHubZenTasksSyncService $syncService, string $owner, string $repo): array
    {
        $this->info("← Syncing issues FROM GitHub to tasks...");
        $this->newLine();

        $result = $syncService->syncIssuesToTasks($owner, $repo);

        return ['issues_to_tasks' => $result];
    }

    private function syncBothWays(GitHubZenTasksSyncService $syncService, string $owner, string $repo): array
    {
        $this->info("↔ Two-way sync starting...");
        $this->newLine();

        return $syncService->syncBothWays($owner, $repo);
    }

    private function displayResults(array $result, string $direction): void
    {
        $this->newLine();
        $this->info("───────────────────────────────────────────────────────────");
        $this->info("  Results");
        $this->info("───────────────────────────────────────────────────────────");
        $this->newLine();

        if (isset($result['issues_to_tasks'])) {
            $r = $result['issues_to_tasks'];
            $this->line("← GitHub Issues → Tasks:");
            $this->line("  • Synced: {$r['synced']}");
            if ($r['errors'] > 0) {
                $this->warn("  • Errors: {$r['errors']}");
            }
            $this->newLine();
        }

        if (isset($result['tasks_to_issues'])) {
            $r = $result['tasks_to_issues'];
            $this->line("→ Tasks → GitHub Issues:");
            $this->line("  • Synced: {$r['synced']}");
            if ($r['errors'] > 0) {
                $this->warn("  • Errors: {$r['errors']}");
            }
            $this->newLine();
        }

        // Show detailed results if verbose
        if ($this->output->isVerbose()) {
            $this->displayDetailedResults($result);
        }
    }

    private function displayDetailedResults(array $result): void
    {
        foreach ($result as $key => $data) {
            if (!isset($data['results'])) {
                continue;
            }

            $this->info("Detailed {$key} results:");
            $this->table(
                ['Task/Issue', 'Number/ID', 'Action', 'Error'],
                array_map(function ($item) {
                    return [
                        $item['task_id'] ?? $item['issue_number'] ?? 'N/A',
                        $item['issue_number'] ?? $item['task_id'] ?? 'N/A',
                        $item['action'] ?? 'error',
                        $item['error'] ?? '',
                    ];
                }, $data['results'])
            );
            $this->newLine();
        }
    }
}

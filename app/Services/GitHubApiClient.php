<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use App\Exceptions\GitHubApiException;

class GitHubApiClient
{
    private const API_BASE_URL = 'https://api.github.com';
    private const CACHE_TTL = 300; // 5 minutes
    private const RATE_LIMIT_THRESHOLD = 100; // Stop when fewer than 100 requests remaining
    private const RATE_LIMIT_CACHE_KEY = 'github:rate_limit';

    private string $token;
    private string $userAgent;

    public function __construct()
    {
        $this->token = config('services.github.token');
        $this->userAgent = config('services.github.user_agent', 'Copilot-Orchestration-Extension');
    }

    /**
     * Get a single issue by number
     */
    public function getIssue(string $owner, string $repo, int $issueNumber): array
    {
        $cacheKey = "github:issue:{$owner}:{$repo}:{$issueNumber}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($owner, $repo, $issueNumber) {
            return $this->request('GET', "/repos/{$owner}/{$repo}/issues/{$issueNumber}");
        });
    }

    /**
     * List issues for a repository
     */
    public function listIssues(string $owner, string $repo, array $params = []): array
    {
        $defaultParams = [
            'state' => 'open',
            'per_page' => 100,
            'page' => 1,
        ];

        $params = array_merge($defaultParams, $params);

        return $this->request('GET', "/repos/{$owner}/{$repo}/issues", $params);
    }

    /**
     * Create a new issue
     */
    public function createIssue(string $owner, string $repo, array $data): array
    {
        $this->invalidateIssueCache($owner, $repo);

        return $this->request('POST', "/repos/{$owner}/{$repo}/issues", $data);
    }

    /**
     * Update an existing issue
     */
    public function updateIssue(string $owner, string $repo, int $issueNumber, array $data): array
    {
        $this->invalidateIssueCache($owner, $repo, $issueNumber);

        return $this->request('PATCH', "/repos/{$owner}/{$repo}/issues/{$issueNumber}", $data);
    }

    /**
     * Close an issue
     */
    public function closeIssue(string $owner, string $repo, int $issueNumber): array
    {
        return $this->updateIssue($owner, $repo, $issueNumber, ['state' => 'closed']);
    }

    /**
     * Reopen an issue
     */
    public function reopenIssue(string $owner, string $repo, int $issueNumber): array
    {
        return $this->updateIssue($owner, $repo, $issueNumber, ['state' => 'open']);
    }

    /**
     * List issue comments
     */
    public function listIssueComments(string $owner, string $repo, int $issueNumber): array
    {
        $cacheKey = "github:comments:{$owner}:{$repo}:{$issueNumber}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($owner, $repo, $issueNumber) {
            return $this->request('GET', "/repos/{$owner}/{$repo}/issues/{$issueNumber}/comments");
        });
    }

    /**
     * Create an issue comment
     */
    public function createComment(string $owner, string $repo, int $issueNumber, string $body): array
    {
        $this->invalidateCommentsCache($owner, $repo, $issueNumber);

        return $this->request('POST', "/repos/{$owner}/{$repo}/issues/{$issueNumber}/comments", [
            'body' => $body,
        ]);
    }

    /**
     * Get a pull request
     */
    public function getPullRequest(string $owner, string $repo, int $prNumber): array
    {
        $cacheKey = "github:pr:{$owner}:{$repo}:{$prNumber}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($owner, $repo, $prNumber) {
            return $this->request('GET', "/repos/{$owner}/{$repo}/pulls/{$prNumber}");
        });
    }

    /**
     * List pull requests
     */
    public function listPullRequests(string $owner, string $repo, array $params = []): array
    {
        $defaultParams = [
            'state' => 'open',
            'per_page' => 100,
        ];

        $params = array_merge($defaultParams, $params);

        return $this->request('GET', "/repos/{$owner}/{$repo}/pulls", $params);
    }

    /**
     * Get pull request files
     */
    public function getPullRequestFiles(string $owner, string $repo, int $prNumber): array
    {
        return $this->request('GET', "/repos/{$owner}/{$repo}/pulls/{$prNumber}/files");
    }

    /**
     * Get repository information
     */
    public function getRepository(string $owner, string $repo): array
    {
        $cacheKey = "github:repo:{$owner}:{$repo}";

        return Cache::remember($cacheKey, 3600, function () use ($owner, $repo) {
            return $this->request('GET', "/repos/{$owner}/{$repo}");
        });
    }

    /**
     * List repository branches
     */
    public function listBranches(string $owner, string $repo): array
    {
        return $this->request('GET', "/repos/{$owner}/{$repo}/branches");
    }

    /**
     * Get a specific branch
     */
    public function getBranch(string $owner, string $repo, string $branch): array
    {
        return $this->request('GET', "/repos/{$owner}/{$repo}/branches/{$branch}");
    }

    /**
     * List repository labels
     */
    public function listLabels(string $owner, string $repo): array
    {
        $cacheKey = "github:labels:{$owner}:{$repo}";

        return Cache::remember($cacheKey, 3600, function () use ($owner, $repo) {
            return $this->request('GET', "/repos/{$owner}/{$repo}/labels");
        });
    }

    /**
     * Add labels to an issue
     */
    public function addLabels(string $owner, string $repo, int $issueNumber, array $labels): array
    {
        $this->invalidateIssueCache($owner, $repo, $issueNumber);

        return $this->request('POST', "/repos/{$owner}/{$repo}/issues/{$issueNumber}/labels", [
            'labels' => $labels,
        ]);
    }

    /**
     * Remove a label from an issue
     */
    public function removeLabel(string $owner, string $repo, int $issueNumber, string $label): void
    {
        $this->invalidateIssueCache($owner, $repo, $issueNumber);

        $this->request('DELETE', "/repos/{$owner}/{$repo}/issues/{$issueNumber}/labels/{$label}");
    }

    /**
     * Search issues
     */
    public function searchIssues(string $query, array $params = []): array
    {
        $defaultParams = [
            'q' => $query,
            'per_page' => 100,
        ];

        $params = array_merge($defaultParams, $params);

        return $this->request('GET', '/search/issues', $params);
    }

    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature(string $payload, string $signature, string $secret): bool
    {
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Make an HTTP request to GitHub API
     */
    private function request(string $method, string $endpoint, array $data = []): array
    {
        // Check rate limit before making request
        $this->checkRateLimit();

        $url = self::API_BASE_URL . $endpoint;

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->token}",
                'Accept' => 'application/vnd.github+json',
                'User-Agent' => $this->userAgent,
                'X-GitHub-Api-Version' => '2022-11-28',
            ])->{strtolower($method)}($url, $data);

            // Update rate limit cache from response headers
            $this->updateRateLimitFromHeaders($response->headers());

            if ($response->failed()) {
                throw new GitHubApiException(
                    "GitHub API request failed: " . $response->body(),
                    $response->status()
                );
            }

            return $response->json() ?? [];
        } catch (\Exception $e) {
            if ($e instanceof GitHubApiException) {
                throw $e;
            }

            throw new GitHubApiException(
                "GitHub API request error: " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Invalidate issue cache
     */
    private function invalidateIssueCache(string $owner, string $repo, ?int $issueNumber = null): void
    {
        if ($issueNumber) {
            Cache::forget("github:issue:{$owner}:{$repo}:{$issueNumber}");
        }

        // Invalidate list cache pattern
        Cache::tags(["github:issues:{$owner}:{$repo}"])->flush();
    }

    /**
     * Invalidate comments cache
     */
    private function invalidateCommentsCache(string $owner, string $repo, int $issueNumber): void
    {
        Cache::forget("github:comments:{$owner}:{$repo}:{$issueNumber}");
    }

    /**
     * Get rate limit information
     */
    public function getRateLimit(): array
    {
        return $this->request('GET', '/rate_limit');
    }

    /**
     * Check if we're approaching rate limit and throw exception if so
     */
    private function checkRateLimit(): void
    {
        $cachedLimit = Cache::get(self::RATE_LIMIT_CACHE_KEY);

        if ($cachedLimit && isset($cachedLimit['remaining'])) {
            if ($cachedLimit['remaining'] < self::RATE_LIMIT_THRESHOLD) {
                $resetTime = $cachedLimit['reset'] ?? time() + 3600;
                $waitMinutes = ceil(($resetTime - time()) / 60);

                throw new GitHubApiException(
                    "GitHub API rate limit approaching threshold. " .
                    "Remaining: {$cachedLimit['remaining']}/{$cachedLimit['limit']}. " .
                    "Resets in {$waitMinutes} minutes.",
                    429
                );
            }
        }
    }

    /**
     * Update rate limit cache from response headers
     */
    private function updateRateLimitFromHeaders(array $headers): void
    {
        $remaining = $headers['x-ratelimit-remaining'][0] ?? null;
        $limit = $headers['x-ratelimit-limit'][0] ?? null;
        $reset = $headers['x-ratelimit-reset'][0] ?? null;

        if ($remaining !== null && $limit !== null && $reset !== null) {
            Cache::put(self::RATE_LIMIT_CACHE_KEY, [
                'remaining' => (int) $remaining,
                'limit' => (int) $limit,
                'reset' => (int) $reset,
                'updated_at' => time(),
            ], 3600);

            // Log warning if getting low
            if ((int) $remaining < 500) {
                \Log::warning("GitHub API rate limit getting low", [
                    'remaining' => $remaining,
                    'limit' => $limit,
                    'reset_at' => date('Y-m-d H:i:s', (int) $reset),
                ]);
            }
        }
    }

    /**
     * Get current rate limit status from cache
     */
    public function getRateLimitStatus(): ?array
    {
        return Cache::get(self::RATE_LIMIT_CACHE_KEY);
    }

    /**
     * Parse repository URL to extract owner and repo name
     */
    public static function parseRepositoryUrl(string $url): array
    {
        // Handle various GitHub URL formats
        $patterns = [
            '#github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$#',
            '#^([^/]+)/([^/]+)$#',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return [
                    'owner' => $matches[1],
                    'repo' => $matches[2],
                ];
            }
        }

        throw new GitHubApiException("Invalid GitHub repository URL: {$url}");
    }
}

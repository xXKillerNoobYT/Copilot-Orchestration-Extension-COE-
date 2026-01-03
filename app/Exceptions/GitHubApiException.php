<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class GitHubApiException extends Exception
{
    private int $statusCode;
    private ?array $githubError;

    public function __construct(
        string $message,
        int $statusCode = 500,
        ?array $githubError = null,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->statusCode = $statusCode;
        $this->githubError = $githubError;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getGitHubError(): ?array
    {
        return $this->githubError;
    }

    /**
     * Render the exception as an HTTP response
     */
    public function render(): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $this->getMessage(),
            'error_type' => 'github_api_error',
        ];

        if ($this->githubError) {
            $response['github_error'] = $this->githubError;
        }

        return response()->json($response, $this->statusCode);
    }

    /**
     * Report the exception
     */
    public function report(): bool
    {
        // Log GitHub API errors for monitoring
        \Log::error('GitHub API Error', [
            'message' => $this->getMessage(),
            'status_code' => $this->statusCode,
            'github_error' => $this->githubError,
            'trace' => $this->getTraceAsString(),
        ]);

        return false;
    }
}

<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class GitHubSyncException extends Exception
{
    private ?string $syncType;
    private ?array $syncContext;

    public function __construct(
        string $message,
        ?string $syncType = null,
        ?array $syncContext = null,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->syncType = $syncType;
        $this->syncContext = $syncContext;
    }

    public function getSyncType(): ?string
    {
        return $this->syncType;
    }

    public function getSyncContext(): ?array
    {
        return $this->syncContext;
    }

    /**
     * Render the exception as an HTTP response
     */
    public function render(): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $this->getMessage(),
            'error_type' => 'github_sync_error',
        ];

        if ($this->syncType) {
            $response['sync_type'] = $this->syncType;
        }

        if ($this->syncContext) {
            $response['context'] = $this->syncContext;
        }

        return response()->json($response, 400);
    }

    /**
     * Report the exception
     */
    public function report(): bool
    {
        // Log sync errors for monitoring
        \Log::error('GitHub Sync Error', [
            'message' => $this->getMessage(),
            'sync_type' => $this->syncType,
            'context' => $this->syncContext,
            'trace' => $this->getTraceAsString(),
        ]);

        return false;
    }
}

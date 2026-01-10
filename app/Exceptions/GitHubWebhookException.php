<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class GitHubWebhookException extends Exception
{
    private ?string $event;
    private ?array $payload;

    public function __construct(
        string $message,
        ?string $event = null,
        ?array $payload = null,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->event = $event;
        $this->payload = $payload;
    }

    public function getEvent(): ?string
    {
        return $this->event;
    }

    public function getPayload(): ?array
    {
        return $this->payload;
    }

    /**
     * Render the exception as an HTTP response
     */
    public function render(): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $this->getMessage(),
            'error_type' => 'github_webhook_error',
        ];

        if ($this->event) {
            $response['event'] = $this->event;
        }

        // Don't expose full payload in response for security
        // but include relevant event type

        return response()->json($response, 400);
    }

    /**
     * Report the exception
     */
    public function report(): bool
    {
        // Log webhook errors with payload for debugging
        \Log::error('GitHub Webhook Error', [
            'message' => $this->getMessage(),
            'event' => $this->event,
            'payload' => $this->payload,
            'trace' => $this->getTraceAsString(),
        ]);

        return false;
    }
}

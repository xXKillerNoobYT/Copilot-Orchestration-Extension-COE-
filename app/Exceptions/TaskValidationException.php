<?php

namespace App\Exceptions;

use Exception;

/**
 * Task Validation Exception
 * 
 * Thrown when task validation fails.
 */
class TaskValidationException extends Exception
{
    /**
     * Create a new exception instance.
     *
     * @param string $message
     * @param int $code
     * @param \Throwable|null $previous
     */
    public function __construct(
        string $message = "Task validation failed",
        int $code = 422,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    /**
     * Render the exception into an HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function render($request)
    {
        return response()->json([
            'error' => 'Validation Error',
            'message' => $this->getMessage(),
        ], $this->getCode());
    }
}

<?php

namespace App\Exceptions;

use Exception;

/**
 * Circular Dependency Exception
 * 
 * Thrown when a circular dependency is detected in the task graph.
 */
class CircularDependencyException extends Exception
{
    /**
     * Create a new exception instance.
     *
     * @param string $message
     * @param int $code
     * @param \Throwable|null $previous
     */
    public function __construct(
        string $message = "Circular dependency detected",
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
            'error' => 'Circular Dependency',
            'message' => $this->getMessage(),
        ], $this->getCode());
    }
}

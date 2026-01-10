<?php

namespace App\Http\Middleware;

use App\Services\LoggingService;
use App\Services\MetricsCollectionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MonitorRequests
{
    public function __construct(
        private LoggingService $logging,
        private MetricsCollectionService $metrics
    ) {}

    /**
     * Handle an incoming request
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        
        // Generate request ID if not present
        if (!$request->header('X-Request-ID')) {
            $request->headers->set('X-Request-ID', uniqid('req_', true));
        }
        
        // Process request
        $response = $next($request);
        
        // Calculate duration
        $duration = microtime(true) - $startTime;
        
        // Record metrics
        $this->recordRequestMetrics($request, $response, $duration);
        
        // Log request
        $this->logRequest($request, $response, $duration);
        
        // Add response headers
        $response->headers->set('X-Request-ID', $request->header('X-Request-ID'));
        $response->headers->set('X-Response-Time', round($duration * 1000, 2) . 'ms');
        
        return $response;
    }

    /**
     * Record request metrics
     */
    private function recordRequestMetrics(Request $request, Response $response, float $duration): void
    {
        $method = $request->method();
        $endpoint = $this->normalizeEndpoint($request->path());
        $statusCode = $response->getStatusCode();
        
        $this->metrics->recordApiMetrics($method, $endpoint, $statusCode, $duration);
    }

    /**
     * Log request
     */
    private function logRequest(Request $request, Response $response, float $duration): void
    {
        $this->logging->logApiRequest(
            $request->method(),
            $request->path(),
            $response->getStatusCode(),
            $duration,
            [
                'request_id' => $request->header('X-Request-ID'),
                'user_id' => $request->user()?->id,
            ]
        );
    }

    /**
     * Normalize endpoint for consistent metrics
     */
    private function normalizeEndpoint(string $path): string
    {
        // Replace UUIDs and IDs with placeholders
        $path = preg_replace('/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i', '{id}', $path);
        $path = preg_replace('/\/\d+/', '/{id}', $path);
        
        return $path;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MetricsService;
use Illuminate\Http\JsonResponse;

class MetricsController extends Controller
{
    public function __construct(private readonly MetricsService $metricsService)
    {
    }

    public function tasks(): JsonResponse
    {
        return response()->json($this->metricsService->getTaskMetrics());
    }

    public function agents(): JsonResponse
    {
        return response()->json($this->metricsService->getAgentMetrics());
    }

    public function errors(): JsonResponse
    {
        return response()->json($this->metricsService->getErrorMetrics());
    }
}

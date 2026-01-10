<?php

namespace App\Http\Controllers;

use App\Services\LoopSchedulerService;
use App\Services\AgentSwitchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * AgentLoopController
 *
 * REST API endpoints for managing the agent switching loop.
 * Endpoints:
 * - POST /api/agent-loop/start — Start the continuous loop
 * - POST /api/agent-loop/stop — Stop the loop
 * - GET /api/agent-loop/status — Get loop status and stats
 * - POST /api/agent-loop/cycle — Execute one cycle (for testing)
 *
 * Phase 7: Auto-Agent Switching & Continuous Execution
 */
class AgentLoopController extends Controller
{
    protected LoopSchedulerService $loopScheduler;
    protected AgentSwitchService $agentSwitch;

    public function __construct(
        LoopSchedulerService $loopScheduler,
        AgentSwitchService $agentSwitch
    ) {
        $this->loopScheduler = $loopScheduler;
        $this->agentSwitch = $agentSwitch;
    }

    /**
     * Start the continuous agent switching loop.
     *
     * POST /api/agent-loop/start
     * Body: { "max_cycles": 0 }  // 0 = infinite
     */
    public function start(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'max_cycles' => 'integer|min:0',
        ]);

        $maxCycles = $validated['max_cycles'] ?? 0;

        Log::info('Agent loop start requested', ['max_cycles' => $maxCycles]);

        try {
            // Start loop (typically in background via queue)
            $stats = $this->loopScheduler->startLoop($maxCycles);

            return response()->json([
                'status' => 'success',
                'message' => 'Agent loop started',
                'stats' => $stats,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to start agent loop', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stop the continuous agent switching loop.
     *
     * POST /api/agent-loop/stop
     */
    public function stop(): JsonResponse
    {
        Log::info('Agent loop stop requested');

        try {
            $this->loopScheduler->stopLoop();

            return response()->json([
                'status' => 'success',
                'message' => 'Loop stop signal sent',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to stop agent loop', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current loop status and statistics.
     *
     * GET /api/agent-loop/status
     */
    public function status(): JsonResponse
    {
        try {
            $stats = $this->loopScheduler->getLoopStats();

            return response()->json([
                'status' => 'success',
                'running' => $stats['running'] ?? false,
                'stats' => $stats,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to get loop status', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Execute a single agent switch cycle (for testing).
     *
     * POST /api/agent-loop/cycle
     */
    public function executeCycle(): JsonResponse
    {
        Log::info('Single agent cycle requested');

        try {
            $result = $this->agentSwitch->executeCycle();

            return response()->json([
                'status' => 'success',
                'cycle_result' => $result,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to execute cycle', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

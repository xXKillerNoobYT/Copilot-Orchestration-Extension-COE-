<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

/**
 * LoopSchedulerService
 *
 * Manages the continuous agent switching loop.
 * Handles:
 * - Loop scheduling (interval-based, cron-like)
 * - Graceful start/stop
 * - Loop statistics and telemetry
 * - Exponential backoff on errors
 *
 * Phase 7: Auto-Agent Switching & Continuous Execution
 */
class LoopSchedulerService
{
    const LOOP_INTERVAL_MIN = 30; // seconds
    const LOOP_INTERVAL_MAX = 120; // seconds
    const LOOP_BACKOFF_MULTIPLIER = 1.5;
    const LOOP_BACKOFF_MAX = 600; // max 10 minutes

    protected AgentSwitchService $agentSwitchService;

    public function __construct(AgentSwitchService $agentSwitchService)
    {
        $this->agentSwitchService = $agentSwitchService;
    }

    /**
     * Start the continuous loop.
     * This should be invoked by a scheduler (Laravel Schedule, cron, or background job).
     *
     * @param int $maxCycles Max cycles to execute (0 = infinite)
     * @return array Statistics about the loop run
     */
    public function startLoop(int $maxCycles = 0): array
    {
        $this->setLoopRunning(true);
        $cycleCount = 0;
        $successCount = 0;
        $errorCount = 0;
        $startTime = now();

        Log::info('Agent switching loop started', [
            'max_cycles' => $maxCycles,
            'interval_min' => self::LOOP_INTERVAL_MIN,
        ]);

        try {
            while ($this->isLoopRunning() && ($maxCycles === 0 || $cycleCount < $maxCycles)) {
                try {
                    $cycleCount++;
                    $result = $this->agentSwitchService->executeCycle();

                    if ($result['state'] === 'error') {
                        $errorCount++;
                        $this->applyExponentialBackoff();
                    } else {
                        $successCount++;
                        $this->resetBackoff();
                    }

                    // Log cycle statistics
                    Log::info('Agent switch cycle result', [
                        'cycle' => $cycleCount,
                        'state' => $result['state'],
                        'task_id' => $result['task_id'],
                    ]);

                    // Update stats cache
                    $this->updateLoopStats([
                        'cycles' => $cycleCount,
                        'successes' => $successCount,
                        'errors' => $errorCount,
                    ]);

                    // Check if we should stop
                    if ($result['state'] === 'maintenance_mode') {
                        // In maintenance mode, increase polling interval
                        $interval = $this->getLoopInterval();
                        Log::debug('Loop in maintenance mode, sleeping longer', ['interval' => $interval]);
                        sleep(min($interval, 180)); // max 3 minutes in maintenance
                    } else {
                        sleep($this->getLoopInterval());
                    }
                } catch (Exception $cycleError) {
                    $errorCount++;
                    Log::error('Cycle execution error', [
                        'cycle' => $cycleCount,
                        'error' => $cycleError->getMessage(),
                    ]);
                    $this->applyExponentialBackoff();
                    sleep(min($this->getBackoffDelay(), 60));
                }
            }
        } finally {
            $this->setLoopRunning(false);
            $duration = now()->diffInSeconds($startTime);

            Log::info('Agent switching loop stopped', [
                'cycles_executed' => $cycleCount,
                'successes' => $successCount,
                'errors' => $errorCount,
                'duration_seconds' => $duration,
                'avg_cycle_time' => $duration / max($cycleCount, 1),
            ]);
        }

        return [
            'cycles_executed' => $cycleCount,
            'successes' => $successCount,
            'errors' => $errorCount,
            'duration_seconds' => $duration,
        ];
    }

    /**
     * Stop the loop gracefully.
     */
    public function stopLoop(): void
    {
        $this->setLoopRunning(false);
        Log::info('Loop stop signal sent');
    }

    /**
     * Check if loop should continue running.
     */
    protected function isLoopRunning(): bool
    {
        return Cache::get('agent_loop.running', false);
    }

    /**
     * Set loop running state.
     */
    protected function setLoopRunning(bool $running): void
    {
        if ($running) {
            Cache::forever('agent_loop.running', true);
        } else {
            Cache::forget('agent_loop.running');
        }
    }

    /**
     * Get current loop interval (varies based on state and backoff).
     */
    protected function getLoopInterval(): int
    {
        $backoffDelay = $this->getBackoffDelay();
        $interval = self::LOOP_INTERVAL_MIN + $backoffDelay;
        return min($interval, self::LOOP_INTERVAL_MAX);
    }

    /**
     * Get current backoff delay (exponential on errors).
     */
    protected function getBackoffDelay(): int
    {
        return (int) Cache::get('agent_loop.backoff_delay', 0);
    }

    /**
     * Apply exponential backoff on error.
     */
    protected function applyExponentialBackoff(): void
    {
        $currentBackoff = $this->getBackoffDelay();
        $newBackoff = max(
            (int) ($currentBackoff * self::LOOP_BACKOFF_MULTIPLIER),
            10 // minimum 10 seconds backoff
        );
        $newBackoff = min($newBackoff, self::LOOP_BACKOFF_MAX);

        Cache::put('agent_loop.backoff_delay', $newBackoff, now()->addHour());
        Log::warning('Exponential backoff applied', ['delay_seconds' => $newBackoff]);
    }

    /**
     * Reset backoff delay on success.
     */
    protected function resetBackoff(): void
    {
        Cache::forget('agent_loop.backoff_delay');
    }

    /**
     * Update loop statistics in cache.
     */
    protected function updateLoopStats(array $stats): void
    {
        Cache::put('agent_loop.stats', array_merge(
            Cache::get('agent_loop.stats', []),
            $stats,
            ['last_update' => now()->toIso8601String()]
        ), now()->addDay());
    }

    /**
     * Get current loop statistics.
     */
    public function getLoopStats(): array
    {
        return Cache::get('agent_loop.stats', [
            'cycles' => 0,
            'successes' => 0,
            'errors' => 0,
            'last_update' => null,
        ]);
    }
}

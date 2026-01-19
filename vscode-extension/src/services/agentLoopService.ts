/**
 * Agent Loop Service
 * 
 * Manages communication with the backend Agent Loop API (Phase 7)
 * - Starts/stops the continuous auto-switching loop
 * - Tracks loop status and statistics
 * - Executes single cycles (for testing)
 * - Handles retries and error management
 * - Applies LLM loading timeouts for model switches
 */

import { readLlmTimeoutConfig, LlmTimeoutConfig } from '../config/llmTimeouts';
import { showAndLogError } from '../utils/errorMessages';

export interface AgentLoopConfig {
  baseUrl: string;
  maxCycles?: number;
}

export interface AgentLoopStatus {
  running: boolean;
  state?: string;
  current_task_id?: string;
  cycles_executed?: number;
  successes?: number;
  errors?: number;
  avg_cycle_time?: number;
}

export interface AgentCycleResult {
  state: string;
  task_id: string | null;
  message: string;
}

/**
 * Service for managing the agent switching loop
 */
export class AgentLoopService {
  private config: AgentLoopConfig;
  private loopStatusCallbacks: ((status: AgentLoopStatus) => void)[] = [];
  private timeoutConfig: LlmTimeoutConfig;

  constructor(config: AgentLoopConfig) {
    this.config = config;
    const llmTimeouts = readLlmTimeoutConfig();
    this.timeoutConfig = llmTimeouts.config;
  }

  /**
   * Start the continuous agent switching loop
   * @param maxCycles Maximum cycles to execute (0 = infinite)
   */
  async startLoop(maxCycles: number = 0): Promise<AgentLoopStatus> {
    try {
      const url = `${this.config.baseUrl}/api/v1/agent-loop/start`;

      // Apply activation timeout for agent initialization
      const timeoutMs = this.timeoutConfig.agentActivationMs;

      const response = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            max_cycles: maxCycles,
            model_load_timeout: this.timeoutConfig.coldLoadMs,
            model_switch_timeout: this.timeoutConfig.modelSwitchMs,
          }),
        }),
        this.createTimeoutPromise(timeoutMs, 'Agent activation'),
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { status: string; stats?: AgentLoopStatus };
      const status = data.stats || { running: true };
      this.notifyStatusChange(status);
      return status;
    } catch (error) {
      // Enhanced error messaging for common issues
      showAndLogError({
        operation: 'Start Agent Loop',
        attemptedUrl: `${this.config.baseUrl}/api/v1/agent-loop/start`,
        error,
        possibleCauses: [
          'Laravel backend not running',
          'Incorrect backend URL in settings',
          'Agent loop service not initialized',
          'Network connectivity issue'
        ],
        solutions: [
          'Start backend: php artisan serve',
          'Check settings: copilot-orchestrator.backendUrl',
          `Verify backend is running: curl "${this.config.baseUrl}/api/v1/agent-loop/status"`,
          'Check Laravel logs for errors'
        ]
      });
      
      throw error;
    }
  }

  /**
   * Stop the continuous agent switching loop
   */
  async stopLoop(): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/api/v1/agent-loop/stop`;

      // Apply deactivation timeout
      const timeoutMs = this.timeoutConfig.agentDeactivationMs;

      const response = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }),
        this.createTimeoutPromise(timeoutMs, 'Agent deactivation'),
      ]);

      if (!response.ok) {
        throw new Error(`Failed to stop loop: ${response.status} ${response.statusText}`);
      }

      this.notifyStatusChange({ running: false });
    } catch (error) {
      throw new Error(`Stop loop failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current loop status and statistics
   */
  async getStatus(): Promise<AgentLoopStatus> {
    try {
      const url = `${this.config.baseUrl}/api/v1/agent-loop/status`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        status: string;
        running: boolean;
        stats: AgentLoopStatus;
      };
      this.notifyStatusChange(data.stats);
      return data.stats;
    } catch (error) {
      throw new Error(`Get status failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a single agent switching cycle (for testing)
   */
  async executeCycle(): Promise<AgentCycleResult> {
    try {
      const url = `${this.config.baseUrl}/api/v1/agent-loop/cycle`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to execute cycle: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { status: string; cycle_result: AgentCycleResult };
      return data.cycle_result;
    } catch (error) {
      throw new Error(`Execute cycle failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Poll loop status periodically
   * @param interval Polling interval in milliseconds
   * @param maxDuration Maximum duration to poll (0 = infinite)
   */
  async pollStatus(interval: number = 5000, maxDuration: number = 0): Promise<AgentLoopStatus[]> {
    const results: AgentLoopStatus[] = [];
    const startTime = Date.now();

    return new Promise<AgentLoopStatus[]>((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getStatus();
          results.push(status);

          if (!status.running) {
            clearInterval(pollInterval);
            resolve(results);
            return;
          }

          if (maxDuration > 0 && Date.now() - startTime > maxDuration) {
            clearInterval(pollInterval);
            resolve(results);
            return;
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, interval);
    });
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: (status: AgentLoopStatus) => void): () => void {
    this.loopStatusCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.loopStatusCallbacks.indexOf(callback);
      if (index >= 0) {
        this.loopStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all status change listeners
   */
  private notifyStatusChange(status: AgentLoopStatus): void {
    this.loopStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }

  /**
   * Create timeout promise for long-running operations
   */
  private createTimeoutPromise(timeoutMs: number, operation: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(
          `${operation} timeout after ${timeoutMs}ms. ` +
          `This may indicate model loading delays. ` +
          `You can increase timeouts in settings: copilot-orchestrator.llm.timeouts`
        ));
      }, timeoutMs);
    });
  }

  /**
   * Refresh timeout configuration from settings
   */
  refreshTimeoutConfig(): void {
    const llmTimeouts = readLlmTimeoutConfig();
    this.timeoutConfig = llmTimeouts.config;
  }
}

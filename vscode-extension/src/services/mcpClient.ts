/**
 * MCP Client Service
 * Provides access to MCP server endpoints from VS Code extension
 * 
 * Reference: Code Master notebook, Section 11.7 - MCP Endpoints
 * All MCP endpoints use the canonical path pattern: /api/v1/mcp/*
 * 
 * Endpoints:
 * - GET /api/v1/mcp/nextTask
 * - POST /api/v1/mcp/reportTaskStatus
 * - POST /api/v1/mcp/reportObservation
 * - POST /api/v1/mcp/reportTestFailure
 * - POST /api/v1/mcp/reportVerificationResult
 * - POST /api/v1/mcp/askQuestion
 * - POST /api/v1/mcp/savePlan
 * - GET /api/v1/mcp/loadPlan/:id
 * - GET /api/v1/mcp/listPlans
 * - POST /api/v1/mcp/plans/:id/decompose
 */

import * as vscode from 'vscode';
import { retryWithBackoff, withTimeout, CircuitBreaker, showErrorMessage, logError, createRetryHandler } from '../utils/errorHandler';

/**
 * Centralized MCP endpoint paths
 * Ensures consistent path patterns across all MCP operations
 */
const MCP_ENDPOINTS = {
  BASE: '/api/v1/mcp',
  NEXT_TASK: '/api/v1/mcp/nextTask',
  REPORT_TASK_STATUS: '/api/v1/mcp/reportTaskStatus',
  REPORT_OBSERVATION: '/api/v1/mcp/reportObservation',
  REPORT_TEST_FAILURE: '/api/v1/mcp/reportTestFailure',
  REPORT_VERIFICATION_RESULT: '/api/v1/mcp/reportVerificationResult',
  ASK_QUESTION: '/api/v1/mcp/askQuestion',
  SAVE_PLAN: '/api/v1/mcp/savePlan',
  LOAD_PLAN: '/api/v1/mcp/loadPlan',
  LIST_PLANS: '/api/v1/mcp/listPlans',
  TEAMS_STATUS: '/api/v1/teams/status',
} as const;

export interface MCPConfig {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
}

/**
 * Team-specific metrics for different orchestrator teams
 */
export interface PlanningMetrics {
  tasksCreated?: number;
  planVersion?: string;
}

export interface AnswerMetrics {
  questionsAnswered?: number;
}

export interface DecompositionMetrics {
  subtasksCreated?: number;
  avgTaskSize?: number;
}

export interface VerificationMetrics {
  tasksVerified?: number;
  pendingVisual?: number;
}

/**
 * Base team status structure
 */
export interface BaseTeamStatus {
  name: string;
  status: 'idle' | 'working' | 'blocked' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  activeTaskCount: number;
  lastActivity?: string;
}

/**
 * Team status response from MCP /api/teams/status endpoint
 */
export interface TeamStatusResponse {
  planning: BaseTeamStatus & { metrics?: PlanningMetrics };
  answer: BaseTeamStatus & { metrics?: AnswerMetrics };
  decomposition: BaseTeamStatus & { metrics?: DecompositionMetrics };
  verification: BaseTeamStatus & { metrics?: VerificationMetrics };
}

export class MCPClient {
  private baseUrl: string;
  private authToken?: string;
  private timeout: number = 10000;
  private static instance: MCPClient | undefined;
  private circuitBreaker: CircuitBreaker;

  private constructor(config: MCPConfig) {
    this.baseUrl = config.baseUrl;
    this.authToken = config.authToken;
    this.timeout = config.timeout ?? 10000;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    });
  }

  /**
   * POST /api/v1/mcp/reportObservation
   * Log observations, discoveries, or issues
   */
  async reportObservation(data: {
    taskId: string;
    type: 'discovery' | 'issue' | 'risk' | 'optimization';
    message: string;
    severity?: string;
    suggestedAction?: string;
    createTask?: boolean;
  }): Promise<any> {
    return this.fetch(`${this.baseUrl}${MCP_ENDPOINTS.REPORT_OBSERVATION}`, 'POST', data);
  }

  /**
   * POST /api/v1/mcp/reportVerificationResult
   * Report visual/manual verification results
   */
  async reportVerificationResult(data: {
    verificationTaskId: string;
    originalTaskId: string;
    status: 'passed' | 'failed' | 'partial';
    checklist?: any[];
    issuesFound?: any[];
    followUpTasks?: any[];
    notes?: string;
  }): Promise<any> {
    return this.fetch(`${this.baseUrl}${MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT}`, 'POST', data);
  }

  /**
   * POST /api/v1/mcp/reportTestFailure
   * Report test failures and create investigation tasks
   */
  async reportTestFailure(data: {
    taskId: string;
    test: string;
    error: string;
    severity: 'critical' | 'major' | 'minor';
  }): Promise<any> {
    return this.fetch(`${this.baseUrl}${MCP_ENDPOINTS.REPORT_TEST_FAILURE}`, 'POST', data);
  }

  static initialize(config: MCPConfig): MCPClient {
    MCPClient.instance = new MCPClient(config);
    return MCPClient.instance;
  }

  static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      const config = vscode.workspace.getConfiguration('copilot-orchestrator');
      const baseUrl = config.get<string>('mcp.baseUrl', 'http://localhost:8000');
      const authToken = config.get<string>('mcp.authToken', '')
        || process.env.COPILOT_MCP_TOKEN
        || process.env.GITHUB_COPILOT_MCP_TOKEN;
      MCPClient.instance = new MCPClient({ baseUrl, authToken });
    }
    return MCPClient.instance;
  }

  /**
   * Invalidate the singleton instance.
   * The next call to getInstance() will create a new instance using the updated configuration.
   *
   * This should be called when configuration changes to ensure the client uses updated settings.
   *
   * NOTE: Calling this method discards the existing CircuitBreaker instance along with any
   * accumulated failure state (e.g., open/half-open state and counters). The next call to
   * {@link MCPClient.getInstance} will create a new MCPClient with a fresh CircuitBreaker
   * in the "closed" state. This effectively resets circuit breaker protection on config change.
   */
  static invalidateInstance(): void {
    if (MCPClient.instance) {
      console.log('[MCPClient] Invalidating cached instance and resetting circuit breaker due to configuration change');
      MCPClient.instance = undefined;
    }
  }

  /**
   * GET /api/v1/mcp/nextTask
   * Fetch next ready task from queue with plan context
   */
  async getNextTask(filter?: string, priority?: string): Promise<any> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (priority) params.append('priority', priority);

    const url = `${this.baseUrl}${MCP_ENDPOINTS.NEXT_TASK}${params.size ? '?' + params : ''}`;
    return this.fetchWithRetry(url, 'GET');
  }

  /**
   * GET /mcp/task/:taskId
   * Fetch a specific task by ID (for version conflict retry)
   */
  async getTaskById(taskId: string): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}/mcp/task/${taskId}`, 'GET');
  }

  /**
   * POST /mcp/reportTaskStatus
   * Report task completion and progress
   * Supports optimistic locking with expectedVersion parameter
   * Will retry with exponential backoff on version conflicts (409)
   * 
   * @param data Task status update data
   * @param maxAttempts Maximum number of attempts (1 initial + retries, default 3)
   */
  async reportTaskStatus(data: {
    taskId: string;
    status: 'in-progress' | 'done' | 'blocked' | 'failed';
    progressPercent?: number;
    implementationNotes?: string;
    filesModified?: string[];
    testing?: any;
    acceptanceCriteriaVerification?: any[];
    observations?: string[];
    followUpTasks?: any[];
    expectedVersion?: number;
  }, maxAttempts: number = 3): Promise<any> {
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        // Use direct fetch to bypass retry logic and handle 409 properly
        const response = await this.fetch(`${this.baseUrl}/mcp/reportTaskStatus`, 'POST', data);
        return response;
      } catch (error: any) {
        // Check if this is a 409 version conflict
        if (error.status === 409 && error.error === 'version_conflict') {
          attempt++;

          if (attempt >= maxAttempts) {
            const wrappedError: any = new Error(`Task status update failed after ${maxAttempts} attempts due to version conflicts. ${error.message || ''}`);
            // Preserve original error details for debugging
            wrappedError.status = error.status;
            wrappedError.error = error.error;
            wrappedError.currentVersion = error.currentVersion;
            wrappedError.expectedVersion = error.expectedVersion;
            wrappedError.currentStatus = error.currentStatus;
            throw wrappedError;
          }

          // Exponential backoff: 1s, 2s, 4s (capped at 5s)
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[MCPClient] Version conflict on attempt ${attempt}/${maxAttempts}, retrying in ${backoffMs}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));

          // Fetch latest task version for retry
          try {
            const taskData = await this.getTaskById(data.taskId);
            if (taskData?.task?.version !== undefined) {
              data.expectedVersion = taskData.task.version;
            } else {
              throw new Error(`Failed to fetch latest version for task ${data.taskId}: unexpected response format`);
            }
          } catch {
            // If we can't fetch latest version, throw the original error
            throw error;
          }
        } else {
          // Not a version conflict, throw immediately
          throw error;
        }
      }
    }

    // TypeScript requires a return statement here, though this is unreachable
    throw new Error('Unexpected error in retry loop');
  }

  /**
   * POST /api/v1/mcp/askQuestion
   * Ask contextual questions with plan/code context
   */
  async askQuestion(data: {
    question: string;
    currentTaskId?: string;
    planSection?: string;
    context?: any;
  }): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}${MCP_ENDPOINTS.ASK_QUESTION}`, 'POST', data);
  }

  /**
   * POST /api/v1/mcp/savePlan
   * Save wizard state and project plan
   */
  async savePlan(data: {
    name: string;
    description?: string;
    wizard_state: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    status?: 'draft' | 'active' | 'archived';
  }): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}${MCP_ENDPOINTS.SAVE_PLAN}`, 'POST', data);
  }

  /**
   * GET /api/v1/mcp/loadPlan/:id
   * Load saved plan by ID
   */
  async loadPlan(id: number): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}${MCP_ENDPOINTS.LOAD_PLAN}/${id}`, 'GET');
  }

  /**
   * GET /api/v1/mcp/listPlans
   * List all saved plans
   */
  async listPlans(status?: string, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const url = `${this.baseUrl}${MCP_ENDPOINTS.LIST_PLANS}${params.size ? '?' + params : ''}`;
    return this.fetchWithRetry(url, 'GET');
  }

  /**
   * GET /api/v1/teams/status
   * Get current team state with latest metrics
   */
  async getTeamsStatus(): Promise<TeamStatusResponse> {
    const url = `${this.baseUrl}${MCP_ENDPOINTS.TEAMS_STATUS}`;
    return this.fetchWithRetry(url, 'GET');
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch(url: string, method: string = 'GET', body?: any): Promise<any> {
    try {
      const options: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      if (this.authToken) {
        options.headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      if (body) {
        options.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error response body for detailed error info
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          // If JSON parsing fails, use default error
          errorData = { message: response.statusText };
        }

        // Create enhanced error object with status and details
        const error: any = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.error = errorData.error;
        error.currentVersion = errorData.currentVersion;
        error.expectedVersion = errorData.expectedVersion;
        error.currentStatus = errorData.currentStatus;
        throw error;
      }

      return response.json();
    } catch (error) {
      logError(error, 'MCPClient.fetch', { url, method });
      throw error;
    }
  }

  /**
   * Fetch with retry, timeout, and circuit breaker
   */
  private async fetchWithRetry(url: string, method: string = 'GET', body?: any): Promise<any> {
    try {
      return await this.circuitBreaker.execute(() =>
        retryWithBackoff(
          () => withTimeout(
            this.fetch(url, method, body),
            this.timeout,
            `Request to ${method} ${url} timed out after ${this.timeout}ms`
          ),
          createRetryHandler('MCPClient')
        )
      );
    } catch (error) {
      showErrorMessage(error, 'MCP Request Failed');
      throw error;
    }
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token?: string): void {
    this.authToken = token;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

/**
 * Export MCP endpoint paths for testing and external use
 */
export { MCP_ENDPOINTS };

/**
 * WebSocket Events Listener
 * Listens for real-time WebSocket events from MCP server
 * Reference: Code Master Section 11.8 - WebSocket Event Model
 */
export class MCPWebSocketListener {
  private listeners: Map<string, vscode.EventEmitter<any>> = new Map();
  private static instance: MCPWebSocketListener;

  private constructor() {
    // Initialize event emitters for each event type
    const eventTypes = ['task-status', 'observation', 'verification', 'test-failure', 'server-status', 'audit'];
    eventTypes.forEach(type => {
      this.listeners.set(type, new vscode.EventEmitter<any>());
    });
  }

  static getInstance(): MCPWebSocketListener {
    if (!MCPWebSocketListener.instance) {
      MCPWebSocketListener.instance = new MCPWebSocketListener();
    }
    return MCPWebSocketListener.instance;
  }

  /**
   * Subscribe to WebSocket event type
   */
  onEvent(eventType: string, handler: (data: any) => void): vscode.Disposable {
    const emitter = this.listeners.get(eventType);
    if (emitter) {
      return emitter.event(handler);
    }
    return { dispose: () => { } };
  }

  /**
   * Emit event (internal use - called by extension when WebSocket data arrives)
   */
  emit(eventType: string, data: any): void {
    const emitter = this.listeners.get(eventType);
    if (emitter) {
      emitter.fire(data);
    }
  }
}

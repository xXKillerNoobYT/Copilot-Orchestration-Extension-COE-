/**
 * MCP Client Service
 * Provides access to MCP server endpoints from VS Code extension
 * 
 * Reference: Code Master notebook, Section 11.7 - MCP Endpoints
 * Endpoints:
 * - GET /mcp/nextTask
 * - POST /mcp/reportTaskStatus
 * - POST /mcp/reportObservation
 * - POST /mcp/reportTestFailure
 * - POST /mcp/reportVerificationResult
 * - POST /mcp/askQuestion
 * - POST /mcp/savePlan
 * - GET /mcp/loadPlan/:id
 * - GET /mcp/listPlans
 */

import * as vscode from 'vscode';
import { retryWithBackoff, withTimeout, CircuitBreaker, showErrorMessage, logError, createRetryHandler } from '../utils/errorHandler';

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
  private static instance: MCPClient;
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
   * GET /mcp/nextTask
   * Fetch next ready task from queue with plan context
   */
  async getNextTask(filter?: string, priority?: string): Promise<any> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (priority) params.append('priority', priority);

    const url = `${this.baseUrl}/mcp/nextTask${params.size ? '?' + params : ''}`;
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
   */
  async reportTaskStatus(data: {
    taskId: string;
    status: 'in-progress' | 'done' | 'blocked' | 'failed';
    expectedVersion?: number;
    progressPercent?: number;
    implementationNotes?: string;
    filesModified?: string[];
    testing?: any;
    acceptanceCriteriaVerification?: any[];
    observations?: string[];
    followUpTasks?: any[];
  }, maxRetries: number = 3): Promise<any> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await this.fetchWithRetry(`${this.baseUrl}/mcp/reportTaskStatus`, 'POST', data);
      } catch (error: any) {
        // Check if it's a version conflict (409)
        if (error.status === 409 && (error.error === 'version_conflict' || !error.error)) {
          attempt++;
          
          if (attempt >= maxRetries) {
            throw new Error(`Task status update failed after ${maxRetries} attempts due to version conflicts. ${error.message || ''}`);
          }
          
          // Exponential backoff: 1s, 2s, 4s (capped at 5s)
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          
          // Fetch latest task version for retry
          try {
            const taskData = await this.getTaskById(data.taskId);
            if (taskData?.task) {
              data.expectedVersion = taskData.task.version;
            }
          } catch (fetchError) {
            // If we can't fetch latest version, throw the original error
            throw error;
          }
        } else {
          // Not a version conflict, throw immediately
          throw error;
        }
      }
    }
    
    throw new Error('Max retry attempts exceeded for task status update');
  }

  /**
   * POST /mcp/reportObservation
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
    return this.fetch(`${this.baseUrl}/mcp/reportObservation`, 'POST', data);
  }

  /**
   * POST /mcp/reportTestFailure
   * Report test failures and block task
   */
  async reportTestFailure(data: {
    taskId: string;
    testName: string;
    errorMessage: string;
    stackTrace?: string;
    failureType?: 'assertion' | 'timeout' | 'error' | 'other';
  }): Promise<any> {
    return this.fetch(`${this.baseUrl}/mcp/reportTestFailure`, 'POST', data);
  }

  /**
   * POST /mcp/reportVerificationResult
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
    return this.fetch(`${this.baseUrl}/mcp/reportVerificationResult`, 'POST', data);
  }

  /**
   * POST /mcp/askQuestion
   * Ask contextual questions with plan/code context
   */
  async askQuestion(data: {
    question: string;
    currentTaskId?: string;
    planSection?: string;
    context?: any;
  }): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}/mcp/askQuestion`, 'POST', data);
  }

  /**
   * POST /mcp/savePlan
   * Save wizard state and project plan
   */
  async savePlan(data: {
    name: string;
    description?: string;
    wizard_state: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    status?: 'draft' | 'active' | 'archived';
  }): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}/api/v1/mcp/savePlan`, 'POST', data);
  }

  /**
   * GET /mcp/loadPlan/:id
   * Load saved plan by ID
   */
  async loadPlan(id: number): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}/api/v1/mcp/loadPlan/${id}`, 'GET');
  }

  /**
   * GET /mcp/listPlans
   * List all saved plans
   */
  async listPlans(status?: string, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const url = `${this.baseUrl}/api/v1/mcp/listPlans${params.size ? '?' + params : ''}`;
    return this.fetchWithRetry(url, 'GET');
  }

  /**
   * GET /api/teams/status
   * Get current team state with latest metrics
   */
  async getTeamsStatus(): Promise<TeamStatusResponse> {
    const url = `${this.baseUrl}/api/teams/status`;
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
        let errorData;
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

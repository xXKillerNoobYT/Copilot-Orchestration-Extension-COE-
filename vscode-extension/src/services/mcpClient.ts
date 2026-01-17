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
  timeout?: number;
}

export class MCPClient {
  private baseUrl: string;
  private timeout: number = 10000;
  private static instance: MCPClient;
  private circuitBreaker: CircuitBreaker;

  private constructor(config: MCPConfig) {
    this.baseUrl = config.baseUrl;
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
      MCPClient.instance = new MCPClient({ baseUrl });
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
   * POST /mcp/reportTaskStatus
   * Report task completion and progress
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
  }): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}/mcp/reportTaskStatus`, 'POST', data);
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
  async getTeamsStatus(): Promise<{
    planning: {
      name: string;
      status: 'idle' | 'working' | 'blocked' | 'error';
      currentTask?: string;
      tasksCompleted: number;
      activeTaskCount: number;
      lastActivity?: string;
      metrics?: {
        tasksCreated?: number;
        planVersion?: string;
      };
    };
    answer: {
      name: string;
      status: 'idle' | 'working' | 'blocked' | 'error';
      currentTask?: string;
      tasksCompleted: number;
      activeTaskCount: number;
      lastActivity?: string;
      metrics?: {
        questionsAnswered?: number;
        currentTask?: string;
      };
    };
    decomposition: {
      name: string;
      status: 'idle' | 'working' | 'blocked' | 'error';
      currentTask?: string;
      tasksCompleted: number;
      activeTaskCount: number;
      lastActivity?: string;
      metrics?: {
        subtasksCreated?: number;
        avgTaskSize?: number;
      };
    };
    verification: {
      name: string;
      status: 'idle' | 'working' | 'blocked' | 'error';
      currentTask?: string;
      tasksCompleted: number;
      activeTaskCount: number;
      lastActivity?: string;
      metrics?: {
        tasksVerified?: number;
        pendingVisual?: number;
      };
    };
  }> {
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

      if (body) {
        options.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
    return { dispose: () => {} };
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

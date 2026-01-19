/**
 * GitHub Copilot Agent Mode API Client
 * 
 * Provides integration with GitHub Copilot's Agent Mode API for:
 * - Agent registration and discovery
 * - Task handoff between agents
 * - Context sharing and coordination
 * - Agent-to-agent communication
 * 
 * Reference: GitHub Copilot Agent Mode API (future integration)
 * Current implementation: Mock/stub for development and testing
 */

import * as vscode from 'vscode';
import { PromptPayload, ContextFile } from '../copilotDispatcher';

export interface CopilotAgentConfig {
  /** Base URL for GitHub Copilot Agent Mode API */
  baseUrl?: string;
  /** Authentication token for API access */
  authToken?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable mock mode for testing */
  mockMode?: boolean;
}

export interface AgentRegistration {
  /** Unique identifier for the agent */
  agentId: string;
  /** Agent name */
  name: string;
  /** Agent role/type */
  role: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Endpoint for receiving tasks */
  endpoint?: string;
}

export interface AgentHandoffRequest {
  /** ID of the task being handed off */
  taskId: string;
  /** Source agent ID */
  fromAgent: string;
  /** Target agent ID */
  toAgent: string;
  /** Context to pass to the next agent */
  context: Record<string, unknown>;
  /** Reason for handoff */
  reason?: string;
}

export interface AgentHandoffResponse {
  /** Whether handoff was successful */
  success: boolean;
  /** Handoff ID for tracking */
  handoffId?: string;
  /** Error message if failed */
  error?: string;
}

export interface AgentExecutionRequest {
  /** Unique request ID */
  requestId: string;
  /** Agent to execute the task */
  agentId: string;
  /** Task payload */
  payload: PromptPayload;
}

export interface AgentExecutionResponse {
  /** Whether execution was successful */
  success: boolean;
  /** Execution output/result */
  output: string;
  /** Agent that executed the task */
  agentId: string;
  /** Execution metadata */
  metadata?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
}

export interface AgentDiscoveryResult {
  /** Whether discovery was successful */
  success: boolean;
  /** List of discovered agents */
  agents: AgentRegistration[];
  /** Error message if failed */
  error?: string;
}

/**
 * GitHub Copilot Agent Mode API Client
 * 
 * Provides methods for:
 * 1. Authentication and connection management
 * 2. Agent registration and discovery
 * 3. Task handoff between agents
 * 4. Agent-to-agent communication
 */
export class CopilotAgentClient {
  private readonly config: Required<CopilotAgentConfig>;
  private registered: boolean = false;
  private currentAgentId: string | null = null;
  private registeredAgents: Set<string> = new Set(); // Track registered agent IDs
  private authenticationValid: boolean = false; // Track authentication validity

  constructor(config?: CopilotAgentConfig) {
    // Load configuration from VS Code settings
    const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
    
    this.config = {
      baseUrl: config?.baseUrl ?? vsConfig.get('mcp.baseUrl') ?? 'http://localhost:8000',
      authToken: config?.authToken ?? vsConfig.get('mcp.authToken') ?? '',
      timeout: config?.timeout ?? 30000,
      mockMode: config?.mockMode ?? vsConfig.get('agentMode.useMock', false), // Use real API by default
    };
  }

  /**
   * Authenticate with GitHub Copilot Agent Mode API
   * @returns Promise<boolean> - true if authentication successful
   */
  async authenticate(): Promise<boolean> {
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Authentication successful');
      this.authenticationValid = true;
      return true;
    }

    try {
      // TODO: Implement real authentication flow
      // This would involve:
      // 1. Validating authToken
      // 2. Exchanging token for session
      // 3. Setting up connection
      
      const response = await this.fetch('/auth/validate', 'POST', {
        token: this.config.authToken,
      });

      const isValid = response.valid === true;
      this.authenticationValid = isValid;
      return isValid;
    } catch (error) {
      console.error('[CopilotAgentClient] Authentication failed:', error);
      this.authenticationValid = false;
      return false;
    }
  }

  /**
   * Register this agent with GitHub Copilot Agent Mode
   * @param registration - Agent registration details
   * @returns Promise<boolean> - true if registration successful
   */
  async registerAgent(registration: AgentRegistration): Promise<boolean> {
    // Check if agent is already registered
    if (this.registeredAgents.has(registration.agentId)) {
      console.log('[CopilotAgentClient] Agent already registered:', registration.agentId);
      return true;
    }

    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Registered agent', registration.name);
      this.registered = true;
      this.currentAgentId = registration.agentId;
      this.registeredAgents.add(registration.agentId);
      return true;
    }

    try {
      // TODO: Implement real agent registration
      const response = await this.fetch('/agents/register', 'POST', registration);
      
      if (response.success) {
        this.registered = true;
        this.currentAgentId = registration.agentId;
        this.registeredAgents.add(registration.agentId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[CopilotAgentClient] Agent registration failed:', error);
      return false;
    }
  }

  /**
   * Handoff a task to another agent
   * @param request - Handoff request details
   * @returns Promise<AgentHandoffResponse> - Handoff result
   */
  async handoffTask(request: AgentHandoffRequest): Promise<AgentHandoffResponse> {
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Task handoff from', request.fromAgent, 'to', request.toAgent);
      return {
        success: true,
        handoffId: `handoff-${Date.now()}`,
      };
    }

    try {
      // TODO: Implement real task handoff
      const response = await this.fetch('/agents/handoff', 'POST', request);
      return response as AgentHandoffResponse;
    } catch (error) {
      console.error('[CopilotAgentClient] Task handoff failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute a task using a specific agent
   * Uses VS Code Language Model API when available
   * @param request - Execution request details
   * @returns Promise<AgentExecutionResponse> - Execution result
   */
  async executeTask(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Executing task with agent', request.agentId);
      
      // Generate a simulated response
      const output = this.generateMockResponse(request.payload);
      
      return {
        success: true,
        output,
        agentId: request.agentId,
        metadata: {
          executionTime: Math.random() * 1000 + 500,
          tokensUsed: Math.floor(Math.random() * 1000) + 100,
        },
      };
    }

    try {
      // Use VS Code Language Model API (real GitHub Copilot integration)
      console.log('[CopilotAgentClient] Using VS Code Language Model API for task execution');
      
      const startTime = Date.now();
      const output = await this.executeWithLanguageModel(request.payload);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output,
        agentId: request.agentId,
        metadata: {
          executionTime,
          model: 'copilot-gpt-4', // VS Code Language Model
        },
      };
    } catch (error) {
      console.error('[CopilotAgentClient] Task execution failed:', error);
      
      // Fallback to mock response on error
      console.warn('[CopilotAgentClient] Falling back to mock response');
      const output = this.generateMockResponse(request.payload);
      
      return {
        success: false,
        output,
        agentId: request.agentId,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute task using VS Code Language Model API
   * This is the real implementation for GitHub Copilot integration
   */
  private async executeWithLanguageModel(payload: PromptPayload): Promise<string> {
    try {
      // Minimum VS Code version for Language Model API
      const MIN_VSCODE_VERSION = '1.90';
      
      // Check VS Code version
      const currentVersion = vscode.version;
      if (!this.isVersionSupported(currentVersion, MIN_VSCODE_VERSION)) {
        throw new Error(
          `VS Code version ${currentVersion} does not meet minimum requirement ${MIN_VSCODE_VERSION}. ` +
          `Please upgrade VS Code to use the Language Model API.`
        );
      }
      
      // Check if Language Model API is available
      if (!vscode.lm || typeof vscode.lm.selectChatModels !== 'function') {
        throw new Error(`VS Code Language Model API not available. Requires VS Code ${MIN_VSCODE_VERSION}+`);
      }

      // Select Copilot chat model
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4',
      });

      if (models.length === 0) {
        throw new Error('No Copilot chat models available. Ensure GitHub Copilot is installed and authenticated.');
      }

      const model = models[0];
      console.log(`[CopilotAgentClient] Using model: ${model.vendor}/${model.family} (${model.name})`);

      // Build messages for the chat model
      const messages: vscode.LanguageModelChatMessage[] = [];

      // System message with agent context
      messages.push(vscode.LanguageModelChatMessage.Assistant(
        `You are ${payload.agent.name}, a ${payload.agent.role} agent in a software development orchestration system. ${payload.agent.instructions || ''}`
      ));

      // Add context files if available
      if (payload.context.files && payload.context.files.length > 0) {
        const contextSummary = payload.context.files
          .map((f: ContextFile) => `- ${f.path}${f.truncated ? ' (truncated)' : ''}`)
          .join('\n');
        
        messages.push(vscode.LanguageModelChatMessage.User(
          `Context files:\n${contextSummary}\n\nAdditional context: ${JSON.stringify(payload.context.files.slice(0, 3))}`
        ));
      }

      // Add main task instruction
      const taskInstruction = `
Task: ${payload.task.title}
Description: ${payload.task.description || 'No description provided'}

Dependencies: ${payload.task.dependencies.length > 0 ? payload.task.dependencies.join(', ') : 'None'}
Priority: ${payload.task.priority || 'Medium'}

Please provide a detailed implementation plan and solution for this task.
Include:
1. Analysis of the task requirements
2. Implementation approach
3. Code samples or pseudocode if applicable
4. Testing considerations
5. Next steps

Format your response in Markdown.
`;

      messages.push(vscode.LanguageModelChatMessage.User(taskInstruction));

      // Send request to language model with proper cancellation token management
      const cancellationTokenSource = new vscode.CancellationTokenSource();
      let response: vscode.LanguageModelChatResponse;
      try {
        response = await model.sendRequest(messages, {}, cancellationTokenSource.token);
      } finally {
        cancellationTokenSource.dispose();
      }

      // Collect response text
      let output = '';
      for await (const fragment of response.text) {
        output += fragment;
      }

      if (!output || output.trim().length === 0) {
        throw new Error('Language model returned empty response');
      }

      console.log(`[CopilotAgentClient] Received response from language model (${output.length} chars)`);
      return output;

    } catch (error) {
      console.error('[CopilotAgentClient] Language model execution failed:', error);
      throw error;
    }
  }

  /**
   * Compare semantic versions to check if current version meets minimum requirement
   * @param current Current version string (e.g., "1.90.0")
   * @param minimum Minimum required version (e.g., "1.90")
   * @returns true if current version meets or exceeds minimum
   */
  private isVersionSupported(current: string, minimum: string): boolean {
    const parseCurrent = current.split('.').map(n => parseInt(n, 10));
    const parseMinimum = minimum.split('.').map(n => parseInt(n, 10));

    // Pad arrays to same length
    while (parseCurrent.length < parseMinimum.length) {
      parseCurrent.push(0);
    }
    while (parseMinimum.length < parseCurrent.length) {
      parseMinimum.push(0);
    }

    // Compare each segment
    for (let i = 0; i < parseMinimum.length; i++) {
      if (parseCurrent[i] > parseMinimum[i]) {
        return true;
      } else if (parseCurrent[i] < parseMinimum[i]) {
        return false;
      }
    }

    return true; // Versions are equal
  }

  /**
   * Discover available agents
   * @returns Promise<AgentDiscoveryResult> - Discovery result with agents or error
   */
  async discoverAgents(): Promise<AgentDiscoveryResult> {
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Returning mock agents');
      return {
        success: true,
        agents: [
          {
            agentId: 'copilot-code-agent',
            name: 'Code Agent',
            role: 'code',
            capabilities: ['code-generation', 'code-review', 'refactoring'],
          },
          {
            agentId: 'copilot-test-agent',
            name: 'Test Agent',
            role: 'testing',
            capabilities: ['test-generation', 'test-execution', 'coverage-analysis'],
          },
          {
            agentId: 'copilot-review-agent',
            name: 'Review Agent',
            role: 'review',
            capabilities: ['code-review', 'security-analysis', 'best-practices'],
          },
        ],
      };
    }

    try {
      // TODO: Implement real agent discovery
      const response = await this.fetch('/agents/discover', 'GET');
      return {
        success: true,
        agents: response.agents as AgentRegistration[],
      };
    } catch (error) {
      console.error('[CopilotAgentClient] Agent discovery failed:', error);
      return {
        success: false,
        agents: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if the client is connected and registered
   */
  isConnected(): boolean {
    return this.registered;
  }

  /**
   * Get the current agent ID
   */
  getCurrentAgentId(): string | null {
    return this.currentAgentId;
  }

  /**
   * Internal fetch method for API calls
   */
  private async fetch(endpoint: string, method: string, body?: unknown): Promise<Record<string, any>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as Record<string, any>;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      // Check if error is an AbortError (timeout)
      const err = error as any;
      const isAbortError = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
      
      if (isAbortError) {
        const timeoutMs = this.config.timeout;
        const timeoutMsg = typeof timeoutMs === 'number' ? ` after ${timeoutMs}ms` : '';
        throw new Error(`Request to ${endpoint} timed out${timeoutMsg}`);
      }
      
      throw error;
    }
  }

  /**
   * Format context files for display in mock response
   */
  private formatContextFiles(files: ContextFile[]): string {
    if (files.length === 0) {
      return 'No context files provided';
    }
    return files.map(f => `- ${f.path}${f.truncated ? ' (truncated)' : ''}`).join('\n');
  }

  /**
   * Generate a mock response for testing
   */
  private generateMockResponse(payload: PromptPayload): string {
    return `# GitHub Copilot Agent Mode Response (Mock)

**Task:** ${payload.taskId}
**Agent:** ${payload.agent.name}
**Role:** ${payload.agent.role}

## Analysis
This is a simulated response from GitHub Copilot Agent Mode API. In production, this would be the actual AI-generated output from GitHub Copilot's agent infrastructure.

## Task Context
- **Task Title:** ${payload.task.title}
- **Task Description:** ${payload.task.description || 'No description provided'}
- **Status:** ${payload.task.status || 'pending'}
- **Priority:** ${payload.task.priority || 'medium'}

## Agent Instructions
${payload.agent.instructions || 'Using default agent instructions'}

## Context Files
${this.formatContextFiles(payload.context.files)}

## Implementation Plan
1. Review task requirements and constraints
2. Analyze provided context and dependencies
3. Generate implementation following best practices
4. Ensure code quality and test coverage
5. Document changes and update relevant files

## Next Steps
- Execute implementation according to agent role
- Run verification and testing
- Report results and update task status

---
*Note: This is a mock response. Real implementation requires GitHub Copilot Agent Mode API access and proper authentication.*
`;
  }
}

/**
 * Singleton instance for global access
 */
let defaultClient: CopilotAgentClient | null = null;

/**
 * Get or create the default CopilotAgentClient instance
 */
export function getDefaultCopilotAgentClient(): CopilotAgentClient {
  if (!defaultClient) {
    defaultClient = new CopilotAgentClient();
  }
  return defaultClient;
}

/**
 * Reset the default client (useful for testing)
 */
export function resetDefaultCopilotAgentClient(): void {
  defaultClient = null;
}

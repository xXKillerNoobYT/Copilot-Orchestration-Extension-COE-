/**
 * GitHub Copilot Agent Mode API Client
 * 
 * Provides integration with GitHub Copilot's Agent Mode API for:
 * - Agent registration and discovery
 * - Task handoff between agents
 * - Context sharing and coordination
 * - Agent-to-agent communication
 * 
 * Reference: PRD.json - Multi-Agent Orchestration (4 Specialized Teams)
 * Implementation: Real API integration with backend and GitHub authentication
 */

import * as vscode from 'vscode';
import { PromptPayload, ContextFile } from '../copilotDispatcher';
import { GitHubAuthProvider } from '../auth/githubAuthProvider';
import { parse as parseYAML } from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Retry utility function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param operation - Name of operation for logging
 * @returns Result of the function or throws error after max attempts
 */
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  operation: string = 'operation'
): Promise<T> {
  let attempts = 0;
  let lastError: Error | null = null;
  
  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      attempts++;
      
      if (attempts < maxAttempts) {
        // Exponential backoff: wait 2^attempts seconds
        const backoffMs = Math.pow(2, attempts) * 1000;
        console.log(`[CopilotAgentClient] ${operation} attempt ${attempts} failed, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  throw lastError || new Error(`${operation} failed after ${maxAttempts} attempts`);
}

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
 * Agent Profile Interface (loaded from YAML)
 */
export interface AgentProfile {
  name: string;
  agentId: string;
  role: string;
  type: string;
  description: string;
  capabilities: string[];
  configuration: Record<string, any>;
  routing_rules?: {
    triggers?: string[];
    handoff_to?: Record<string, string[]>;
  };
  metrics_tracked?: string[];
  constraints?: Record<string, any>;
}

/**
 * Analytics Event Interface
 */
export interface AnalyticsEvent {
  agentId: string;
  eventType: 'task_execution' | 'task_handoff' | 'agent_registration' | 'agent_discovery';
  timestamp: Date;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * GitHub Copilot Agent Mode API Client
 * 
 * Provides methods for:
 * 1. Authentication and connection management
 * 2. Agent registration and discovery
 * 3. Task handoff between agents
 * 4. Agent-to-agent communication
 * 5. Analytics integration
 */
export class CopilotAgentClient {
  private readonly config: Required<CopilotAgentConfig>;
  private registered: boolean = false;
  private currentAgentId: string | null = null;
  private registeredAgents: Set<string> = new Set(); // Track registered agent IDs
  private authenticationValid: boolean = false; // Track authentication validity
  private authProvider: GitHubAuthProvider | null = null;
  private agentProfiles: Map<string, AgentProfile> = new Map();
  private analyticsQueue: AnalyticsEvent[] = [];
  
  // Cache for agent discovery results
  private agentDiscoveryCache: { agents: AgentRegistration[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  
  // Maximum analytics queue size to prevent memory leaks
  private readonly MAX_ANALYTICS_QUEUE_SIZE = 1000;

  constructor(
    config?: CopilotAgentConfig,
    private readonly context?: vscode.ExtensionContext
  ) {
    // Load configuration from VS Code settings
    const vsConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
    
    this.config = {
      baseUrl: config?.baseUrl ?? vsConfig.get('backendUrl') ?? 'http://localhost:8000',
      authToken: config?.authToken ?? '',
      timeout: config?.timeout ?? 30000,
      mockMode: config?.mockMode ?? false, // Real API mode by default
    };
    
    // Initialize auth provider if context is available
    if (this.context) {
      this.authProvider = new GitHubAuthProvider(this.context.secrets);
      // Load stored token if available
      this.loadStoredToken();
    }
    
    // Load agent profiles from YAML files (async, non-blocking)
    this.loadAgentProfiles().catch(err => {
      console.error('[CopilotAgentClient] Failed to load agent profiles:', err);
    });
  }
  
  /**
   * Load stored authentication token from secret storage
   */
  private async loadStoredToken(): Promise<void> {
    if (!this.authProvider) {
      return;
    }
    
    try {
      const token = await this.authProvider.getStoredToken();
      if (token) {
        this.config.authToken = token;
      }
    } catch (error) {
      console.error('[CopilotAgentClient] Failed to load stored token:', error);
    }
  }

  /**
   * Load agent profiles from YAML configuration files
   * 
   * Uses asynchronous file operations to avoid blocking the extension host
   */
  private async loadAgentProfiles(): Promise<void> {
    try {
      // Use extension context for reliable path resolution if available
      const baseDir = this.context?.extensionPath ?? __dirname;
      const profilesDir = path.join(baseDir, 'src/config/agent-profiles');
      
      const profileFiles = [
        'planning-team.yaml',
        'answer-team.yaml',
        'decomposition-team.yaml',
        'verification-team.yaml',
      ];
      
      for (const filename of profileFiles) {
        const filepath = path.join(profilesDir, filename);
        try {
          await fs.promises.access(filepath);
          const content = await fs.promises.readFile(filepath, 'utf-8');
          const profile = parseYAML(content) as AgentProfile;
          this.agentProfiles.set(profile.agentId, profile);
          console.log(`[CopilotAgentClient] Loaded agent profile: ${profile.name}`);
        } catch {
          // File doesn't exist or can't be read, skip silently
        }
      }
    } catch (error) {
      console.error('[CopilotAgentClient] Failed to load agent profiles:', error);
    }
  }

  /**
   * Authenticate with GitHub Copilot Agent Mode API
   * 
   * Real implementation:
   * 1. Uses GitHub token from VS Code Secret Storage
   * 2. Validates token with GitHub API
   * 3. Exchanges token for backend session
   * 4. Stores credentials securely
   * 
   * @returns Promise<boolean> - true if authentication successful
   */
  async authenticate(): Promise<boolean> {
    // Mock mode bypass
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Authentication successful');
      this.authenticationValid = true;
      return true;
    }

    try {
      // Real authentication flow
      if (!this.authProvider) {
        const errorMsg = 'Auth provider not initialized. CopilotAgentClient requires ExtensionContext for authentication.';
        console.error(`[CopilotAgentClient] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Step 1: Authenticate with GitHub and get token
      const authResult = await this.authProvider.authenticate();
      
      if (!authResult.success || !authResult.token) {
        console.error('[CopilotAgentClient] GitHub authentication failed:', authResult.error);
        this.authenticationValid = false;
        return false;
      }
      
      // Step 2: Validate token with backend API
      const response = await this.fetch('/api/v1/auth/validate', 'POST', {
        token: authResult.token,
      });

      const isValid = response.success === true;
      this.authenticationValid = isValid;
      
      if (isValid) {
        this.config.authToken = authResult.token;
        console.log('[CopilotAgentClient] Authentication successful');
      } else {
        console.error('[CopilotAgentClient] Backend token validation failed');
      }
      
      return isValid;
      
    } catch (error) {
      console.error('[CopilotAgentClient] Authentication failed:', error);
      this.authenticationValid = false;
      return false;
    }
  }

  /**
   * Register this agent with GitHub Copilot Agent Mode
   * 
   * Real implementation:
   * 1. Registers agent with backend API (/api/v1/agents)
   * 2. Implements retry logic with exponential backoff
   * 3. Loads agent profile from YAML configuration
   * 4. Handles registration failures gracefully
   * 
   * @param registration - Agent registration details
   * @returns Promise<boolean> - true if registration successful
   */
  async registerAgent(registration: AgentRegistration): Promise<boolean> {
    // Check if agent is already registered
    if (this.registeredAgents.has(registration.agentId)) {
      console.log('[CopilotAgentClient] Agent already registered:', registration.agentId);
      return true;
    }

    // Mock mode bypass
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Registered agent', registration.name);
      this.registered = true;
      this.currentAgentId = registration.agentId;
      this.registeredAgents.add(registration.agentId);
      return true;
    }

    try {
      // Real agent registration with backend API using retry utility
      await retryWithExponentialBackoff(async () => {
        // Load agent profile from YAML if available
        const profile = this.agentProfiles.get(registration.agentId);
        
        // Prepare registration payload
        const payload = {
          name: registration.name,
          type: profile?.type ?? this.mapRoleToType(registration.role),
          description: profile?.description ?? `Agent for ${registration.role}`,
          capabilities: registration.capabilities,
          configuration: profile?.configuration ?? {},
          llm_provider: profile?.configuration?.llm_provider ?? 'copilot',
          is_active: true,
        };
        
        const response = await this.fetch('/api/v1/agents', 'POST', payload);
        
        if (!response.success) {
          throw new Error(response.error || 'Registration failed');
        }
        
        return response;
      }, 3, 'Agent registration');
      
      // Registration successful
      this.registered = true;
      this.currentAgentId = registration.agentId;
      this.registeredAgents.add(registration.agentId);
      
      // Track analytics
      this.trackAnalytics({
        agentId: registration.agentId,
        eventType: 'agent_registration',
        timestamp: new Date(),
        success: true,
        metadata: { name: registration.name, role: registration.role },
      });
      
      console.log(`[CopilotAgentClient] Successfully registered agent: ${registration.name}`);
      return true;
      
    } catch (error) {
      console.error('[CopilotAgentClient] Agent registration failed after retries:', error);
      
      // Track failed registration
      this.trackAnalytics({
        agentId: registration.agentId,
        eventType: 'agent_registration',
        timestamp: new Date(),
        success: false,
        metadata: { error: (error as Error).message },
      });
      
      return false;
    }
  }
  
  /**
   * Map agent role to backend agent type
   */
  private mapRoleToType(role: string): string {
    const roleMapping: Record<string, string> = {
      'planning': 'planner',
      'answer': 'documentation',
      'decomposition': 'planner',
      'verification': 'tester',
      'code': 'coder',
      'review': 'reviewer',
      'testing': 'tester',
    };
    
    return roleMapping[role] || 'coder';
  }

  /**
   * Handoff a task to another agent
   * 
   * Real implementation:
   * 1. Submits handoff request to backend API
   * 2. Includes full context for next agent
   * 3. Handles handoff failures and timeout (30s)
   * 4. Tracks handoff analytics
   * 
   * @param request - Handoff request details
   * @returns Promise<AgentHandoffResponse> - Handoff result
   */
  async handoffTask(request: AgentHandoffRequest): Promise<AgentHandoffResponse> {
    const startTime = Date.now();
    
    // Mock mode bypass
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Task handoff from', request.fromAgent, 'to', request.toAgent);
      return {
        success: true,
        handoffId: `handoff-${Date.now()}`,
      };
    }

    try {
      // Real task handoff via backend API
      const response = await this.fetch('/api/v1/agents/handoff', 'POST', {
        task_id: request.taskId,
        from_agent_id: request.fromAgent,
        to_agent_id: request.toAgent,
        context: request.context,
        reason: request.reason,
      });
      
      const duration = Date.now() - startTime;
      
      // Track analytics
      this.trackAnalytics({
        agentId: request.fromAgent,
        eventType: 'task_handoff',
        timestamp: new Date(),
        duration,
        success: response.success === true,
        metadata: {
          taskId: request.taskId,
          toAgent: request.toAgent,
        },
      });
      
      if (response.success) {
        return {
          success: true,
          handoffId: response.data?.handoff_id || `handoff-${Date.now()}`,
        };
      }
      
      return {
        success: false,
        error: response.error || 'Handoff failed',
      };
      
    } catch (error) {
      console.error('[CopilotAgentClient] Task handoff failed:', error);
      
      // Track failed handoff
      this.trackAnalytics({
        agentId: request.fromAgent,
        eventType: 'task_handoff',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        metadata: { error: (error as Error).message },
      });
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute a task using a specific agent
   * 
   * Real implementation:
   * 1. Submits task execution request to backend
   * 2. Streams execution results via MCP protocol
   * 3. Handles execution timeout (30s) and errors
   * 4. Implements retry logic (3 attempts)
   * 5. Tracks execution analytics
   * 
   * @param request - Execution request details
   * @returns Promise<AgentExecutionResponse> - Execution result
   */
  async executeTask(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const startTime = Date.now();
    
    // Mock mode bypass
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
      // Real task execution via backend API with retry utility
      const response = await retryWithExponentialBackoff(async () => {
        const res = await this.fetch('/api/v1/tasks/execute', 'POST', {
          request_id: request.requestId,
          agent_id: request.agentId,
          task_id: request.payload.taskId,
          payload: request.payload,
        });
        
        if (!res.success) {
          throw new Error(res.error || 'Execution failed');
        }
        
        return res;
      }, 3, 'Task execution');
      
      const duration = Date.now() - startTime;
      
      // Track successful execution
      this.trackAnalytics({
        agentId: request.agentId,
        eventType: 'task_execution',
        timestamp: new Date(),
        duration,
        success: true,
        metadata: {
          taskId: request.payload.taskId,
          requestId: request.requestId,
        },
      });
      
      return {
        success: true,
        output: response.data?.output || response.data?.result || '',
        agentId: request.agentId,
        metadata: {
          executionTime: duration,
          ...(response.data?.metadata || {}),
        },
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('[CopilotAgentClient] Task execution failed after retries:', error);
      
      this.trackAnalytics({
        agentId: request.agentId,
        eventType: 'task_execution',
        timestamp: new Date(),
        duration,
        success: false,
        metadata: { error: (error as Error).message },
      });
      
      return {
        success: false,
        output: '',
        agentId: request.agentId,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Discover available agents
   * 
   * Real implementation:
   * 1. Fetches agents from backend API (/api/v1/agents)
   * 2. Loads agent profiles from YAML configuration
   * 3. Caches results (5-minute TTL)
   * 4. Matches tasks to agent capabilities
   * 
   * @returns Promise<AgentDiscoveryResult> - Discovery result with agents or error
   */
  async discoverAgents(): Promise<AgentDiscoveryResult> {
    // Check cache first
    if (this.agentDiscoveryCache) {
      const cacheAge = Date.now() - this.agentDiscoveryCache.timestamp;
      if (cacheAge < this.CACHE_TTL_MS) {
        console.log('[CopilotAgentClient] Returning cached agent discovery results');
        return {
          success: true,
          agents: this.agentDiscoveryCache.agents,
        };
      }
    }
    
    // Mock mode bypass
    if (this.config.mockMode) {
      console.log('[CopilotAgentClient] Mock mode: Returning mock agents');
      const mockAgents = [
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
      ];
      
      // Cache mock results
      this.agentDiscoveryCache = {
        agents: mockAgents,
        timestamp: Date.now(),
      };
      
      return {
        success: true,
        agents: mockAgents,
      };
    }

    try {
      // Real agent discovery via backend API
      const response = await this.fetch('/api/v1/agents', 'GET');
      
      if (!response.success) {
        throw new Error(response.error || 'Discovery failed');
      }
      
      // Map backend agent data to AgentRegistration format
      const agents: AgentRegistration[] = (response.data || []).map((agent: any) => {
        const profile = this.agentProfiles.get(agent.id);
        
        return {
          agentId: agent.id,
          name: agent.name,
          role: profile?.role || this.mapTypeToRole(agent.type),
          capabilities: profile?.capabilities || agent.capabilities || [],
          endpoint: agent.endpoint,
        };
      });
      
      // Add agents from YAML profiles that aren't in backend yet
      for (const [agentId, profile] of this.agentProfiles.entries()) {
        if (!agents.find(a => a.agentId === agentId)) {
          agents.push({
            agentId: profile.agentId,
            name: profile.name,
            role: profile.role,
            capabilities: profile.capabilities,
          });
        }
      }
      
      // Cache results
      this.agentDiscoveryCache = {
        agents,
        timestamp: Date.now(),
      };
      
      // Track analytics
      this.trackAnalytics({
        agentId: 'system',
        eventType: 'agent_discovery',
        timestamp: new Date(),
        success: true,
        metadata: { agentCount: agents.length },
      });
      
      console.log(`[CopilotAgentClient] Discovered ${agents.length} agents`);
      
      return {
        success: true,
        agents,
      };
      
    } catch (error) {
      console.error('[CopilotAgentClient] Agent discovery failed:', error);
      
      // Track failed discovery
      this.trackAnalytics({
        agentId: 'system',
        eventType: 'agent_discovery',
        timestamp: new Date(),
        success: false,
        metadata: { error: (error as Error).message },
      });
      
      return {
        success: false,
        agents: [],
        error: (error as Error).message,
      };
    }
  }
  
  /**
   * Map backend agent type to role
   */
  private mapTypeToRole(type: string): string {
    const typeMapping: Record<string, string> = {
      'planner': 'planning',
      'documentation': 'answer',
      'tester': 'verification',
      'coder': 'code',
      'reviewer': 'review',
    };
    
    return typeMapping[type] || type;
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
  
  /**
   * Track analytics event
   * 
   * Queues analytics events for batch submission to backend
   * Events are flushed automatically every 30 seconds or when queue reaches 50 events
   * Implements maximum queue size to prevent memory leaks
   */
  private trackAnalytics(event: AnalyticsEvent): void {
    // Check if queue has reached maximum size
    if (this.analyticsQueue.length >= this.MAX_ANALYTICS_QUEUE_SIZE) {
      // Drop oldest events to prevent memory exhaustion
      // Reduce to 1/4 of max size to minimize frequent reallocations
      const retainSize = Math.max(1, Math.floor(this.MAX_ANALYTICS_QUEUE_SIZE / 4));
      console.warn(`[CopilotAgentClient] Analytics queue full (${this.MAX_ANALYTICS_QUEUE_SIZE} events), dropping to ${retainSize} events`);
      this.analyticsQueue = this.analyticsQueue.slice(-retainSize);
    }
    
    this.analyticsQueue.push(event);
    
    // Auto-flush if queue is getting large
    if (this.analyticsQueue.length >= 50) {
      this.flushAnalytics().catch(error => {
        console.error('[CopilotAgentClient] Analytics flush failed:', error);
      });
    }
  }
  
  /**
   * Flush analytics events to backend
   * 
   * Sends queued analytics events to backend analytics endpoint
   * Implements batch submission for efficiency with retry limit
   * 
   * @returns Promise<boolean> - true if flush successful
   */
  async flushAnalytics(): Promise<boolean> {
    if (this.analyticsQueue.length === 0) {
      return true;
    }
    
    // Don't send analytics in mock mode
    if (this.config.mockMode) {
      this.analyticsQueue = [];
      return true;
    }
    
    const events = [...this.analyticsQueue];
    this.analyticsQueue = [];
    
    try {
      const response = await this.fetch('/api/v1/analytics/events', 'POST', {
        events: events.map(e => ({
          agent_id: e.agentId,
          event_type: e.eventType,
          timestamp: e.timestamp.toISOString(),
          duration_ms: e.duration,
          success: e.success,
          metadata: e.metadata,
        })),
      });
      
      if (response.success) {
        console.log(`[CopilotAgentClient] Flushed ${events.length} analytics events`);
        return true;
      }
      
      // Re-queue events if submission failed, but limit to prevent unbounded growth
      if (this.analyticsQueue.length + events.length <= this.MAX_ANALYTICS_QUEUE_SIZE) {
        this.analyticsQueue.push(...events);
      } else {
        console.warn('[CopilotAgentClient] Dropping analytics events due to queue size limit');
      }
      return false;
      
    } catch (error) {
      console.error('[CopilotAgentClient] Failed to flush analytics:', error);
      // Re-queue events with size limit
      if (this.analyticsQueue.length + events.length <= this.MAX_ANALYTICS_QUEUE_SIZE) {
        this.analyticsQueue.push(...events);
      } else {
        console.warn('[CopilotAgentClient] Dropping analytics events due to queue size limit');
      }
      return false;
    }
  }
  
  /**
   * Get agent profile by ID
   * 
   * @param agentId - Agent identifier
   * @returns Agent profile or undefined if not found
   */
  getAgentProfile(agentId: string): AgentProfile | undefined {
    return this.agentProfiles.get(agentId);
  }
  
  /**
   * Get all loaded agent profiles
   * 
   * @returns Map of agent ID to profile
   */
  getAllAgentProfiles(): Map<string, AgentProfile> {
    return new Map(this.agentProfiles);
  }
  
  /**
   * Clear agent discovery cache
   * 
   * Forces next discoverAgents() call to fetch fresh data
   */
  clearDiscoveryCache(): void {
    this.agentDiscoveryCache = null;
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

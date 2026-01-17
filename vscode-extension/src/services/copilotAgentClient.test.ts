/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  CopilotAgentClient, 
  CopilotAgentConfig, 
  AgentRegistration,
  AgentHandoffRequest,
  AgentExecutionRequest,
  getDefaultCopilotAgentClient,
  resetDefaultCopilotAgentClient,
} from './copilotAgentClient';
import { PromptPayload } from '../copilotDispatcher';
import { ParsedTask } from '../taskParser';

// Jest type definitions
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function beforeEach(fn: () => Promise<void> | void): void;
declare function afterEach(fn: () => Promise<void> | void): void;

interface Expect {
  (actual: any): any;
  toBeDefined(): void;
  toEqual(expected: any): void;
  toBe(expected: any): void;
  toContain(expected: any): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toThrow(): void;
  not: any;
  toMatch(expected: RegExp): void;
  toBeTruthy(): void;
  toHaveLength(length: number): void;
  toHaveProperty(property: string, value?: any): void;
}

declare function expect(actual: any): Expect;

describe('CopilotAgentClient', () => {
  let client: CopilotAgentClient;

  beforeEach(() => {
    // Reset and create a new client in mock mode for each test
    resetDefaultCopilotAgentClient();
    client = new CopilotAgentClient({ mockMode: true });
  });

  afterEach(() => {
    resetDefaultCopilotAgentClient();
  });

  describe('Configuration', () => {
    test('should create client with default configuration', () => {
      const defaultClient = new CopilotAgentClient();
      expect(defaultClient).toBeDefined();
      expect(defaultClient.isConnected()).toBe(false);
    });

    test('should create client with custom configuration', () => {
      const config: CopilotAgentConfig = {
        baseUrl: 'https://api.github.com/copilot',
        authToken: 'test-token',
        timeout: 60000,
        mockMode: false,
      };
      const customClient = new CopilotAgentClient(config);
      expect(customClient).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('should authenticate successfully in mock mode', async () => {
      const result = await client.authenticate();
      expect(result).toBe(true);
    });

    test('should handle authentication in mock mode', async () => {
      const authenticated = await client.authenticate();
      expect(authenticated).toBeTruthy();
    });
  });

  describe('Agent Registration', () => {
    test('should register agent successfully in mock mode', async () => {
      const registration: AgentRegistration = {
        agentId: 'test-agent-001',
        name: 'Test Agent',
        role: 'testing',
        capabilities: ['test-generation', 'test-execution'],
      };

      const result = await client.registerAgent(registration);
      expect(result).toBe(true);
      expect(client.isConnected()).toBe(true);
      expect(client.getCurrentAgentId()).toBe('test-agent-001');
    });

    test('should track registered agent ID', async () => {
      const registration: AgentRegistration = {
        agentId: 'code-agent-123',
        name: 'Code Agent',
        role: 'code',
        capabilities: ['code-generation'],
      };

      await client.registerAgent(registration);
      expect(client.getCurrentAgentId()).toBe('code-agent-123');
    });
  });

  describe('Agent Discovery', () => {
    test('should discover available agents in mock mode', async () => {
      const agents = await client.discoverAgents();
      expect(agents).toBeDefined();
      expect(agents.length).toBeGreaterThan(0);
      
      // Check that mock agents have required properties
      agents.forEach(agent => {
        expect(agent).toHaveProperty('agentId');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('role');
        expect(agent).toHaveProperty('capabilities');
      });
    });

    test('should return different agent types', async () => {
      const agents = await client.discoverAgents();
      const roles = agents.map(a => a.role);
      
      expect(roles).toContain('code');
      expect(roles).toContain('testing');
      expect(roles).toContain('review');
    });
  });

  describe('Task Handoff', () => {
    test('should handoff task successfully in mock mode', async () => {
      const handoffRequest: AgentHandoffRequest = {
        taskId: 'TASK-001',
        fromAgent: 'agent-1',
        toAgent: 'agent-2',
        context: {
          previousResults: 'some results',
          nextSteps: ['step 1', 'step 2'],
        },
        reason: 'Task requires different expertise',
      };

      const result = await client.handoffTask(handoffRequest);
      expect(result.success).toBe(true);
      expect(result.handoffId).toBeDefined();
      expect(result.handoffId).toMatch(/^handoff-/);
    });

    test('should include handoff context', async () => {
      const context = {
        taskType: 'code-review',
        previousAgent: 'code-generator',
        files: ['file1.ts', 'file2.ts'],
      };

      const handoffRequest: AgentHandoffRequest = {
        taskId: 'TASK-002',
        fromAgent: 'code-agent',
        toAgent: 'review-agent',
        context,
      };

      const result = await client.handoffTask(handoffRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('Task Execution', () => {
    test('should execute task successfully in mock mode', async () => {
      const mockTask: ParsedTask = {
        id: 'TASK-003',
        title: 'Implement feature X',
        description: 'Add new feature to the system',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        assignees: [],
        labels: [],
        subtasks: [],
        rawFrontMatter: {},
      };

      const mockPayload: PromptPayload = {
        taskId: 'TASK-003',
        agent: {
          name: 'Code Agent',
          role: 'code',
          instructions: 'Generate high-quality code',
        },
        task: mockTask,
        context: {
          files: [],
        },
        memory: [],
        messages: [],
      };

      const executionRequest: AgentExecutionRequest = {
        requestId: 'req-001',
        agentId: 'code-agent-001',
        payload: mockPayload,
      };

      const result = await client.executeTask(executionRequest);
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.agentId).toBe('code-agent-001');
    });

    test('should include execution metadata', async () => {
      const mockTask: ParsedTask = {
        id: 'TASK-004',
        title: 'Write tests',
        description: '',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        assignees: [],
        labels: [],
        subtasks: [],
        rawFrontMatter: {},
      };

      const mockPayload: PromptPayload = {
        taskId: 'TASK-004',
        agent: {
          name: 'Test Agent',
          role: 'testing',
        },
        task: mockTask,
        context: {
          files: [],
        },
        memory: [],
        messages: [],
      };

      const executionRequest: AgentExecutionRequest = {
        requestId: 'req-002',
        agentId: 'test-agent-001',
        payload: mockPayload,
      };

      const result = await client.executeTask(executionRequest);
      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('executionTime');
      expect(result.metadata).toHaveProperty('tokensUsed');
    });

    test('should generate contextual mock response', async () => {
      const mockTask: ParsedTask = {
        id: 'TASK-005',
        title: 'Refactor authentication module',
        description: 'Improve code structure and security',
        status: 'in_progress',
        priority: 'critical',
        dependencies: ['TASK-001', 'TASK-002'],
        assignees: ['coder'],
        labels: [],
        subtasks: [],
        rawFrontMatter: {},
      };

      const mockPayload: PromptPayload = {
        taskId: 'TASK-005',
        agent: {
          name: 'Code Agent',
          role: 'code',
          instructions: 'Follow security best practices',
        },
        task: mockTask,
        context: {
          files: [
            { path: '/src/auth.ts', content: 'auth code' },
            { path: '/src/security.ts', content: 'security code', truncated: true },
          ],
        },
        memory: [],
        messages: [],
      };

      const executionRequest: AgentExecutionRequest = {
        requestId: 'req-003',
        agentId: 'code-agent-001',
        payload: mockPayload,
      };

      const result = await client.executeTask(executionRequest);
      
      // Verify the response contains task information
      expect(result.output).toContain('TASK-005');
      expect(result.output).toContain('Refactor authentication module');
      expect(result.output).toContain('Code Agent');
      expect(result.output).toContain('critical');
    });
  });

  describe('Connection State', () => {
    test('should track connection state', async () => {
      expect(client.isConnected()).toBe(false);
      
      await client.registerAgent({
        agentId: 'test-001',
        name: 'Test',
        role: 'test',
        capabilities: [],
      });
      
      expect(client.isConnected()).toBe(true);
    });

    test('should return null agent ID when not registered', () => {
      expect(client.getCurrentAgentId()).toBe(null);
    });

    test('should return agent ID after registration', async () => {
      const agentId = 'my-custom-agent';
      await client.registerAgent({
        agentId,
        name: 'Custom Agent',
        role: 'custom',
        capabilities: ['capability-1'],
      });
      
      expect(client.getCurrentAgentId()).toBe(agentId);
    });
  });

  describe('Singleton Pattern', () => {
    test('should get default client instance', () => {
      const instance1 = getDefaultCopilotAgentClient();
      const instance2 = getDefaultCopilotAgentClient();
      
      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2); // Same instance
    });

    test('should reset default client', () => {
      const instance1 = getDefaultCopilotAgentClient();
      resetDefaultCopilotAgentClient();
      const instance2 = getDefaultCopilotAgentClient();
      
      expect(instance1).not.toBe(instance2); // Different instances after reset
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication gracefully', async () => {
      // In mock mode, authentication should always succeed
      const result = await client.authenticate();
      expect(result).toBe(true);
    });

    test('should handle registration gracefully', async () => {
      const registration: AgentRegistration = {
        agentId: 'error-test-agent',
        name: 'Error Test',
        role: 'test',
        capabilities: [],
      };

      // In mock mode, registration should always succeed
      const result = await client.registerAgent(registration);
      expect(result).toBe(true);
    });
  });
});

/**
 * Integration tests for GitHub Copilot Agent Mode API
 * 
 * These tests verify real API integration (mocking HTTP responses)
 * Run with: npm run test:integration
 */

import { CopilotAgentClient, AgentRegistration } from '../../src/services/copilotAgentClient';

// Mock global fetch for integration tests
const originalFetch = global.fetch;

// Mock VS Code extension context for tests
const mockSecretStorage = {
  get: jest.fn().mockResolvedValue(undefined),
  store: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  onDidChange: jest.fn(),
};

const mockExtensionContext = {
  secrets: mockSecretStorage,
  extensionPath: '/mock/extension/path',
  subscriptions: [],
  workspaceState: {} as any,
  globalState: {} as any,
  extensionUri: {} as any,
  environmentVariableCollection: {} as any,
  extensionMode: 3,
  storageUri: undefined,
  storagePath: undefined,
  globalStorageUri: {} as any,
  globalStoragePath: '/mock/global/storage',
  logUri: {} as any,
  logPath: '/mock/log',
  asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
  extension: {} as any,
};

describe('CopilotAgentClient Integration Tests', () => {
  let client: CopilotAgentClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Create client in real API mode (not mock) with proper context
    client = new CopilotAgentClient(
      { mockMode: false, baseUrl: 'http://localhost:8000' },
      mockExtensionContext as any
    );
    
    // Mock fetch for controlled testing
    mockFetch = jest.fn();
    global.fetch = mockFetch as any;
    
    // Reset mock storage
    mockSecretStorage.get.mockClear();
    mockSecretStorage.store.mockClear();
    mockSecretStorage.delete.mockClear();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('Authentication Flow', () => {
    test('should authenticate with valid token', async () => {
      // Mock GitHub API token validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' }),
        headers: {
          get: (name: string) => name === 'x-oauth-scopes' ? 'repo,user' : null,
        },
      });
      
      // Mock backend auth validation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await client.authenticate();
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // First call to GitHub API
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github+json',
          }),
        })
      );
      // Second call to backend
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'http://localhost:8000/api/v1/auth/validate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('should fail authentication with invalid token', async () => {
      // Mock GitHub API returning error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await client.authenticate();
      
      expect(result).toBe(false);
    });

    test('should handle network errors during authentication', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.authenticate();
      
      expect(result).toBe(false);
    });
  });

  describe('Agent Registration', () => {
    test('should register agent successfully', async () => {
      const registration: AgentRegistration = {
        agentId: 'test-agent-001',
        name: 'Test Agent',
        role: 'testing',
        capabilities: ['test-generation'],
      };

      // Mock successful registration response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'test-agent-001' } }),
      });

      const result = await client.registerAgent(registration);
      
      expect(result).toBe(true);
      expect(client.getCurrentAgentId()).toBe('test-agent-001');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/agents',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('should retry registration on failure', async () => {
      const registration: AgentRegistration = {
        agentId: 'test-agent-002',
        name: 'Test Agent 2',
        role: 'testing',
        capabilities: [],
      };

      // Mock first two attempts failing, third succeeding
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { id: 'test-agent-002' } }),
        });

      const result = await client.registerAgent(registration);
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 15000); // Increased timeout for retries

    test('should fail after max retry attempts', async () => {
      const registration: AgentRegistration = {
        agentId: 'test-agent-003',
        name: 'Test Agent 3',
        role: 'testing',
        capabilities: [],
      };

      // Mock all attempts failing
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.registerAgent(registration);
      
      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 15000); // Increased timeout for retries

    test('should not re-register already registered agent', async () => {
      const registration: AgentRegistration = {
        agentId: 'test-agent-004',
        name: 'Test Agent 4',
        role: 'testing',
        capabilities: [],
      };

      // Mock successful first registration
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'test-agent-004' } }),
      });

      const result1 = await client.registerAgent(registration);
      expect(result1).toBe(true);
      
      // Second registration should succeed without API call
      const result2 = await client.registerAgent(registration);
      expect(result2).toBe(true);
      
      // Only one API call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task Handoff', () => {
    test('should handoff task successfully', async () => {
      const handoffRequest = {
        taskId: 'TASK-001',
        fromAgent: 'agent-1',
        toAgent: 'agent-2',
        context: { data: 'test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { handoff_id: 'handoff-123' },
        }),
      });

      const result = await client.handoffTask(handoffRequest);
      
      expect(result.success).toBe(true);
      expect(result.handoffId).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/agents/handoff',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('should handle handoff failures', async () => {
      const handoffRequest = {
        taskId: 'TASK-002',
        fromAgent: 'agent-1',
        toAgent: 'agent-2',
        context: {},
      };

      mockFetch.mockRejectedValueOnce(new Error('Handoff failed'));

      const result = await client.handoffTask(handoffRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Task Execution', () => {
    test('should execute task successfully', async () => {
      const executionRequest = {
        requestId: 'req-001',
        agentId: 'agent-1',
        payload: {
          taskId: 'TASK-001',
          agent: { name: 'Test Agent', role: 'testing' },
          task: {
            id: 'TASK-001',
            title: 'Test',
            description: '',
            status: 'pending',
            priority: 'high',
            dependencies: [],
            assignees: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
          },
          context: { files: [] },
          memory: [],
          messages: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { output: 'Task completed', result: 'Success' },
        }),
      });

      const result = await client.executeTask(executionRequest);
      
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/tasks/execute',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('should retry task execution on failure', async () => {
      const executionRequest = {
        requestId: 'req-002',
        agentId: 'agent-1',
        payload: {
          taskId: 'TASK-002',
          agent: { name: 'Test Agent', role: 'testing' },
          task: {
            id: 'TASK-002',
            title: 'Test',
            description: '',
            status: 'pending',
            priority: 'high',
            dependencies: [],
            assignees: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
          },
          context: { files: [] },
          memory: [],
          messages: [],
        },
      };

      // First attempt fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Execution failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { output: 'Task completed' },
          }),
        });

      const result = await client.executeTask(executionRequest);
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000); // Increased timeout for retries
  });

  describe('Agent Discovery', () => {
    test('should discover agents successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'agent-1', name: 'Agent 1', type: 'coder', capabilities: ['coding'] },
            { id: 'agent-2', name: 'Agent 2', type: 'tester', capabilities: ['testing'] },
          ],
        }),
      });

      const result = await client.discoverAgents();
      
      expect(result.success).toBe(true);
      expect(result.agents).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/agents',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('should cache discovery results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'agent-1', name: 'Agent 1', type: 'coder' }],
        }),
      });

      // First call
      const result1 = await client.discoverAgents();
      expect(result1.success).toBe(true);
      
      // Second call should use cache
      const result2 = await client.discoverAgents();
      expect(result2.success).toBe(true);
      
      // Only one API call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle discovery failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Discovery failed'));

      const result = await client.discoverAgents();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Analytics', () => {
    test('should flush analytics events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await client.flushAnalytics();
      
      // Should succeed even with empty queue
      expect(result).toBe(true);
    });
  });
});

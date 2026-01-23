/**
 * Unit tests for getAgentState handler
 * Tests agent metrics and state retrieval
 */
// @ts-ignore TS2835 - ts-jest handles .ts imports in CommonJS mode
import { handleGetAgentState } from '../getAgentState';

global.fetch = jest.fn() as jest.Mock;

// Mock the AuditLogger
jest.mock('../../auditLogger', () => ({
  getAuditLogger: jest.fn(() => ({
    initialize: jest.fn().mockReturnValue(undefined),
    log: jest.fn().mockReturnValue(1),
    setWebSocketCallback: jest.fn(),
    queryLogs: jest.fn().mockReturnValue([]),
  })),
}));

describe('handleGetAgentState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MCP_BASE_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    delete process.env.MCP_BASE_URL;
  });

  it('should fetch all agent states when no agentName provided', async () => {
    const mockAgents = [
      {
        name: 'Auto Zen',
        status: 'working',
        current_task_id: 'TASK-123',
        queue_depth: 3,
        avg_task_duration: '45 minutes',
        success_rate: 0.92,
        tasks_completed: 150,
        tasks_active: 1,
        last_activity_at: '2026-01-19T10:00:00Z',
        capabilities: ['code', 'test'],
        agent_type: 'executor',
      },
      {
        name: 'Zen Planner',
        status: 'idle',
        current_task_id: null,
        queue_depth: 0,
        avg_task_duration: '12 minutes',
        success_rate: 0.98,
        tasks_completed: 200,
        tasks_active: 0,
        last_activity_at: '2026-01-19T09:00:00Z',
        capabilities: ['planning'],
        agent_type: 'planner',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ agents: mockAgents }),
    });

    const result = await handleGetAgentState({});

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/agents',
      expect.any(Object)
    );

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.agents['Auto Zen']).toBeDefined();
    expect(parsedResponse.agents['Zen Planner']).toBeDefined();
    expect(parsedResponse.systemStatus).toBe('operational');
  });

  it('should fetch specific agent when agentName provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        agents: [
          {
            name: 'Auto Zen',
            status: 'active',
            queue_depth: 2,
          },
        ],
      }),
    });

    const result = await handleGetAgentState({ agentName: 'Auto Zen' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/agents?name=Auto+Zen',
      expect.any(Object)
    );

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.agents['Auto Zen']).toBeDefined();
    expect(Object.keys(parsedResponse.agents)).toHaveLength(1);
  });

  it('should map agent status correctly', async () => {
    const statusTests = [
      { backend: 'working', expected: 'active' },
      { backend: 'busy', expected: 'active' },
      { backend: 'idle', expected: 'idle' },
      { backend: 'available', expected: 'idle' },
      { backend: 'error', expected: 'error' },
      { backend: 'blocked', expected: 'error' },
    ];

    for (const test of statusTests) {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          agents: [{ name: 'TestAgent', status: test.backend }],
        }),
      });

      const result = await handleGetAgentState({});
      const parsedResponse = JSON.parse(result.content[0].text);

      expect(parsedResponse.agents.TestAgent.status).toBe(test.expected);
    }
  });

  it('should determine system status based on error rate', async () => {
    const mockAgents = [
      { name: 'Agent1', status: 'active' },
      { name: 'Agent2', status: 'active' },
      { name: 'Agent3', status: 'error' },
      { name: 'Agent4', status: 'error' },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ agents: mockAgents }),
    });

    const result = await handleGetAgentState({});
    const parsedResponse = JSON.parse(result.content[0].text);

    // 50% error rate => degraded
    expect(parsedResponse.systemStatus).toBe('degraded');
  });

  it('should return error when agent not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ agents: [] }),
    });

    const result = await handleGetAgentState({ agentName: 'Nonexistent' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining("Agent 'Nonexistent' not found"),
        },
      ],
    });
  });
});


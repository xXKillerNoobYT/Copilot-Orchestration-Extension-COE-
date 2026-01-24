/**
 * Unit tests for getWorkspaceConfig handler
 * Tests environment-based configuration
 */
// @ts-ignore TS2835 - ts-jest handles .ts imports in CommonJS mode
import { handleGetWorkspaceConfig } from '../getWorkspaceConfig';

// Mock the AuditLogger
jest.mock('../../auditLogger', () => ({
  getAuditLogger: jest.fn(() => ({
    initialize: jest.fn().mockReturnValue(undefined),
    log: jest.fn().mockReturnValue(1),
    setWebSocketCallback: jest.fn(),
    queryLogs: jest.fn().mockReturnValue([]),
  })),
}));

describe('handleGetWorkspaceConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default environment variables
    process.env.MCP_BASE_URL = 'http://localhost:8000';
    process.env.WORKSPACE_TASK_ROOTS = '_ZENTASKS,_TASKS';
    process.env.LLM_MODEL = 'test-model';
    process.env.WEBSOCKET_DRIVER = 'soketi';
  });

  afterEach(() => {
    // Clean up all environment variables
    delete process.env.MCP_BASE_URL;
    delete process.env.WORKSPACE_TASK_ROOTS;
    delete process.env.LLM_MODEL;
    delete process.env.WEBSOCKET_DRIVER;
    delete process.env.MCP_AUTH_TOKEN;
  });

  it('should return configuration from environment variables', async () => {
    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.workspace.taskRoots).toEqual(['_ZENTASKS', '_TASKS']);
    expect(parsedResponse.mcp.baseUrl).toBe('http://localhost:8000');
    expect(parsedResponse.llm.model).toBe('test-model');
    expect(parsedResponse.websocket.driver).toBe('soketi');
  });

  it('should use default values when environment variables not set', async () => {
    delete process.env.MCP_BASE_URL;
    delete process.env.WORKSPACE_TASK_ROOTS;

    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.workspace.taskRoots).toEqual(['_ZENTASKS']);
    expect(parsedResponse.mcp.baseUrl).toBe('http://localhost:8000');
  });

  it('should mask auth token in response', async () => {
    process.env.MCP_AUTH_TOKEN = 'super-secret-token';

    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.mcp.authToken).toBe('***');
    expect(parsedResponse.mcp.authToken).not.toBe('super-secret-token');
  });

  it('should include agent profiles when requested', async () => {
    const result = await handleGetWorkspaceConfig({ includeAgentProfiles: true });
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.agentProfiles).toBeDefined();
    expect(parsedResponse.agentProfiles['Auto Zen']).toBeDefined();
    expect(parsedResponse.agentProfiles['Zen Planner']).toBeDefined();
    expect(parsedResponse.agentProfiles['Testing Agent']).toBeDefined();
    expect(parsedResponse.agentProfiles['Verification Agent']).toBeDefined();
  });

  it('should not include agent profiles by default', async () => {
    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.agentProfiles).toBeUndefined();
  });

  it('should parse numeric environment variables correctly', async () => {
    process.env.MCP_TIMEOUT = '45000';
    process.env.WEBSOCKET_PORT = '7001';
    process.env.LLM_TEMPERATURE = '0.9';

    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.mcp.timeout).toBe(45000);
    expect(parsedResponse.websocket.port).toBe(7001);
    expect(parsedResponse.llm.temperature).toBe(0.9);
  });

  it('should handle boolean environment variables', async () => {
    process.env.MCP_LOCAL_SERVER_ENABLED = 'false';
    process.env.WEBSOCKET_ENABLED = 'true';
    process.env.GITHUB_SYNC_ENABLED = 'false';

    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.mcp.localServerEnabled).toBe(false);
    expect(parsedResponse.websocket.enabled).toBe(true);
    expect(parsedResponse.github.syncEnabled).toBe(false);
  });

  it('should include all configuration sections', async () => {
    const result = await handleGetWorkspaceConfig({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.workspace).toBeDefined();
    expect(parsedResponse.mcp).toBeDefined();
    expect(parsedResponse.llm).toBeDefined();
    expect(parsedResponse.websocket).toBeDefined();
    expect(parsedResponse.github).toBeDefined();
    expect(parsedResponse.project).toBeDefined();
  });
});


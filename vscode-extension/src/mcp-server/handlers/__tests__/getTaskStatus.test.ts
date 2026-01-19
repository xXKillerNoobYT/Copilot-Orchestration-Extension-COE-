/**
 * Unit tests for getTaskStatus handler
 * Tests real backend integration with mocked fetch responses
 */

import { handleGetTaskStatus } from '../getTaskStatus.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

describe('handleGetTaskStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MCP_BASE_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    delete process.env.MCP_BASE_URL;
  });

  it('should fetch task status from backend API', async () => {
    const mockTask = {
      id: 'TASK-123',
      status: 'in-progress',
      title: 'Implement feature X',
      description: 'Full description here',
      assigned_agent: 'Auto Zen',
      priority: 'high',
      progress_percent: 75,
      blockers: [],
      dependencies: [{ id: 'TASK-001', title: 'Prerequisite task' }],
      updated_at: '2026-01-19T10:00:00Z',
      estimated_completion: '2026-01-20T10:00:00Z',
      estimated_hours: 8,
      actual_hours: 6,
      github_issue_id: 42,
      github_issue_url: 'https://github.com/owner/repo/issues/42',
      version: 3,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ task: mockTask }),
    });

    const result = await handleGetTaskStatus({ taskId: 'TASK-123' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks/TASK-123',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('"taskId": "TASK-123"'),
        },
      ],
    });

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.taskId).toBe('TASK-123');
    expect(parsedResponse.status).toBe('in-progress');
    expect(parsedResponse.title).toBe('Implement feature X');
    expect(parsedResponse.progress).toBe(0.75); // Converted from percent
    expect(parsedResponse.linkedIssue.number).toBe(42);
    expect(parsedResponse.version).toBe(3);
  });

  it('should return error when taskId is missing', async () => {
    const result = await handleGetTaskStatus({});

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Missing required parameter: taskId'),
        },
      ],
    });
  });

  it('should handle 404 not found errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await handleGetTaskStatus({ taskId: 'NONEXISTENT' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Task NONEXISTENT not found'),
        },
      ],
    });
  });

  it('should handle backend errors with retry', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          task: {
            id: 'TASK-123',
            status: 'pending',
            title: 'Test task',
          },
        }),
      });

    const result = await handleGetTaskStatus({ taskId: 'TASK-123' });

    // Should have retried 2 times before succeeding on 3rd attempt
    expect(global.fetch).toHaveBeenCalledTimes(3);

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.taskId).toBe('TASK-123');
  });

  it('should fail after max retries', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await handleGetTaskStatus({ taskId: 'TASK-123' });

    expect(global.fetch).toHaveBeenCalledTimes(3); // Default retry count
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('failed after 3 attempts'),
        },
      ],
    });
  });

  it('should use custom base URL from environment', async () => {
    process.env.MCP_BASE_URL = 'http://custom-backend:9000';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ task: { id: 'TASK-123', status: 'done' } }),
    });

    await handleGetTaskStatus({ taskId: 'TASK-123' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://custom-backend:9000/api/v1/tasks/TASK-123',
      expect.any(Object)
    );
  });

  it('should handle tasks without linked GitHub issues', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        task: {
          id: 'TASK-123',
          status: 'pending',
          title: 'Internal task',
          github_issue_id: null,
        },
      }),
    });

    const result = await handleGetTaskStatus({ taskId: 'TASK-123' });
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.linkedIssue).toBeNull();
  });
});


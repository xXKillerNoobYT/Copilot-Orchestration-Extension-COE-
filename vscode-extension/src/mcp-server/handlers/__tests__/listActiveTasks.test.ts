/**
 * Unit tests for listActiveTasks handler
 * Tests filtering and pagination with backend API
 */

import { handleListActiveTasks } from '../listActiveTasks.js';

global.fetch = jest.fn() as jest.Mock;

describe('handleListActiveTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MCP_BASE_URL = 'http://localhost:8000';
    process.env.MCP_PROJECT_ID = 'test-project';
  });

  afterEach(() => {
    delete process.env.MCP_BASE_URL;
    delete process.env.MCP_PROJECT_ID;
  });

  it('should fetch tasks with filters from backend', async () => {
    const mockTasks = [
      {
        id: 'TASK-001',
        status: 'in-progress',
        title: 'Task 1',
        description: 'Description 1',
        assigned_agent: 'Auto Zen',
        priority: 'high',
        progress_percent: 50,
        github_issue_id: 10,
        estimated_hours: 4,
        created_at: '2026-01-18T10:00:00Z',
        updated_at: '2026-01-19T10:00:00Z',
      },
      {
        id: 'TASK-002',
        status: 'pending',
        title: 'Task 2',
        description: 'Description 2',
        assigned_agent: null,
        priority: 'medium',
        progress_percent: 0,
        github_issue_id: null,
        estimated_hours: 2,
        created_at: '2026-01-19T09:00:00Z',
        updated_at: '2026-01-19T09:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tasks: mockTasks }),
    });

    const result = await handleListActiveTasks({
      status: 'in-progress',
      priority: 'high',
      assignee: 'Auto Zen',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/projects/test-project/tasks?status=in-progress&priority=high&assigned_agent=Auto+Zen',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.tasks).toHaveLength(2);
    expect(parsedResponse.total).toBe(2);
    expect(parsedResponse.filters.status).toBe('in-progress');
    expect(parsedResponse.projectId).toBe('test-project');
  });

  it('should use default project ID when not provided', async () => {
    delete process.env.MCP_PROJECT_ID;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tasks: [] }),
    });

    await handleListActiveTasks({});

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/projects/default/tasks?',
      expect.any(Object)
    );
  });

  it('should handle empty task list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tasks: [] }),
    });

    const result = await handleListActiveTasks({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.tasks).toEqual([]);
    expect(parsedResponse.total).toBe(0);
  });

  it('should transform task data correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tasks: [
          {
            id: 'TASK-999',
            status: 'done',
            title: 'Completed task',
            progress_percent: 100,
          },
        ],
      }),
    });

    const result = await handleListActiveTasks({});
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.tasks[0].taskId).toBe('TASK-999');
    expect(parsedResponse.tasks[0].progress).toBe(1); // 100% => 1.0
  });

  it('should handle backend errors with retry', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ tasks: [] }),
      });

    const result = await handleListActiveTasks({});

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.tasks).toEqual([]);
  });
});


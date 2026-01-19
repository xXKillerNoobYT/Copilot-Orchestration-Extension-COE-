/**
 * Unit tests for requestVerification handler
 * Tests verification request creation in backend
 */

import { handleRequestVerification } from '../requestVerification';

global.fetch = jest.fn() as jest.Mock;

describe('handleRequestVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MCP_BASE_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    delete process.env.MCP_BASE_URL;
  });

  it('should create verification request in backend', async () => {
    const mockVerification = {
      id: 'VER-123',
      task_id: 'TASK-456',
      verification_type: 'visual',
      checklist: ['UI matches design', 'No console errors'],
      status: 'pending',
      created_at: '2026-01-19T10:00:00Z',
      expires_at: '2026-01-20T10:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ verification: mockVerification }),
    });

    const result = await handleRequestVerification({
      taskId: 'TASK-456',
      verificationType: 'visual',
      checklist: ['UI matches design', 'No console errors'],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/verifications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: expect.stringContaining('TASK-456'),
      }
    );

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.success).toBe(true);
    expect(parsedResponse.verificationRequest.id).toBe('VER-123');
    expect(parsedResponse.verificationRequest.taskId).toBe('TASK-456');
    expect(parsedResponse.message).toContain('Verification request created');
  });

  it('should return error when taskId is missing', async () => {
    const result = await handleRequestVerification({});

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Missing required parameter: taskId'),
        },
      ],
    });
  });

  it('should use default verification type when not provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        verification: { id: 'VER-123', task_id: 'TASK-456' },
      }),
    });

    await handleRequestVerification({ taskId: 'TASK-456' });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody.verification_type).toBe('visual');
  });

  it('should include expiration time (24 hours)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        verification: { id: 'VER-123', task_id: 'TASK-456' },
      }),
    });

    await handleRequestVerification({ taskId: 'TASK-456' });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody.expires_at).toBeDefined();
    const expiresAt = new Date(requestBody.expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    // Should be approximately 24 hours (within 1 minute tolerance)
    expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 60 * 1000);
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + 60 * 1000);
  });

  it('should handle backend errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await handleRequestVerification({ taskId: 'TASK-456' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Failed to create verification request'),
        },
      ],
    });
  });

  it('should include note about VS Code extension handling UI', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        verification: { id: 'VER-123', task_id: 'TASK-456' },
      }),
    });

    const result = await handleRequestVerification({ taskId: 'TASK-456' });
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.note).toContain('VS Code extension');
    expect(parsedResponse.note).toContain('WebSocket');
  });
});

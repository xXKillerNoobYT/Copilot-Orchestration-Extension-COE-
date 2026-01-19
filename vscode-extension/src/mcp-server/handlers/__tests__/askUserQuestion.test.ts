/**
 * Unit tests for askUserQuestion handler
 * Tests question creation in backend
 */

import { handleAskUserQuestion } from '../askUserQuestion';

global.fetch = jest.fn() as jest.Mock;

describe('handleAskUserQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MCP_BASE_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    delete process.env.MCP_BASE_URL;
  });

  it('should create question in backend database', async () => {
    const mockQuestion = {
      id: 'Q-123',
      question: 'Should we proceed with this approach?',
      context: { relatedTask: 'TASK-456' },
      timeout: 300,
      status: 'pending',
      asked_at: '2026-01-19T10:00:00Z',
      expires_at: '2026-01-19T10:05:00Z',
      created_at: '2026-01-19T10:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ question: mockQuestion }),
    });

    const result = await handleAskUserQuestion({
      question: 'Should we proceed with this approach?',
      context: { relatedTask: 'TASK-456' },
      timeout: 300,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/questions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: expect.stringContaining('Should we proceed'),
      }
    );

    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.success).toBe(true);
    expect(parsedResponse.questionRequest.id).toBe('Q-123');
    expect(parsedResponse.questionRequest.question).toBe('Should we proceed with this approach?');
    expect(parsedResponse.questionRequest.timeout).toBe(300);
  });

  it('should return error when question is missing', async () => {
    const result = await handleAskUserQuestion({});

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Missing required parameter: question'),
        },
      ],
    });
  });

  it('should use default timeout when not provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        question: { id: 'Q-123', question: 'Test?' },
      }),
    });

    await handleAskUserQuestion({ question: 'Test?' });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody.timeout).toBe(300); // Default timeout
  });

  it('should calculate expiration time based on timeout', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        question: { id: 'Q-123' },
      }),
    });

    await handleAskUserQuestion({ question: 'Test?', timeout: 600 });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    const askedAt = new Date(requestBody.asked_at);
    const expiresAt = new Date(requestBody.expires_at);
    const diff = expiresAt.getTime() - askedAt.getTime();

    expect(diff).toBe(600 * 1000); // 600 seconds
  });

  it('should handle empty context', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        question: { id: 'Q-123' },
      }),
    });

    await handleAskUserQuestion({ question: 'Test?' });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody.context).toEqual({});
  });

  it('should handle backend errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await handleAskUserQuestion({ question: 'Test?' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Failed to create question'),
        },
      ],
    });
  });

  it('should include note about WebSocket and polling', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        question: { id: 'Q-123' },
      }),
    });

    const result = await handleAskUserQuestion({ question: 'Test?' });
    const parsedResponse = JSON.parse(result.content[0].text);

    expect(parsedResponse.message).toContain('WebSocket event or polling');
    expect(parsedResponse.note).toContain('VS Code extension');
  });
});

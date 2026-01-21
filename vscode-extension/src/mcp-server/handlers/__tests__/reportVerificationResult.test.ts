/**
 * Unit tests for reportVerificationResult handler
 * Tests verification result submission and task status updates
 */

import { handleReportVerificationResult } from '../reportVerificationResult';

global.fetch = jest.fn() as jest.Mock;

// Mock the validation module
jest.mock('../../agentValidation', () => ({
  validateInput: jest.fn(),
  ValidationSchemas: {
    reportVerificationResult: {},
  },
  formatAgentSuccess: jest.fn((data) => data),
  formatAgentError: jest.fn((error) => ({ error })),
  AgentErrors: {},
}));

const { validateInput, formatAgentSuccess, formatAgentError } = require('../../agentValidation');

describe('handleReportVerificationResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MCP_BASE_URL = 'http://localhost:8000';

    // Default successful validation
    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: true,
        findings: [],
        screenshots: [],
      },
    });
  });

  afterEach(() => {
    delete process.env.MCP_BASE_URL;
  });

  it('should submit verification result to backend', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        verificationResult: {
          id: 'VERIFY-123',
          task_id: 'TASK-456',
        },
      }),
    });

    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: true,
        findings: [],
      },
    });

    await handleReportVerificationResult({
      taskId: 'TASK-456',
      verificationType: 'visual',
      passed: true,
      findings: [],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/mcp/reportVerificationResult',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
    );
  });

  it('should return validation error when input is invalid', async () => {
    const mockError = { code: 'INVALID_INPUT', message: 'Invalid input' };
    (validateInput as jest.Mock).mockReturnValue({
      valid: false,
      error: mockError,
    });
    (formatAgentError as jest.Mock).mockReturnValue({ error: mockError });

    const result = await handleReportVerificationResult({
      taskId: '',
      passed: true,
    });

    expect(result).toEqual({ error: mockError });
  });

  it('should create investigation tasks when verification fails', async () => {
    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: false,
        findings: [
          { description: 'UI mismatch', severity: 'high' },
          { description: 'Console errors', severity: 'medium' },
        ],
      },
    });

    (global.fetch as jest.Mock)
      // First call: submit verification result
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ verificationResult: { id: 'VERIFY-123' } }),
      })
      // Second call: create first investigation task
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ task: { id: 'TASK-INV-1' } }),
      })
      // Third call: create second investigation task
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ task: { id: 'TASK-INV-2' } }),
      })
      // Fourth call: get current task status (terminal state check)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ task: { status: 'in-progress' } }),
      })
      // Fifth call: update task status to blocked
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    await handleReportVerificationResult({
      taskId: 'TASK-456',
      verificationType: 'visual',
      passed: false,
      findings: [
        { description: 'UI mismatch', severity: 'high' },
        { description: 'Console errors', severity: 'medium' },
      ],
    });

    // Should create 2 investigation tasks + check status + update status = 5 calls
    expect(global.fetch).toHaveBeenCalledTimes(5);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/v1/tasks',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should update task status to completed when verification passes', async () => {
    (global.fetch as jest.Mock)
      // First call: submit verification result
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ verificationResult: { id: 'VERIFY-123' } }),
      })
      // Second call: get current task status (terminal state check)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ task: { status: 'in-progress' } }),
      })
      // Third call: update task status to completed
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: true,
        findings: [],
      },
    });

    await handleReportVerificationResult({
      taskId: 'TASK-456',
      verificationType: 'visual',
      passed: true,
      findings: [],
    });

    // Third call should be updating task status to completed
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/v1/tasks/TASK-456/status',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('completed'),
      })
    );
  });

  it('should update task status to blocked when verification fails', async () => {
    (global.fetch as jest.Mock)
      // First call: submit verification result
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ verificationResult: { id: 'VERIFY-123' } }),
      })
      // Second call: get current task status (terminal state check)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ task: { status: 'in-progress' } }),
      })
      // Third call: update task status to blocked
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: false,
        findings: ['Some issue'],
      },
    });

    await handleReportVerificationResult({
      taskId: 'TASK-456',
      verificationType: 'visual',
      passed: false,
      findings: ['Some issue'],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks/TASK-456/status',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('blocked'),
      })
    );
  });

  it('should return appropriate next steps based on pass/fail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ verificationResult: {} }),
    });

    // Test passed verification
    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: true,
        findings: [],
      },
    });

    (formatAgentSuccess as jest.Mock).mockImplementation((data) => data);

    let result = await handleReportVerificationResult({
      taskId: 'TASK-456',
      passed: true,
    });

    expect(result.content[0].text).toContain('Update task status to done');
    expect(result.content[0].text).toContain('Merge pull request');

    // Test failed verification
    (validateInput as jest.Mock).mockReturnValue({
      valid: true,
      data: {
        taskId: 'TASK-456',
        verificationType: 'visual',
        passed: false,
        findings: ['Issue'],
      },
    });

    result = await handleReportVerificationResult({
      taskId: 'TASK-456',
      passed: false,
      findings: ['Issue'],
    });

    expect(result.content[0].text).toContain('Address verification findings');
    expect(result.content[0].text).toContain('Request re-verification');
  });
});


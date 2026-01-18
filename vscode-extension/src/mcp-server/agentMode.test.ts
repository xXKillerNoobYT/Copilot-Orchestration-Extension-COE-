/**
 * Tests for Agent Mode Integration
 * Validates Agent Mode API functionality, tool discovery, validation, and error handling
 */

import {
  validateInput,
  ValidationSchemas,
  formatAgentError,
  formatAgentSuccess,
  AgentErrors,
  AgentErrorCode,
} from '../agentValidation';

describe('Agent Mode Validation', () => {
  describe('Input validation', () => {
    describe('getNextTask', () => {
      it('should validate valid input', () => {
        const input = { filter: 'bug', priority: 'high', agentType: 'code-master' };
        const result = validateInput(ValidationSchemas.getNextTask, input);
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data).toEqual(input);
        }
      });

      it('should allow optional fields to be omitted', () => {
        const input = {};
        const result = validateInput(ValidationSchemas.getNextTask, input);
        expect(result.valid).toBe(true);
      });

      it('should reject invalid priority enum', () => {
        const input = { priority: 'invalid' };
        const result = validateInput(ValidationSchemas.getNextTask, input);
        expect(result.valid).toBe(false);
      });
    });

    describe('reportTaskStatus', () => {
      it('should validate valid input', () => {
        const input = {
          taskId: 'TASK-001',
          status: 'in-progress',
          progress: 0.5,
          observations: 'Making good progress',
          blockers: [],
        };
        const result = validateInput(ValidationSchemas.reportTaskStatus, input);
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data).toEqual(input);
        }
      });

      it('should require taskId', () => {
        const input = { status: 'in-progress' };
        const result = validateInput(ValidationSchemas.reportTaskStatus, input);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error.code).toBe(AgentErrorCode.INVALID_INPUT);
        }
      });

      it('should require status', () => {
        const input = { taskId: 'TASK-001' };
        const result = validateInput(ValidationSchemas.reportTaskStatus, input);
        expect(result.valid).toBe(false);
      });

      it('should reject invalid status enum', () => {
        const input = { taskId: 'TASK-001', status: 'invalid' };
        const result = validateInput(ValidationSchemas.reportTaskStatus, input);
        expect(result.valid).toBe(false);
      });

      it('should validate progress range', () => {
        const invalidInput = { taskId: 'TASK-001', status: 'in-progress', progress: 1.5 };
        const result = validateInput(ValidationSchemas.reportTaskStatus, invalidInput);
        expect(result.valid).toBe(false);

        const validInput = { taskId: 'TASK-001', status: 'in-progress', progress: 0.75 };
        const validResult = validateInput(ValidationSchemas.reportTaskStatus, validInput);
        expect(validResult.valid).toBe(true);
      });
    });

    describe('getContextBundle', () => {
      it('should validate valid input', () => {
        const input = { taskId: 'TASK-001', includeFiles: true, includeDocs: false };
        const result = validateInput(ValidationSchemas.getContextBundle, input);
        expect(result.valid).toBe(true);
      });

      it('should require taskId', () => {
        const input = {};
        const result = validateInput(ValidationSchemas.getContextBundle, input);
        expect(result.valid).toBe(false);
      });

      it('should allow boolean flags to be optional', () => {
        const input = { taskId: 'TASK-001' };
        const result = validateInput(ValidationSchemas.getContextBundle, input);
        expect(result.valid).toBe(true);
      });
    });

    describe('reportTestFailure', () => {
      it('should validate complete input', () => {
        const input = {
          taskId: 'TASK-001',
          testName: 'should authenticate user',
          errorMessage: 'Expected 200, got 401',
          stackTrace: 'at test.ts:42',
          suggestedFix: 'Add authentication token',
        };
        const result = validateInput(ValidationSchemas.reportTestFailure, input);
        expect(result.valid).toBe(true);
      });

      it('should require all mandatory fields', () => {
        const input = { taskId: 'TASK-001' };
        const result = validateInput(ValidationSchemas.reportTestFailure, input);
        expect(result.valid).toBe(false);
      });

      it('should allow optional fields to be omitted', () => {
        const input = {
          taskId: 'TASK-001',
          testName: 'test',
          errorMessage: 'error',
        };
        const result = validateInput(ValidationSchemas.reportTestFailure, input);
        expect(result.valid).toBe(true);
      });
    });

    describe('reportVerificationResult', () => {
      it('should validate complete input', () => {
        const input = {
          taskId: 'TASK-001',
          verificationType: 'functional',
          passed: true,
          findings: ['All tests passed'],
          screenshots: ['screenshot1.png'],
        };
        const result = validateInput(ValidationSchemas.reportVerificationResult, input);
        expect(result.valid).toBe(true);
      });

      it('should require all mandatory fields', () => {
        const input = { taskId: 'TASK-001', verificationType: 'visual' };
        const result = validateInput(ValidationSchemas.reportVerificationResult, input);
        expect(result.valid).toBe(false);
      });

      it('should validate verificationType enum', () => {
        const input = {
          taskId: 'TASK-001',
          verificationType: 'invalid',
          passed: true,
          findings: [],
        };
        const result = validateInput(ValidationSchemas.reportVerificationResult, input);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Error formatting', () => {
    it('should format agent error correctly', () => {
      const error = AgentErrors.taskNotFound('TASK-999');
      const formatted = formatAgentError(error);

      expect(formatted.isError).toBe(true);
      expect(formatted.content).toHaveLength(1);
      expect(formatted.content[0].type).toBe('text');

      const content = JSON.parse(formatted.content[0].text);
      expect(content.success).toBe(false);
      expect(content.error.code).toBe(AgentErrorCode.TASK_NOT_FOUND);
      expect(content.error.message).toContain('TASK-999');
      expect(content.error.suggestion).toBeDefined();
    });

    it('should format operation failed error', () => {
      const error = AgentErrors.operationFailed('update task', 'Network timeout');
      const formatted = formatAgentError(error);

      const content = JSON.parse(formatted.content[0].text);
      expect(content.error.code).toBe(AgentErrorCode.OPERATION_FAILED);
      expect(content.error.message).toContain('update task');
      expect(content.error.message).toContain('Network timeout');
    });

    it('should format unauthorized error', () => {
      const error = AgentErrors.unauthorized();
      const formatted = formatAgentError(error);

      const content = JSON.parse(formatted.content[0].text);
      expect(content.error.code).toBe(AgentErrorCode.UNAUTHORIZED);
    });
  });

  describe('Success formatting', () => {
    it('should format success response correctly', () => {
      const data = { taskId: 'TASK-001', status: 'complete' };
      const formatted = formatAgentSuccess(data);

      expect(formatted.isError).toBeUndefined();
      expect(formatted.content).toHaveLength(1);
      expect(formatted.content[0].type).toBe('text');

      const content = JSON.parse(formatted.content[0].text);
      expect(content.success).toBe(true);
      expect(content.data).toEqual(data);
    });
  });

  describe('Standard error constructors', () => {
    it('should create taskNotFound error with taskId', () => {
      const error = AgentErrors.taskNotFound('TASK-123');
      expect(error.code).toBe(AgentErrorCode.TASK_NOT_FOUND);
      expect(error.message).toContain('TASK-123');
      expect(error.suggestion).toBeDefined();
    });

    it('should create operationFailed error with context', () => {
      const error = AgentErrors.operationFailed('save task', 'Database error');
      expect(error.code).toBe(AgentErrorCode.OPERATION_FAILED);
      expect(error.message).toContain('save task');
      expect(error.message).toContain('Database error');
    });

    it('should create unauthorized error', () => {
      const error = AgentErrors.unauthorized();
      expect(error.code).toBe(AgentErrorCode.UNAUTHORIZED);
      expect(error.suggestion).toBeDefined();
    });

    it('should create internal error with message', () => {
      const error = AgentErrors.internalError('Unexpected null pointer');
      expect(error.code).toBe(AgentErrorCode.INTERNAL_ERROR);
      expect(error.message).toContain('Unexpected null pointer');
    });
  });
});

describe('Agent Mode Tool Handlers', () => {
  // Import handlers for testing
  const { handleGetNextTask } = require('../handlers/getNextTask');
  const { handleReportTaskStatus } = require('../handlers/reportTaskStatus');
  const { handleGetContextBundle } = require('../handlers/getContextBundle');
  const { handleReportTestFailure } = require('../handlers/reportTestFailure');
  const { handleReportVerificationResult } = require('../handlers/reportVerificationResult');

  describe('handleGetNextTask', () => {
    it('should return next task with valid input', async () => {
      const result = await handleGetNextTask({ priority: 'high' });
      expect(result.content).toHaveLength(1);

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.data.task).toBeDefined();
      expect(content.data.task.taskId).toBeDefined();
      expect(content.data.queueDepth).toBeGreaterThanOrEqual(0);
    });

    it('should reject invalid input', async () => {
      const result = await handleGetNextTask({ priority: 'invalid' });
      expect(result.isError).toBe(true);

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.error.code).toBe(AgentErrorCode.INVALID_INPUT);
    });
  });

  describe('handleReportTaskStatus', () => {
    it('should update task status with valid input', async () => {
      const result = await handleReportTaskStatus({
        taskId: 'TASK-001',
        status: 'in-progress',
        progress: 0.5,
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.data.statusUpdate).toBeDefined();
      expect(content.data.statusUpdate.taskId).toBe('TASK-001');
      expect(content.data.statusUpdate.newStatus).toBe('in-progress');
    });

    it('should require taskId', async () => {
      const result = await handleReportTaskStatus({ status: 'done' });
      expect(result.isError).toBe(true);
    });
  });

  describe('handleGetContextBundle', () => {
    it('should return context bundle with valid input', async () => {
      const result = await handleGetContextBundle({
        taskId: 'TASK-001',
        includeFiles: true,
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.data.context).toBeDefined();
      expect(content.data.context.taskId).toBe('TASK-001');
    });

    it('should require taskId', async () => {
      const result = await handleGetContextBundle({});
      expect(result.isError).toBe(true);
    });
  });

  describe('handleReportTestFailure', () => {
    it('should report test failure with valid input', async () => {
      const result = await handleReportTestFailure({
        taskId: 'TASK-001',
        testName: 'auth test',
        errorMessage: 'Failed',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.data.failureReport).toBeDefined();
      expect(content.data.failureReport.testName).toBe('auth test');
    });

    it('should require all mandatory fields', async () => {
      const result = await handleReportTestFailure({ taskId: 'TASK-001' });
      expect(result.isError).toBe(true);
    });
  });

  describe('handleReportVerificationResult', () => {
    it('should report verification result with valid input', async () => {
      const result = await handleReportVerificationResult({
        taskId: 'TASK-001',
        verificationType: 'functional',
        passed: true,
        findings: ['All tests passed'],
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.data.verificationResult).toBeDefined();
      expect(content.data.verificationResult.passed).toBe(true);
    });

    it('should provide next steps when verification fails', async () => {
      const result = await handleReportVerificationResult({
        taskId: 'TASK-001',
        verificationType: 'visual',
        passed: false,
        findings: ['UI alignment issue'],
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.data.nextSteps).toBeDefined();
      expect(content.data.nextSteps.length).toBeGreaterThan(0);
    });
  });
});

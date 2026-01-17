/**
 * Tests for MCP Client Endpoint Path Consistency
 * Validates that all MCP endpoints use the canonical /api/v1/mcp/ pattern
 * Reference: Issue [HIGH] MCP client uses inconsistent endpoint paths
 */

import { MCP_ENDPOINTS } from './mcpClient';

describe('MCP Endpoint Path Consistency', () => {
  describe('MCP_ENDPOINTS constant', () => {
    it('should define all required MCP endpoints', () => {
      expect(MCP_ENDPOINTS.BASE).toBeDefined();
      expect(MCP_ENDPOINTS.NEXT_TASK).toBeDefined();
      expect(MCP_ENDPOINTS.REPORT_TASK_STATUS).toBeDefined();
      expect(MCP_ENDPOINTS.REPORT_OBSERVATION).toBeDefined();
      expect(MCP_ENDPOINTS.REPORT_TEST_FAILURE).toBeDefined();
      expect(MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT).toBeDefined();
      expect(MCP_ENDPOINTS.ASK_QUESTION).toBeDefined();
      expect(MCP_ENDPOINTS.SAVE_PLAN).toBeDefined();
      expect(MCP_ENDPOINTS.LOAD_PLAN).toBeDefined();
      expect(MCP_ENDPOINTS.LIST_PLANS).toBeDefined();
      expect(MCP_ENDPOINTS.TEAMS_STATUS).toBeDefined();
    });

    it('should use consistent /api/v1/mcp/ prefix for all MCP endpoints', () => {
      const mcpPrefix = '/api/v1/mcp/';
      
      expect(MCP_ENDPOINTS.NEXT_TASK).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.REPORT_TASK_STATUS).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.REPORT_OBSERVATION).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.REPORT_TEST_FAILURE).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.ASK_QUESTION).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.SAVE_PLAN).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.LOAD_PLAN).toContain(mcpPrefix);
      expect(MCP_ENDPOINTS.LIST_PLANS).toContain(mcpPrefix);
    });

    it('should NOT use legacy /mcp/ prefix for any endpoint', () => {
      const legacyPrefix = /^\/mcp\//;
      
      expect(MCP_ENDPOINTS.NEXT_TASK).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.REPORT_TASK_STATUS).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.REPORT_OBSERVATION).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.REPORT_TEST_FAILURE).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.ASK_QUESTION).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.SAVE_PLAN).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.LOAD_PLAN).not.toMatch(legacyPrefix);
      expect(MCP_ENDPOINTS.LIST_PLANS).not.toMatch(legacyPrefix);
    });

    it('should use /api/v1/teams/status for teams status endpoint', () => {
      expect(MCP_ENDPOINTS.TEAMS_STATUS).toBe('/api/v1/teams/status');
    });
  });

  describe('Individual endpoint paths', () => {
    it('NEXT_TASK should be /api/v1/mcp/nextTask', () => {
      expect(MCP_ENDPOINTS.NEXT_TASK).toBe('/api/v1/mcp/nextTask');
    });

    it('REPORT_TASK_STATUS should be /api/v1/mcp/reportTaskStatus', () => {
      expect(MCP_ENDPOINTS.REPORT_TASK_STATUS).toBe('/api/v1/mcp/reportTaskStatus');
    });

    it('REPORT_OBSERVATION should be /api/v1/mcp/reportObservation', () => {
      expect(MCP_ENDPOINTS.REPORT_OBSERVATION).toBe('/api/v1/mcp/reportObservation');
    });

    it('REPORT_TEST_FAILURE should be /api/v1/mcp/reportTestFailure', () => {
      expect(MCP_ENDPOINTS.REPORT_TEST_FAILURE).toBe('/api/v1/mcp/reportTestFailure');
    });

    it('REPORT_VERIFICATION_RESULT should be /api/v1/mcp/reportVerificationResult', () => {
      expect(MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT).toBe('/api/v1/mcp/reportVerificationResult');
    });

    it('ASK_QUESTION should be /api/v1/mcp/askQuestion', () => {
      expect(MCP_ENDPOINTS.ASK_QUESTION).toBe('/api/v1/mcp/askQuestion');
    });

    it('SAVE_PLAN should be /api/v1/mcp/savePlan', () => {
      expect(MCP_ENDPOINTS.SAVE_PLAN).toBe('/api/v1/mcp/savePlan');
    });

    it('LOAD_PLAN should be /api/v1/mcp/loadPlan', () => {
      expect(MCP_ENDPOINTS.LOAD_PLAN).toBe('/api/v1/mcp/loadPlan');
    });

    it('LIST_PLANS should be /api/v1/mcp/listPlans', () => {
      expect(MCP_ENDPOINTS.LIST_PLANS).toBe('/api/v1/mcp/listPlans');
    });
  });

  describe('Base endpoint', () => {
    it('BASE should be /api/v1/mcp', () => {
      expect(MCP_ENDPOINTS.BASE).toBe('/api/v1/mcp');
    });

    it('all MCP endpoints should start with BASE path', () => {
      const basePrefix = MCP_ENDPOINTS.BASE;
      
      expect(MCP_ENDPOINTS.NEXT_TASK.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.REPORT_TASK_STATUS.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.REPORT_OBSERVATION.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.REPORT_TEST_FAILURE.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.ASK_QUESTION.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.SAVE_PLAN.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.LOAD_PLAN.startsWith(basePrefix)).toBe(true);
      expect(MCP_ENDPOINTS.LIST_PLANS.startsWith(basePrefix)).toBe(true);
    });
  });

  describe('Endpoint naming conventions', () => {
    it('should use camelCase for endpoint names', () => {
      // Extract the endpoint name from the full path
      const getEndpointName = (path: string) => path.split('/').pop() || '';
      
      const endpoints = [
        MCP_ENDPOINTS.NEXT_TASK,
        MCP_ENDPOINTS.REPORT_TASK_STATUS,
        MCP_ENDPOINTS.REPORT_OBSERVATION,
        MCP_ENDPOINTS.REPORT_TEST_FAILURE,
        MCP_ENDPOINTS.REPORT_VERIFICATION_RESULT,
        MCP_ENDPOINTS.ASK_QUESTION,
        MCP_ENDPOINTS.SAVE_PLAN,
        MCP_ENDPOINTS.LOAD_PLAN,
        MCP_ENDPOINTS.LIST_PLANS,
      ];

      endpoints.forEach(endpoint => {
        const name = getEndpointName(endpoint);
        // Check that the first letter is lowercase (camelCase)
        expect(name[0]).toBe(name[0].toLowerCase());
      });
    });
  });
});

import * as mainExports from '../index';

jest.mock('vscode');

describe('Index Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should export task parser types and functions', () => {
      expect(mainExports.parseTaskMarkdown).toBeDefined();
      expect(mainExports.parseTaskFile).toBeDefined();
      expect(mainExports.parseTasksFromDirectory).toBeDefined();
      expect(mainExports.isValidTaskType).toBeDefined();
      expect(mainExports.isValidTaskPriority).toBeDefined();
      expect(mainExports.isValidTaskStatus).toBeDefined();
      expect(mainExports.isValidAgentType).toBeDefined();
      expect(mainExports.normalizeEffort).toBeDefined();
    });

    it('should export task graph generator types and classes', () => {
      expect(mainExports.TaskGraphGenerator).toBeDefined();
      expect(mainExports.generateTaskGraph).toBeDefined();
      expect(mainExports.getExecutionOrder).toBeDefined();
      expect(mainExports.detectCycles).toBeDefined();
      expect(mainExports.getReadyTasks).toBeDefined();
      expect(mainExports.exportToDot).toBeDefined();
      expect(mainExports.exportToMermaid).toBeDefined();
    });

    it('should export agent profiles', () => {
      expect(mainExports.AgentProfileLoader).toBeDefined();
      expect(mainExports.defaultAgentProfileLoader).toBeDefined();
    });

    it('should export copilot dispatcher', () => {
      expect(mainExports.CopilotDispatcher).toBeDefined();
      expect(mainExports.defaultCopilotDispatcher).toBeDefined();
    });

    it('should export orchestrator panel', () => {
      expect(mainExports.OrchestratorPanelProvider).toBeDefined();
    });

    it('should export task executor', () => {
      expect(mainExports.TaskExecutor).toBeDefined();
      expect(mainExports.defaultTaskExecutor).toBeDefined();
      expect(mainExports.executeNextTask).toBeDefined();
    });

    it('should export testing agent', () => {
      expect(mainExports.TestingAgent).toBeDefined();
      expect(mainExports.defaultTestingAgent).toBeDefined();
    });

    it('should export verification agent', () => {
      expect(mainExports.VerificationAgent).toBeDefined();
      expect(mainExports.defaultVerificationAgent).toBeDefined();
      expect(mainExports.verifyAndReport).toBeDefined();
    });

    it('should export decomposition agent', () => {
      expect(mainExports.DecompositionAgent).toBeDefined();
      expect(mainExports.defaultDecompositionAgent).toBeDefined();
    });

    it('should export LLM configuration helper', () => {
      expect(mainExports.readLlmConfig).toBeDefined();
      expect(mainExports.isValidBaseUrl).toBeDefined();
      expect(mainExports.redactSecret).toBeDefined();
    });

    it('should export LLM client', () => {
      expect(mainExports.createOpenAIClient).toBeDefined();
    });

    it('should export demo and test functions', () => {
      expect(mainExports.runTaskGraphDemo).toBeDefined();
      expect(mainExports.runAllTests).toBeDefined();
    });
  });

  describe('Type Validation Functions', () => {
    it('should validate task types correctly', () => {
      expect(mainExports.isValidTaskType('feature')).toBe(true);
      expect(mainExports.isValidTaskType('bug')).toBe(true);
      expect(mainExports.isValidTaskType('invalid')).toBe(false);
    });

    it('should validate task priorities correctly', () => {
      expect(mainExports.isValidTaskPriority('high')).toBe(true);
      expect(mainExports.isValidTaskPriority('medium')).toBe(true);
      expect(mainExports.isValidTaskPriority('low')).toBe(true);
      expect(mainExports.isValidTaskPriority('invalid')).toBe(false);
    });

    it('should validate task statuses correctly', () => {
      expect(mainExports.isValidTaskStatus('pending')).toBe(true);
      expect(mainExports.isValidTaskStatus('in_progress')).toBe(true);
      expect(mainExports.isValidTaskStatus('completed')).toBe(true);
      expect(mainExports.isValidTaskStatus('testing')).toBe(true);
      expect(mainExports.isValidTaskStatus('review')).toBe(true);
      expect(mainExports.isValidTaskStatus('blocked')).toBe(true);
      expect(mainExports.isValidTaskStatus('invalid')).toBe(false);
    });

    it('should validate agent types correctly', () => {
      expect(mainExports.isValidAgentType('planner')).toBe(true);
      expect(mainExports.isValidAgentType('coder')).toBe(true);
      expect(mainExports.isValidAgentType('tester')).toBe(true);
      expect(mainExports.isValidAgentType('reviewer')).toBe(true);
      expect(mainExports.isValidAgentType('invalid')).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should normalize effort correctly', () => {
      const result = mainExports.normalizeEffort('2h');
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('should validate base URL correctly', () => {
      expect(mainExports.isValidBaseUrl('https://api.openai.com')).toBe(true);
      expect(mainExports.isValidBaseUrl('http://localhost:8080')).toBe(true);
      expect(mainExports.isValidBaseUrl('not-a-url')).toBe(false);
    });

    it('should redact secrets correctly', () => {
      const secret = 'sk-1234567890abcdef';
      const redacted = mainExports.redactSecret(secret);
      expect(redacted).not.toBe(secret);
      expect(redacted).toContain('***');
    });
  });
});

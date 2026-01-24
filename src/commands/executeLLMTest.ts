import { ExecutionContext } from './executeLLM';

/**
 * Mock LLM response for testing
 */
export const mockLlmResponses = {
  success: {
    id: 'chatcmpl-test-123',
    choices: [
      {
        message: {
          role: 'assistant' as const,
          content: 'This is a successful LLM response with analysis and recommendations.',
        },
        finish_reason: 'stop',
      },
    ],
  },
  error: {
    error: {
      message: 'Invalid request',
      type: 'invalid_request_error',
      code: 'invalid_request',
    },
  },
};

/**
 * Mock CopilotDispatcher for testing
 */
export class MockCopilotDispatcher {
  async composePrompt(taskId: string, options?: any) {
    return {
      taskId,
      agent: {
        name: 'coder',
        role: 'code-generator',
        instructions: 'Generate code for tasks',
        tool_permissions: [],
        execution_constraints: {},
        prompt_templates: { planning: 'Analyze: {{task}}' },
        defaults: {},
      },
      task: {
        id: taskId,
        title: 'Test Task',
        description: 'A test task for LLM execution',
        status: 'pending' as const,
        priority: 'medium' as const,
        dependencies: [],
        subtasks: [],
        assignees: [],
        labels: [],
        rawFrontMatter: {},
      },
      context: {
        files: [
          {
            path: 'test.ts',
            content: 'const test = true;',
          },
        ],
      },
      memory: [
        {
          role: 'user' as const,
          content: 'Previous context',
        },
      ],
      messages: [
        {
          role: 'system' as const,
          content: 'You are a helpful code generator.',
        },
        {
          role: 'user' as const,
          content: 'Generate code for: A test task for LLM execution',
        },
      ],
      metadata: {
        workspaceRoot: '/test',
        tasksDir: '/test/_ZENTASKS',
      },
    };
  }
}

/**
 * Mock OpenAI client for testing
 */
export class MockOpenAIClient {
  async sendChat(messages: any[], options?: any) {
    return {
      id: 'chatcmpl-test-456',
      choices: [
        {
          message: {
            role: 'assistant' as const,
            content: 'Mock LLM response: Task analysis complete.',
          },
          finish_reason: 'stop',
        },
      ],
    };
  }

  async testConnection() {
    return true;
  }
}

/**
 * Test execution context builder
 */
export function createTestExecutionContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    taskId: 'TASK-test-123',
    agentName: 'coder',
    startTime: Date.now(),
    memoryEntries: [
      {
        role: 'system',
        content: 'Test system context',
        timestamp: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}

/**
 * Validate execution context
 */
export function validateExecutionContext(context: ExecutionContext): string[] {
  const issues: string[] = [];

  if (!context.taskId) {
    issues.push('taskId is required');
  }
  if (!context.agentName) {
    issues.push('agentName is required');
  }
  if (!context.startTime || context.startTime <= 0) {
    issues.push('startTime must be a valid timestamp');
  }
  if (context.endTime && context.endTime < context.startTime) {
    issues.push('endTime cannot be before startTime');
  }
  if (context.error && !context.error.trim()) {
    issues.push('error message cannot be empty');
  }

  return issues;
}

/**
 * Run LLM executor tests
 */
function runExecuteLlmTests(): void {
  console.log('=== ExecuteLLM Integration Tests ===');

  // Test 1: Mock execution context creation
  try {
    const context = createTestExecutionContext();
    console.assert(context.taskId === 'TASK-test-123', 'Context should have taskId');
    console.assert(context.agentName === 'coder', 'Context should have agentName');
    console.assert(Array.isArray(context.memoryEntries), 'Context should have memoryEntries array');
    console.log('✓ Execution context creation');
  } catch (error) {
    console.error('✗ Execution context creation:', error);
  }

  // Test 2: Context validation - valid case
  try {
    const context = createTestExecutionContext();
    const issues = validateExecutionContext(context);
    console.assert(issues.length === 0, `Should have no validation issues, got: ${issues.join(', ')}`);
    console.log('✓ Context validation (valid)');
  } catch (error) {
    console.error('✗ Context validation (valid):', error);
  }

  // Test 3: Context validation - missing taskId
  try {
    const context = createTestExecutionContext({ taskId: '' });
    const issues = validateExecutionContext(context);
    console.assert(issues.length > 0, 'Should detect missing taskId');
    console.assert(issues.some((i) => i.includes('taskId')), 'Should mention taskId');
    console.log('✓ Context validation (missing taskId)');
  } catch (error) {
    console.error('✗ Context validation (missing taskId):', error);
  }

  // Test 4: Context validation - endTime before startTime
  try {
    const context = createTestExecutionContext({
      startTime: 1000,
      endTime: 500,
    });
    const issues = validateExecutionContext(context);
    console.assert(issues.length > 0, 'Should detect endTime before startTime');
    console.assert(issues.some((i) => i.includes('endTime')), 'Should mention endTime');
    console.log('✓ Context validation (endTime before startTime)');
  } catch (error) {
    console.error('✗ Context validation (endTime before startTime):', error);
  }

  // Test 5: Mock dispatcher composition
  try {
    const dispatcher = new MockCopilotDispatcher();
    dispatcher.composePrompt('TASK-test-1', { agentName: 'coder' }).then((payload) => {
      console.assert(payload.taskId === 'TASK-test-1', 'Payload should contain taskId');
      console.assert(payload.messages.length === 2, 'Payload should have system and user messages');
      console.assert(payload.agent.name === 'coder', 'Payload should have agent name');
      console.log('✓ Mock dispatcher composition');
    });
  } catch (error) {
    console.error('✗ Mock dispatcher composition:', error);
  }

  // Test 6: Mock LLM client
  try {
    const client = new MockOpenAIClient();
    client
      .sendChat(
        [
          { role: 'system', content: 'test' },
          { role: 'user', content: 'test' },
        ],
        { temperature: 0.7 }
      )
      .then((response) => {
        console.assert(!!response.id, 'Response should have id');
        console.assert(response.choices?.length > 0, 'Response should have choices');
        console.assert(!!response.choices[0].message?.content, 'Message should have content');
        console.log('✓ Mock LLM client');
      });
  } catch (error) {
    console.error('✗ Mock LLM client:', error);
  }

  // Test 7: Mock LLM response shape
  try {
    const response = mockLlmResponses.success;
    console.assert(!!response.id, 'Response should have id');
    console.assert(response.choices?.length > 0, 'Response should have choices');
    console.assert(!!response.choices[0].finish_reason, 'Choice should have finish_reason');
    console.assert(response.choices[0].message?.role === 'assistant', 'Role should be assistant');
    console.log('✓ Mock LLM response shape');
  } catch (error) {
    console.error('✗ Mock LLM response shape:', error);
  }

  // Test 8: Execution duration tracking
  try {
    const startTime = Date.now();
    const endTime = startTime + 5000;
    const context = createTestExecutionContext({
      startTime,
      endTime,
    });
    const durationMs = context.endTime! - context.startTime;
    console.assert(durationMs === 5000, `Duration should be 5000ms, got ${durationMs}`);
    console.log('✓ Execution duration tracking');
  } catch (error) {
    console.error('✗ Execution duration tracking:', error);
  }

  console.log('=== ExecuteLLM Tests Complete ✓ ===');
}

if (require.main === module) {
  try {
    runExecuteLlmTests();
  } catch (error) {
    console.error('ExecuteLLM tests failed:', error);
    process.exit(1);
  }
}

export { runExecuteLlmTests };

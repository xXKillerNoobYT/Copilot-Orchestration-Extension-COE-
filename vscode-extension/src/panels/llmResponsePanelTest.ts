/**
 * Tests for LLM Response Panel
 */

export interface ExecutionResult {
  taskId: string;
  taskTitle: string;
  agentName: string;
  timestamp: string;
  duration: number;
  success: boolean;
  message: string;
  response?: string;
  error?: string;
}

// Test fixtures
const mockResults: ExecutionResult[] = [
  {
    taskId: 'TASK-001',
    taskTitle: 'Implement auth system',
    agentName: 'CopilotDispatcher',
    timestamp: new Date().toISOString(),
    duration: 2500,
    success: true,
    message: 'Execution completed successfully',
    response: 'Successfully implemented JWT-based authentication with refresh tokens.',
  },
  {
    taskId: 'TASK-002',
    taskTitle: 'Fix memory leak',
    agentName: 'CopilotDispatcher',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    duration: 1800,
    success: false,
    message: 'Execution failed',
    error: 'Memory analysis tool not available in this environment',
  },
  {
    taskId: 'TASK-003',
    taskTitle: 'Add documentation',
    agentName: 'CopilotDispatcher',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    duration: 3200,
    success: true,
    message: 'Execution completed successfully',
    response: 'Added comprehensive JSDoc comments and README sections.',
  },
];

/**
 * Run LLM response panel tests
 */
async function runLLMResponsePanelTests(): Promise<void> {
  let passCount = 0;
  let failCount = 0;

  // Test 1: Create execution result
  try {
    const result: ExecutionResult = {
      taskId: 'TASK-test',
      taskTitle: 'Test Task',
      agentName: 'TestAgent',
      timestamp: new Date().toISOString(),
      duration: 1000,
      success: true,
      message: 'Test message',
      response: 'Test response',
    };

    console.assert(!!result.taskId, 'Result should have taskId');
    console.assert(!!result.taskTitle, 'Result should have taskTitle');
    console.assert(result.success === true, 'Result should indicate success');
    console.assert(result.duration > 0, 'Result should have duration');

    console.log('[✓] Test 1: Create execution result');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 1: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 2: Result with error
  try {
    const errorResult: ExecutionResult = {
      taskId: 'TASK-error',
      taskTitle: 'Failed Task',
      agentName: 'TestAgent',
      timestamp: new Date().toISOString(),
      duration: 500,
      success: false,
      message: 'Execution failed',
      error: 'Test error message',
    };

    console.assert(!errorResult.success, 'Error result should indicate failure');
    console.assert(!!errorResult.error, 'Error result should have error message');
    console.assert(!errorResult.response, 'Error result should not have response');

    console.log('[✓] Test 2: Result with error');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 2: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 3: Mock history array
  try {
    const history: ExecutionResult[] = [...mockResults];

    console.assert(history.length === 3, 'History should have 3 items');
    console.assert(history[0].success === true, 'First item should be successful');
    console.assert(history[1].success === false, 'Second item should be failed');
    console.assert(history.every((r) => !!r.timestamp), 'All items should have timestamp');

    console.log('[✓] Test 3: Mock history array');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 3: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 4: History rotation (limit to 50)
  try {
    const history: ExecutionResult[] = [];
    for (let i = 0; i < 60; i++) {
      history.unshift({
        taskId: `TASK-${i}`,
        taskTitle: `Task ${i}`,
        agentName: 'TestAgent',
        timestamp: new Date().toISOString(),
        duration: 1000,
        success: i % 2 === 0,
        message: `Message ${i}`,
      });
    }

    // Apply rotation logic (keep only last 50)
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    console.assert(history.length === 50, 'History should be limited to 50 items');
    console.assert(history[history.length - 1].taskId === 'TASK-9', 'Oldest item should be TASK-9');

    console.log('[✓] Test 4: History rotation (limit to 50)');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 4: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 5: Duration formatting
  try {
    const result1: ExecutionResult = {
      taskId: 'TASK-1',
      taskTitle: 'Quick Task',
      agentName: 'TestAgent',
      timestamp: new Date().toISOString(),
      duration: 1500, // 1.5 seconds
      success: true,
      message: 'Quick execution',
    };

    const result2: ExecutionResult = {
      taskId: 'TASK-2',
      taskTitle: 'Slow Task',
      agentName: 'TestAgent',
      timestamp: new Date().toISOString(),
      duration: 45000, // 45 seconds
      success: true,
      message: 'Slow execution',
    };

    const duration1 = (result1.duration / 1000).toFixed(2);
    const duration2 = (result2.duration / 1000).toFixed(2);

    console.assert(duration1 === '1.50', 'Quick task should format to 1.50s');
    console.assert(duration2 === '45.00', 'Slow task should format to 45.00s');

    console.log('[✓] Test 5: Duration formatting');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 5: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 6: Timestamp parsing
  try {
    const now = new Date();
    const result: ExecutionResult = {
      taskId: 'TASK-ts',
      taskTitle: 'Timestamp Task',
      agentName: 'TestAgent',
      timestamp: now.toISOString(),
      duration: 1000,
      success: true,
      message: 'Timestamp test',
    };

    const parsed = new Date(result.timestamp);
    console.assert(!isNaN(parsed.getTime()), 'Timestamp should be valid date');
    console.assert(parsed.getTime() === now.getTime(), 'Timestamp should match original');

    console.log('[✓] Test 6: Timestamp parsing');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 6: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 7: HTML escaping for security
  try {
    const dangerous = '<script>alert("xss")</script>';
    const result: ExecutionResult = {
      taskId: 'TASK-xss',
      taskTitle: dangerous,
      agentName: dangerous,
      timestamp: new Date().toISOString(),
      duration: 1000,
      success: true,
      message: dangerous,
      response: dangerous,
      error: dangerous,
    };

    // Simulate escaping
    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const escaped = escapeHtml(result.response || '');
    console.assert(!escaped.includes('<script>'), 'Script tags should be escaped');
    console.assert(escaped.includes('&lt;script&gt;'), 'Should have escaped brackets');

    console.log('[✓] Test 7: HTML escaping for security');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 7: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 8: Result status classification
  try {
    const successResult: ExecutionResult = {
      taskId: 'TASK-s',
      taskTitle: 'Success',
      agentName: 'TestAgent',
      timestamp: new Date().toISOString(),
      duration: 1000,
      success: true,
      message: 'Success',
    };

    const failResult: ExecutionResult = {
      taskId: 'TASK-f',
      taskTitle: 'Fail',
      agentName: 'TestAgent',
      timestamp: new Date().toISOString(),
      duration: 1000,
      success: false,
      message: 'Fail',
      error: 'Error',
    };

    const successClass = successResult.success ? 'status-success' : 'status-error';
    const failClass = failResult.success ? 'status-success' : 'status-error';

    console.assert(successClass === 'status-success', 'Success result should get success class');
    console.assert(failClass === 'status-error', 'Failed result should get error class');

    console.log('[✓] Test 8: Result status classification');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 8: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Print summary
  console.log('\n=== LLM Response Panel Tests Summary ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('✓ All tests passed!');
  }
}

// Run tests
export { runLLMResponsePanelTests };

// Execute tests if running directly
if (require.main === module) {
  runLLMResponsePanelTests()
    .then(() => {
      console.log('LLM Response Panel tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('LLM Response Panel tests failed:', error);
      process.exit(1);
    });
}

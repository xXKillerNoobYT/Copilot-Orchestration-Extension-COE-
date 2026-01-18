/**
 * Manual Test Script for Agent Mode Integration
 * Run with: node dist/mcp-server/agentModeManualTest.js
 */

import { validateInput, ValidationSchemas } from './agentValidation.js';
import { handleGetNextTask } from './handlers/getNextTask.js';
import { handleReportTaskStatus } from './handlers/reportTaskStatus.js';
import { handleGetContextBundle } from './handlers/getContextBundle.js';
import { handleReportTestFailure } from './handlers/reportTestFailure.js';
import { handleReportVerificationResult } from './handlers/reportVerificationResult.js';

async function runTests() {
  console.log('🧪 Testing Agent Mode Integration\n');

  let passCount = 0;
  let failCount = 0;

  function test(name: string, fn: () => boolean) {
    try {
      const result = fn();
      if (result) {
        console.log(`✅ ${name}`);
        passCount++;
      } else {
        console.log(`❌ ${name}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  async function testAsync(name: string, fn: () => Promise<boolean>) {
    try {
      const result = await fn();
      if (result) {
        console.log(`✅ ${name}`);
        passCount++;
      } else {
        console.log(`❌ ${name}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  // Validation tests
  console.log('📋 Validation Tests:');

  test('getNextTask validates valid input', () => {
    const result = validateInput(ValidationSchemas.getNextTask, { priority: 'high' });
    return result.valid === true;
  });

  test('getNextTask accepts empty input', () => {
    const result = validateInput(ValidationSchemas.getNextTask, {});
    return result.valid === true;
  });

  test('getNextTask rejects invalid priority', () => {
    const result = validateInput(ValidationSchemas.getNextTask, { priority: 'invalid' });
    return result.valid === false;
  });

  test('reportTaskStatus validates complete input', () => {
    const result = validateInput(ValidationSchemas.reportTaskStatus, {
      taskId: 'TASK-001',
      status: 'in-progress',
      progress: 0.5,
    });
    return result.valid === true;
  });

  test('reportTaskStatus requires taskId', () => {
    const result = validateInput(ValidationSchemas.reportTaskStatus, { status: 'done' });
    return result.valid === false;
  });

  test('getContextBundle validates with taskId', () => {
    const result = validateInput(ValidationSchemas.getContextBundle, { taskId: 'TASK-001' });
    return result.valid === true;
  });

  test('reportTestFailure validates complete input', () => {
    const result = validateInput(ValidationSchemas.reportTestFailure, {
      taskId: 'TASK-001',
      testName: 'test',
      errorMessage: 'error',
    });
    return result.valid === true;
  });

  test('reportVerificationResult validates complete input', () => {
    const result = validateInput(ValidationSchemas.reportVerificationResult, {
      taskId: 'TASK-001',
      verificationType: 'functional',
      passed: true,
      findings: [],
    });
    return result.valid === true;
  });

  // Handler tests
  console.log('\n🔧 Handler Tests:');

  await testAsync('handleGetNextTask returns task', async () => {
    const result = await handleGetNextTask({ priority: 'high' });
    const content = JSON.parse(result.content[0].text);
    return content.success === true && content.data.task !== undefined;
  });

  await testAsync('handleGetNextTask rejects invalid input', async () => {
    const result = await handleGetNextTask({ priority: 'invalid' });
    const content = JSON.parse(result.content[0].text);
    return content.success === false;
  });

  await testAsync('handleReportTaskStatus updates status', async () => {
    const result = await handleReportTaskStatus({
      taskId: 'TASK-001',
      status: 'in-progress',
    });
    const content = JSON.parse(result.content[0].text);
    return content.success === true;
  });

  await testAsync('handleGetContextBundle returns context', async () => {
    const result = await handleGetContextBundle({ taskId: 'TASK-001' });
    const content = JSON.parse(result.content[0].text);
    return content.success === true && content.data.context !== undefined;
  });

  await testAsync('handleReportTestFailure reports failure', async () => {
    const result = await handleReportTestFailure({
      taskId: 'TASK-001',
      testName: 'test',
      errorMessage: 'error',
    });
    const content = JSON.parse(result.content[0].text);
    return content.success === true;
  });

  await testAsync('handleReportVerificationResult submits result', async () => {
    const result = await handleReportVerificationResult({
      taskId: 'TASK-001',
      verificationType: 'functional',
      passed: true,
      findings: [],
    });
    const content = JSON.parse(result.content[0].text);
    return content.success === true;
  });

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

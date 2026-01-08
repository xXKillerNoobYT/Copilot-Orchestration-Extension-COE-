/**
 * Client Request Builder Unit Tests
 *
 * Tests for buildTransportRequest, buildRequestBody, buildRequestHeaders,
 * request validation, and token estimation.
 */

import {
  buildRequestHeaders,
  buildRequestBody,
  buildRequestMetadata,
  validateRequestBody,
  buildTransportRequest,
  estimateTokenCount,
  buildTransportRequestWithEstimate,
  formatRequestForLogging,
  ChatCompletionsRequest,
  TransportRequest,
} from './client';
import { LlmConfig } from '../config/llmConfig';
import { PromptPayload } from '../copilotDispatcher';

// Mock data
const mockConfig: LlmConfig = {
  baseUrl: 'http://localhost:1234/v1',
  apiKey: 'test-api-key-12345',
  defaultModel: 'gpt-4',
  temperature: 0.7,
  timeout: 30000,
  taskRoots: ['_ZENTASKS'],
};

const mockPayload: PromptPayload = {
  taskId: 'TASK-test-123',
  agent: {
    name: 'test-agent',
    role: 'code-generator',
    instructions: 'Generate code',
    tool_permissions: { read_files: true },
    execution_constraints: { max_depth: 5 },
    prompt_templates: { system: 'System template' },
    defaults: {},
  },
  task: {
    id: 'TASK-test-123',
    title: 'Test Task',
    description: 'Test task description',
    status: 'pending',
    priority: 'high',
    dependencies: [],
    subtasks: [],
    assignees: [],
    labels: [],
    rawFrontMatter: {},
  },
  context: {
    files: [{ path: '/src/test.ts', content: 'const test = true;', truncated: false }],
  },
  memory: [{ role: 'user', content: 'Previous message' }],
  messages: [
    { role: 'system', content: 'You are a helpful code generator.' },
    { role: 'user', content: 'Generate a simple function.' },
  ],
  metadata: {
    workspaceRoot: '/test',
    tasksDir: '/test/_ZENTASKS',
    contextFileCount: 1,
    memoryCount: 1,
  },
};

/**
 * Test: Build Request Headers
 */
function testBuildRequestHeaders() {
  console.log('\nTest: Build Request Headers');

  // Test with API key
  const headers = buildRequestHeaders(mockConfig);

  if (headers['Content-Type'] !== 'application/json') {
    console.error('✗ Content-Type header missing');
    return;
  }

  if (!headers['Authorization']) {
    console.error('✗ Authorization header missing');
    return;
  }

  if (!headers['Authorization'].startsWith('Bearer ')) {
    console.error('✗ Authorization header format invalid');
    return;
  }

  if (headers['User-Agent'] !== 'CopilotOrchestrator/1.0') {
    console.error('✗ User-Agent header incorrect');
    return;
  }

  console.log('✓ Request headers built correctly');
}

/**
 * Test: Build Request Headers Without API Key
 */
function testBuildRequestHeadersNoApiKey() {
  console.log('\nTest: Build Request Headers Without API Key');

  const configNoKey: LlmConfig = { ...mockConfig, apiKey: '' };
  const headers = buildRequestHeaders(configNoKey);

  if (headers['Authorization']) {
    console.error('✗ Authorization header should not be present');
    return;
  }

  if (headers['Content-Type'] !== 'application/json') {
    console.error('✗ Content-Type header missing');
    return;
  }

  console.log('✓ Headers work without API key');
}

/**
 * Test: Build Request Headers with Correlation
 */
function testBuildRequestHeadersWithCorrelation() {
  console.log('\nTest: Build Request Headers with Correlation');

  const headers = buildRequestHeaders(mockConfig, {
    includeTaskId: true,
    taskId: 'TASK-correlation-test',
    agentName: 'test-agent',
  });

  if (headers['X-Task-Id'] !== 'TASK-correlation-test') {
    console.error('✗ X-Task-Id header missing or incorrect');
    return;
  }

  if (headers['X-Agent-Name'] !== 'test-agent') {
    console.error('✗ X-Agent-Name header missing or incorrect');
    return;
  }

  console.log('✓ Correlation headers added correctly');
}

/**
 * Test: Build Request Body
 */
function testBuildRequestBody() {
  console.log('\nTest: Build Request Body');

  const body = buildRequestBody(mockPayload, mockConfig);

  if (body.model !== mockConfig.defaultModel) {
    console.error('✗ Model mismatch');
    return;
  }

  if (!Array.isArray(body.messages) || body.messages.length < 2) {
    console.error('✗ Messages not properly set');
    return;
  }

  if (body.temperature !== mockConfig.temperature) {
    console.error('✗ Temperature not set');
    return;
  }

  if (body.user !== `task:${mockPayload.taskId}`) {
    console.error('✗ User field should contain task ID');
    return;
  }

  console.log('✓ Request body built correctly');
}

/**
 * Test: Build Request Body with Options
 */
function testBuildRequestBodyWithOptions() {
  console.log('\nTest: Build Request Body with Options');

  const body = buildRequestBody(mockPayload, mockConfig, {
    maxTokens: 500,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    stop: ['###', '---'],
    userId: 'user-123',
  });

  if (body.max_tokens !== 500) {
    console.error('✗ max_tokens not set');
    return;
  }

  if (body.top_p !== 0.9) {
    console.error('✗ top_p not set');
    return;
  }

  if (body.frequency_penalty !== 0.5) {
    console.error('✗ frequency_penalty not set');
    return;
  }

  if (body.presence_penalty !== 0.5) {
    console.error('✗ presence_penalty not set');
    return;
  }

  if (!Array.isArray(body.stop) || body.stop.length !== 2) {
    console.error('✗ stop parameter not set correctly');
    return;
  }

  console.log('✓ Request body options applied correctly');
}

/**
 * Test: Build Request Metadata
 */
function testBuildRequestMetadata() {
  console.log('\nTest: Build Request Metadata');

  const metadata = buildRequestMetadata(mockPayload);

  if (metadata.taskId !== mockPayload.taskId) {
    console.error('✗ TaskId not preserved');
    return;
  }

  if (metadata.agentName !== mockPayload.agent.name) {
    console.error('✗ Agent name not preserved');
    return;
  }

  if (metadata.messageCount !== mockPayload.messages.length) {
    console.error('✗ Message count incorrect');
    return;
  }

  if (metadata.contextFileCount !== mockPayload.metadata?.contextFileCount) {
    console.error('✗ Context file count incorrect');
    return;
  }

  if (typeof metadata.totalCharacters !== 'number' || metadata.totalCharacters === 0) {
    console.error('✗ Total characters not calculated');
    return;
  }

  if (!metadata.timestamp) {
    console.error('✗ Timestamp not set');
    return;
  }

  console.log('✓ Request metadata built correctly');
}

/**
 * Test: Validate Request Body - Valid
 */
function testValidateRequestBodyValid() {
  console.log('\nTest: Validate Request Body - Valid');

  const validBody: ChatCompletionsRequest = {
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
    ],
    temperature: 0.7,
  };

  try {
    validateRequestBody(validBody);
    console.log('✓ Valid request body passes validation');
  } catch (error) {
    console.error(`✗ Valid body rejected: ${(error as Error).message}`);
  }
}

/**
 * Test: Validate Request Body - Missing Model
 */
function testValidateRequestBodyMissingModel() {
  console.log('\nTest: Validate Request Body - Missing Model');

  const invalidBody: any = {
    messages: [{ role: 'user', content: 'Hello' }],
  };

  try {
    validateRequestBody(invalidBody);
    console.error('✗ Should have rejected missing model');
  } catch (error) {
    if ((error as Error).message.includes('model')) {
      console.log('✓ Correctly rejects missing model');
    } else {
      console.error(`✗ Wrong error message: ${(error as Error).message}`);
    }
  }
}

/**
 * Test: Validate Request Body - Invalid Temperature
 */
function testValidateRequestBodyInvalidTemperature() {
  console.log('\nTest: Validate Request Body - Invalid Temperature');

  const invalidBody: ChatCompletionsRequest = {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
    temperature: 3.5, // Out of range
  };

  try {
    validateRequestBody(invalidBody);
    console.error('✗ Should have rejected invalid temperature');
  } catch (error) {
    if ((error as Error).message.includes('temperature')) {
      console.log('✓ Correctly rejects invalid temperature');
    } else {
      console.error(`✗ Wrong error message: ${(error as Error).message}`);
    }
  }
}

/**
 * Test: Build Transport Request
 */
function testBuildTransportRequest() {
  console.log('\nTest: Build Transport Request');

  const request = buildTransportRequest(mockPayload, mockConfig);

  if (!request.body || !request.headers || !request.metadata) {
    console.error('✗ Transport request missing fields');
    return;
  }

  if (!request.headers['Authorization']) {
    console.error('✗ Authorization header missing in transport request');
    return;
  }

  if (request.metadata.taskId !== mockPayload.taskId) {
    console.error('✗ Metadata taskId mismatch');
    return;
  }

  console.log('✓ Transport request built correctly');
}

/**
 * Test: Build Transport Request with Correlation
 */
function testBuildTransportRequestWithCorrelation() {
  console.log('\nTest: Build Transport Request with Correlation');

  const request = buildTransportRequest(mockPayload, mockConfig, {
    includeCorrelationHeaders: true,
  });

  if (!request.headers['X-Task-Id']) {
    console.error('✗ Correlation header missing');
    return;
  }

  if (request.headers['X-Task-Id'] !== mockPayload.taskId) {
    console.error('✗ Correlation header value incorrect');
    return;
  }

  console.log('✓ Transport request with correlation built correctly');
}

/**
 * Test: Estimate Token Count
 */
function testEstimateTokenCount() {
  console.log('\nTest: Estimate Token Count');

  const body = buildRequestBody(mockPayload, mockConfig);
  const estimatedTokens = estimateTokenCount(body);

  if (typeof estimatedTokens !== 'number' || estimatedTokens <= 0) {
    console.error('✗ Token count estimation failed');
    return;
  }

  // Rough validation: should be reasonable for typical prompt
  if (estimatedTokens < 10 || estimatedTokens > 10000) {
    console.error(`✗ Token count out of reasonable range: ${estimatedTokens}`);
    return;
  }

  console.log(`✓ Token count estimated: ${estimatedTokens} tokens`);
}

/**
 * Test: Build Transport Request with Estimate
 */
function testBuildTransportRequestWithEstimate() {
  console.log('\nTest: Build Transport Request with Estimate');

  const request = buildTransportRequestWithEstimate(mockPayload, mockConfig);

  if (!request.estimatedTokens || request.estimatedTokens <= 0) {
    console.error('✗ Estimated tokens not calculated');
    return;
  }

  if (request.body === undefined || request.metadata === undefined) {
    console.error('✗ Standard fields missing');
    return;
  }

  console.log(`✓ Transport request with estimate built: ${request.estimatedTokens} tokens`);
}

/**
 * Test: Format Request for Logging
 */
function testFormatRequestForLogging() {
  console.log('\nTest: Format Request for Logging');

  const request = buildTransportRequest(mockPayload, mockConfig);
  const formatted = formatRequestForLogging(request);

  if (!formatted || typeof formatted !== 'string') {
    console.error('✗ Formatted output invalid');
    return;
  }

  if (!formatted.includes(mockConfig.defaultModel)) {
    console.error('✗ Model not in formatted output');
    return;
  }

  if (!formatted.includes(mockPayload.taskId)) {
    console.error('✗ Task ID not in formatted output');
    return;
  }

  if (!formatted.includes('Messages Preview')) {
    console.error('✗ Message preview missing');
    return;
  }

  console.log('✓ Request formatted for logging correctly');
}

/**
 * Test: LM Studio Compatibility
 */
function testLmStudioCompatibility() {
  console.log('\nTest: LM Studio Compatibility');

  const lmStudioConfig: LlmConfig = {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    defaultModel: 'local-model',
    temperature: 0.7,
    timeout: 30000,
    taskRoots: ['_ZENTASKS'],
  };

  const body = buildRequestBody(mockPayload, lmStudioConfig);

  if (body.model !== 'local-model') {
    console.error('✗ LM Studio model not set');
    return;
  }

  const headers = buildRequestHeaders(lmStudioConfig);
  if (headers['Authorization']) {
    console.error('✗ LM Studio should not have auth header');
    return;
  }

  console.log('✓ LM Studio compatibility verified');
}

/**
 * Test: Empty Messages Validation
 */
function testEmptyMessagesValidation() {
  console.log('\nTest: Empty Messages Validation');

  const invalidBody: any = {
    model: 'gpt-4',
    messages: [], // Empty
  };

  try {
    validateRequestBody(invalidBody);
    console.error('✗ Should have rejected empty messages');
  } catch (error) {
    if ((error as Error).message.includes('empty')) {
      console.log('✓ Correctly rejects empty messages array');
    } else {
      console.error(`✗ Wrong error: ${(error as Error).message}`);
    }
  }
}

/**
 * Test: Message Role Validation
 */
function testMessageRoleValidation() {
  console.log('\nTest: Message Role Validation');

  const invalidBody: any = {
    model: 'gpt-4',
    messages: [
      { role: 'invalid-role', content: 'Hello' }, // Invalid role
    ],
  };

  try {
    validateRequestBody(invalidBody);
    console.error('✗ Should have rejected invalid role');
  } catch (error) {
    if ((error as Error).message.includes('role')) {
      console.log('✓ Correctly rejects invalid message role');
    } else {
      console.error(`✗ Wrong error: ${(error as Error).message}`);
    }
  }
}

/**
 * Test: OpenAI and LM Studio Compatibility
 */
function testOpenAIAndLmStudioCompatibility() {
  console.log('\nTest: OpenAI and LM Studio Compatibility');

  // Test with OpenAI config
  const openaiConfig: LlmConfig = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-key',
    defaultModel: 'gpt-4-turbo',
    temperature: 0.8,
    timeout: 60000,
    taskRoots: ['_ZENTASKS'],
  };

  const openaiBody = buildRequestBody(mockPayload, openaiConfig);
  const openaiHeaders = buildRequestHeaders(openaiConfig);

  if (openaiBody.model !== 'gpt-4-turbo') {
    console.error('✗ OpenAI model not set');
    return;
  }

  if (!openaiHeaders['Authorization']?.includes('sk-test-key')) {
    console.error('✗ OpenAI API key not in headers');
    return;
  }

  // Both should generate valid requests
  try {
    validateRequestBody(openaiBody);
    console.log('✓ Both OpenAI and LM Studio configurations work');
  } catch (error) {
    console.error(`✗ Request validation failed: ${(error as Error).message}`);
  }
}

/**
 * Main test runner
 */
function runTests() {
  console.log('=== Client Request Builder Tests ===');

  try {
    // Header building
    testBuildRequestHeaders();
    testBuildRequestHeadersNoApiKey();
    testBuildRequestHeadersWithCorrelation();

    // Body building
    testBuildRequestBody();
    testBuildRequestBodyWithOptions();

    // Metadata
    testBuildRequestMetadata();

    // Validation
    testValidateRequestBodyValid();
    testValidateRequestBodyMissingModel();
    testValidateRequestBodyInvalidTemperature();
    testEmptyMessagesValidation();
    testMessageRoleValidation();

    // Transport request
    testBuildTransportRequest();
    testBuildTransportRequestWithCorrelation();

    // Token estimation
    testEstimateTokenCount();
    testBuildTransportRequestWithEstimate();

    // Logging
    testFormatRequestForLogging();

    // Compatibility
    testLmStudioCompatibility();
    testOpenAIAndLmStudioCompatibility();

    console.log('\n=== Client Tests Complete ===\n');
  } catch (error) {
    console.error(`\n✗ Test suite error: ${(error as Error).message}`);
    process.exit(1);
  }
}

runTests();

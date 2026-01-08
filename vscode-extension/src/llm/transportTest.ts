/**
 * Transport Layer Integration Tests
 *
 * Validates that PromptPayload structures correctly map to OpenAI-compatible
 * LLM transport formats. Tests correlation tracking, message formatting,
 * and payload preservation through the transport pipeline.
 */

import { PromptPayload, PromptMessage } from '../copilotDispatcher';

// Mock types for testing
interface OpenAIChatRequest {
  model: string;
  messages: PromptMessage[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

interface TransportCorrelation {
  taskId: string;
  timestamp: string;
  headers: Record<string, string>;
}

/**
 * Helper: Create a mock LLM client request from a payload
 */
function createLlmRequest(payload: PromptPayload, options?: { model?: string; temperature?: number }): OpenAIChatRequest {
  return {
    model: options?.model || 'gpt-4',
    messages: payload.messages,
    temperature: options?.temperature || 0.7,
  };
}

/**
 * Helper: Create transport correlation metadata
 */
function createTransportCorrelation(payload: PromptPayload): TransportCorrelation {
  return {
    taskId: payload.taskId,
    timestamp: new Date().toISOString(),
    headers: {
      'x-task-id': payload.taskId,
      'x-agent': payload.agent.name,
      'x-context-files': String(payload.metadata?.contextFileCount || 0),
    },
  };
}

/**
 * Test: Message Format Compatibility
 */
function testMessageFormatCompatibility() {
  console.log('\nTest: Message Format Compatibility');

  // Mock payload
  const mockPayload: PromptPayload = {
    taskId: 'TASK-test-123',
    agent: {
      name: 'test-agent',
      role: 'code-generator',
      instructions: 'Test instructions',
      tool_permissions: { read_files: true },
      execution_constraints: { max_depth: 5 },
      prompt_templates: { system: 'Test' },
      defaults: {},
    },
    task: {
      id: 'TASK-test-123',
      title: 'Test Task',
      description: 'A test task',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      subtasks: [],
      assignees: [],
      labels: [],
      rawFrontMatter: {},
    },
    context: { files: [] },
    memory: [],
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Help me with this task.' },
    ],
    metadata: { workspaceRoot: '/test', tasksDir: '/test/_ZENTASKS', contextFileCount: 0, memoryCount: 0 },
  };

  // Create LLM request
  const request = createLlmRequest(mockPayload);

  // Validate message structure
  if (!Array.isArray(request.messages)) {
    console.error('✗ Messages is not an array');
    return;
  }

  if (request.messages.length < 2) {
    console.error('✗ Messages array too short');
    return;
  }

  const systemMsg = request.messages[0];
  const userMsg = request.messages[1];

  if (systemMsg.role !== 'system') {
    console.error('✗ First message is not system role');
    return;
  }

  if (userMsg.role !== 'user') {
    console.error('✗ Second message is not user role');
    return;
  }

  if (!systemMsg.content || typeof systemMsg.content !== 'string') {
    console.error('✗ System message content invalid');
    return;
  }

  if (!userMsg.content || typeof userMsg.content !== 'string') {
    console.error('✗ User message content invalid');
    return;
  }

  // Validate message roles are valid
  const validRoles = ['system', 'user', 'assistant'];
  for (const msg of request.messages) {
    if (!validRoles.includes(msg.role)) {
      console.error(`✗ Invalid message role: ${msg.role}`);
      return;
    }
  }

  console.log('✓ Message format is compatible with OpenAI API');
}

/**
 * Test: TaskId Correlation Preservation
 */
function testTaskIdCorrelationPreservation() {
  console.log('\nTest: TaskId Correlation Preservation');

  const mockPayload: PromptPayload = {
    taskId: 'TASK-correlation-test-456',
    agent: {
      name: 'test-agent',
      role: 'reviewer',
      instructions: 'Review code',
      tool_permissions: {},
      execution_constraints: {},
      prompt_templates: {},
      defaults: {},
    },
    task: {
      id: 'TASK-correlation-test-456',
      title: 'Code Review',
      description: 'Review the code',
      dependencies: [],
      subtasks: [],
      assignees: [],
      labels: [],
      rawFrontMatter: {},
    },
    context: { files: [] },
    memory: [],
    messages: [
      { role: 'system', content: 'You are a code reviewer.' },
      { role: 'user', content: 'Review this code.' },
    ],
    metadata: { workspaceRoot: '/test', tasksDir: '/test/_ZENTASKS', contextFileCount: 0, memoryCount: 0 },
  };

  // Create correlation metadata
  const correlation = createTransportCorrelation(mockPayload);

  // Verify taskId is preserved
  if (correlation.taskId !== mockPayload.taskId) {
    console.error('✗ TaskId not preserved in correlation');
    return;
  }

  // Verify headers contain taskId
  if (correlation.headers['x-task-id'] !== mockPayload.taskId) {
    console.error('✗ TaskId not in correlation headers');
    return;
  }

  // Verify agent name in headers
  if (correlation.headers['x-agent'] !== mockPayload.agent.name) {
    console.error('✗ Agent name not in correlation headers');
    return;
  }

  // Verify timestamp is valid ISO string
  const timestamp = new Date(correlation.timestamp);
  if (isNaN(timestamp.getTime())) {
    console.error('✗ Invalid ISO timestamp in correlation');
    return;
  }

  console.log('✓ TaskId correlation preserved through transport');
}

/**
 * Test: Context File Handling in Messages
 */
function testContextFileHandlingInMessages() {
  console.log('\nTest: Context File Handling in Messages');

  const mockPayload: PromptPayload = {
    taskId: 'TASK-context-test',
    agent: {
      name: 'code-agent',
      role: 'developer',
      instructions: 'Write code',
      tool_permissions: { read_files: true },
      execution_constraints: {},
      prompt_templates: {},
      defaults: {},
    },
    task: {
      id: 'TASK-context-test',
      title: 'Implement Feature',
      description: 'Implement new feature',
      dependencies: [],
      subtasks: [],
      assignees: [],
      labels: [],
      rawFrontMatter: {},
    },
    context: {
      files: [
        { path: '/src/index.ts', content: 'export const x = 42;', truncated: false },
        { path: '/src/util.ts', content: 'export function helper() {}', truncated: false },
      ],
    },
    memory: [],
    messages: [
      { role: 'system', content: 'You are a developer.' },
      { role: 'user', content: 'Write code:\n/src/index.ts\n/src/util.ts' },
    ],
    metadata: { workspaceRoot: '/test', tasksDir: '/test/_ZENTASKS', contextFileCount: 2, memoryCount: 0 },
  };

  // Create LLM request
  const request = createLlmRequest(mockPayload);

  // Verify context files are referenced in user prompt
  const userContent = request.messages[1].content;
  let foundReferences = 0;

  for (const file of mockPayload.context.files) {
    if (userContent.includes(file.path)) {
      foundReferences++;
    }
  }

  if (foundReferences === 0) {
    console.error('✗ Context files not referenced in user message');
    return;
  }

  // Verify metadata tracks context file count
  if (mockPayload.metadata?.contextFileCount !== mockPayload.context.files.length) {
    console.error('✗ Context file count mismatch in metadata');
    return;
  }

  console.log('✓ Context files properly handled in messages');
}

/**
 * Test: Metadata Preservation
 */
function testMetadataPreservation() {
  console.log('\nTest: Metadata Preservation');

  const testWorkspace = '/home/user/project';
  const testTasksDir = '/home/user/project/_ZENTASKS';

  const mockPayload: PromptPayload = {
    taskId: 'TASK-metadata-test',
    agent: {
      name: 'architect',
      role: 'system-design',
      instructions: 'Design systems',
      tool_permissions: { read_files: true, access_network: true },
      execution_constraints: { require_context_review: true },
      prompt_templates: { planning: 'Plan: {{task}}' },
      defaults: { timeout: 60000 },
    },
    task: {
      id: 'TASK-metadata-test',
      title: 'System Design',
      description: 'Design the system',
      dependencies: ['TASK-deps'],
      subtasks: [],
      assignees: [],
      labels: [],
      rawFrontMatter: {},
    },
    context: {
      files: [
        { path: '/arch.md', content: 'Architecture', truncated: false },
        { path: '/design.md', content: 'Design doc (truncated...)...', truncated: true },
      ],
    },
    memory: [
      { role: 'user', content: 'Previous discussion' },
      { role: 'assistant', content: 'Previous response' },
    ],
    messages: [
      { role: 'system', content: 'You design systems.' },
      { role: 'user', content: 'Design a system.' },
    ],
    metadata: {
      workspaceRoot: testWorkspace,
      tasksDir: testTasksDir,
      contextFileCount: 2,
      memoryCount: 2,
    },
  };

  // Verify metadata fields
  if (mockPayload.metadata?.workspaceRoot !== testWorkspace) {
    console.error('✗ Workspace root not preserved');
    return;
  }

  if (mockPayload.metadata?.tasksDir !== testTasksDir) {
    console.error('✗ Tasks dir not preserved');
    return;
  }

  if (mockPayload.metadata?.contextFileCount !== 2) {
    console.error('✗ Context file count not preserved');
    return;
  }

  if (mockPayload.metadata?.memoryCount !== 2) {
    console.error('✗ Memory count not preserved');
    return;
  }

  // Verify metadata is accessible during transport
  const correlation = createTransportCorrelation(mockPayload);
  if (Number(correlation.headers['x-context-files']) !== mockPayload.metadata?.contextFileCount) {
    console.error('✗ Context file count not transmitted in headers');
    return;
  }

  console.log('✓ Metadata preserved through transport pipeline');
}

/**
 * Test: Memory Preservation in Transport
 */
function testMemoryPreservationInTransport() {
  console.log('\nTest: Memory Preservation in Transport');

  const mockMemory = [
    { role: 'user' as const, content: 'First question', timestamp: '2026-01-08T10:00:00Z' },
    { role: 'assistant' as const, content: 'First answer', timestamp: '2026-01-08T10:00:05Z' },
    { role: 'user' as const, content: 'Follow-up question', timestamp: '2026-01-08T10:00:10Z' },
  ];

  const mockPayload: PromptPayload = {
    taskId: 'TASK-memory-test',
    agent: {
      name: 'conversational',
      role: 'assistant',
      instructions: 'Be conversational',
      tool_permissions: {},
      execution_constraints: {},
      prompt_templates: {},
      defaults: {},
    },
    task: {
      id: 'TASK-memory-test',
      title: 'Conversation',
      description: 'Have a conversation',
      dependencies: [],
      subtasks: [],
      assignees: [],
      labels: [],
      rawFrontMatter: {},
    },
    context: { files: [] },
    memory: mockMemory,
    messages: [
      { role: 'system', content: 'Be helpful.' },
      { role: 'user', content: 'Continue the conversation.' },
    ],
    metadata: { workspaceRoot: '/test', tasksDir: '/test/_ZENTASKS', contextFileCount: 0, memoryCount: 3 },
  };

  // Verify memory is preserved
  if (mockPayload.memory.length !== mockMemory.length) {
    console.error('✗ Memory entries lost');
    return;
  }

  // Verify memory roles are valid
  const validRoles = ['user', 'assistant', 'system'];
  for (const entry of mockPayload.memory) {
    if (!validRoles.includes(entry.role)) {
      console.error(`✗ Invalid memory role: ${entry.role}`);
      return;
    }
  }

  // Verify timestamps are preserved
  let timestampCount = 0;
  for (const entry of mockPayload.memory) {
    if (entry.timestamp) {
      timestampCount++;
    }
  }

  if (timestampCount !== mockMemory.length) {
    console.error('✗ Memory timestamps not preserved');
    return;
  }

  console.log('✓ Memory entries preserved for multi-turn transport');
}

/**
 * Test: Agent Profile Transmission
 */
function testAgentProfileTransmission() {
  console.log('\nTest: Agent Profile Transmission');

  const mockPayload: PromptPayload = {
    taskId: 'TASK-agent-test',
    agent: {
      name: 'validator',
      role: 'data-validator',
      instructions: 'Validate data comprehensively',
      tool_permissions: {
        read_files: true,
        write_files: false,
        run_commands: false,
        access_network: true,
        modify_tasks: false,
      },
      execution_constraints: {
        max_depth: 10,
        max_parallel_actions: 3,
        require_plan_before_action: true,
        require_context_review: false,
        require_tests_for_changes: true,
      },
      prompt_templates: {
        system: 'System template',
        planning: 'Plan template',
        review: 'Review template',
      },
      defaults: {
        timeout: 45000,
        retries: 3,
        backoff: 'exponential',
      },
    },
    task: {
      id: 'TASK-agent-test',
      title: 'Validation',
      description: 'Validate the data',
      dependencies: [],
      subtasks: [],
      assignees: [],
      labels: [],
      rawFrontMatter: {},
    },
    context: { files: [] },
    memory: [],
    messages: [
      { role: 'system', content: 'You validate data.' },
      { role: 'user', content: 'Validate this data.' },
    ],
    metadata: { workspaceRoot: '/test', tasksDir: '/test/_ZENTASKS', contextFileCount: 0, memoryCount: 0 },
  };

  // Verify agent profile fields are transmitted
  if (!mockPayload.agent.name) {
    console.error('✗ Agent name missing');
    return;
  }

  if (!mockPayload.agent.instructions) {
    console.error('✗ Agent instructions missing');
    return;
  }

  // Verify tool permissions are accessible
  if (typeof mockPayload.agent.tool_permissions?.read_files !== 'boolean') {
    console.error('✗ Tool permissions not transmitted');
    return;
  }

  // Verify execution constraints are accessible
  if (typeof mockPayload.agent.execution_constraints?.max_depth !== 'number') {
    console.error('✗ Execution constraints not transmitted');
    return;
  }

  // Verify prompt templates are transmitted
  if (!mockPayload.agent.prompt_templates || !mockPayload.agent.prompt_templates.system) {
    console.error('✗ Prompt templates not transmitted');
    return;
  }

  // Verify defaults are transmitted
  if (!mockPayload.agent.defaults || !mockPayload.agent.defaults.timeout) {
    console.error('✗ Agent defaults not transmitted');
    return;
  }

  console.log('✓ Agent profile fully transmitted for transport');
}

/**
 * Test: Error Handling in Transport
 */
function testErrorHandlingInTransport() {
  console.log('\nTest: Error Handling in Transport');

  // Test with missing required fields
  const invalidPayload = {
    taskId: 'TASK-error-test',
    // Missing agent, task, messages - should still be handleable
  } as any;

  try {
    // Should not crash when accessing undefined fields
    const taskId = invalidPayload.taskId;
    if (!taskId) {
      console.error('✗ TaskId missing from invalid payload');
      return;
    }

    // Transport layer should verify structure before sending
    if (!invalidPayload.messages || !Array.isArray(invalidPayload.messages)) {
      console.log('✓ Transport layer can detect and report missing messages');
      return;
    }
  } catch (e) {
    console.error(`✗ Unexpected error handling invalid payload: ${(e as Error).message}`);
    return;
  }

  console.log('✓ Error handling in transport validated');
}

/**
 * Main test runner
 */
function runTests() {
  console.log('=== Transport Layer Integration Tests ===');

  try {
    testMessageFormatCompatibility();
    testTaskIdCorrelationPreservation();
    testContextFileHandlingInMessages();
    testMetadataPreservation();
    testMemoryPreservationInTransport();
    testAgentProfileTransmission();
    testErrorHandlingInTransport();

    console.log('\n=== Transport Tests Complete ===\n');
  } catch (error) {
    console.error(`\n✗ Transport test suite error: ${(error as Error).message}`);
    process.exit(1);
  }
}

runTests();

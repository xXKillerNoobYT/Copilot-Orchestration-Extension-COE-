# CopilotDispatcher Output Survey & Test Harness Design

**Date:** January 8, 2026  
**Status:** Design Document  
**Purpose:** Map dispatcher output shape, identify test strategy, and document transport payload requirements

---

## 1. Dispatcher Architecture Overview

### Location
- **File:** `vscode-extension/src/copilotDispatcher.ts` (250 lines)
- **Main Class:** `CopilotDispatcher`
- **Key Method:** `composePrompt(taskId: string, options?: ComposeOptions): Promise<PromptPayload>`

### Responsibility
The `CopilotDispatcher` composes complete prompt payloads for LLM agents by:
1. Loading task definitions from `_ZENTASKS` directory
2. Loading agent profiles from `config/agents`
3. Building system and user prompts with task context
4. Packaging memory, context files, and metadata
5. Returning a complete `PromptPayload` ready for transport

---

## 2. PromptPayload Structure (Complete)

```typescript
export interface PromptPayload {
  taskId: string;
  agent: Pick<AgentProfile, 'name' | 'role' | 'instructions' | 'tool_permissions' | 'execution_constraints' | 'prompt_templates' | 'defaults'>;
  task: ParsedTask;
  context: {
    files: ContextFile[];
  };
  memory: MemoryEntry[];
  messages: PromptMessage[];
  metadata?: Record<string, unknown>;
}
```

### Field Breakdown

#### `taskId: string`
- **Example:** `"TASK-mk4zb7ym-qy4ay"`
- **Purpose:** Unique identifier to correlate LLM response with task
- **Transport Use:** Include in response callback to link result back to task

#### `agent: Pick<AgentProfile, ...>`
- **Fields:**
  - `name: string` — Agent identifier (e.g., `"coder"`, `"planner"`, `"reviewer"`)
  - `role: string` — Agent role description (e.g., `"code-generator"`, `"architect"`)
  - `instructions: string` — Full system instructions for agent behavior
  - `tool_permissions: ToolPermissions` — Permissions object:
    ```typescript
    {
      read_files?: boolean,
      write_files?: boolean,
      run_commands?: boolean,
      access_network?: boolean,
      modify_tasks?: boolean,
      [key: string]: unknown
    }
    ```
  - `execution_constraints: ExecutionConstraints` — Execution limits:
    ```typescript
    {
      max_depth?: number,
      max_parallel_actions?: number,
      require_plan_before_action?: boolean,
      require_context_review?: boolean,
      require_tests_for_changes?: boolean,
      require_explicit_confirmation_for_commands?: boolean,
      approval_required_for_changes?: boolean,
      approval_required_for_schema_changes?: boolean,
      allowed_file_types?: string[],
      [key: string]: unknown
    }
    ```
  - `prompt_templates: PromptTemplates` — Optional templates:
    ```typescript
    {
      system?: string,
      planning?: string,
      recap?: string,
      adr?: string,
      review?: string,
      plan?: string,
      summary?: string,
      report?: string,
      checklist?: string,
      announce?: string,
      [key: string]: unknown
    }
    ```
  - `defaults: Record<string, unknown>` — Default settings for this agent
- **Transport Use:** Send to LLM or agent runtime; used to initialize agent execution context

#### `task: ParsedTask`
- **Fields (from taskParser.ts):**
  ```typescript
  {
    id: string,
    title: string,
    description?: string,
    details?: string,
    status?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled',
    priority?: 'high' | 'medium' | 'low',
    type?: 'feature' | 'bug' | 'refactor' | 'maintenance' | 'documentation',
    assignees?: string[],
    dependencies?: string[],
    subtasks?: ParsedTask[],
    labels?: string[],
    createdAt?: string,
    updatedAt?: string,
    rawFrontMatter?: Record<string, unknown>
  }
  ```
- **Transport Use:** Send full task data with LLM request for context

#### `context: { files: ContextFile[] }`
- **ContextFile Structure:**
  ```typescript
  {
    path: string,           // File path (absolute or relative)
    content: string,        // File content (may be truncated)
    truncated?: boolean     // Indicates if content was cut off due to maxContextBytes
  }
  ```
- **Populated By:** `loadContextFiles()` helper function
- **Max Size Control:** `options.maxContextBytes` (default: 32,000 bytes)
- **Transport Use:** Include file content inline in prompt for context

#### `memory: MemoryEntry[]`
- **MemoryEntry Structure:**
  ```typescript
  {
    role: 'user' | 'assistant' | 'system',
    content: string,
    timestamp?: string
  }
  ```
- **Populated By:** `options.memory` parameter (can be empty array)
- **Transport Use:** Append to message history for multi-turn conversations
- **Note:** Recent 5 entries extracted by `buildUserPrompt()` for summary

#### `messages: PromptMessage[]`
- **PromptMessage Structure:**
  ```typescript
  {
    role: 'system' | 'user' | 'assistant',
    content: string
  }
  ```
- **Always Contains (in order):**
  1. `{ role: 'system', content: systemPrompt }` — Built from `agent.instructions` + `options.extraInstructions`
  2. `{ role: 'user', content: userPrompt }` — Built from task, context, memory, templates
- **Additional Messages:** Can be extended with conversation history
- **Transport Use:** Send directly as `messages` array to OpenAI-compatible `/v1/chat/completions` endpoint

#### `metadata?: Record<string, unknown>`
- **Default Contents:**
  ```typescript
  {
    workspaceRoot: string,        // e.g., "/Users/dev/project"
    tasksDir: string,             // e.g., "/Users/dev/project/_ZENTASKS"
    contextFileCount: number,     // Number of context files included
    memoryCount: number          // Number of memory entries included
  }
  ```
- **Transport Use:** For logging, diagnostics, and correlation

---

## 3. Message Composition Flow

### System Message
**Built by:** `buildSystemPrompt(agent, extraInstructions)`

```
source:
  1. agent.prompt_templates.system (if exists)
     OR
     agent.instructions

  2. + options.extraInstructions (if provided)
  
output: Joined with double newline
```

**Example:**
```
You are a code generation agent responsible for implementing features and fixing bugs...

[additional instructions from extraInstructions parameter]
```

### User Message
**Built by:** `buildUserPrompt(task, context, memory, agent)`

**Structure:**
```
### Task
Task ID: TASK-mk4zb7ym-qy4ay
Title: Survey dispatcher output and test harness for transport client
Status: pending
Priority: high
Dependencies: none
[Assignees if present]

### Description
Inspect CopilotDispatcher.composePrompt output shape and existing tests to design chat/completions payload mapping and mocks.

### Context Files
[Only if contextFiles provided]
- file1.ts
- file2.js (truncated)

### Recent Memory
[Only if memory entries exist]
USER: Previous context message
ASSISTANT: Response to previous

### Template
[From agent.prompt_templates.plan or planning, with {{}} substitutions]
Analyze: Survey dispatcher output and test harness for transport client
```

---

## 4. Current Usage Patterns

### In Extension
**File:** `vscode-extension/src/commands/executeLLM.ts`
```typescript
const payload = await dispatcher.composePrompt(taskId, {
  agentName: options.agentName,
  contextFiles: options.contextFiles,
  memory: conversationHistory,
  extraInstructions: "Focus on code generation",
  workspaceRoot: vscode.workspace.rootPath
});
```

**Then sends to LLM:**
```typescript
const response = await llmClient.sendChat(payload.messages, {
  model: config.defaultModel,
  temperature: config.temperature,
  taskId: payload.taskId
});
```

### In Tests
**File:** `vscode-extension/src/commands/executeLLMTest.ts`

**MockCopilotDispatcher returns:**
```typescript
{
  taskId: 'TASK-test-1',
  agent: {
    name: 'coder',
    role: 'code-generator',
    instructions: 'Generate code for tasks',
    tool_permissions: [],
    execution_constraints: {},
    prompt_templates: { planning: 'Analyze: {{task}}' },
    defaults: {}
  },
  task: {
    id: 'TASK-test-1',
    title: 'Test Task',
    description: 'A test task for LLM execution',
    status: 'pending',
    priority: 'medium',
    dependencies: [],
    // ... full ParsedTask shape
  },
  context: {
    files: [
      { path: 'test.ts', content: 'const test = true;' }
    ]
  },
  memory: [
    { role: 'user', content: 'Previous context' }
  ],
  messages: [
    { role: 'system', content: 'You are a helpful code generator.' },
    { role: 'user', content: 'Generate code for: A test task for LLM execution' }
  ],
  metadata: {
    workspaceRoot: '/test',
    tasksDir: '/test/_ZENTASKS'
  }
}
```

---

## 5. Test Strategy & Harness Design

### Existing Test Coverage
- **File:** `executeLLMTest.ts` (282 lines)
- **Approach:** MockCopilotDispatcher + MockOpenAIClient
- **Coverage:**
  - Task/agent selection flows
  - Config validation
  - Progress indication
  - Response handling

### Recommended New Test Areas

#### 5.1 Dispatcher Payload Shape Tests
**Location:** Create `vscode-extension/src/copilotDispatcher.test.ts`

**Test Cases:**
```typescript
describe('CopilotDispatcher Payload Shape', () => {
  test('composePrompt returns valid PromptPayload structure', async () => {
    const dispatcher = new CopilotDispatcher();
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    // Validate all required fields present
    expect(payload.taskId).toBeDefined();
    expect(payload.agent).toBeDefined();
    expect(payload.task).toBeDefined();
    expect(payload.context).toBeDefined();
    expect(payload.memory).toBeInstanceOf(Array);
    expect(payload.messages).toBeInstanceOf(Array);
  });

  test('messages array contains system and user messages', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    expect(payload.messages.length).toBeGreaterThanOrEqual(2);
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[1].role).toBe('user');
    expect(payload.messages[0].content).toBeTruthy();
    expect(payload.messages[1].content).toBeTruthy();
  });

  test('agent profile fields are correctly extracted', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    expect(payload.agent.name).toBeDefined();
    expect(payload.agent.role).toBeDefined();
    expect(payload.agent.instructions).toBeDefined();
    expect(typeof payload.agent.tool_permissions).toBe('object');
    expect(typeof payload.agent.execution_constraints).toBe('object');
  });

  test('context files are loaded and truncated correctly', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1', {
      contextFiles: ['./test-files/sample.ts'],
      maxContextBytes: 100
    });
    
    if (payload.context.files.length > 0) {
      expect(payload.context.files[0].path).toBeDefined();
      expect(payload.context.files[0].content).toBeDefined();
      // May or may not be truncated depending on file size
      expect(typeof payload.context.files[0].truncated).toBe('boolean');
    }
  });

  test('memory entries are preserved in payload', async () => {
    const memory = [
      { role: 'user' as const, content: 'Previous message' },
      { role: 'assistant' as const, content: 'Assistant response' }
    ];
    
    const payload = await dispatcher.composePrompt('TASK-test-1', { memory });
    
    expect(payload.memory).toEqual(memory);
  });

  test('template substitution in user prompt', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    // User prompt should contain task information
    expect(payload.messages[1].content).toContain('Task ID');
    expect(payload.messages[1].content).toContain('Title');
    expect(payload.messages[1].content).toContain('Description');
  });

  test('metadata includes workspace context', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    expect(payload.metadata).toBeDefined();
    expect(payload.metadata?.workspaceRoot).toBeDefined();
    expect(payload.metadata?.tasksDir).toBeDefined();
    expect(typeof payload.metadata?.contextFileCount).toBe('number');
    expect(typeof payload.metadata?.memoryCount).toBe('number');
  });
});
```

#### 5.2 Transport Integration Tests
**File:** `vscode-extension/src/llm/transportTest.ts` (new)

**Purpose:** Verify payload → LLM request mapping

```typescript
describe('Payload to LLM Transport', () => {
  test('PromptPayload messages map to OpenAI format', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    // Should be compatible with OpenAI chat/completions
    const request = {
      model: 'gpt-4',
      messages: payload.messages,  // Direct mapping
      temperature: 0.7
    };
    
    expect(request.messages[0]).toEqual({
      role: 'system',
      content: expect.any(String)
    });
    expect(request.messages[1]).toEqual({
      role: 'user',
      content: expect.any(String)
    });
  });

  test('Task metadata preserved through transport', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1');
    
    // Simulate sending to LLM with metadata
    const llmRequest = {
      taskId: payload.taskId,  // Correlated
      payload,
      headers: {
        'x-task-id': payload.taskId
      }
    };
    
    // Verify correlation possible
    expect(llmRequest.headers['x-task-id']).toBe(payload.taskId);
  });

  test('Context files do not break OpenAI message format', async () => {
    const payload = await dispatcher.composePrompt('TASK-test-1', {
      contextFiles: ['./sample.ts']
    });
    
    // messages should still be valid
    expect(payload.messages).toBeInstanceOf(Array);
    payload.messages.forEach(msg => {
      expect(msg.role).toMatch(/^(system|user|assistant)$/);
      expect(typeof msg.content).toBe('string');
    });
  });
});
```

#### 5.3 Mock Harness Improvements
**Current File:** `executeLLMTest.ts` (update MockCopilotDispatcher)

**Enhancements:**
```typescript
// Already partially present; enhance with:
export class MockCopilotDispatcher {
  private mockPayload: Partial<PromptPayload> = {};

  constructor(overrides?: Partial<PromptPayload>) {
    this.mockPayload = overrides || {};
  }

  async composePrompt(taskId: string, options?: ComposeOptions): Promise<PromptPayload> {
    // Return fixture + overrides for flexibility
    return {
      taskId: this.mockPayload.taskId ?? taskId,
      agent: this.mockPayload.agent ?? {
        name: 'coder',
        role: 'code-generator',
        instructions: 'Generate code for tasks',
        tool_permissions: {},
        execution_constraints: {},
        prompt_templates: { planning: 'Analyze: {{task}}' },
        defaults: {}
      },
      task: this.mockPayload.task ?? { /* default task */ },
      context: this.mockPayload.context ?? { files: [] },
      memory: this.mockPayload.memory ?? [],
      messages: this.mockPayload.messages ?? [
        { role: 'system' as const, content: 'You are helpful.' },
        { role: 'user' as const, content: 'Do something.' }
      ],
      metadata: this.mockPayload.metadata ?? { workspaceRoot: '/test' }
    };
  }

  // Helper for test setup
  withAgent(agent: Partial<AgentProfile>): this {
    this.mockPayload.agent = { ...this.mockPayload.agent, ...agent };
    return this;
  }

  withMemory(entries: MemoryEntry[]): this {
    this.mockPayload.memory = entries;
    return this;
  }

  withContextFiles(files: ContextFile[]): this {
    this.mockPayload.context = { files };
    return this;
  }
}

// Usage in tests:
const dispatcher = new MockCopilotDispatcher()
  .withAgent({ name: 'reviewer' })
  .withMemory([{ role: 'user', content: 'Previous context' }]);
```

---

## 6. Design Decisions & Recommendations

### For Transport Layer
1. **Message Array Format:** Already OpenAI-compatible; send directly to `/v1/chat/completions`
2. **TaskId Correlation:** Include `payload.taskId` in request headers or body for response tracking
3. **Context Handling:** File content is pre-included in user prompt; no separate attachment needed
4. **Memory Management:** Append `payload.memory` to conversation history for multi-turn flows

### For Test Harness
1. **Use MockCopilotDispatcher** already in place; enhance with builder pattern
2. **Create separate `copilotDispatcher.test.ts`** for payload shape validation
3. **Create `transportTest.ts`** for mapping verification
4. **Leverage existing `executeLLMTest.ts`** for end-to-end command flows

### For Future Extensions
- [ ] Add `ComposeOptions.responseFormat` for structured outputs (e.g., JSON schemas)
- [ ] Support streaming payloads for large context files
- [ ] Add `agent.cost_model` for token tracking
- [ ] Implement prompt caching for frequently-used agent profiles

---

## 7. Files & Locations Summary

| File | Purpose | Size | Status |
|------|---------|------|--------|
| `copilotDispatcher.ts` | Core dispatch logic | 250 LOC | Complete ✅ |
| `agentProfiles.ts` | Profile loader | 144 LOC | Complete ✅ |
| `executeLLM.ts` | Command handler | 169 LOC | Complete ✅ |
| `executeLLMTest.ts` | Command tests + MockDispatcher | 282 LOC | Complete ✅ |
| **copilotDispatcher.test.ts** | Payload shape tests | ~150 LOC | **Design Ready** 📋 |
| **transportTest.ts** | Transport mapping tests | ~100 LOC | **Design Ready** 📋 |

---

## 8. Next Steps

### Immediate (for this task)
1. ✅ Document payload structure (COMPLETE)
2. ✅ Identify mock harness (COMPLETE - already exists)
3. ✅ Design test strategy (COMPLETE)

### Follow-up Tasks
1. **Create `copilotDispatcher.test.ts`** (EST: 45 min)
2. **Create `transportTest.ts`** (EST: 30 min)
3. **Enhance MockCopilotDispatcher** with builder pattern (EST: 15 min)
4. **Run full test suite** including new tests (EST: 5 min)

### Phase 6B Backend Integration
- Once transport tests pass, ready to wire Phase 6B services
- Dispatcher will send payloads to repository lifecycle agent
- Agent will use context bundles + branching strategy

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-08  
**Author:** Auto Zen  
**Status:** Complete - Ready for Implementation

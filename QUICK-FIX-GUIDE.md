# Quick Reference Guide - Fixing Remaining Test Failures

## Overview
**Current**: 33 failing tests in 5 test suites  
**Target**: 0 failing tests, 60%+ coverage  
**CI**: Already configured in `.github/workflows/tests.yml`

## Test Suites to Fix (Priority Order)

### 1. extension.test.ts (~10 failures) - HIGHEST PRIORITY
**Location**: `vscode-extension/src/__tests__/extension.test.ts`  
**Impact**: Core extension functionality

#### Common Issues
- Missing VS Code extension context mocks
- Command registration expectations don't match implementation
- Output channel creation not mocked properly
- Status bar items not mocked
- Tree view providers not mocked

#### Fix Pattern
```typescript
// Add comprehensive mocks in beforeEach
beforeEach(() => {
    (vscode.window as any).createOutputChannel = jest.fn().mockReturnValue({
        append: jest.fn(),
        appendLine: jest.fn(),
        show: jest.fn(),
        dispose: jest.fn(),
    });
    
    (vscode.window as any).createStatusBarItem = jest.fn().mockReturnValue({
        text: '',
        tooltip: '',
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
    });
    
    (vscode.window as any).registerTreeDataProvider = jest.fn();
    (vscode.commands as any).registerCommand = jest.fn();
    (vscode.languages as any).registerCodeLensProvider = jest.fn();
});
```

### 2. taskParser.test.ts (~10 failures)
**Location**: `vscode-extension/src/__tests__/taskParser.test.ts`  
**Impact**: Core parsing functionality

#### Common Issues
- `failOnInvalid` option behavior not tested correctly
- YAML parsing errors not handled in tests
- Missing/malformed frontmatter tests fail

#### Fix Pattern
```typescript
// When testing invalid cases, use failOnInvalid: false
it('should handle malformed YAML', async () => {
    const content = `---
id: TASK-BAD
malformed: [unclosed
---`;

    const result = await parseTask(content, { 
        failOnInvalid: false,  // Allow parsing to continue
        validateSchema: true    // But still collect errors
    });

    expect(result.errors.length).toBeGreaterThan(0);
    // Don't expect result.task to be null - parser may recover
});
```

### 3. executeLLM.test.ts (~8 failures)
**Location**: `vscode-extension/src/__tests__/executeLLM.test.ts`  
**Impact**: LLM integration

#### Common Issues
- Streaming response mocks not async-aware
- Progress reporting not mocked correctly
- Output channel streaming tests fail

#### Fix Pattern
```typescript
// Mock streaming responses properly
it('should handle streaming responses', async () => {
    const mockStream = {
        on: jest.fn((event, callback) => {
            if (event === 'data') {
                // Simulate streaming chunks
                callback('chunk 1');
                callback('chunk 2');
            }
            if (event === 'end') {
                callback();
            }
            return mockStream;
        }),
    };

    (llmClient as any).executeStreaming = jest.fn().mockResolvedValue(mockStream);

    await executeLlmCommandStreaming(prompt);
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockOutputChannel.append).toHaveBeenCalledWith('chunk 1');
    expect(mockOutputChannel.append).toHaveBeenCalledWith('chunk 2');
});
```

### 4. autoAgentLoop.test.ts (~4 failures)
**Location**: `vscode-extension/src/__tests__/autoAgentLoop.test.ts`  
**Impact**: Agent automation

#### Common Issues
- Service mock expectations don't match implementation
- Status display tests fail due to formatting differences
- Cycle execution mocks incomplete

#### Fix Pattern
```typescript
// Mock the service completely
jest.mock('../services/agentLoopService', () => ({
    AgentLoopService: jest.fn().mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        executeSingleCycle: jest.fn().mockResolvedValue({ success: true }),
        getStatus: jest.fn().mockReturnValue({
            isRunning: false,
            cyclesCompleted: 0,
            lastCycleTime: null,
        }),
    })),
}));
```

### 5. jest-sanity-check.test.ts (1 failure - INTENTIONAL)
**Action**: **KEEP AS-IS** - This is a permanent failure to ensure CI reports failures correctly.

## Coverage Target Strategy

### Phase 1: Fix All Failing Tests (33 tests)
- Estimated time: 2-3 hours
- Coverage impact: +5-8%
- New coverage: ~36-39%

### Phase 2: Add Panel Tests
**Files to add tests for**:
1. `panels/DeadLetterQueuePanel.ts` - Basic panel operations
2. `panels/planAdjustmentWizard.ts` - Wizard flow
3. `panels/planBuilderPanel.ts` - Plan building
4. `panels/visualVerificationPanel.ts` - Visual verification

**Template**:
```typescript
describe('PanelName', () => {
    let mockContext: vscode.ExtensionContext;
    let mockPanel: any;

    beforeEach(() => {
        mockPanel = {
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                postMessage: jest.fn(),
                asWebviewUri: jest.fn((uri) => uri),
            },
            onDidDispose: jest.fn(),
            reveal: jest.fn(),
            dispose: jest.fn(),
        };

        (vscode.window as any).createWebviewPanel = jest.fn().mockReturnValue(mockPanel);

        mockContext = {
            extensionUri: { fsPath: '/test' } as vscode.Uri,
            subscriptions: [],
        } as any;
    });

    describe('Panel Creation', () => {
        it('should create panel instance', () => {
            const panel = Panel.createOrShow(mockContext);
            expect(panel).toBeDefined();
        });

        it('should reuse existing panel', () => {
            const panel1 = Panel.createOrShow(mockContext);
            const panel2 = Panel.createOrShow(mockContext);
            expect(panel1).toBe(panel2);
        });
    });

    describe('Message Handling', () => {
        it('should handle messages', () => {
            const panel = Panel.createOrShow(mockContext);
            // Test message handling
        });
    });
});
```

- Estimated time: 3-4 hours
- Coverage impact: +12-15%
- New coverage: ~48-54%

### Phase 3: Add Service Tests
**Files to add tests for**:
1. `services/agentLoopService.ts` - Agent loop control
2. `services/connectionMonitor.ts` - Connection monitoring
3. `services/mcpRouter.ts` - MCP routing
4. `services/taskGenerator.ts` - Task generation

**Template**:
```typescript
describe('ServiceName', () => {
    let service: ServiceName;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        service = new ServiceName(mockContext);
    });

    describe('Initialization', () => {
        it('should initialize service', () => {
            expect(service).toBeDefined();
        });
    });

    describe('Core Operations', () => {
        it('should perform operation', async () => {
            const result = await service.operation();
            expect(result).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle errors gracefully', async () => {
            await expect(service.operation()).resolves.not.toThrow();
        });
    });
});
```

- Estimated time: 2-3 hours
- Coverage impact: +8-10%
- New coverage: ~56-64%

## Testing Best Practices

### 1. Mock Setup
```typescript
// Always clean up in afterEach
afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});
```

### 2. Async Testing
```typescript
// Use async/await properly
it('should handle async operation', async () => {
    await expect(asyncFunction()).resolves.toBe(expected);
});

// Wait for async operations to complete
await new Promise(resolve => setTimeout(resolve, 100));
```

### 3. Error Testing
```typescript
// Test both success and failure
it('should handle errors', async () => {
    mockService.operation = jest.fn().mockRejectedValue(new Error('Test error'));
    await expect(service.callOperation()).rejects.toThrow('Test error');
});
```

### 4. Coverage-Driven
```typescript
// Cover all branches
it('should handle condition A', () => { /* test true case */ });
it('should handle condition B', () => { /* test false case */ });
```

## Commands

```bash
# Run all tests
npm test

# Run specific file
npm test -- --testPathPattern="extension"

# Run with coverage
npm run test:jest:coverage

# Watch mode (for active development)
npm test -- --watch

# Update snapshots if needed
npm test -- --updateSnapshot

# Run only changed tests
npm test -- --onlyChanged

# Run failing tests first
npm test -- --onlyFailures
```

## Common Pitfalls

1. **Forgetting to await async operations**
   - ✅ `await expect(fn()).resolves.toBe(x)`
   - ❌ `expect(fn()).resolves.toBe(x)` (missing await)

2. **Not cleaning up mocks**
   - ✅ `afterEach(() => jest.clearAllMocks())`
   - ❌ Mocks persist between tests

3. **Incomplete VS Code API mocks**
   - ✅ Mock entire object with all methods
   - ❌ Mock only one method, test fails on another

4. **Wrong assertion types**
   - ✅ `toBeGreaterThan(0)` for counts
   - ❌ `toBe(1)` when count varies

5. **Not handling promises in tests**
   - ✅ `await service.start()`
   - ❌ `service.start()` (missing await)

## Success Criteria

- ✅ All 33 failing tests fixed (0 failures)
- ✅ Coverage ≥ 60% statements
- ✅ Coverage ≥ 50% branches
- ✅ Coverage ≥ 50% functions  
- ✅ Coverage ≥ 60% lines
- ✅ CI pipeline passes
- ✅ No new warnings or errors

## Timeline

| Phase | Duration | Outcome |
|-------|----------|---------|
| Fix failing tests | 2-3 hours | 0 failures, ~36-39% coverage |
| Add panel tests | 3-4 hours | ~48-54% coverage |
| Add service tests | 2-3 hours | ~56-64% coverage |
| **Total** | **7-10 hours** | **60%+ coverage achieved** |

## Resources

- Existing test files (for patterns): `vscode-extension/src/**/__tests__/*.test.ts`
- VS Code API docs: https://code.visualstudio.com/api/references/vscode-api
- Jest docs: https://jestjs.io/docs/getting-started
- Coverage report: `vscode-extension/coverage/lcov-report/index.html` (after running npm run test:jest:coverage)

---

**Start with**: extension.test.ts (biggest impact)  
**End with**: Service tests (final push to 60%)  
**Keep**: jest-sanity-check.test.ts failure (intentional)

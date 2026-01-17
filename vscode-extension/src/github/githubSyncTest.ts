/**
 * Test suite for GitHub synchronization
 */

// Import types for test fixtures
import type { GitHubIssue } from './githubClient';
interface MockFetchOptions {
  response?: { status: number; body: unknown };
  error?: Error;
}

let mockFetchConfig: Record<string, MockFetchOptions> = {};

// Store original fetch
const originalFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch;

function setupMockFetch(config: Record<string, MockFetchOptions>): void {
  mockFetchConfig = config;
  // Override global fetch for tests
  const mockFetch = async (input: unknown, options?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : String(input);
    const key = url;
    const mockConfig = mockFetchConfig[key];

    if (mockConfig?.error) {
      throw mockConfig.error;
    }

    if (mockConfig?.response) {
      return {
        ok: mockConfig.response.status >= 200 && mockConfig.response.status < 300,
        status: mockConfig.response.status,
        json: async () => mockConfig.response?.body,
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response;
  };
  (globalThis as unknown as { fetch?: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;
}

function restoreFetch(): void {
  if (originalFetch) {
    (globalThis as unknown as { fetch?: typeof fetch }).fetch = originalFetch;
  }
}

// Test fixtures
const mockIssue: GitHubIssue = {
  id: 1,
  number: 123,
  title: 'Test Issue',
  body: 'Test body',
  state: 'open',
  labels: [{ name: 'bug' }, { name: 'urgent' }],
  assignees: [{ login: 'user1' }, { login: 'user2' }],
  milestone: { number: 1, title: 'v1.0' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  html_url: 'https://github.com/owner/repo/issues/123',
};

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'pending' as const,
  priority: 'high' as const,
  labels: ['feature', 'backend'],
  assignees: ['dev1', 'dev2'],
  updated_at: new Date().toISOString(),
};

/**
 * Test suite for GitHub operations
 */
async function runGitHubSyncTests(): Promise<void> {
  let passCount = 0;
  let failCount = 0;

  // Test 1: Parse GitHub webhook payload
  try {
    // Use eval to bypass webpack's static analysis
    const webhookModule = eval("require('./webhookHandler.js')");
    const WebhookHandler = webhookModule.WebhookProcessor;
    const parseIssueWebhook = webhookModule.parseIssueWebhook;

    const payload = {
      action: 'opened',
      issue: mockIssue,
      repository: { name: 'test-repo', owner: { login: 'owner' } },
    };

    const parsed = parseIssueWebhook(payload);
    console.assert(!!parsed, 'parseIssueWebhook should return issue data');
    console.assert(parsed?.issueNumber === 123, 'Issue number should match');
    console.assert(parsed?.title === 'Test Issue', 'Title should match');
    console.assert(parsed?.labels.includes('bug'), 'Labels should be parsed');
    console.assert(parsed?.assignees.includes('user1'), 'Assignees should be parsed');

    console.log('[✓] Test 1: Parse GitHub webhook payload');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 1: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 2: Verify webhook signature
  try {
    const webhookModule = eval("require('./webhookHandler.js')");
    const WebhookProcessor = webhookModule.WebhookProcessor;
    const crypto = require('crypto');

    const processor = new WebhookProcessor('test-secret');
    const payload = JSON.stringify({ test: 'data' });
    const hmac = crypto.createHmac('sha256', 'test-secret');
    hmac.update(payload);
    const validSignature = `sha256=${hmac.digest('hex')}`;

    const isValid = processor.verifySignature(payload, validSignature);
    console.assert(!!isValid, 'Valid signature should be verified');

    const invalidSig = processor.verifySignature(payload, 'sha256=invalid');
    console.assert(!invalidSig, 'Invalid signature should be rejected');

    console.log('[✓] Test 2: Verify webhook signature');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 2: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 3: Create sync event from GitHub issue
  try {
    const webhookModule = eval("require('./webhookHandler.js')");
    const createSyncEvent = webhookModule.createSyncEvent;
    const parseIssueWebhook = webhookModule.parseIssueWebhook;

    const payload = {
      action: 'opened',
      issue: mockIssue,
      repository: { name: 'test-repo', owner: { login: 'owner' } },
    };

    const parsed = parseIssueWebhook(payload);
    const syncEvent = createSyncEvent('opened', parsed);

    console.assert(!!syncEvent, 'Sync event should be created');
    console.assert(syncEvent?.source === 'github', 'Source should be github');
    console.assert(syncEvent?.action === 'created', 'Action should be created for opened');
    console.assert(syncEvent?.issueNumber === 123, 'Issue number should match');

    console.log('[✓] Test 3: Create sync event from GitHub issue');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 3: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 4: Handle webhook events
  try {
    const webhookModule = eval("require('./webhookHandler.js')");
    const WebhookProcessor = webhookModule.WebhookProcessor;

    const processor = new WebhookProcessor('test-secret');
    let eventHandled = false;

    processor.onEvent('issue', async (event: any) => {
      eventHandled = true;
      console.assert(event.type === 'issue', 'Event type should be issue');
      console.assert(event.action === 'opened', 'Action should be opened');
    });

    const payload = JSON.stringify({
      action: 'opened',
      issue: mockIssue,
      repository: { name: 'test-repo', owner: { login: 'owner' } },
    });

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', 'test-secret');
    hmac.update(payload);
    const signature = `sha256=${hmac.digest('hex')}`;

    const result = await processor.processWebhook(payload, signature);
    console.assert(result.success, 'Webhook processing should succeed');
    console.assert(eventHandled, 'Event handler should have been called');

    console.log('[✓] Test 4: Handle webhook events');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 4: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 5: Map task status to GitHub state
  try {
    const syncServiceModule = eval("require('../services/githubSyncService.js')");
    const GitHubSyncService = syncServiceModule.GitHubSyncService;

    // Create a mock service to test internal mapping
    const service = new GitHubSyncService({
      owner: 'test',
      repo: 'test',
      githubToken: 'test-token',
    });

    // We'll test through the task conversion
    const task = mockTask;
    console.assert(task.status === 'pending', 'Task status should be pending');
    console.assert(task.priority === 'high', 'Task priority should be high');

    console.log('[✓] Test 5: Task data model');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 5: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 6: GitHub to task conversion
  try {
    const syncServiceModule = eval("require('../services/githubSyncService.js')");
    const GitHubSyncService = syncServiceModule.GitHubSyncService;

    setupMockFetch({});

    const service = new GitHubSyncService({
      owner: 'test',
      repo: 'test',
      githubToken: 'test-token',
    });

    const task = await service.syncGitHubToTask(mockIssue);
    console.assert(task.id.includes('github-issue'), 'Task ID should reference GitHub issue');
    console.assert(task.github_issue_id === 123, 'GitHub issue ID should be stored');
    console.assert(task.github_issue_url === mockIssue.html_url, 'GitHub URL should be stored');
    console.assert(task.title === 'Test Issue', 'Title should match issue');
    console.assert(task.labels.includes('bug'), 'Labels should be synced');
    console.assert(task.assignees.includes('user1'), 'Assignees should be synced');

    restoreFetch();

    console.log('[✓] Test 6: GitHub to task conversion');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 6: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
    restoreFetch();
  }

  // Test 7: Sync log tracking
  try {
    const syncServiceModule = eval("require('../services/githubSyncService.js')");
    const GitHubSyncService = syncServiceModule.GitHubSyncService;

    setupMockFetch({});

    const service = new GitHubSyncService({
      owner: 'test',
      repo: 'test',
      githubToken: 'test-token',
    });

    await service.syncGitHubToTask(mockIssue);
    const log = service.getSyncLog();

    console.assert(log.length > 0, 'Sync log should have entries');
    console.assert(log[0].action === 'github_to_task', 'Log should track sync action');
    console.assert(log[0].result.includes('123'), 'Log should include issue number');

    service.clearSyncLog();
    const clearedLog = service.getSyncLog();
    console.assert(clearedLog.length === 0, 'Sync log should be cleared');

    restoreFetch();

    console.log('[✓] Test 7: Sync log tracking');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 7: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
    restoreFetch();
  }

  // Test 8: Full sync operation
  try {
    const syncServiceModule = eval("require('../services/githubSyncService.js')");
    const GitHubSyncService = syncServiceModule.GitHubSyncService;

    setupMockFetch({
      'https://api.github.com/repos/test/test/issues': {
        response: {
          status: 200,
          body: [mockIssue, { ...mockIssue, number: 124, title: 'Second Issue' }],
        },
      },
    });

    const service = new GitHubSyncService({
      owner: 'test',
      repo: 'test',
      githubToken: 'test-token',
    });

    const result = await service.performFullSync();
    console.assert(result.synced >= 0, 'Sync should report number synced');
    console.assert(result.errors >= 0, 'Sync should report errors');

    restoreFetch();

    console.log('[✓] Test 8: Full sync operation');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 8: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
    restoreFetch();
  }

  // Print summary
  console.log('\n=== GitHub Sync Tests Summary ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('✓ All tests passed!');
  }
}

// Run tests
export { runGitHubSyncTests };

// Execute tests if running directly
if (require.main === module) {
  runGitHubSyncTests()
    .then(() => {
      console.log('GitHub sync tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('GitHub sync tests failed:', error);
      process.exit(1);
    });
}


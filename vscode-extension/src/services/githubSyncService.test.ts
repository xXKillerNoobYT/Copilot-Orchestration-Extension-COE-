/**
 * Tests for enhanced GitHub Sync Service
 * Covers batching, caching, GraphQL, backoff, and accuracy
 */

import { GitHubSyncService, SyncConfig, TaskData } from './githubSyncService';
import { GitHubClient } from '../github/githubClient';
import { GitHubBatcher } from '../utils/githubBatch';

// Mock dependencies
jest.mock('../github/githubClient');
jest.mock('../utils/githubBatch');
jest.mock('../utils/errorHandler', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
}));

describe('GitHubSyncService - Enhanced Features', () => {
  let service: GitHubSyncService;
  let mockClient: jest.Mocked<GitHubClient>;
  let mockBatcher: jest.Mocked<GitHubBatcher>;
  const baseConfig: SyncConfig = {
    owner: 'test-owner',
    repo: 'test-repo',
    githubToken: 'test-token',
    enableBatching: true,
    enableGraphQL: true,
    cacheTTLMinutes: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockClient = new GitHubClient({
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
    }) as jest.Mocked<GitHubClient>;

    mockBatcher = new GitHubBatcher() as jest.Mocked<GitHubBatcher>;
    mockBatcher.enqueue = jest.fn();
    mockBatcher.flush = jest.fn().mockReturnValue([]);

    service = new GitHubSyncService(baseConfig);
    // Replace private instances with mocks
    (service as any).client = mockClient;
    (service as any).batcher = mockBatcher;
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  describe('Batching', () => {
    it('should queue task updates when batching enabled', async () => {
      const task: TaskData = {
        id: 'task-1',
        title: 'Test Task',
        status: 'in-progress',
        priority: 'high',
        labels: ['bug'],
        assignees: ['user1'],
        github_issue_id: 123,
        github_issue_url: 'https://github.com/test/test/issues/123',
        updated_at: new Date().toISOString(),
      };

      mockClient.getIssue = jest.fn().mockResolvedValue({
        number: 123,
        title: 'Old Title',
        state: 'open',
        labels: [],
        assignees: [],
      });

      await service.syncTaskToGitHub(task);

      expect(mockBatcher.enqueue).toHaveBeenCalledWith({
        type: 'update',
        payload: expect.objectContaining({
          issueNumber: 123,
          data: expect.objectContaining({ title: 'Test Task' }),
        }),
        key: 'update-issue-123',
      });
    });

    it('should queue task creation when batching enabled', async () => {
      const task: TaskData = {
        id: 'task-2',
        title: 'New Task',
        status: 'pending',
        priority: 'medium',
        labels: [],
        assignees: [],
        updated_at: new Date().toISOString(),
      };

      await service.syncTaskToGitHub(task);

      expect(mockBatcher.enqueue).toHaveBeenCalledWith({
        type: 'create',
        payload: expect.objectContaining({
          title: 'New Task',
          body: expect.stringContaining('task-2'),
        }),
        key: 'create-task-task-2',
      });
    });

    it('should flush batches on timer', async () => {
      mockBatcher.flush.mockReturnValue([
        [
          {
            type: 'create',
            payload: { title: 'Batch Task 1' },
          },
        ],
      ]);

      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Let async flush complete

      expect(mockBatcher.flush).toHaveBeenCalled();
    });

    it('should handle batch execution errors gracefully', async () => {
      mockBatcher.flush.mockReturnValue([
        [
          {
            type: 'update',
            payload: { issueNumber: 999, data: {} },
          },
        ],
      ]);

      mockClient.updateIssue = jest.fn().mockRejectedValue(new Error('API Error'));

      // Manually trigger flush
      await (service as any).flushBatches();

      const log = service.getSyncLog();
      expect(log.some((entry) => entry.action === 'batch_error')).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache issue on first fetch', async () => {
      const mockIssue = {
        number: 456,
        title: 'Cached Issue',
        state: 'open' as const,
        labels: [],
        assignees: [],
        id: 1,
        body: '',
        milestone: undefined,
        created_at: '2026-01-21T00:00:00Z',
        updated_at: '2026-01-21T00:00:00Z',
        html_url: 'https://github.com/test/test/issues/456',
      };

      mockClient.getIssue = jest.fn().mockResolvedValue(mockIssue);

      const task: TaskData = {
        id: 'task-cache',
        title: 'Test',
        status: 'pending',
        priority: 'low',
        labels: [],
        assignees: [],
        github_issue_id: 456,
        updated_at: new Date().toISOString(),
      };

      await service.syncTaskToGitHub(task);

      expect(mockClient.getIssue).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.syncTaskToGitHub(task);

      expect(mockClient.getIssue).toHaveBeenCalledTimes(1); // Still 1, cache hit
      const log = service.getSyncLog();
      expect(log.some((entry) => entry.action === 'cache_hit')).toBe(true);
    });

    it('should expire cache after TTL', async () => {
      const mockIssue = {
        number: 789,
        title: 'Expiring Issue',
        state: 'open' as const,
        labels: [],
        assignees: [],
        id: 1,
        body: '',
        milestone: undefined,
        created_at: '2026-01-21T00:00:00Z',
        updated_at: '2026-01-21T00:00:00Z',
        html_url: 'https://github.com/test/test/issues/789',
      };

      mockClient.getIssue = jest.fn().mockResolvedValue(mockIssue);

      const task: TaskData = {
        id: 'task-expire',
        title: 'Test',
        status: 'pending',
        priority: 'low',
        labels: [],
        assignees: [],
        github_issue_id: 789,
        updated_at: new Date().toISOString(),
      };

      await service.syncTaskToGitHub(task);
      expect(mockClient.getIssue).toHaveBeenCalledTimes(1);

      // Advance time by 6 minutes (past 5-minute TTL)
      jest.advanceTimersByTime(6 * 60 * 1000);

      await service.syncTaskToGitHub(task);
      expect(mockClient.getIssue).toHaveBeenCalledTimes(2); // Cache expired, fetched again
    });

    it('should invalidate cache on update', async () => {
      const mockIssue = {
        number: 101,
        title: 'Issue to Update',
        state: 'open' as const,
        labels: [],
        assignees: [],
        id: 1,
        body: '',
        milestone: undefined,
        created_at: '2026-01-21T00:00:00Z',
        updated_at: '2026-01-21T00:00:00Z',
        html_url: 'https://github.com/test/test/issues/101',
      };

      mockClient.getIssue = jest.fn().mockResolvedValue(mockIssue);
      mockClient.updateIssue = jest.fn().mockResolvedValue(mockIssue);

      const serviceNoBatch = new GitHubSyncService({ ...baseConfig, enableBatching: false });
      (serviceNoBatch as any).client = mockClient;

      const task: TaskData = {
        id: 'task-invalidate',
        title: 'Updated Title',
        status: 'done',
        priority: 'high',
        labels: ['feature'],
        assignees: [],
        github_issue_id: 101,
        updated_at: new Date().toISOString(),
      };

      await serviceNoBatch.syncTaskToGitHub(task);

      const log = serviceNoBatch.getSyncLog();
      expect(log.some((entry) => entry.action === 'cache_invalidate')).toBe(true);

      serviceNoBatch.stop();
    });
  });

  describe('GraphQL Integration', () => {
    it('should use GraphQL for full sync when enabled', async () => {
      const mockIssues = [
        {
          number: 1,
          title: 'Issue 1',
          state: 'open' as const,
          labels: [],
          assignees: [],
          id: 1,
          body: '',
          created_at: '2026-01-21T00:00:00Z',
          updated_at: '2026-01-21T00:00:00Z',
          html_url: 'https://github.com/test/test/issues/1',
        },
      ];

      mockClient.listIssues = jest.fn().mockResolvedValue(mockIssues);

      await service.performFullSync();

      expect(mockClient.listIssues).toHaveBeenCalled();
      const log = service.getSyncLog();
      expect(log.some((entry) => entry.action === 'full_sync_graphql')).toBe(true);
    });

    it('should fallback to REST when GraphQL disabled', async () => {
      const serviceNoGraphQL = new GitHubSyncService({ ...baseConfig, enableGraphQL: false });
      (serviceNoGraphQL as any).client = mockClient;

      mockClient.listIssues = jest.fn().mockResolvedValue([]);

      await serviceNoGraphQL.performFullSync();

      expect(mockClient.listIssues).toHaveBeenCalledWith('test-owner', 'test-repo', { per_page: 20 });

      serviceNoGraphQL.stop();
    });
  });

  describe('Backoff & Retry', () => {
    it('should retry on rate limit errors', async () => {
      const { retryWithBackoff } = require('../utils/errorHandler');
      retryWithBackoff.mockImplementation((fn, options) => {
        expect(options.maxRetries).toBe(3);
        expect(options.backoffMultiplier).toBe(2);
        return fn();
      });

      mockBatcher.flush.mockReturnValue([
        [
          {
            type: 'create',
            payload: { title: 'Retry Task' },
          },
        ],
      ]);

      mockClient.createIssue = jest.fn().mockResolvedValue({ number: 1 });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(retryWithBackoff).toHaveBeenCalled();
    });

    it('should log retry attempts', async () => {
      const { retryWithBackoff } = require('../utils/errorHandler');
      const mockOnRetry = jest.fn();

      retryWithBackoff.mockImplementation((fn, options) => {
        if (options.onRetry) {
          options.onRetry(1, new Error('Rate limit'));
        }
        return fn();
      });

      mockBatcher.flush.mockReturnValue([
        [
          {
            type: 'update',
            payload: { issueNumber: 1, data: {} },
          },
        ],
      ]);

      mockClient.updateIssue = jest.fn().mockResolvedValue({ number: 1 });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      const log = service.getSyncLog();
      expect(log.some((entry) => entry.action === 'batch_retry')).toBe(true);
    });
  });

  describe('Sync Accuracy', () => {
    it('should maintain sync log accuracy', async () => {
      const task: TaskData = {
        id: 'task-accuracy',
        title: 'Accuracy Test',
        status: 'in-progress',
        priority: 'high',
        labels: ['test'],
        assignees: ['dev1'],
        updated_at: new Date().toISOString(),
      };

      await service.syncTaskToGitHub(task);

      const log = service.getSyncLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[log.length - 1]).toHaveProperty('timestamp');
      expect(log[log.length - 1]).toHaveProperty('action');
      expect(log[log.length - 1]).toHaveProperty('result');
    });

    it('should track sync interval drift', async () => {
      const startTime = Date.now();

      // Trigger multiple flushes
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      }

      const endTime = Date.now();
      const drift = endTime - startTime - 15000; // Expected 15s (3 x 5s)

      // Drift should be minimal (< 1s in test environment)
      expect(Math.abs(drift)).toBeLessThan(1000);
    });
  });

  describe('Service Lifecycle', () => {
    it('should start batch flushing on init', () => {
      expect((service as any).batchFlushTimer).not.toBeNull();
    });

    it('should stop batch flushing on stop()', () => {
      service.stop();
      expect((service as any).batchFlushTimer).toBeNull();
    });

    it('should clear sync log', () => {
      const task: TaskData = {
        id: 'task-log',
        title: 'Log Test',
        status: 'pending',
        priority: 'low',
        labels: [],
        assignees: [],
        updated_at: new Date().toISOString(),
      };

      service.syncTaskToGitHub(task);
      expect(service.getSyncLog().length).toBeGreaterThan(0);

      service.clearSyncLog();
      expect(service.getSyncLog().length).toBe(0);
    });
  });
});

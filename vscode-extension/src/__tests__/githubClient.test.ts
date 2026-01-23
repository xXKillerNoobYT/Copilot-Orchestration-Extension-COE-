import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  GitHubClient,
  GitHubSyncConfig,
  GitHubIssue,
  GitHubCreateIssueRequest,
  GitHubUpdateIssueRequest,
} from '../github/githubClient';

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('GitHubClient', () => {
  let client: GitHubClient;
  let config: GitHubSyncConfig;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token-123',
    };

    client = new GitHubClient(config);
  });

  describe('constructor', () => {
    it('should initialize with default base URL', () => {
      expect(client).toBeDefined();
    });

    it('should initialize with custom base URL', () => {
      const customConfig = {
        ...config,
        baseUrl: 'https://custom.github.com/api',
      };

      const customClient = new GitHubClient(customConfig);
      expect(customClient).toBeDefined();
    });
  });

  describe('getIssue', () => {
    it('should fetch issue by number successfully', async () => {
      const mockIssue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'Test Issue',
        body: 'Issue body',
        state: 'open',
        labels: [{ name: 'bug' }],
        assignees: [{ login: 'user1' }],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      } as Response);

      const result = await client.getIssue('test-owner', 'test-repo', 123);

      expect(result).toEqual(mockIssue);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/issues/123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'token test-token-123',
          }),
        })
      );
    });

    it('should return null for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.getIssue('test-owner', 'test-repo', 999);

      expect(result).toBeNull();
    });

    it('should throw error for other error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(client.getIssue('test-owner', 'test-repo', 123)).rejects.toThrow(
        'GitHub getIssue failed'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getIssue('test-owner', 'test-repo', 123)).rejects.toThrow(
        'GitHub getIssue failed'
      );
    });
  });

  describe('createIssue', () => {
    it('should create issue successfully', async () => {
      const createRequest: GitHubCreateIssueRequest = {
        title: 'New Issue',
        body: 'Issue description',
        labels: ['bug', 'enhancement'],
        assignees: ['user1'],
      };

      const mockIssue: GitHubIssue = {
        id: 1,
        number: 124,
        title: 'New Issue',
        body: 'Issue description',
        state: 'open',
        labels: [{ name: 'bug' }, { name: 'enhancement' }],
        assignees: [{ login: 'user1' }],
        created_at: '2026-01-22T00:00:00Z',
        updated_at: '2026-01-22T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/124',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockIssue,
      } as Response);

      const result = await client.createIssue('test-owner', 'test-repo', createRequest);

      expect(result).toEqual(mockIssue);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/issues',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createRequest),
        })
      );
    });

    it('should throw error on creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
      } as Response);

      await expect(
        client.createIssue('test-owner', 'test-repo', { title: 'Test' })
      ).rejects.toThrow('GitHub createIssue failed');
    });
  });

  describe('updateIssue', () => {
    it('should update issue successfully', async () => {
      const updateRequest: GitHubUpdateIssueRequest = {
        title: 'Updated Title',
        state: 'closed',
        labels: ['resolved'],
      };

      const mockIssue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'Updated Title',
        state: 'closed',
        labels: [{ name: 'resolved' }],
        assignees: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-22T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      } as Response);

      const result = await client.updateIssue('test-owner', 'test-repo', 123, updateRequest);

      expect(result).toEqual(mockIssue);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/issues/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateRequest),
        })
      );
    });

    it('should throw error on update failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(
        client.updateIssue('test-owner', 'test-repo', 999, { title: 'Test' })
      ).rejects.toThrow('GitHub updateIssue failed');
    });
  });

  describe('listIssues', () => {
    it('should list issues with default options', async () => {
      const mockIssues: GitHubIssue[] = [
        {
          id: 1,
          number: 123,
          title: 'Issue 1',
          state: 'open',
          labels: [],
          assignees: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/123',
        },
        {
          id: 2,
          number: 124,
          title: 'Issue 2',
          state: 'open',
          labels: [],
          assignees: [],
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/124',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssues,
      } as Response);

      const result = await client.listIssues('test-owner', 'test-repo');

      expect(result).toEqual(mockIssues);
      expect(result).toHaveLength(2);
    });

    it('should list issues with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);

      await client.listIssues('test-owner', 'test-repo', {
        state: 'closed',
        labels: ['bug', 'critical'],
        page: 2,
        per_page: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=closed'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('labels=bug%2Ccritical'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.any(Object)
      );
    });

    it('should throw error on list failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      await expect(client.listIssues('test-owner', 'test-repo')).rejects.toThrow(
        'GitHub listIssues failed'
      );
    });
  });

  describe('closeIssue', () => {
    it('should close issue', async () => {
      const mockIssue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'Closed Issue',
        state: 'closed',
        labels: [],
        assignees: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-22T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      } as Response);

      const result = await client.closeIssue('test-owner', 'test-repo', 123);

      expect(result.state).toBe('closed');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ state: 'closed' }),
        })
      );
    });
  });

  describe('reopenIssue', () => {
    it('should reopen issue', async () => {
      const mockIssue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'Reopened Issue',
        state: 'open',
        labels: [],
        assignees: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-22T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      } as Response);

      const result = await client.reopenIssue('test-owner', 'test-repo', 123);

      expect(result.state).toBe('open');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ state: 'open' }),
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty issue body', async () => {
      const mockIssue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'No Body',
        state: 'open',
        labels: [],
        assignees: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      } as Response);

      const result = await client.getIssue('test-owner', 'test-repo', 123);

      expect(result?.body).toBeUndefined();
    });

    it('should handle issues with milestone', async () => {
      const mockIssue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'With Milestone',
        state: 'open',
        labels: [],
        assignees: [],
        milestone: { number: 1, title: 'v1.0.0' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      } as Response);

      const result = await client.getIssue('test-owner', 'test-repo', 123);

      expect(result?.milestone?.title).toBe('v1.0.0');
    });

    it('should handle rate limiting errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1234567890',
        }),
      } as Response);

      await expect(client.getIssue('test-owner', 'test-repo', 123)).rejects.toThrow();
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(client.getIssue('test-owner', 'test-repo', 123)).rejects.toThrow();
    });
  });
});

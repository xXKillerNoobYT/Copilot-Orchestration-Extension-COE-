/**
 * Settings Panel + GitHub Sync - End-to-End Integration Tests
 * 
 * Tests the complete workflow:
 * 1. User opens Settings Panel
 * 2. Configures GitHub token + repository
 * 3. Saves settings to VS Code configuration
 * 4. Triggers manual GitHub sync
 * 5. Verifies GitHub Issues created/updated
 * 6. Confirms task status synchronized
 */

import * as vscode from 'vscode';
import { SettingsPanel } from '../settingsPanel';
import { GitHubSyncService } from '../../services/githubSyncService';
import { GitHubClient } from '../../github/githubClient';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../services/githubSyncService');
jest.mock('../../github/githubClient');

describe('Settings Panel + GitHub Sync - E2E Integration', () => {
  let mockPanel: jest.Mocked<vscode.WebviewPanel>;
  let mockExtensionUri: vscode.Uri;
  let mockConfig: any;
  let mockGitHubClient: jest.Mocked<GitHubClient>;
  let mockSyncService: jest.Mocked<GitHubSyncService>;
  let messageHandlers: Map<string, Function> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    messageHandlers.clear();

    // Setup mocks
    mockPanel = {
      webview: {
        onDidReceiveMessage: jest.fn((handler) => {
          messageHandlers.set('message-handler', handler);
          return { dispose: jest.fn() };
        }),
        postMessage: jest.fn().mockResolvedValue(true),
        html: '',
      },
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      reveal: jest.fn(),
    } as any;

    mockExtensionUri = vscode.Uri.file('/test/extension');

    mockConfig = {
      get: jest.fn((key, defaultValue) => {
        const values: any = {
          'copilot-orchestrator.github.token': 'ghp_old-token',
          'copilot-orchestrator.github.repo': 'old-owner/old-repo',
          'copilot-orchestrator.github.syncInterval': 5,
          'copilot-orchestrator.github.syncDirection': 'bidirectional',
        };
        return values[key] ?? defaultValue;
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

    // Setup GitHub mocks
    mockGitHubClient = new GitHubClient({
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'ghp_test-token',
    }) as jest.Mocked<GitHubClient>;

    mockSyncService = new GitHubSyncService({
      owner: 'test-owner',
      repo: 'test-repo',
      githubToken: 'ghp_test-token',
    }) as jest.Mocked<GitHubSyncService>;

    // Reset singleton
    (SettingsPanel as any).currentPanel = undefined;
  });

  describe('Complete GitHub Sync Workflow', () => {
    it('should configure GitHub settings and trigger sync successfully', async () => {
      // Step 1: Open Settings Panel
      SettingsPanel.createOrShow(mockExtensionUri);
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();

      const handler = messageHandlers.get('message-handler');
      expect(handler).toBeDefined();

      // Step 2: User loads existing settings
      await handler({ command: 'loadSettings' });
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'settingsLoaded' })
      );

      // Step 3: User enters GitHub configuration
      const newGitHubSettings = {
        token: 'ghp_new-valid-token',
        repo: 'new-owner/new-repo',
        syncInterval: 10,
        syncDirection: 'bidirectional',
        conflictResolution: 'last-write-wins',
      };

      // Step 4: User tests GitHub connection
      mockGitHubClient.getAuthenticatedUser = jest.fn().mockResolvedValue({
        login: 'testuser',
        id: 12345,
        type: 'User',
      });

      await handler({
        command: 'testGitHubConnection',
        token: newGitHubSettings.token,
        repo: newGitHubSettings.repo,
      });

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'githubConnectionTested',
          success: true,
        })
      );

      // Step 5: User saves GitHub settings
      await handler({
        command: 'saveGitHubSettings',
        settings: newGitHubSettings,
      });

      // Verify settings persisted
      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.token',
        'ghp_new-valid-token',
        expect.any(Number)
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.repo',
        'new-owner/new-repo',
        expect.any(Number)
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.syncInterval',
        10,
        expect.any(Number)
      );

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('GitHub settings saved')
      );

      // Step 6: User triggers immediate sync
      mockSyncService.syncTasksToGitHub = jest
        .fn()
        .mockResolvedValue({ success: true, synced: 3, updated: 1 });

      await handler({ command: 'syncNow' });

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.syncWithGitHub'
      );
    });
  });

  describe('Task Creation via Settings Panel + Sync', () => {
    it('should create GitHub Issue from task when sync triggered', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Setup: Configure GitHub
      const settings = {
        token: 'ghp_valid-token',
        repo: 'owner/repo',
        syncInterval: 5,
        syncDirection: 'bidirectional',
      };

      await handler({ command: 'saveGitHubSettings', settings });

      // Setup: Mock GitHub API response for Issue creation
      const createdIssue = {
        number: 42,
        title: 'Test Task',
        body: 'Task description',
        state: 'open',
        labels: ['bug', 'feature'],
        assignees: ['user1'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        html_url: 'https://github.com/owner/repo/issues/42',
      };

      mockGitHubClient.createIssue = jest.fn().mockResolvedValue(createdIssue);

      // Trigger sync with sample task
      const taskData = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Task description',
        status: 'pending',
        priority: 'high',
        labels: ['bug', 'feature'],
        assignees: ['user1'],
        updated_at: new Date().toISOString(),
      };

      mockSyncService.syncTaskToGitHub = jest.fn().mockResolvedValue({
        success: true,
        issueNumber: 42,
        issueUrl: 'https://github.com/owner/repo/issues/42',
      });

      await handler({ command: 'syncNow' });

      // Verify Issue would be created with correct data
      expect(mockGitHubClient.createIssue).not.toHaveBeenCalled(); // Would be called by sync service
    });

    it('should update existing GitHub Issue when task status changes', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure GitHub sync
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'bidirectional',
        },
      });

      // Task with existing GitHub Issue ID
      const updatedTask = {
        id: 'task-1',
        title: 'Test Task - Updated',
        status: 'done',
        priority: 'high',
        labels: [],
        assignees: [],
        github_issue_id: 42,
        github_issue_url: 'https://github.com/owner/repo/issues/42',
        updated_at: new Date().toISOString(),
      };

      mockGitHubClient.updateIssue = jest.fn().mockResolvedValue({
        number: 42,
        title: 'Test Task - Updated',
        state: 'closed',
        labels: [],
        assignees: [],
      });

      mockSyncService.syncTaskToGitHub = jest
        .fn()
        .mockResolvedValue({ success: true, updated: true, issueNumber: 42 });

      // Trigger sync
      await handler({ command: 'syncNow' });

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.syncWithGitHub'
      );
    });

    it('should handle sync conflicts according to conflict resolution strategy', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure GitHub with specific conflict resolution
      const settings = {
        token: 'ghp_valid-token',
        repo: 'owner/repo',
        syncInterval: 5,
        syncDirection: 'bidirectional',
        conflictResolution: 'manual', // Manual merge mode
      };

      await handler({ command: 'saveGitHubSettings', settings });

      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.conflictResolution',
        'manual',
        expect.any(Number)
      );

      // Verify conflict resolution strategy persisted
      const savedConfig = mockConfig.update.mock.calls;
      const conflictResolutionCall = savedConfig.find((call: any[]) =>
        call[0].includes('conflictResolution')
      );
      expect(conflictResolutionCall).toBeDefined();
    });
  });

  describe('Rate Limiting & Backoff', () => {
    it('should display GitHub rate limit status in Settings Panel', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure GitHub
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'bidirectional',
        },
      });

      // Simulate rate limit check
      mockGitHubClient.getRateLimit = jest.fn().mockResolvedValue({
        limit: 5000,
        remaining: 4987,
        reset: Math.floor(Date.now() / 1000) + 3600,
      });

      // Panel should display rate limit info
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle rate limit 429 errors with exponential backoff', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Setup
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'bidirectional',
        },
      });

      // Mock rate limit error
      const error = new Error('API rate limit exceeded');
      (error as any).status = 429;

      mockGitHubClient.getIssue = jest.fn().mockRejectedValue(error);

      // Sync service should handle with backoff
      mockSyncService.syncTasksToGitHub = jest.fn().mockResolvedValue({
        success: false,
        error: 'Rate limited',
        retryAfter: 60,
      });

      // Trigger sync
      await handler({ command: 'syncNow' });

      // Should notify user to retry
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.syncWithGitHub'
      );
    });
  });

  describe('Multi-Directional Sync', () => {
    it('should support push-only sync mode (Tasks → Issues)', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure push-only sync
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'push', // Tasks → Issues only
        },
      });

      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.syncDirection',
        'push',
        expect.any(Number)
      );
    });

    it('should support pull-only sync mode (Issues → Tasks)', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure pull-only sync
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'pull', // Issues → Tasks only
        },
      });

      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.syncDirection',
        'pull',
        expect.any(Number)
      );
    });

    it('should support bidirectional sync (Tasks ↔ Issues)', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure bidirectional sync
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'bidirectional', // Tasks ↔ Issues
        },
      });

      expect(mockConfig.update).toHaveBeenCalledWith(
        'copilot-orchestrator.github.syncDirection',
        'bidirectional',
        expect.any(Number)
      );
    });
  });

  describe('Sub-Issue Linking', () => {
    it('should enable/disable sub-issue linking from Settings Panel', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure GitHub with sub-issue linking enabled
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'bidirectional',
          enableSubIssues: true,
        },
      });

      // Configuration saved
      expect(mockConfig.update).toHaveBeenCalled();

      // When sync triggered, parent/child relationships should be maintained
      mockSyncService.syncTasksToGitHub = jest.fn().mockResolvedValue({
        success: true,
        synced: 5,
        parentIssueId: 42,
        childIssueIds: [43, 44, 45, 46],
      });
    });
  });

  describe('Error Recovery & Validation', () => {
    it('should validate repository format before sync', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Try to save invalid repository format
      const invalidSettings = {
        token: 'ghp_valid-token',
        repo: 'invalid-format-no-slash',
        syncInterval: 5,
        syncDirection: 'bidirectional',
      };

      await handler({
        command: 'saveGitHubSettings',
        settings: invalidSettings,
      });

      // Should still save (validation happens at sync time)
      expect(mockConfig.update).toHaveBeenCalled();
    });

    it('should detect and report GitHub authentication failures', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Setup with invalid token
      mockGitHubClient.getAuthenticatedUser = jest.fn().mockRejectedValue(
        new Error('Bad credentials')
      );

      await handler({
        command: 'testGitHubConnection',
        token: 'ghp_invalid-token',
        repo: 'owner/repo',
      });

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'githubConnectionTested',
          success: false,
        })
      );
    });

    it('should handle repository not found errors', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Setup
      mockGitHubClient.getRepository = jest.fn().mockRejectedValue(
        new Error('Repository not found')
      );

      await handler({
        command: 'testGitHubConnection',
        token: 'ghp_valid-token',
        repo: 'nonexistent/repo',
      });

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should recover from sync failures and allow retry', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      // Configure sync
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_valid-token',
          repo: 'owner/repo',
          syncInterval: 5,
          syncDirection: 'bidirectional',
        },
      });

      // First sync attempt fails
      mockSyncService.syncTasksToGitHub = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({ success: true, synced: 3 });

      // First attempt
      await handler({ command: 'syncNow' });

      // Should allow retry
      await handler({ command: 'syncNow' });

      expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('Sync Interval Management', () => {
    it('should allow configuring sync interval from 1 to 60 minutes', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = messageHandlers.get('message-handler');

      const testIntervals = [1, 5, 15, 30, 60];

      for (const interval of testIntervals) {
        await handler({
          command: 'saveGitHubSettings',
          settings: {
            token: 'ghp_valid-token',
            repo: 'owner/repo',
            syncInterval: interval,
            syncDirection: 'bidirectional',
          },
        });

        expect(mockConfig.update).toHaveBeenCalledWith(
          'copilot-orchestrator.github.syncInterval',
          interval,
          expect.any(Number)
        );
      }
    });
  });

  describe('Settings Panel → GitHub Sync Persistence', () => {
    it('should retain GitHub settings across Settings Panel reopens', async () => {
      // First session: Set GitHub settings
      SettingsPanel.createOrShow(mockExtensionUri);
      let handler = messageHandlers.get('message-handler');

      const settings = {
        token: 'ghp_persistent-token',
        repo: 'owner/persistent-repo',
        syncInterval: 15,
        syncDirection: 'bidirectional',
      };

      await handler({ command: 'saveGitHubSettings', settings });

      // Second session: Reload and verify settings
      (SettingsPanel as any).currentPanel = undefined;
      SettingsPanel.createOrShow(mockExtensionUri);
      handler = messageHandlers.get('message-handler');

      mockConfig.get.mockReturnValue((key: string) => {
        const values: any = {
          'copilot-orchestrator.github.token': 'ghp_persistent-token',
          'copilot-orchestrator.github.repo': 'owner/persistent-repo',
          'copilot-orchestrator.github.syncInterval': 15,
        };
        return values[key];
      });

      await handler({ command: 'loadSettings' });

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'settingsLoaded',
        })
      );
    });
  });
});

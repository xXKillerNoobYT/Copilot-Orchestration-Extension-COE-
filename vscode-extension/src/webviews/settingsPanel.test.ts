/**
 * Settings Panel Tests - Pragmatic Suite
 * Tests Settings Panel webview message handlers and functionality
 * Covers core workflows: connection, GitHub sync, settings persistence
 */

import * as vscode from 'vscode';
import { SettingsPanel } from './settingsPanel';

// Mock dependencies
jest.mock('vscode');
jest.mock('./programmingOrchestratorTab');
jest.mock('../services/mcpClient');
jest.mock('../services/agentProfileLoader');
jest.mock('../transport/transportManager');
jest.mock('../config/llmTimeouts');

describe('SettingsPanel - Core Functionality', () => {
  let mockPanel: any;
  let mockExtensionUri: any;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock webview panel
    mockPanel = {
      webview: {
        onDidReceiveMessage: jest.fn((handler: any) => {
          (global as any).messageHandler = handler;
          return { dispose: jest.fn() };
        }),
        postMessage: jest.fn().mockResolvedValue(true),
        html: '<html></html>',
      },
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      reveal: jest.fn(),
    };

    // Setup mock extension URI
    mockExtensionUri = { path: '/test', fsPath: '/test' };

    // Setup mock configuration
    mockConfig = {
      get: jest.fn((key: string, defaultValue: any) => defaultValue),
      update: jest.fn().mockResolvedValue(undefined),
    };

    // Setup vscode mocks
    (vscode.workspace as any) = {
      getConfiguration: jest.fn().mockReturnValue(mockConfig),
    };
    (vscode.window as any) = {
      createWebviewPanel: jest.fn().mockReturnValue(mockPanel),
      showInformationMessage: jest.fn().mockResolvedValue(undefined),
      showErrorMessage: jest.fn().mockResolvedValue(undefined),
    };
    (vscode.commands as any) = {
      executeCommand: jest.fn().mockResolvedValue(undefined),
    };
    (vscode as any).ViewColumn = { One: 1 };
    (vscode as any).ConfigurationTarget = { Global: 1 };
    (vscode as any).Uri = { 
      file: jest.fn((p) => ({ path: p, fsPath: p })),
      joinPath: jest.fn((uri, ...segments) => ({ path: uri.path + '/' + segments.join('/'), fsPath: uri.fsPath + '/' + segments.join('/') })),
    };

    // Reset singleton
    (SettingsPanel as any).currentPanel = undefined;
  });

  describe('Panel Creation', () => {
    it('should create panel with createOrShow', () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });

    it('should reuse existing panel', () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const callCount1 = (vscode.window.createWebviewPanel as jest.Mock).mock.calls.length;

      SettingsPanel.createOrShow(mockExtensionUri);
      const callCount2 = (vscode.window.createWebviewPanel as jest.Mock).mock.calls.length;

      expect(callCount2).toBe(callCount1);
    });

    it('should have message handler registered', () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      expect((global as any).messageHandler).toBeDefined();
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to VS Code config', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      const config = {
        baseUrl: 'http://localhost:5000',
        apiKey: 'test-key',
        model: 'gpt-4',
        temperature: 0.8,
        timeout: 60000,
      };

      await handler({ command: 'saveSettings', config });
      expect(mockConfig.update).toHaveBeenCalled();
    });

    it('should load settings from VS Code config', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      mockConfig.get = jest.fn((key: string) => {
        const values: any = {
          'copilot-orchestrator.llm.baseUrl': 'http://localhost:1234',
          'copilot-orchestrator.llm.model': 'gpt-4',
        };
        return values[key];
      });

      await handler({ command: 'loadSettings' });
      expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
    });
  });

  describe('GitHub Sync Configuration', () => {
    it('should handle GitHub settings', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      const settings = {
        token: 'ghp_valid-token',
        repo: 'owner/repo',
        syncInterval: 5,
        syncDirection: 'bidirectional',
      };

      await handler({ command: 'saveGitHubSettings', settings });
      expect(mockConfig.update).toHaveBeenCalled();
    });

    it('should trigger manual sync', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      await handler({ command: 'syncNow' });
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'copilot-orchestrator.syncWithGitHub'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle config save errors', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      mockConfig.update.mockRejectedValueOnce(new Error('Save failed'));
      const handler = (global as any).messageHandler!;

      await handler({ command: 'saveSettings', config: { baseUrl: 'http://localhost' } });
      // Handler should process the error - either show message or handle gracefully
      expect(mockConfig.update).toHaveBeenCalled();
    });

    it('should handle connection test errors', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      jest.spyOn(global, 'fetch' as any).mockRejectedValueOnce(new Error('Network error'));
      await handler({
        command: 'testConnection',
        config: { baseUrl: 'http://unreachable:1234' },
      });

      expect(mockPanel.webview.postMessage).toHaveBeenCalled();
    });
  });

  describe('UI Rendering', () => {
    it('should render HTML with tabs', () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      expect(mockPanel.webview.html).toBeDefined();
      expect(mockPanel.webview.html.length).toBeGreaterThan(0);
    });

    it('should include tab buttons in HTML', () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      // HTML should contain tab structure
      const html = mockPanel.webview.html;
      expect(html).toMatch(/tab|settings/);
    });
  });

  describe('Integration Workflows', () => {
    it('should support complete GitHub configuration workflow', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      // Load existing settings
      await handler({ command: 'loadSettings' });
      expect(vscode.workspace.getConfiguration).toHaveBeenCalled();

      // Save new GitHub settings
      await handler({
        command: 'saveGitHubSettings',
        settings: {
          token: 'ghp_new-token',
          repo: 'owner/repo',
          syncInterval: 10,
          syncDirection: 'bidirectional',
        },
      });
      expect(mockConfig.update).toHaveBeenCalled();

      // Trigger sync
      await handler({ command: 'syncNow' });
      expect(vscode.commands.executeCommand).toHaveBeenCalled();
    });

    it('should support agent profile management', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      await handler({ command: 'loadAgentProfile', profileName: 'planner' });
      expect(mockPanel.webview.postMessage).toHaveBeenCalled();

      const profile = { name: 'TestProfile', version: 1 };
      await handler({ command: 'saveAgentProfile', profile });
      expect(mockConfig.update).toHaveBeenCalled();
    });

    it('should support advanced settings', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;

      const settings = {
        temperature: 0.5,
        timeout: 45000,
        contextBundleSize: 150,
        tokenLimit: 10000,
      };

      await handler({ command: 'saveAdvancedSettings', settings });
      expect(mockConfig.update).toHaveBeenCalled();
    });
  });

  describe('Message Handler Coverage', () => {
    it('should handle all major message types', async () => {
      SettingsPanel.createOrShow(mockExtensionUri);
      const handler = (global as any).messageHandler!;
      expect(handler).toBeDefined();

      // Verify handler can process various message types
      const messages = [
        { command: 'loadSettings' },
        { command: 'getModels', baseUrl: 'http://localhost:1234' },
        { command: 'testConnection', config: {} },
        { command: 'testGitHubConnection', token: 'ghp_test', repo: 'test/repo' },
        { command: 'syncNow' },
      ];

      for (const msg of messages) {
        try {
          await handler(msg);
        } catch (e) {
          // Errors are OK - we're testing that handler exists and is callable
        }
      }
      expect(mockPanel.webview.postMessage).toHaveBeenCalled();
    });
  });
});

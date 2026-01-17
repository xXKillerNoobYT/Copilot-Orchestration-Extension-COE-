/**
 * Tests for LLMIPMonitor - Configuration Change Handling
 * Validates that configuration changes invalidate the globalState cache
 */

import { LLMIPMonitor } from './llmIPMonitor';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('LLMIPMonitor - Configuration Change Handling', () => {
  let mockContext: any;
  let mockGlobalState: Map<string, any>;
  let configurationChangeListener: ((event: vscode.ConfigurationChangeEvent) => void) | null = null;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockGlobalState = new Map();
    configurationChangeListener = null;

    // Create mock context with globalState
    mockContext = {
      globalState: {
        get: jest.fn((key: string) => mockGlobalState.get(key)),
        update: jest.fn((key: string, value: any) => {
          if (value === undefined) {
            mockGlobalState.delete(key);
          } else {
            mockGlobalState.set(key, value);
          }
          return Promise.resolve();
        }),
      },
      subscriptions: {
        push: jest.fn((disposable: any) => {
          // Capture the configuration change listener
          if (disposable && typeof disposable === 'function') {
            // This is the workspace.onDidChangeConfiguration callback
            const listener = disposable;
            // Store it so we can trigger it in tests
            if (!configurationChangeListener) {
              configurationChangeListener = listener;
            }
          }
        }),
      },
    };

    // Mock vscode.window methods
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue({
      text: '',
      color: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    });

    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    });

    // Mock vscode.workspace.onDidChangeConfiguration
    (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((callback) => {
      configurationChangeListener = callback;
      return { dispose: jest.fn() };
    });

    // Mock vscode.workspace.getConfiguration
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === 'baseUrl') {
          return 'http://192.168.1.100:8000';
        }
        return undefined;
      }),
    });

    // Mock vscode.commands.registerCommand
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
  });

  test('should store context and subscribe to configuration changes', () => {
    const monitor = new LLMIPMonitor(mockContext);

    // Verify context was stored
    expect(mockContext.subscriptions.push).toHaveBeenCalled();
    
    // Verify configuration change listener was registered
    expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
  });

  test('should clear globalState cache when configuration changes', () => {
    // Set up initial cache in globalState
    mockGlobalState.set('llmConfig', {
      host: '192.168.137.215',
      port: 8000,
      lastKnownIP: '192.168.137.215',
      isHealthy: false,
    });

    const monitor = new LLMIPMonitor(mockContext);

    // Verify initial cache exists
    expect(mockGlobalState.has('llmConfig')).toBe(true);

    // Trigger configuration change event
    if (configurationChangeListener) {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => {
          return section === 'copilot-orchestrator.llm';
        }),
      } as any;

      configurationChangeListener(mockEvent);
    }

    // Verify cache was cleared
    expect(mockContext.globalState.update).toHaveBeenCalledWith('llmConfig', undefined);
    expect(mockGlobalState.has('llmConfig')).toBe(false);
  });

  test('should not clear cache for unrelated configuration changes', () => {
    // Set up initial cache in globalState
    mockGlobalState.set('llmConfig', {
      host: '192.168.137.215',
      port: 8000,
      lastKnownIP: '192.168.137.215',
      isHealthy: false,
    });

    const monitor = new LLMIPMonitor(mockContext);

    // Trigger configuration change event for unrelated setting
    if (configurationChangeListener) {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => {
          return section !== 'copilot-orchestrator.llm';
        }),
      } as any;

      configurationChangeListener(mockEvent);
    }

    // Verify cache was NOT cleared (still has the initial value)
    expect(mockGlobalState.has('llmConfig')).toBe(true);
    expect(mockGlobalState.get('llmConfig')).toEqual({
      host: '192.168.137.215',
      port: 8000,
      lastKnownIP: '192.168.137.215',
      isHealthy: false,
    });
  });

  test('should save configuration to globalState', () => {
    const monitor = new LLMIPMonitor(mockContext);

    // Access the private method indirectly by triggering setIP which calls saveConfig
    monitor.setIP('192.168.1.50', 9000);

    // Verify globalState.update was called
    expect(mockContext.globalState.update).toHaveBeenCalledWith(
      'llmConfig',
      expect.objectContaining({
        host: '192.168.1.50',
        port: 9000,
      })
    );
  });
});

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
    // Use fake timers for debounce testing
    jest.useFakeTimers();

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
        push: jest.fn(),
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

  afterEach(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  test('should store context and subscribe to configuration changes', () => {
    new LLMIPMonitor(mockContext);

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

    new LLMIPMonitor(mockContext);

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

      // Fast-forward debounce timer
      jest.advanceTimersByTime(500);
    }

    // Verify cache was cleared (called with undefined)
    expect(mockContext.globalState.update).toHaveBeenCalledWith('llmConfig', undefined);

    // Verify configuration was reloaded from settings and saved back
    // The mocked baseUrl is 'http://192.168.1.100:8000'
    expect(mockContext.globalState.update).toHaveBeenCalledWith(
      'llmConfig',
      expect.objectContaining({
        host: '192.168.1.100',
        port: 8000,
      })
    );

    // After the full flow, cache should contain the updated config
    expect(mockGlobalState.has('llmConfig')).toBe(true);
    const savedConfig = mockGlobalState.get('llmConfig');
    expect(savedConfig.host).toBe('192.168.1.100');
    expect(savedConfig.port).toBe(8000);
  });

  test('should load settings on initialization, overriding cached values', () => {
    // Set up initial cache in globalState with OLD values
    mockGlobalState.set('llmConfig', {
      host: '192.168.137.215',
      port: 8000,
      lastKnownIP: '192.168.137.215',
      isHealthy: false,
    });

    new LLMIPMonitor(mockContext);

    // After initialization, the constructor calls updateConfigFromSettings()
    // which should override cached values with settings from VS Code
    // Mock returns baseUrl='http://192.168.1.100:8000'
    const updatedConfig = mockGlobalState.get('llmConfig');

    // Verify the config was updated from settings (not just cached value)
    expect(updatedConfig.host).toBe('192.168.1.100');
    expect(updatedConfig.port).toBe(8000);
    // lastKnownIP preserved from cache (only host/port updated)
    expect(updatedConfig.lastKnownIP).toBe('192.168.137.215');
    // Health status reset because endpoint changed
    expect(updatedConfig.isHealthy).toBeUndefined();
    expect(updatedConfig.lastCheckedAt).toBeUndefined();
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

  test('should handle invalid or missing baseUrl gracefully', () => {
    // Mock getConfiguration to return undefined baseUrl
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn(() => undefined),
    });

    new LLMIPMonitor(mockContext);

    // Trigger configuration change event
    if (configurationChangeListener) {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => {
          return section === 'copilot-orchestrator.llm';
        }),
      } as any;

      configurationChangeListener(mockEvent);

      // Fast-forward debounce timer
      jest.advanceTimersByTime(500);
    }

    // Verify cache was cleared
    expect(mockContext.globalState.update).toHaveBeenCalledWith('llmConfig', undefined);

    // Verify that saveConfig was NOT called (since updateConfigFromSettings returned false)
    // We can check this by ensuring the last call to update was for clearing, not saving
    const updateCalls = (mockContext.globalState.update as jest.Mock).mock.calls;
    const lastCall = updateCalls[updateCalls.length - 1];
    expect(lastCall[1]).toBeUndefined(); // Last call should be clearing cache, not saving
  });

  test('should debounce multiple rapid configuration changes', () => {
    new LLMIPMonitor(mockContext);

    let configUpdateCount = 0;
    (mockContext.globalState.update as jest.Mock).mockImplementation((key: string, value: any) => {
      if (value !== undefined) {
        configUpdateCount++;
      }
      if (value === undefined) {
        mockGlobalState.delete(key);
      } else {
        mockGlobalState.set(key, value);
      }
      return Promise.resolve();
    });

    // Trigger multiple configuration change events in rapid succession
    if (configurationChangeListener) {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => {
          return section === 'copilot-orchestrator.llm';
        }),
      } as any;

      // Fire 5 configuration changes rapidly
      configurationChangeListener(mockEvent);
      jest.advanceTimersByTime(100);
      configurationChangeListener(mockEvent);
      jest.advanceTimersByTime(100);
      configurationChangeListener(mockEvent);
      jest.advanceTimersByTime(100);
      configurationChangeListener(mockEvent);
      jest.advanceTimersByTime(100);
      configurationChangeListener(mockEvent);

      // Fast-forward past the final debounce timer
      jest.advanceTimersByTime(500);
    }

    // Verify that only one config save occurred (debouncing worked)
    // The configUpdateCount should be 1 (only the final debounced call)
    expect(configUpdateCount).toBe(1);
  });
});

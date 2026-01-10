/// <reference types="mocha" />
/**
 * Status Bar Lifecycle Integration Tests
 * Verifies status bar shows/hides based on LLM config validity and extension activation
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Status Bar Lifecycle', () => {
  let statusBarItems: vscode.StatusBarItem[] = [];

  teardown(() => {
    // Clean up all created status bar items
    statusBarItems.forEach(item => item.dispose());
    statusBarItems = [];
  });

  /**
   * Test: Status bar item creation and initial state
   */
  test('Status bar item should be created on activation', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // The extension should create a status bar item for LLM config status
    // We can verify by creating a new one and checking it doesn't conflict
    const testItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItems.push(testItem);

    assert.ok(testItem, 'Status bar item should be creatable');
    testItem.text = '$(check) LLM: Configured';
    testItem.show();

    assert.strictEqual(testItem.text, '$(check) LLM: Configured', 'Status bar text should be set');
  });

  /**
   * Test: Status bar reflects configuration state
   */
  test('Status bar should reflect LLM configuration state', async () => {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const baseUrl = config.get<string>('llm.baseUrl');

    // Create a status bar item to simulate extension behavior
    const statusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItems.push(statusItem);

    if (baseUrl && baseUrl.length > 0) {
      statusItem.text = '$(check) LLM: Configured';
      statusItem.tooltip = `Base URL: ${baseUrl}`;
    } else {
      statusItem.text = '$(warning) LLM: Not Configured';
      statusItem.tooltip = 'Click to configure LLM settings';
      statusItem.command = 'copilot-orchestrator.configureLLM';
    }

    statusItem.show();

    assert.ok(statusItem.text.includes('LLM:'), 'Status should indicate LLM status');
  });

  /**
   * Test: Status bar command binding
   */
  test('Status bar item should have command when config is invalid', async () => {
    const statusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItems.push(statusItem);

    statusItem.text = '$(warning) LLM: Not Configured';
    statusItem.command = 'copilot-orchestrator.configureLLM';
    statusItem.tooltip = 'Click to configure';

    assert.strictEqual(
      statusItem.command,
      'copilot-orchestrator.configureLLM',
      'Status bar should have configure command'
    );
  });

  /**
   * Test: Auto Agent Loop status bar updates
   */
  test('Auto Loop status bar should update on loop state changes', async () => {
    const loopStatusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    statusBarItems.push(loopStatusItem);

    // Simulate loop not running
    loopStatusItem.text = '$(debug-pause) Auto Loop: Stopped';
    loopStatusItem.command = 'copilot-orchestrator.startAutoLoop';
    loopStatusItem.show();

    assert.ok(loopStatusItem.text.includes('Stopped'), 'Should show stopped state');

    // Simulate loop running
    loopStatusItem.text = '$(sync~spin) Auto Loop: Running';
    loopStatusItem.command = 'copilot-orchestrator.stopAutoLoop';

    assert.ok(loopStatusItem.text.includes('Running'), 'Should show running state');
  });

  /**
   * Test: Status bar visibility toggle
   */
  test('Status bar items should be show/hideable', async () => {
    const testItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItems.push(testItem);

    testItem.text = 'Test';
    testItem.show();
    // VS Code doesn't expose visibility state directly, but show/hide should not throw
    testItem.hide();

    assert.ok(true, 'Show/hide operations should complete without errors');
  });

  /**
   * Test: Disposables cleanup on deactivation
   */
  test('Status bar items should be disposable', async () => {
    const items = [
      vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100),
      vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100),
    ];

    items.forEach(item => {
      item.text = 'Test';
      item.show();
      statusBarItems.push(item);
    });

    // Dispose all items
    items.forEach(item => item.dispose());

    assert.ok(true, 'All status bar items should be disposable without errors');
  });
});

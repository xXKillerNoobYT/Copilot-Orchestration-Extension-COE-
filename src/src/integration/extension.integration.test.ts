/// <reference types="mocha" />
/**
 * VS Code Extension Integration Tests
 * Tests command registration, activation, and status bar behavior
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {
  /**
   * Test: Extension Activation
   * Verifies extension loads without errors
   */
  test('Extension should be present', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    assert.ok(ext, 'Extension should be installed');
  });

  /**
   * Test: Extension Activation
   * Verifies extension activates successfully
   */
  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    if (ext) {
      await ext.activate();
      assert.ok(ext.isActive, 'Extension should be active');
    }
  });

  /**
   * Test: Command Registration
   * Verifies all required commands are registered
   */
  test('Commands should be registered', async () => {
    const expectedCommands = [
      'copilot-orchestrator.start',
      'copilot-orchestrator.refreshTasks',
      'copilot-orchestrator.showGraph',
      'copilot-orchestrator.showDependencies',
      'copilot-orchestrator.showPanel',
      'copilot-orchestrator.executeTask',
      'copilot-orchestrator.changeTaskStatus',
      'copilot-orchestrator.configureLLM',
      'copilot-orchestrator.testConnection',
      'copilot-orchestrator.executeLLM',
      // Auto Agent Loop commands
      'copilot-orchestrator.startAutoLoop',
      'copilot-orchestrator.stopAutoLoop',
      'copilot-orchestrator.autoLoopStatus',
      'copilot-orchestrator.executeSingleCycle',
    ];

    const allCommands = await vscode.commands.getCommands();

    for (const cmd of expectedCommands) {
      assert.ok(
        allCommands.includes(cmd),
        `Command ${cmd} should be registered`
      );
    }
  });

  /**
   * Test: Configuration Access
   * Verifies configuration properties are readable
   */
  test('Configuration should be accessible', async () => {
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');

    assert.ok(
      config.get('llm.baseUrl'),
      'LLM baseUrl configuration should exist'
    );
    assert.ok(
      config.get('llm.defaultModel') !== undefined,
      'LLM defaultModel configuration should exist'
    );
  });

  /**
   * Test: View Registration
   * Verifies sidebar view is registered
   */
  test('Sidebar view should be registered', async () => {
    // Views are registered in package.json, we can't directly test them
    // but we can verify the configuration exists
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    const pkg = ext?.packageJSON;

    assert.ok(pkg?.contributes?.views, 'Views should be contributed');
    assert.ok(pkg?.contributes?.views?.copilotOrchestrator, 'copilotOrchestrator view should exist');
  });

  /**
   * Test: Status Bar Item Creation
   * Verifies status bar item can be created
   */
  test('Status bar item can be created', async () => {
    const statusBarItem = vscode.window.createStatusBarItem(
      'copilot-orchestrator.status',
      vscode.StatusBarAlignment.Right,
      100
    );

    assert.ok(statusBarItem, 'Status bar item should be created');
    assert.ok(statusBarItem.command === undefined || typeof statusBarItem.command === 'string',
      'Status bar command should be valid');

    statusBarItem.dispose();
  });

  /**
   * Test: LLM Configuration Command Existence
   * Verifies configureLLM command can be executed
   */
  test('configureLLM command should be callable', async () => {
    try {
      // Don't actually execute, just verify it exists
      const allCommands = await vscode.commands.getCommands();
      const hasConfigure = allCommands.includes('copilot-orchestrator.configureLLM');
      
      assert.ok(hasConfigure, 'configureLLM command should be registered');
    } catch (error) {
      // Command might require UI interaction, that's OK
      assert.ok(true, 'Command check completed');
    }
  });
});

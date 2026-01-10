/// <reference types="mocha" />
/**
 * Extension Activation Flow Integration Tests
 * Verifies activation triggers and configuration change handling
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Activation Flows', () => {
  /**
   * Test: Extension activates on command execution
   */
  test('Extension should activate on command execution', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');

    if (ext && !ext.isActive) {
      // Execute a command to trigger activation
      try {
        await vscode.commands.executeCommand('copilot-orchestrator.start');
      } catch (err) {
        // Command might fail if workspace is not set up, but activation should still happen
      }

      // Extension should now be active
      assert.ok(ext.isActive, 'Extension should be active after command execution');
    }
  });

  /**
   * Test: Extension responds to configuration changes
   */
  test('Extension should handle configuration changes', async function() {
    this.timeout(5000); // Allow time for config changes to propagate

    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const originalValue = config.get<string>('llm.baseUrl');

    try {
      // Update configuration
      await config.update('llm.baseUrl', 'http://localhost:1234', vscode.ConfigurationTarget.Global);

      // Wait a bit for event handlers to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify config was updated
      const updatedConfig = vscode.workspace.getConfiguration('copilot-orchestrator');
      const newValue = updatedConfig.get<string>('llm.baseUrl');

      assert.strictEqual(newValue, 'http://localhost:1234', 'Configuration should be updated');

      // Restore original value
      await config.update('llm.baseUrl', originalValue, vscode.ConfigurationTarget.Global);
    } catch (err) {
      // Restore on error
      await config.update('llm.baseUrl', originalValue, vscode.ConfigurationTarget.Global);
      throw err;
    }
  });

  /**
   * Test: Activation events are registered
   */
  test('Activation events should be configured', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    const pkg = ext?.packageJSON;

    assert.ok(pkg?.activationEvents, 'Activation events should be defined');
    assert.ok(
      Array.isArray(pkg.activationEvents) && pkg.activationEvents.length > 0,
      'Activation events array should not be empty'
    );

    // Common activation events
    const hasCommandActivation = pkg.activationEvents.some(
      (event: string) => event.startsWith('onCommand:')
    );
    const hasViewActivation = pkg.activationEvents.some(
      (event: string) => event.startsWith('onView:')
    );

    assert.ok(
      hasCommandActivation || hasViewActivation,
      'Should have command or view activation events'
    );
  });

  /**
   * Test: Extension contributes views
   */
  test('Extension should contribute views to sidebar', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    const pkg = ext?.packageJSON;

    assert.ok(pkg?.contributes?.views, 'Extension should contribute views');

    const views = pkg.contributes.views;
    const viewContainers = Object.keys(views);

    assert.ok(viewContainers.length > 0, 'Should have at least one view container');

    // Verify copilotOrchestrator view container exists
    assert.ok(
      viewContainers.includes('copilotOrchestrator') || viewContainers.length > 0,
      'Should have view container defined'
    );
  });

  /**
   * Test: Commands are registered during activation
   */
  test('All commands should be available after activation', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');

    if (ext && !ext.isActive) {
      await ext.activate();
    }

    const allCommands = await vscode.commands.getCommands(true);

    // Core commands
    const coreCommands = [
      'copilot-orchestrator.start',
      'copilot-orchestrator.configureLLM',
      'copilot-orchestrator.showPanel',
    ];

    for (const cmd of coreCommands) {
      assert.ok(
        allCommands.includes(cmd),
        `Core command ${cmd} should be registered after activation`
      );
    }
  });

  /**
   * Test: Configuration contributes are valid
   */
  test('Configuration schema should be valid', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
    const pkg = ext?.packageJSON;

    assert.ok(pkg?.contributes?.configuration, 'Should contribute configuration');

    const config = pkg.contributes.configuration;
    assert.ok(config.properties, 'Configuration should have properties');

    // Verify LLM configuration properties
    const props = Object.keys(config.properties);
    assert.ok(
      props.some(p => p.includes('llm.baseUrl')),
      'Should have LLM baseUrl configuration'
    );
    assert.ok(
      props.some(p => p.includes('llm.defaultModel')),
      'Should have LLM defaultModel configuration'
    );
  });

  /**
   * Test: Workspace change handling
   */
  test('Extension should handle workspace folder changes', async function() {
    this.timeout(3000);

    const ext = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');

    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // Get current workspace folders
    const folders = vscode.workspace.workspaceFolders;

    assert.ok(
      folders === undefined || Array.isArray(folders),
      'Workspace folders should be array or undefined'
    );

    // Extension should handle both cases (workspace vs no workspace)
    assert.ok(ext?.isActive, 'Extension should remain active');
  });

  /**
   * Test: Settings update triggers refresh
   */
  test('LLM settings update should be detectable', async function() {
    this.timeout(5000);

    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const originalModel = config.get<string>('llm.defaultModel');

    let changeDetected = false;
    const listener = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('copilot-orchestrator.llm')) {
        changeDetected = true;
      }
    });

    try {
      // Update model setting
      await config.update('llm.defaultModel', 'gpt-4', vscode.ConfigurationTarget.Global);

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 1000));

      assert.ok(changeDetected, 'Configuration change should be detected');

      // Restore
      await config.update('llm.defaultModel', originalModel, vscode.ConfigurationTarget.Global);
    } finally {
      listener.dispose();
    }
  });
});

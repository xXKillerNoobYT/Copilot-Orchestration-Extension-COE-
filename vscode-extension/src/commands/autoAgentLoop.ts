/**
 * Auto Agent Loop Command
 * 
 * Implements the "Enable auto agent switching" command (TASK-mjy040m5-0ggvk)
 * - Starts the continuous agent switching loop
 * - Provides UI feedback and status monitoring
 * - Allows user control (start/stop)
 */

import * as vscode from 'vscode';
import { AgentLoopService, AgentLoopStatus } from '../services/agentLoopService';

export class AutoAgentLoopCommand {
  private agentLoopService: AgentLoopService;
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;
  private loopRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(context: vscode.ExtensionContext) {
    // Get backend URL from extension settings or use default
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const backendUrl = config.get<string>('backendUrl') || 'http://localhost:8000';

    this.agentLoopService = new AgentLoopService({ baseUrl: backendUrl });
    this.outputChannel = vscode.window.createOutputChannel('Agent Loop');
    
    // Create status bar item for loop status
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      80
    );
    this.statusBarItem.text = '$(circle-outline) Agent Loop: Idle';
    this.statusBarItem.tooltip = 'Start the agent switching loop';
    this.statusBarItem.command = 'copilot-orchestrator.startAutoLoop';
    this.statusBarItem.show();

    context.subscriptions.push(this.statusBarItem);
    context.subscriptions.push(this.outputChannel);

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('copilot-orchestrator.startAutoLoop', async () => {
        await this.startAutoLoop(context);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('copilot-orchestrator.stopAutoLoop', async () => {
        await this.stopAutoLoop();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('copilot-orchestrator.autoLoopStatus', async () => {
        await this.showStatus();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('copilot-orchestrator.executeSingleCycle', async () => {
        await this.executeSingleCycle();
      })
    );

    // Monitor loop status on activation
    this.monitorLoopStatus(context);
  }

  /**
   * Start the continuous agent switching loop
   */
  private async startAutoLoop(context: vscode.ExtensionContext): Promise<void> {
    if (this.loopRunning) {
      vscode.window.showWarningMessage('Agent Loop is already running');
      return;
    }

    try {
      this.outputChannel.appendLine('[INFO] Starting agent switching loop...');
      this.updateStatusBar('$(loading~spin) Agent Loop: Starting...', false);

      // Optionally ask user for max cycles
      const maxCyclesStr = await vscode.window.showInputBox({
        prompt: 'Max cycles to execute (0 = infinite)',
        value: '0',
        validateInput: (value) => {
          const num = parseInt(value);
          if (isNaN(num) || num < 0) {
            return 'Please enter a valid number';
          }
          return null;
        },
      });

      if (maxCyclesStr === undefined) {
        this.outputChannel.appendLine('[CANCELLED] User cancelled loop startup');
        this.updateStatusBar('$(circle-outline) Agent Loop: Idle', false);
        return;
      }

      const maxCycles = parseInt(maxCyclesStr);
      const status = await this.agentLoopService.startLoop(maxCycles);

      this.loopRunning = true;
      this.outputChannel.appendLine(`[SUCCESS] Agent Loop started (max cycles: ${maxCycles})`);
      this.updateStatusBar('$(sync~spin) Agent Loop: Running', true);

      // Show informational message
      vscode.window.showInformationMessage(
        `Agent Loop started (cycles: ${maxCycles === 0 ? 'infinite' : maxCycles})`,
        'View Status',
        'Stop Loop'
      ).then((selection) => {
        if (selection === 'View Status') {
          this.showStatus();
        } else if (selection === 'Stop Loop') {
          this.stopAutoLoop();
        }
      });

      // Start polling status
      this.startPolling(context);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ERROR] Failed to start loop: ${errorMsg}`);
      this.updateStatusBar('$(error) Agent Loop: Error', false);
      vscode.window.showErrorMessage(`Failed to start agent loop: ${errorMsg}`);
    }
  }

  /**
   * Stop the continuous agent switching loop
   */
  private async stopAutoLoop(): Promise<void> {
    if (!this.loopRunning) {
      vscode.window.showWarningMessage('Agent Loop is not running');
      return;
    }

    try {
      this.outputChannel.appendLine('[INFO] Stopping agent switching loop...');
      this.updateStatusBar('$(loading~spin) Agent Loop: Stopping...', false);

      await this.agentLoopService.stopLoop();

      this.loopRunning = false;
      this.stopPolling();
      this.outputChannel.appendLine('[SUCCESS] Agent Loop stopped');
      this.updateStatusBar('$(circle-outline) Agent Loop: Idle', false);

      vscode.window.showInformationMessage('Agent Loop stopped');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ERROR] Failed to stop loop: ${errorMsg}`);
      vscode.window.showErrorMessage(`Failed to stop agent loop: ${errorMsg}`);
    }
  }

  /**
   * Show current loop status
   */
  private async showStatus(): Promise<void> {
    try {
      const status = await this.agentLoopService.getStatus();
      
      const statusText = `
Agent Loop Status:
- Running: ${status.running}
- State: ${status.state || 'unknown'}
- Current Task: ${status.current_task_id || 'none'}
- Cycles Executed: ${status.cycles_executed || 0}
- Successes: ${status.successes || 0}
- Errors: ${status.errors || 0}
- Avg Cycle Time: ${status.avg_cycle_time?.toFixed(2) || 'N/A'}s
      `;

      this.outputChannel.appendLine('[INFO] Current Status:');
      this.outputChannel.appendLine(statusText);
      
      vscode.window.showInformationMessage(
        `Agent Loop is ${status.running ? 'RUNNING' : 'IDLE'}. View details in output panel.`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ERROR] Failed to get status: ${errorMsg}`);
      vscode.window.showErrorMessage(`Failed to get loop status: ${errorMsg}`);
    }
  }

  /**
   * Execute a single agent cycle (for testing)
   */
  private async executeSingleCycle(): Promise<void> {
    try {
      this.outputChannel.appendLine('[INFO] Executing single agent cycle...');
      
      const result = await this.agentLoopService.executeCycle();
      
      const cycleInfo = `
Cycle Result:
- State: ${result.state}
- Task ID: ${result.task_id || 'none'}
- Message: ${result.message}
      `;

      this.outputChannel.appendLine('[SUCCESS] Cycle completed:');
      this.outputChannel.appendLine(cycleInfo);
      
      vscode.window.showInformationMessage(
        `Cycle completed. New state: ${result.state}`,
        'View Details'
      ).then((selection) => {
        if (selection === 'View Details') {
          this.outputChannel.show();
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ERROR] Failed to execute cycle: ${errorMsg}`);
      vscode.window.showErrorMessage(`Failed to execute cycle: ${errorMsg}`);
    }
  }

  /**
   * Start polling loop status
   */
  private startPolling(context: vscode.ExtensionContext): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const status = await this.agentLoopService.getStatus();

        // Update status bar based on loop state
        if (!status.running) {
          this.loopRunning = false;
          this.stopPolling();
          this.updateStatusBar('$(circle-outline) Agent Loop: Idle', false);
          this.outputChannel.appendLine('[INFO] Agent Loop completed');

          // Show completion notification
          const action = await vscode.window.showInformationMessage(
            'Agent Loop completed execution',
            'View Stats',
            'View Output'
          );

          if (action === 'View Stats') {
            this.showStatus();
          } else if (action === 'View Output') {
            this.outputChannel.show();
          }
          return;
        }

        // Show current task in status bar
        if (status.current_task_id) {
          this.updateStatusBar(
            `$(sync~spin) Agent Loop: ${status.current_task_id}`,
            true
          );
        }

        // Log cycle progress periodically
        const cycleCount = status.cycles_executed || 0;
        if (cycleCount % 5 === 0) {
          this.outputChannel.appendLine(
            `[PROGRESS] Cycles: ${cycleCount}, Successes: ${status.successes}, Errors: ${status.errors}`
          );
        }
      } catch (error) {
        this.outputChannel.appendLine(`[WARN] Failed to poll status: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Stop polling loop status
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Update status bar appearance
   */
  private updateStatusBar(text: string, isRunning: boolean): void {
    this.statusBarItem.text = text;
    this.statusBarItem.command = isRunning 
      ? 'copilot-orchestrator.stopAutoLoop' 
      : 'copilot-orchestrator.startAutoLoop';
    this.statusBarItem.tooltip = isRunning 
      ? 'Click to stop the agent loop' 
      : 'Click to start the agent loop';
  }

  /**
   * Monitor loop status on activation
   */
  private async monitorLoopStatus(context: vscode.ExtensionContext): Promise<void> {
    try {
      const status = await this.agentLoopService.getStatus();
      if (status.running) {
        this.loopRunning = true;
        this.updateStatusBar('$(sync~spin) Agent Loop: Running', true);
        this.startPolling(context);
      }
    } catch (error) {
      // Silent fail on startup - loop may not be running yet
    }
  }
}

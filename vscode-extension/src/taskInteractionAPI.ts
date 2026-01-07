import * as vscode from 'vscode';
import { ParsedTask } from './taskParser';
import { TaskStatusParser } from './taskStatusParser';

/**
 * TaskInteractionAPI: Bridge between .task.md files and the main orchestrator workflow
 * Provides methods for executing tasks, updating status, linking resources, and managing context bundles
 */
export class TaskInteractionAPI {
  private statusParser: TaskStatusParser;
  private eventEmitter = new vscode.EventEmitter<TaskInteractionEvent>();
  public readonly onTaskInteraction = this.eventEmitter.event;

  constructor() {
    this.statusParser = new TaskStatusParser();
  }

  /**
   * Execute a task immediately through the orchestrator
   * Emits event that the main extension listens to for triggering task execution
   */
  async executeTask(taskId: string, taskUri: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(taskUri);
      const text = new TextDecoder().decode(content);
      const result = this.statusParser.parseTaskFile(taskUri.fsPath, text);

      if (!result.task) {
        vscode.window.showErrorMessage('Failed to parse task file');
        return;
      }

      const task = result.task;

      // Validate task is in executable state
      if (!this.canExecuteTask(task)) {
        vscode.window.showWarningMessage(
          `Task cannot be executed in current state: ${task.status}`
        );
        return;
      }

      // Emit execution event
      this.eventEmitter.fire({
        type: 'executeTask',
        taskId,
        taskUri,
        task,
        timestamp: new Date(),
      });

      vscode.window.showInformationMessage(`Executing task: ${task.title}`);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to execute task: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Change task status via UI picker
   */
  async changeTaskStatus(taskId: string, taskUri: vscode.Uri): Promise<void> {
    const statuses = ['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled'];

    const selected = await vscode.window.showQuickPick(statuses, {
      title: `Change task status for ${taskId}`,
      placeHolder: 'Select new status',
    });

    if (!selected) {
      return;
    }

    await this.updateTaskStatus(taskId, taskUri, selected as any);

    // Emit status change event
    this.eventEmitter.fire({
      type: 'statusChanged',
      taskId,
      taskUri,
      oldStatus: taskId,
      newStatus: selected,
      timestamp: new Date(),
    });

    vscode.window.showInformationMessage(`Task status updated to: ${selected}`);
  }

  /**
   * Update task status in the file
   */
  private async updateTaskStatus(
    taskId: string,
    taskUri: vscode.Uri,
    newStatus: string
  ): Promise<void> {
    const document = await vscode.workspace.openTextDocument(taskUri);
    const editor = await vscode.window.showTextDocument(document);

    // Find and replace status field in YAML front matter
    const text = document.getText();
    const statusRegex = /^(\s*status:\s*)[^\n]*$/m;

    const match = text.match(statusRegex);
    if (match) {
      const startPos = document.positionAt(match.index || 0);
      const endPos = new vscode.Position(startPos.line, match[0].length);
      const newText = `${match[1]}${newStatus}`;

      await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(startPos, endPos), newText);
      });

      await document.save();
    }
  }

  /**
   * Open associated context bundle
   */
  async openContextBundle(bundlePath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(bundlePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open context bundle: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a new context bundle for a task
   */
  async createContextBundle(taskId: string, taskUri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(taskUri);
      const result = this.statusParser.parseTaskFile(taskUri.fsPath, document.getText());

      if (!result.task) {
        vscode.window.showErrorMessage('Failed to parse task file');
        return;
      }

      // Ask user for context bundle name
      const bundleName = await vscode.window.showInputBox({
        title: 'Create context bundle',
        prompt: 'Enter context bundle name (or leave empty for auto-generated)',
        value: `${taskId}-context`,
      });

      if (bundleName === undefined) {
        return; // User cancelled
      }

      // Create context bundle file structure
      const contextDir = `context/${bundleName}`;
      const bundleFile = `${contextDir}/bundle.json`;

      const contextBundle = {
        id: bundleName,
        taskId,
        type: 'task_context',
        createdAt: new Date().toISOString(),
        files: [],
        notes: `Context bundle for task: ${result.task.title}`,
        version: 1,
      };

      // Create bundle file
      const uri = vscode.Uri.file(bundleFile);
      await vscode.workspace.fs.writeFile(
        uri,
        new TextEncoder().encode(JSON.stringify(contextBundle, null, 2))
      );

      vscode.window.showInformationMessage(`Context bundle created: ${bundleFile}`);

      // Emit context bundle created event
      this.eventEmitter.fire({
        type: 'contextBundleCreated',
        taskId,
        taskUri,
        bundlePath: bundleFile,
        timestamp: new Date(),
      });

      // Optionally open the newly created bundle
      const openBundle = await vscode.window.showInformationMessage(
        'Context bundle created. Open it now?',
        'Yes',
        'No'
      );

      if (openBundle === 'Yes') {
        const bundleDoc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(bundleDoc);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create context bundle: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Link task to a GitHub issue
   */
  async linkGitHubIssue(taskId: string, taskUri: vscode.Uri): Promise<void> {
    const issueUrl = await vscode.window.showInputBox({
      title: 'Link GitHub Issue',
      prompt: 'Enter GitHub issue URL or issue number',
      placeHolder: 'https://github.com/owner/repo/issues/123 or 123',
    });

    if (!issueUrl) {
      return;
    }

    const fullUrl = this.normalizeGitHubUrl(issueUrl);
    const issueNumber = this.extractIssueNumber(fullUrl);

    if (!fullUrl || !issueNumber) {
      vscode.window.showErrorMessage('Invalid GitHub issue URL or number');
      return;
    }

    await this.updateTaskFile(taskUri, (content) => {
      // Update or add github_issue_url and github_issue_id in front matter
      const yamlEndMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!yamlEndMatch) {
        return content;
      }

      const yamlContent = yamlEndMatch[1];
      let updatedYaml = yamlContent;

      // Add or update github_issue_id
      if (updatedYaml.includes('github_issue_id:')) {
        updatedYaml = updatedYaml.replace(/github_issue_id:\s*\d+/, `github_issue_id: ${issueNumber}`);
      } else {
        updatedYaml += `\ngithub_issue_id: ${issueNumber}`;
      }

      // Add or update github_issue_url
      if (updatedYaml.includes('github_issue_url:')) {
        updatedYaml = updatedYaml.replace(
          /github_issue_url:\s*.*$/m,
          `github_issue_url: ${fullUrl}`
        );
      } else {
        updatedYaml += `\ngithub_issue_url: ${fullUrl}`;
      }

      return content.replace(yamlEndMatch[0], `---\n${updatedYaml}\n---`);
    });

    vscode.window.showInformationMessage(`Task linked to GitHub issue #${issueNumber}`);

    this.eventEmitter.fire({
      type: 'gitHubLinked',
      taskId,
      taskUri,
      issueUrl: fullUrl,
      issueNumber,
      timestamp: new Date(),
    });
  }

  /**
   * Open linked GitHub issue
   */
  async openGitHubIssue(issueUrl: string): Promise<void> {
    if (!issueUrl) {
      vscode.window.showWarningMessage('No GitHub issue linked to this task');
      return;
    }

    vscode.env.openExternal(vscode.Uri.parse(issueUrl));
  }

  /**
   * Show task metadata in a quick pick or info message
   */
  async showTaskMetadata(task: ParsedTask): Promise<void> {
    const metadataText = `
Task: ${task.title}
ID: ${task.id}
Type: ${task.type || 'N/A'}
Priority: ${task.priority || 'N/A'}
Status: ${task.status || 'N/A'}
Estimate: ${task.estimate || 'N/A'}
Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}
${task.github_issue_id ? `GitHub Issue: #${task.github_issue_id}` : ''}
${task.context_bundle ? `Context Bundle: ${task.context_bundle}` : ''}
    `.trim();

    vscode.window.showInformationMessage(metadataText, { modal: false });
  }

  /**
   * Manage task dependencies
   */
  async manageDependencies(taskId: string, taskUri: vscode.Uri, dependencies: string[]): Promise<void> {
    const items = dependencies.map((dep) => ({
      label: dep,
      description: 'Click to remove',
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: `Manage dependencies for ${taskId}`,
      placeHolder: 'Select a dependency to remove (or Escape to cancel)',
    });

    if (!selected) {
      return;
    }

    const updatedDeps = dependencies.filter((dep) => dep !== selected.label);

    await this.updateTaskDependencies(taskUri, updatedDeps);

    vscode.window.showInformationMessage(`Removed dependency: ${selected.label}`);

    this.eventEmitter.fire({
      type: 'dependenciesChanged',
      taskId,
      taskUri,
      dependencies: updatedDeps,
      timestamp: new Date(),
    });
  }

  /**
   * Update task dependencies in the file
   */
  private async updateTaskDependencies(taskUri: vscode.Uri, dependencies: string[]): Promise<void> {
    await this.updateTaskFile(taskUri, (content) => {
      const depList = dependencies.length > 0
        ? `[${dependencies.map((d) => `"${d}"`).join(', ')}]`
        : '[]';

      const depsRegex = /^(\s*dependencies:\s*)(\[[\s\S]*?\]|\[\])/m;
      return content.replace(depsRegex, `$1${depList}`);
    });
  }

  /**
   * Generic task file update helper
   */
  private async updateTaskFile(
    taskUri: vscode.Uri,
    updateFn: (content: string) => string
  ): Promise<void> {
    const document = await vscode.workspace.openTextDocument(taskUri);
    const editor = await vscode.window.showTextDocument(document);

    const fullText = document.getText();
    const updatedText = updateFn(fullText);

    if (updatedText !== fullText) {
      const start = new vscode.Position(0, 0);
      const end = document.lineAt(document.lineCount - 1).range.end;

      await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(start, end), updatedText);
      });

      await document.save();
    }
  }

  /**
   * Check if task can be executed
   */
  private canExecuteTask(task: ParsedTask): boolean {
    const executableStates = ['pending', 'approved', 'blocked'];
    return executableStates.includes(task.status || 'pending');
  }

  /**
   * Normalize GitHub URL
   */
  private normalizeGitHubUrl(input: string): string {
    // If just a number, construct full URL (would need repo context)
    if (/^\d+$/.test(input.trim())) {
      // This is simplified; in production, you'd get repo from workspace config
      return `https://github.com/unknown/repo/issues/${input}`;
    }

    // If already a URL, validate it
    if (input.includes('github.com')) {
      return input;
    }

    return '';
  }

  /**
   * Extract issue number from URL
   */
  private extractIssueNumber(url: string): string | null {
    const match = url.match(/\/issues\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Dispose of event emitter
   */
  dispose(): void {
    this.eventEmitter.dispose();
  }
}

/**
 * Event types emitted by TaskInteractionAPI
 */
export interface TaskInteractionEvent {
  type:
    | 'executeTask'
    | 'statusChanged'
    | 'contextBundleCreated'
    | 'gitHubLinked'
    | 'dependenciesChanged';
  taskId: string;
  taskUri: vscode.Uri;
  task?: ParsedTask;
  oldStatus?: string;
  newStatus?: string;
  bundlePath?: string;
  issueUrl?: string;
  issueNumber?: string | number;
  dependencies?: string[];
  timestamp: Date;
}

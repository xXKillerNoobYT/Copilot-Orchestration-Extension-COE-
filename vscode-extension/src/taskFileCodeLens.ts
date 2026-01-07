import * as vscode from 'vscode';
import { ParsedTask } from './taskParser';
import { TaskStatusParser } from './taskStatusParser';

/**
 * CodeLensProvider for .task.md files
 * Provides interactive CodeLens actions for task operations:
 * - Execute Now: Trigger task execution via the orchestrator
 * - Open Context: Load associated context bundle
 * - View Status: Display inline task status and metadata
 * - Link GitHub: Associate with GitHub issue (if not linked)
 */
export class TaskFileCodeLensProvider implements vscode.CodeLensProvider {
  private codeLensPattern: vscode.DocumentSelector = { scheme: 'file', language: 'markdown' };
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private statusParser: TaskStatusParser;
  private taskCache: Map<string, ParsedTask> = new Map();

  constructor() {
    this.statusParser = new TaskStatusParser();
  }

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    // Only provide CodeLens for .task.md files
    if (!document.uri.fsPath.endsWith('.task.md')) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    try {
      // Parse the task file
      const parsed = this.statusParser.parseTaskFile(document.uri.fsPath, text);
      if (!parsed || !parsed.task) {
        return [];
      }

      const task = parsed.task;
      this.taskCache.set(document.uri.fsPath, task);

      // Create CodeLens at line 0 (YAML front matter start)
      const range = new vscode.Range(0, 0, 0, 10);

      // CodeLens 1: Execute Now
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: `$(play) Execute Now`,
          tooltip: `Execute task: ${task.title}`,
          command: 'copilot-orchestrator.executeTask',
          arguments: [document.uri, task.id],
        })
      );

      // CodeLens 2: View/Edit Status
      const statusEmoji = this.getStatusEmoji(task.status);
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: `${statusEmoji} Status: ${task.status || 'pending'}`,
          tooltip: `View and update task status`,
          command: 'copilot-orchestrator.changeTaskStatus',
          arguments: [document.uri, task.id, task.status],
        })
      );

      // CodeLens 3: Open Context Bundle
      if (task.context_bundle) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `$(file-symlink-file) Open Context`,
            tooltip: `Open associated context bundle: ${task.context_bundle}`,
            command: 'copilot-orchestrator.openContextBundle',
            arguments: [task.context_bundle],
          })
        );
      } else {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `$(file-symlink-file) Create Context`,
            tooltip: `Create a context bundle for this task`,
            command: 'copilot-orchestrator.createContextBundle',
            arguments: [document.uri, task.id],
          })
        );
      }

      // CodeLens 4: Link GitHub Issue (if not linked)
      if (!task.github_issue_id && !task.github_issue_url) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `$(github) Link GitHub`,
            tooltip: `Associate this task with a GitHub issue`,
            command: 'copilot-orchestrator.linkGitHubIssue',
            arguments: [document.uri, task.id],
          })
        );
      } else {
        const issueNum = task.github_issue_id || extractIssueNumber(task.github_issue_url || '');
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `$(github) Issue #${issueNum}`,
            tooltip: `Open GitHub issue ${issueNum}`,
            command: 'copilot-orchestrator.openGitHubIssue',
            arguments: [task.github_issue_url],
          })
        );
      }

      // CodeLens 5: Show Metadata (priorities, dependencies)
      const metadataText = this.buildMetadataText(task);
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: metadataText,
          tooltip: `Task metadata and details`,
          command: 'copilot-orchestrator.showTaskMetadata',
          arguments: [task],
        })
      );

      // If task has dependencies, add a CodeLens for managing them
      if (task.dependencies && task.dependencies.length > 0) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `$(link) Dependencies (${task.dependencies.length})`,
            tooltip: `View and manage task dependencies`,
            command: 'copilot-orchestrator.manageDependencies',
            arguments: [document.uri, task.id, task.dependencies],
          })
        );
      }

      return codeLenses;
    } catch (error) {
      console.error(`Error parsing task file ${document.uri.fsPath}:`, error);
      return [];
    }
  }

  resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  private getStatusEmoji(status?: string): string {
    switch (status) {
      case 'pending':
        return '$(clock)';
      case 'approved':
        return '$(check)';
      case 'in_progress':
        return '$(sync~spin)';
      case 'testing':
        return '$(beaker)';
      case 'review':
        return '$(comment-discussion)';
      case 'completed':
        return '$(pass)';
      case 'failed':
        return '$(error)';
      case 'blocked':
        return '$(stop)';
      case 'cancelled':
        return '$(x)';
      default:
        return '$(question)';
    }
  }

  private buildMetadataText(task: ParsedTask): string {
    const parts: string[] = [];

    if (task.type) {
      parts.push(`Type: ${task.type}`);
    }
    if (task.priority) {
      parts.push(`Priority: ${task.priority}`);
    }
    if (task.estimate) {
      parts.push(`Est: ${task.estimate}`);
    }

    return parts.length > 0 ? `$(info) ${parts.join(' • ')}` : '$(info) Task';
  }
}

function extractIssueNumber(url: string): string {
  const match = url.match(/\/issues\/(\d+)/);
  return match ? match[1] : '';
}

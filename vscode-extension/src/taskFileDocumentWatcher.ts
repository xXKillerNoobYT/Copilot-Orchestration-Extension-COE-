import * as vscode from 'vscode';
import { TaskFileCodeLensProvider } from './taskFileCodeLens';
import { TaskStatusParser } from './taskStatusParser';
import { ParsedTask } from './taskParser';

/**
 * TaskFileDocumentWatcher: Monitors .task.md files for changes
 * Provides real-time metadata updates, decorations, and status tracking
 */
export class TaskFileDocumentWatcher {
  private statusParser: TaskStatusParser;
  private codeLensProvider: TaskFileCodeLensProvider;
  private decorationType: vscode.TextEditorDecorationType;
  private statusBarItem: vscode.StatusBarItem;
  private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private activeTaskMetadata: Map<string, ParsedTask> = new Map();

  constructor(codeLensProvider: TaskFileCodeLensProvider) {
    this.statusParser = new TaskStatusParser();
    this.codeLensProvider = codeLensProvider;

    // Create decoration type for status inline display
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('editor.background'),
      color: new vscode.ThemeColor('editor.foreground'),
      before: {
        margin: '0 10px 0 0',
        textDecoration: 'underline dotted',
      },
    });

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }

  /**
   * Start watching .task.md files in the workspace
   */
  startWatching(): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Watch for changes to .task.md files
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.task.md');

    watcher.onDidCreate(
      (uri) => this.onTaskFileCreated(uri),
      null,
      disposables
    );

    watcher.onDidChange(
      (uri) => this.onTaskFileChanged(uri),
      null,
      disposables
    );

    watcher.onDidDelete(
      (uri) => this.onTaskFileDeleted(uri),
      null,
      disposables
    );

    disposables.push(watcher);

    // Watch active editor changes
    vscode.window.onDidChangeActiveTextEditor(
      (editor) => this.onEditorChanged(editor),
      null,
      disposables
    );

    // Watch document changes
    vscode.workspace.onDidChangeTextDocument(
      (e) => this.onDocumentChanged(e),
      null,
      disposables
    );

    // Initial scan for existing .task.md files
    this.scanExistingFiles();

    return disposables;
  }

  /**
   * Handle when a new .task.md file is created
   */
  private async onTaskFileCreated(uri: vscode.Uri): Promise<void> {
    vscode.window.showInformationMessage(`Task file created: ${uri.fsPath}`);
    await this.updateTaskMetadata(uri);
  }

  /**
   * Handle when a .task.md file is changed
   */
  private async onTaskFileChanged(uri: vscode.Uri): Promise<void> {
    await this.updateTaskMetadata(uri);
    this.codeLensProvider.refresh();
  }

  /**
   * Handle when a .task.md file is deleted
   */
  private onTaskFileDeleted(uri: vscode.Uri): void {
    this.activeTaskMetadata.delete(uri.fsPath);
    this.watchers.delete(uri.fsPath);
  }

  /**
   * Handle active editor changes
   */
  private async onEditorChanged(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    // Check if the opened file is a .task.md file
    if (editor.document.uri.fsPath.endsWith('.task.md')) {
      await this.updateStatusBar(editor.document);
      this.updateDecorations(editor);
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Handle document text changes
   */
  private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
    if (!event.document.uri.fsPath.endsWith('.task.md')) {
      return;
    }

    // Update decorations in real-time as user edits
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === event.document) {
      this.updateDecorations(editor);
      this.codeLensProvider.refresh();
    }
  }

  /**
   * Update task metadata from file content
   */
  private async updateTaskMetadata(uri: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(content);

      const result = this.statusParser.parseTaskFile(uri.fsPath, text);

      if (result && result.task) {
        this.activeTaskMetadata.set(uri.fsPath, result.task);
      }

      if (result && result.errors.length > 0) {
        vscode.window.showWarningMessage(
          `Task file parsing warnings: ${result.errors.join('; ')}`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to parse task file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update status bar with task metadata
   */
  private async updateStatusBar(document: vscode.TextDocument): Promise<void> {
    const taskData = this.activeTaskMetadata.get(document.uri.fsPath);

    if (!taskData) {
      // Try to parse document if not cached
      const result = this.statusParser.parseTaskFile(
        document.uri.fsPath,
        document.getText()
      );
      if (result && result.task) {
        this.activeTaskMetadata.set(document.uri.fsPath, result.task);
      } else {
        this.statusBarItem.hide();
        return;
      }
    }

    const task = this.activeTaskMetadata.get(document.uri.fsPath)!;

    // Build status bar text
    const statusEmoji = this.getStatusEmoji(task.status);
    const priorityEmoji = this.getPriorityEmoji(task.priority);
    const estimateText = task.estimate ? ` • ${task.estimate}` : '';

    this.statusBarItem.text = `${statusEmoji} ${task.status || 'pending'} ${priorityEmoji} ${task.priority || 'medium'}${estimateText}`;
    this.statusBarItem.tooltip = `Task: ${task.title}\nType: ${task.type || 'unknown'}\nID: ${task.id}`;
    this.statusBarItem.show();
  }

  /**
   * Update editor decorations for inline metadata display
   */
  private updateDecorations(editor: vscode.TextEditor): void {
    const taskData = this.activeTaskMetadata.get(editor.document.uri.fsPath);

    if (!taskData) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    // Find the YAML front matter end line
    const text = editor.document.getText();
    const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);

    if (match) {
      const endLine = text.substring(0, match[0].length).split('\n').length;
      const range = new vscode.Range(
        endLine,
        0,
        endLine,
        editor.document.lineAt(endLine).text.length
      );

      const decoration = {
        range,
        renderOptions: {
          after: {
            contentText: this.statusParser.buildStatusDisplay(taskData),
            margin: '0 0 0 20px',
            color: new vscode.ThemeColor('editorCodeLens.foreground'),
            fontStyle: 'italic',
            fontSize: '0.85em',
          },
        },
      };

      editor.setDecorations(this.decorationType, [decoration]);
    }
  }

  /**
   * Scan workspace for existing .task.md files
   */
  private async scanExistingFiles(): Promise<void> {
    const files = await vscode.workspace.findFiles('**/*.task.md');

    for (const file of files) {
      await this.updateTaskMetadata(file);
    }
  }

  /**
   * Get emoji for task status
   */
  private getStatusEmoji(status?: string): string {
    const emojis: Record<string, string> = {
      pending: '⏳',
      approved: '✅',
      in_progress: '🔄',
      testing: '🧪',
      review: '💬',
      completed: '✔️',
      failed: '❌',
      blocked: '🚫',
      cancelled: '❌',
    };
    return emojis[status || ''] || '❓';
  }

  /**
   * Get emoji for task priority
   */
  private getPriorityEmoji(priority?: string): string {
    const emojis: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return emojis[priority || ''] || '⚪';
  }

  /**
   * Get metadata for a specific task file
   */
  getTaskMetadata(uri: vscode.Uri): ParsedTask | undefined {
    return this.activeTaskMetadata.get(uri.fsPath);
  }

  /**
   * Get all cached task metadata
   */
  getAllTaskMetadata(): Map<string, ParsedTask> {
    return new Map(this.activeTaskMetadata);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.decorationType.dispose();
    this.statusBarItem.dispose();
    this.watchers.forEach((watcher) => watcher.dispose());
  }
}

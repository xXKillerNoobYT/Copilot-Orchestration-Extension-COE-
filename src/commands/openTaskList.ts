/**
 * Open Task List Command
 * Provides quick access to the Zen Tasks todo list
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Open the task list file (_ZENTASKS/tasks.json or first .md file)
 */
export async function openTaskList(): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspaceRoot) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  const zenTasksDir = path.join(workspaceRoot, '_ZENTASKS');

  try {
    // Check if _ZENTASKS directory exists
    await fs.access(zenTasksDir);

    // Try to find tasks.json first
    const tasksJsonPath = path.join(zenTasksDir, 'tasks.json');
    try {
      await fs.access(tasksJsonPath);
      await openFile(tasksJsonPath);
      return;
    } catch {
      // tasks.json doesn't exist, look for first .md file
    }

    // Find first task .md file
    const files = await fs.readdir(zenTasksDir);
    const taskFiles = files.filter(f => f.endsWith('.md') && f.startsWith('TASK-'));

    if (taskFiles.length > 0) {
      const firstTaskPath = path.join(zenTasksDir, taskFiles[0]);
      await openFile(firstTaskPath);
      return;
    }

    // No task files found
    vscode.window.showInformationMessage('No task files found in _ZENTASKS folder');

  } catch (error) {
    // Check if this is an openTextDocument error - these should be thrown
    if (error instanceof Error && error.message === 'Cannot open document') {
      throw error;
    }

    // _ZENTASKS folder doesn't exist or other errors
    const action = await vscode.window.showInformationMessage(
      'Task folder not found. Create it?',
      'Create Folder',
      'Cancel'
    );

    if (action === 'Create Folder') {
      await createZenTasksFolder(workspaceRoot);
    }
  }
}

/**
 * Open a file in the editor
 */
async function openFile(filePath: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
}

/**
 * Create _ZENTASKS folder and a sample task
 */
async function createZenTasksFolder(workspaceRoot: string): Promise<void> {
  const zenTasksDir = path.join(workspaceRoot, '_ZENTASKS');
  const tasksJsonPath = path.join(zenTasksDir, 'tasks.json');

  try {
    await fs.mkdir(zenTasksDir, { recursive: true });

    // Create empty tasks.json
    const emptyTasks = {
      version: '1.0',
      tasks: [],
      metadata: {
        createdAt: new Date().toISOString(),
        description: 'Zen Tasks workflow task list',
      },
    };

    await fs.writeFile(tasksJsonPath, JSON.stringify(emptyTasks, null, 2), 'utf-8');

    vscode.window.showInformationMessage('✓ Created _ZENTASKS folder');
    await openFile(tasksJsonPath);

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create task folder: ${error}`);
  }
}

/**
 * Register the command in extension activation
 */
export function registerOpenTaskListCommand(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand(
    'copilot-orchestrator.openTaskList',
    openTaskList
  );

  context.subscriptions.push(command);
}

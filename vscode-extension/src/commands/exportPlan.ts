/**
 * Export Plan Command
 * 
 * Handles plan export with format selection and output directory selection
 * - QuickPick for format selection
 * - OpenDialog for directory selection
 * - User feedback via progress notification
 * - Integration with PlanExporter service
 */

import * as vscode from 'vscode';
import { PlanExporter, PlanData, ExportFormat } from '../planBuilder/exporters/planExporter';

const EXPORT_FORMATS: { label: string; value: ExportFormat; description: string }[] = [
  {
    label: '$(file-code) JSON',
    value: 'json',
    description: 'Complete plan data in JSON format (importable)',
  },
  {
    label: '$(markdown) Markdown README',
    value: 'markdown',
    description: 'Formatted README with sections and task lists',
  },
  {
    label: '$(file-pdf) PDF Ready (HTML)',
    value: 'pdf',
    description: 'HTML file ready for browser printing to PDF',
  },
  {
    label: '$(octoface) GitHub Issues',
    value: 'github',
    description: 'Issue templates for creating GitHub issues',
  },
  {
    label: '$(symbol-class) Mermaid - Architecture',
    value: 'mermaid-architecture',
    description: 'Architecture flow diagram in Mermaid format',
  },
  {
    label: '$(git-branch) Mermaid - Dependencies',
    value: 'mermaid-dependencies',
    description: 'Task dependency diagram in Mermaid format',
  },
  {
    label: '$(timeline) Mermaid - Timeline',
    value: 'mermaid-timeline',
    description: 'Gantt chart timeline in Mermaid format',
  },
];

/**
 * Execute plan export command
 */
export async function exportPlanCommand(): Promise<void> {
  try {
    // Get current plan data from Plan Builder panel
    const planData = await getPlanData();
    
    if (!planData) {
      vscode.window.showWarningMessage('No plan data available. Open Plan Builder first.');
      return;
    }

    // Show format selection
    const format = await showFormatPicker();
    if (!format) {
      return; // User cancelled
    }

    // Show directory selection
    const outputPath = await showDirectoryPicker();
    if (!outputPath) {
      return; // User cancelled
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Exporting plan to ${format}...`,
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ increment: 50 });
          
          const exportPath = await PlanExporter.exportPlan(
            planData,
            format,
            outputPath
          );
          
          progress.report({ increment: 50 });
          
          // Show success message with open/reveal actions
          const action = await vscode.window.showInformationMessage(
            `Plan exported successfully to:\n${exportPath}`,
            'Open File',
            'Open Folder',
            'Copy Path'
          );

          if (action === 'Open File') {
            const doc = await vscode.workspace.openTextDocument(exportPath);
            await vscode.window.showTextDocument(doc);
          } else if (action === 'Open Folder') {
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
          } else if (action === 'Copy Path') {
            await vscode.env.clipboard.writeText(exportPath);
            vscode.window.showInformationMessage('Path copied to clipboard');
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Export failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Export plan error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Show format selection QuickPick
 */
async function showFormatPicker(): Promise<ExportFormat | undefined> {
  const selected = await vscode.window.showQuickPick(
    EXPORT_FORMATS.map((fmt) => ({
      label: fmt.label,
      description: fmt.description,
      detail: fmt.value,
    })),
    {
      title: 'Select Export Format',
      placeHolder: 'Choose a format for exporting your plan',
      matchOnDescription: true,
    }
  );

  return selected?.detail as ExportFormat | undefined;
}

/**
 * Show directory selection dialog
 */
async function showDirectoryPicker(): Promise<string | undefined> {
  const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
  
  const folders = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri,
    title: 'Select Export Directory',
    openLabel: 'Export Here',
  });

  return folders?.[0]?.fsPath;
}

/**
 * Get plan data from Plan Builder panel or create sample plan
 */
async function getPlanData(): Promise<PlanData | null> {
  // Try to get from Plan Builder if available
  const { PlanBuilderPanel } = await import('../panels/planBuilderPanel.js').catch(() => ({ PlanBuilderPanel: null }));
  
  if (PlanBuilderPanel && (PlanBuilderPanel as any).currentPanel) {
    try {
      // Request plan data from webview
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 5000);
        
        (PlanBuilderPanel as any).currentPanel._panel.webview.onDidReceiveMessage((message: any) => {
          if (message.type === 'planData') {
            clearTimeout(timeout);
            resolve(message.data);
          }
        });

        (PlanBuilderPanel as any).currentPanel._panel.webview.postMessage({
          type: 'getPlanData',
        });
      });
    } catch {
      // Fall through to sample plan
    }
  }

  // Return null to prompt user
  return null;
}

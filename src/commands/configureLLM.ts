import * as vscode from 'vscode';
import { SettingsPanel } from '../webviews/settingsPanel';

/**
 * Opens the LLM Settings webview panel
 */
export async function configureLlmCommand(context: vscode.ExtensionContext): Promise<void> {
  SettingsPanel.createOrShow(context.extensionUri);
}

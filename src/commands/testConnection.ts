import * as vscode from 'vscode';
import { readLlmConfig } from '../config/llmConfig';
import { createOpenAIClient, ChatMessage } from '../llm/openaiClient';

export async function testConnectionCommand(): Promise<void> {
  const configState = readLlmConfig();
  if (!configState.isConfigured) {
    void vscode.window.showErrorMessage(`LLM configuration is incomplete: ${configState.issues.join('; ')}`);
    return;
  }

  const client = createOpenAIClient(configState.config);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  status.text = '$(plug) Testing LLM…';
  status.show();

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'ping' },
      { role: 'user', content: 'ping' },
    ];
    const timeout = configState.config.timeoutMs || 5000;
    await client.sendChat(messages, { temperature: 0, timeoutMs: Math.min(5000, timeout) });
    status.text = '$(check) LLM OK';
    void vscode.window.showInformationMessage('LLM connection successful.');
  } catch (error) {
    status.text = '$(error) LLM Failed';
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`LLM connection failed: ${message}`);
  } finally {
    setTimeout(() => status.dispose(), 2000);
  }
}
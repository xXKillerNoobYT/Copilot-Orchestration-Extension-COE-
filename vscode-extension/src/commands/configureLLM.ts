import * as vscode from 'vscode';
import { readLlmConfig, isValidBaseUrl, redactSecret } from '../config/llmConfig';

async function promptString(options: vscode.InputBoxOptions): Promise<string | undefined> {
  const value = await vscode.window.showInputBox(options);
  return value?.trim();
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTaskRoots(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export async function configureLlmCommand(): Promise<void> {
  const configuration = vscode.workspace.getConfiguration();
  const current = readLlmConfig({ configuration }).config;

  const baseUrl = await promptString({
    prompt: 'LLM base URL (OpenAI-compatible)',
    placeHolder: 'http://localhost:1234/v1',
    value: current.baseUrl,
    ignoreFocusOut: true,
  });
  if (baseUrl === undefined) return;

  if (!isValidBaseUrl(baseUrl)) {
    void vscode.window.showErrorMessage('Invalid base URL. Must start with http or https.');
    return;
  }

  const apiKey = await promptString({
    prompt: 'API key (leave empty for LM Studio)',
    value: current.apiKey ? redactSecret(current.apiKey) : '',
    password: true,
    ignoreFocusOut: true,
  });
  if (apiKey === undefined) return;

  const defaultModel = await promptString({
    prompt: 'Default model (e.g., gpt-4.1 or lm-studio model name)',
    value: current.defaultModel,
    ignoreFocusOut: true,
  });
  if (defaultModel === undefined || defaultModel.length === 0) {
    void vscode.window.showErrorMessage('Model name cannot be empty.');
    return;
  }

  const temperatureInput = await promptString({
    prompt: 'Temperature (0-2)',
    value: String(current.temperature),
    ignoreFocusOut: true,
  });
  if (temperatureInput === undefined) return;
  const temperature = toNumber(temperatureInput);
  if (temperature === undefined || temperature < 0 || temperature > 2) {
    void vscode.window.showErrorMessage('Temperature must be between 0 and 2.');
    return;
  }

  const timeoutInput = await promptString({
    prompt: 'Timeout in milliseconds (1000-120000)',
    value: String(current.timeoutMs),
    ignoreFocusOut: true,
  });
  if (timeoutInput === undefined) return;
  const timeoutMs = toNumber(timeoutInput);
  if (timeoutMs === undefined || timeoutMs < 1000 || timeoutMs > 120000) {
    void vscode.window.showErrorMessage('Timeout must be between 1000 and 120000 ms.');
    return;
  }

  const taskRootsInput = await promptString({
    prompt: 'Task roots (comma-separated, relative to workspace)',
    value: current.taskRoots.join(', '),
    ignoreFocusOut: true,
  });
  if (taskRootsInput === undefined) return;
  const taskRoots = parseTaskRoots(taskRootsInput);
  if (!taskRoots || taskRoots.length === 0) {
    void vscode.window.showErrorMessage('At least one task root is required.');
    return;
  }

  await configuration.update('copilot-orchestrator.llm.baseUrl', baseUrl, vscode.ConfigurationTarget.Workspace);
  await configuration.update('copilot-orchestrator.llm.apiKey', apiKey, vscode.ConfigurationTarget.Global);
  await configuration.update('copilot-orchestrator.llm.defaultModel', defaultModel, vscode.ConfigurationTarget.Workspace);
  await configuration.update('copilot-orchestrator.llm.temperature', temperature, vscode.ConfigurationTarget.Workspace);
  await configuration.update('copilot-orchestrator.llm.timeoutMs', timeoutMs, vscode.ConfigurationTarget.Workspace);
  await configuration.update('copilot-orchestrator.taskRoots', taskRoots, vscode.ConfigurationTarget.Workspace);

  void vscode.window.showInformationMessage('LLM settings saved.');
}
import type * as vscodeType from 'vscode';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  temperature: number;
  timeoutMs: number;
  taskRoots: string[];
}

export interface LlmConfigState {
  config: LlmConfig;
  issues: string[];
  isConfigured: boolean;
}

interface ConfigLike {
  get<T>(section: string, defaultValue?: T): T | undefined;
}

const DEFAULTS: LlmConfig = {
  baseUrl: 'http://localhost:1234/v1',
  apiKey: '',
  defaultModel: 'gpt-4.1',
  temperature: 0.7,
  timeoutMs: 30000,
  taskRoots: ['_ZENTASKS'],
};

let vscode: typeof vscodeType | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  vscode = require('vscode');
} catch {
  vscode = undefined;
}

export function readLlmConfig(options?: { configuration?: ConfigLike }): LlmConfigState {
  const configuration = options?.configuration ?? vscode?.workspace.getConfiguration();

  const baseUrl = configuration?.get<string>('copilot-orchestrator.llm.baseUrl', DEFAULTS.baseUrl) ?? DEFAULTS.baseUrl;
  const apiKey = configuration?.get<string>('copilot-orchestrator.llm.apiKey', DEFAULTS.apiKey) ?? DEFAULTS.apiKey;
  const defaultModel = configuration?.get<string>('copilot-orchestrator.llm.defaultModel', DEFAULTS.defaultModel) ?? DEFAULTS.defaultModel;
  const temperatureRaw = configuration?.get<number>('copilot-orchestrator.llm.temperature', DEFAULTS.temperature);
  const timeoutRaw = configuration?.get<number>('copilot-orchestrator.llm.timeoutMs', DEFAULTS.timeoutMs);
  const taskRootsRaw = configuration?.get<string[]>('copilot-orchestrator.taskRoots', DEFAULTS.taskRoots);

  const issues: string[] = [];

  const baseUrlTrimmed = baseUrl.trim();
  if (!isValidBaseUrl(baseUrlTrimmed)) {
    issues.push('Invalid LLM baseUrl: must start with http or https');
  }

  const normalizedTemperature = normalizeTemperature(temperatureRaw, issues);
  const normalizedTimeout = normalizeTimeout(timeoutRaw, issues);
  const normalizedTaskRoots = normalizeTaskRoots(taskRootsRaw);

  if (!defaultModel || defaultModel.trim().length === 0) {
    issues.push('Missing default model');
  }

  const config: LlmConfig = {
    baseUrl: baseUrlTrimmed,
    apiKey: apiKey ?? '',
    defaultModel: defaultModel ?? DEFAULTS.defaultModel,
    temperature: normalizedTemperature,
    timeoutMs: normalizedTimeout,
    taskRoots: normalizedTaskRoots,
  };

  const isConfigured = issues.length === 0;

  return { config, issues, isConfigured };
}

export function isValidBaseUrl(value: string): boolean {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function redactSecret(secret: string | undefined, visible: number = 4): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length === 0) return '';
  const keep = Math.max(0, visible);
  if (trimmed.length <= keep) {
    return '*'.repeat(trimmed.length);
  }
  return `${trimmed.slice(0, keep)}***`;
}

function normalizeTemperature(value: number | undefined, issues: string[]): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULTS.temperature;
  }
  if (value < 0 || value > 2) {
    issues.push('Temperature must be between 0 and 2');
  }
  return Math.min(2, Math.max(0, value));
}

function normalizeTimeout(value: number | undefined, issues: string[]): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULTS.timeoutMs;
  }
  if (value < 1000 || value > 120000) {
    issues.push('Timeout must be between 1000 and 120000 ms');
  }
  return Math.min(120000, Math.max(1000, value));
}

function normalizeTaskRoots(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULTS.taskRoots];
  }
  const cleaned = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned : [...DEFAULTS.taskRoots];
}
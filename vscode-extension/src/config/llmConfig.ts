import type * as vscodeType from 'vscode';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  customModel: string;
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
  defaultModel: 'gpt-4o',
  customModel: 'llama2',
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

  // Check for environment variable override first
  const envBaseUrl = process.env.COPILOT_LLM_BASE_URL;
  const configBaseUrl = configuration?.get<string>('copilot-orchestrator.llm.baseUrl', DEFAULTS.baseUrl) ?? DEFAULTS.baseUrl;
  const baseUrl = envBaseUrl !== undefined && envBaseUrl !== null ? envBaseUrl : configBaseUrl;

  const apiKey = configuration?.get<string>('copilot-orchestrator.llm.apiKey', DEFAULTS.apiKey) ?? DEFAULTS.apiKey;
  const defaultModel = configuration?.get<string>('copilot-orchestrator.llm.defaultModel', DEFAULTS.defaultModel) ?? DEFAULTS.defaultModel;
  const customModel = configuration?.get<string>('copilot-orchestrator.llm.customModel', DEFAULTS.customModel) ?? DEFAULTS.customModel;
  const temperatureRaw = configuration?.get<number>('copilot-orchestrator.llm.temperature', DEFAULTS.temperature);
  const timeoutRaw = configuration?.get<number>('copilot-orchestrator.llm.timeoutMs', DEFAULTS.timeoutMs);
  const taskRootsRaw = configuration?.get<string[]>('copilot-orchestrator.taskRoots', DEFAULTS.taskRoots);

  const issues: string[] = [];

  const baseUrlTrimmed = baseUrl.trim();
  if (!isValidBaseUrl(baseUrlTrimmed)) {
    issues.push('Invalid LLM baseUrl: must start with http or https');
  }

  // Warn about APIPA addresses (169.254.x.x)
  if (isApipaAddress(baseUrlTrimmed)) {
    issues.push('Warning: APIPA address (169.254.x.x) detected. This may indicate network configuration issues.');
  }

  const normalizedTemperature = normalizeTemperature(temperatureRaw, issues);
  const normalizedTimeout = normalizeTimeout(timeoutRaw, issues);
  const normalizedTaskRoots = normalizeTaskRoots(taskRootsRaw);

  if (!defaultModel || defaultModel.trim().length === 0) {
    issues.push('Missing default model');
  }

  // Validate customModel if defaultModel is 'custom'
  if (defaultModel === 'custom' && (!customModel || customModel.trim().length === 0)) {
    issues.push('Custom model name is required when defaultModel is set to "custom"');
  }

  const config: LlmConfig = {
    baseUrl: baseUrlTrimmed,
    apiKey: apiKey ?? '',
    defaultModel: defaultModel ?? DEFAULTS.defaultModel,
    customModel: customModel ?? DEFAULTS.customModel,
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

/**
 * Check if URL contains an APIPA (Automatic Private IP Addressing) address (169.254.x.x)
 * These addresses indicate network configuration issues
 */
function isApipaAddress(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Check for APIPA address range 169.254.0.0/16
    const apipaPattern =
      /^169\.254\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return apipaPattern.test(hostname);
  } catch {
    return false;
  }
}
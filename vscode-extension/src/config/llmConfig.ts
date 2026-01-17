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
    issues.push('Network IP is APIPA (169.254.x.x) indicating DHCP failure. Please configure a static IP address or restart DHCP service.');
  }

  // Warn about HTTPS on local addresses
  const protocolWarning = validateProtocol(baseUrlTrimmed);
  if (protocolWarning) {
    issues.push(protocolWarning);
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

/**
 * Check if hostname is a local address (localhost, 127.0.0.1, or private IP ranges)
 */
export function isLocalHost(hostname: string): boolean {
  if (!hostname) return false;
  
  const lower = hostname.toLowerCase();
  
  // Check for localhost variants
  if (lower === 'localhost' || lower === 'localhost.localdomain') {
    return true;
  }
  
  // Check for 127.x.x.x (loopback)
  if (/^127\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
    return true;
  }
  
  // Check for ::1 (IPv6 loopback)
  if (hostname === '::1' || hostname === '[::1]') {
    return true;
  }
  
  // Check for private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (/^192\.168\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
    return true;
  }
  
  if (/^10\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
    return true;
  }
  
  if (/^172\.(?:1[6-9]|2[0-9]|3[0-1])\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) {
    return true;
  }
  
  return false;
}

/**
 * Validate protocol choice for the given URL
 * Returns a warning message if HTTPS is used with local addresses
 */
export function validateProtocol(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const protocol = urlObj.protocol;
    
    // Warn if using HTTPS with local addresses
    if (protocol === 'https:' && isLocalHost(hostname)) {
      return 'Local LLM servers (LM Studio, Ollama) typically use HTTP, not HTTPS. If you see connection errors, try changing the protocol to http://. For production use with HTTPS, set up a reverse proxy (nginx, caddy) with TLS certificates.';
    }
    
    return null;
  } catch {
    return null;
  }
}
/**
 * Tests for LLM Configuration
 * Validates environment variable override and APIPA detection
 */

import { readLlmConfig, isValidBaseUrl } from './llmConfig';

interface MockConfiguration {
  get<T>(section: string, defaultValue?: T): T | undefined;
}

function createMockConfig(values: Record<string, any>): MockConfiguration {
  return {
    get<T>(section: string, defaultValue?: T): T | undefined {
      const key = section.replace('copilot-orchestrator.', '');
      return (values[key] !== undefined ? values[key] : defaultValue) as T | undefined;
    },
  };
}

describe('LLM Configuration', () => {
  // Save and restore environment variable
  const originalEnv = process.env.COPILOT_LLM_BASE_URL;

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.COPILOT_LLM_BASE_URL = originalEnv;
    } else {
      delete process.env.COPILOT_LLM_BASE_URL;
    }
  });

  test('should use localhost as default baseUrl', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({}),
    });

    expect(config.config.baseUrl).toBe('http://localhost:1234/v1');
  });

  test('should allow environment variable override', () => {
    process.env.COPILOT_LLM_BASE_URL = 'http://remote-server:8080/v1';

    const config = readLlmConfig({
      configuration: createMockConfig({}),
    });

    expect(config.config.baseUrl).toBe('http://remote-server:8080/v1');
  });

  test('environment variable should take precedence over config', () => {
    process.env.COPILOT_LLM_BASE_URL = 'http://env-server:9000/v1';

    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://config-server:7000/v1',
      }),
    });

    expect(config.config.baseUrl).toBe('http://env-server:9000/v1');
  });

  test('should detect APIPA addresses (169.254.x.x)', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.254.100.50:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(true);
  });

  test('should not flag non-APIPA addresses', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://localhost:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(false);
  });

  describe('URL validation', () => {
    test('should validate http URLs', () => {
      expect(isValidBaseUrl('http://localhost:1234/v1')).toBe(true);
    });

    test('should validate https URLs', () => {
      expect(isValidBaseUrl('https://api.openai.com/v1')).toBe(true);
    });

    test('should validate IP addresses', () => {
      expect(isValidBaseUrl('http://192.168.1.100:8080/v1')).toBe(true);
    });

    test('should reject ftp URLs', () => {
      expect(isValidBaseUrl('ftp://server.com')).toBe(false);
    });

    test('should reject invalid strings', () => {
      expect(isValidBaseUrl('not-a-url')).toBe(false);
    });

    test('should reject empty strings', () => {
      expect(isValidBaseUrl('')).toBe(false);
    });
  });
});


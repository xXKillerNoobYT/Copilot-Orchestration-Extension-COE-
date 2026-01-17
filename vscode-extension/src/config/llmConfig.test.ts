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

  test('should allow empty string environment variable to override config', () => {
    process.env.COPILOT_LLM_BASE_URL = '';

    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://config-server:7000/v1',
      }),
    });

    expect(config.config.baseUrl).toBe('');
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

  test('should provide actionable error message for APIPA addresses', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.254.100.50:1234/v1',
      }),
    });

    const apipaIssue = config.issues.find((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(apipaIssue).toBeDefined();
    expect(apipaIssue).toContain('DHCP failure');
    expect(apipaIssue).toContain('static IP');
  });

  test('should detect APIPA address at lower boundary (169.254.0.0)', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.254.0.0:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(true);
  });

  test('should detect APIPA address at upper boundary (169.254.255.255)', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.254.255.255:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(true);
  });

  test('should not detect invalid APIPA-like addresses (169.255.x.x)', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.255.100.50:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(false);
  });

  test('should not detect invalid APIPA-like addresses (168.254.x.x)', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://168.254.100.50:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(false);
  });

  test('should not detect addresses with invalid octets > 255', () => {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.254.999.999:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    expect(hasApipaWarning).toBe(false);
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

  describe('Protocol validation', () => {
    test('should warn when HTTPS is used with localhost', () => {
      const config = readLlmConfig({
        configuration: createMockConfig({
          'llm.baseUrl': 'https://localhost:1234/v1',
        }),
      });

      const hasProtocolWarning = config.issues.some((issue) =>
        issue.toLowerCase().includes('local llm servers')
      );

      expect(hasProtocolWarning).toBe(true);
      expect(config.issues.some(issue => issue.includes('reverse proxy'))).toBe(true);
    });

    test('should warn when HTTPS is used with 127.0.0.1', () => {
      const config = readLlmConfig({
        configuration: createMockConfig({
          'llm.baseUrl': 'https://127.0.0.1:1234/v1',
        }),
      });

      const hasProtocolWarning = config.issues.some((issue) =>
        issue.toLowerCase().includes('local llm servers')
      );

      expect(hasProtocolWarning).toBe(true);
    });

    test('should warn when HTTPS is used with private IP (192.168.x.x)', () => {
      const config = readLlmConfig({
        configuration: createMockConfig({
          'llm.baseUrl': 'https://192.168.1.100:1234/v1',
        }),
      });

      const hasProtocolWarning = config.issues.some((issue) =>
        issue.toLowerCase().includes('local llm servers')
      );

      expect(hasProtocolWarning).toBe(true);
    });

    test('should not warn when HTTP is used with localhost', () => {
      const config = readLlmConfig({
        configuration: createMockConfig({
          'llm.baseUrl': 'http://localhost:1234/v1',
        }),
      });

      const hasProtocolWarning = config.issues.some((issue) =>
        issue.toLowerCase().includes('local llm servers')
      );

      expect(hasProtocolWarning).toBe(false);
    });

    test('should not warn when HTTPS is used with public domain', () => {
      const config = readLlmConfig({
        configuration: createMockConfig({
          'llm.baseUrl': 'https://api.openai.com/v1',
        }),
      });

      const hasProtocolWarning = config.issues.some((issue) =>
        issue.toLowerCase().includes('local llm servers')
      );

      expect(hasProtocolWarning).toBe(false);
    });

    test('should provide actionable guidance for HTTPS on localhost', () => {
      const config = readLlmConfig({
        configuration: createMockConfig({
          'llm.baseUrl': 'https://localhost:1234/v1',
        }),
      });

      const protocolIssue = config.issues.find((issue) =>
        issue.toLowerCase().includes('local llm servers')
      );

      expect(protocolIssue).toBeDefined();
      expect(protocolIssue).toContain('HTTP');
      expect(protocolIssue).toContain('reverse proxy');
      expect(protocolIssue).toContain('TLS certificates');
    });
  });
});


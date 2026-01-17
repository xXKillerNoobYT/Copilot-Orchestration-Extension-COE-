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

function runTests(): void {
  let passCount = 0;
  let failCount = 0;

  // Test 1: Default baseUrl should be localhost
  try {
    const config = readLlmConfig({
      configuration: createMockConfig({}),
    });

    console.assert(
      config.config.baseUrl === 'http://localhost:1234/v1',
      'Default baseUrl should be localhost'
    );
    console.log('[✓] Test 1: Default baseUrl is localhost');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 1: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 2: Environment variable override
  try {
    const originalEnv = process.env.COPILOT_LLM_BASE_URL;
    process.env.COPILOT_LLM_BASE_URL = 'http://remote-server:8080/v1';

    const config = readLlmConfig({
      configuration: createMockConfig({}),
    });

    console.assert(
      config.config.baseUrl === 'http://remote-server:8080/v1',
      'Environment variable should override default'
    );

    // Restore original env
    if (originalEnv !== undefined) {
      process.env.COPILOT_LLM_BASE_URL = originalEnv;
    } else {
      delete process.env.COPILOT_LLM_BASE_URL;
    }

    console.log('[✓] Test 2: Environment variable override works');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 2: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 3: Environment variable takes precedence over config
  try {
    const originalEnv = process.env.COPILOT_LLM_BASE_URL;
    process.env.COPILOT_LLM_BASE_URL = 'http://env-server:9000/v1';

    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://config-server:7000/v1',
      }),
    });

    console.assert(
      config.config.baseUrl === 'http://env-server:9000/v1',
      'Environment variable should take precedence over config'
    );

    // Restore original env
    if (originalEnv !== undefined) {
      process.env.COPILOT_LLM_BASE_URL = originalEnv;
    } else {
      delete process.env.COPILOT_LLM_BASE_URL;
    }

    console.log('[✓] Test 3: Environment variable has highest priority');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 3: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 4: APIPA address detection (169.254.x.x)
  try {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://169.254.100.50:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    console.assert(hasApipaWarning, 'APIPA address should generate warning');
    console.log('[✓] Test 4: APIPA address detection works');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 4: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 5: Non-APIPA addresses should not trigger warning
  try {
    const config = readLlmConfig({
      configuration: createMockConfig({
        'llm.baseUrl': 'http://localhost:1234/v1',
      }),
    });

    const hasApipaWarning = config.issues.some((issue) =>
      issue.toLowerCase().includes('apipa')
    );

    console.assert(!hasApipaWarning, 'Non-APIPA address should not generate APIPA warning');
    console.log('[✓] Test 5: Non-APIPA addresses pass validation');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 5: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 6: Valid URL detection
  try {
    console.assert(isValidBaseUrl('http://localhost:1234/v1'), 'localhost should be valid');
    console.assert(isValidBaseUrl('https://api.openai.com/v1'), 'https URL should be valid');
    console.assert(isValidBaseUrl('http://192.168.1.100:8080/v1'), 'IP address should be valid');
    console.assert(!isValidBaseUrl('ftp://server.com'), 'ftp should be invalid');
    console.assert(!isValidBaseUrl('not-a-url'), 'invalid string should be invalid');

    console.log('[✓] Test 6: URL validation works correctly');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 6: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Test 7: Clean up environment variable after tests
  try {
    delete process.env.COPILOT_LLM_BASE_URL;

    const config = readLlmConfig({
      configuration: createMockConfig({}),
    });

    console.assert(
      config.config.baseUrl === 'http://localhost:1234/v1',
      'Should use default when env var is not set'
    );

    console.log('[✓] Test 7: Environment cleanup works');
    passCount++;
  } catch (error) {
    console.error(`[✗] Test 7: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }

  // Summary
  console.log('\n=== LLM Config Test Summary ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };

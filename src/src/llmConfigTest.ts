import { readLlmConfig, redactSecret, isValidBaseUrl } from './config/llmConfig';

interface FakeConfig {
  get<T>(section: string, defaultValue?: T): T | undefined;
}

function makeConfig(values: Record<string, unknown>): FakeConfig {
  return {
    get<T>(section: string, defaultValue?: T): T | undefined {
      if (values.hasOwnProperty(section)) {
        return values[section] as T;
      }
      return defaultValue;
    },
  };
}

function testDefaults() {
  const { config, issues, isConfigured } = readLlmConfig({ configuration: makeConfig({}) });
  console.assert(issues.length === 0, 'Defaults should have no issues');
  console.assert(isConfigured, 'Defaults should be considered configured');
  console.assert(config.baseUrl === 'http://localhost:1234/v1', 'Default baseUrl mismatch');
  console.assert(config.defaultModel === 'gpt-4.1', 'Default model mismatch');
  console.assert(config.temperature === 0.7, 'Default temperature mismatch');
  console.assert(config.timeoutMs === 30000, 'Default timeout mismatch');
  console.assert(config.taskRoots[0] === '_ZENTASKS', 'Default task root mismatch');
}

function testInvalidUrl() {
  const { issues, isConfigured } = readLlmConfig({ configuration: makeConfig({ 'copilot-orchestrator.llm.baseUrl': 'ftp://bad' }) });
  console.assert(issues.some((i) => i.includes('Invalid LLM baseUrl')), 'Should report invalid URL');
  console.assert(!isConfigured, 'Invalid URL should not be configured');
  console.assert(!isValidBaseUrl(''), 'Empty URL should be invalid');
}

function testTemperatureClamping() {
  const highTemp = readLlmConfig({ configuration: makeConfig({ 'copilot-orchestrator.llm.temperature': 5 }) });
  console.assert(highTemp.config.temperature === 2, 'Temperature should clamp to 2');
  console.assert(highTemp.issues.length > 0, 'Clamping should emit an issue');

  const lowTemp = readLlmConfig({ configuration: makeConfig({ 'copilot-orchestrator.llm.temperature': -1 }) });
  console.assert(lowTemp.config.temperature === 0, 'Temperature should clamp to 0');
}

function testTimeoutClamping() {
  const high = readLlmConfig({ configuration: makeConfig({ 'copilot-orchestrator.llm.timeoutMs': 999999 }) });
  console.assert(high.config.timeoutMs === 120000, 'Timeout should clamp to 120000');
  console.assert(high.issues.length > 0, 'Clamping should emit an issue');

  const low = readLlmConfig({ configuration: makeConfig({ 'copilot-orchestrator.llm.timeoutMs': 10 }) });
  console.assert(low.config.timeoutMs === 1000, 'Timeout should clamp to 1000');
}

function testRedaction() {
  console.assert(redactSecret('abcd1234') === 'abcd***', 'Redaction should keep prefix and mask rest');
  console.assert(redactSecret('') === '', 'Redaction should handle empty');
  console.assert(redactSecret(undefined) === '', 'Redaction should handle undefined');
}

function runLlmConfigTests() {
  console.log('=== LLM Config Tests ===');
  testDefaults();
  testInvalidUrl();
  testTemperatureClamping();
  testTimeoutClamping();
  testRedaction();
  console.log('=== LLM Config Tests Passed ✓ ===');
}

if (require.main === module) {
  try {
    runLlmConfigTests();
  } catch (error) {
    console.error('LLM Config Tests failed:', error);
    process.exit(1);
  }
}

export { runLlmConfigTests };
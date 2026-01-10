/**
 * Test Runner for VS Code Integration Tests
 * Uses @vscode/test-electron to run integration tests in VS Code environment
 */

import * as path from 'path';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, '../../dist/integration/index.js');
    const testWorkspace = path.resolve(__dirname, '../../test-workspace');

    // Pass test directory to the extension host via env
    process.env.INTEGRATION_TEST_DIR = path.resolve(__dirname, '../../dist/integration');

    console.log('[integration] extensionDevelopmentPath:', extensionDevelopmentPath);
    console.log('[integration] extensionTestsPath:', extensionTestsPath);
    console.log('[integration] testWorkspace:', testWorkspace);
    console.log('[integration] INTEGRATION_TEST_DIR:', process.env.INTEGRATION_TEST_DIR);

    // Download VS Code, unzip it and run the integration tests
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    // The execSync below will throw if the test failed
    const exitCode: number = await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace, '--disable-updates'],
    });

    console.log('[integration] VS Code exited with code:', exitCode);
    process.exit(exitCode);
  } catch (err) {
    console.error('Failed to run integration tests:', err);
    process.exit(1);
  }
}

main();


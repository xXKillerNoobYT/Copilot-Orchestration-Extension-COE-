const path = require('path');
const { downloadAndUnzipVSCode, runTests } = require('@vscode/test-electron');

(async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath = path.resolve(__dirname, '../dist/integration/index.js');
    const testWorkspace = path.resolve(__dirname, '../test-workspace');

    // Pass test dir through env so the extension host can discover test files
    process.env.INTEGRATION_TEST_DIR = path.resolve(__dirname, '../dist/integration');

    console.log('[integration] extensionDevelopmentPath:', extensionDevelopmentPath);
    console.log('[integration] extensionTestsPath:', extensionTestsPath);
    console.log('[integration] testWorkspace:', testWorkspace);
    console.log('[integration] INTEGRATION_TEST_DIR:', process.env.INTEGRATION_TEST_DIR);

    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    const exitCode = await runTests({
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
})();


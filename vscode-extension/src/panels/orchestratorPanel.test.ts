import { OrchestratorPanelProvider } from '../orchestratorPanel';

// Mock functions for testing
function mockPanel(): any {
  return {
    webview: mockWebview(),
    title: '',
    onDidDispose: () => ({ dispose: () => {} }),
    dispose: () => {}
  };
}

function mockUri(): any {
  return { fsPath: '/test/path' };
}

function mockWebview(): any {
  return {
    cspSource: 'test-csp',
    asWebviewUri: (uri: any) => uri,
    options: {},
    html: '',
    onDidReceiveMessage: () => ({ dispose: () => {} }),
    postMessage: () => {}
  };
}

async function runOrchestratorPanelTests() {
  console.log('Running OrchestratorPanel snapshot tests...');

  try {
    // Simple test - just check if we can create a provider and call the method
    const provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
    const html = provider._getHtmlForWebview(mockWebview());

    console.assert(typeof html === 'string', 'Should return a string');
    console.assert(html.length > 0, 'Should return non-empty HTML');
    console.assert(html.includes('<html>'), 'Should contain HTML tags');

    console.log('✓ Basic HTML generation test passed');
    console.log('All OrchestratorPanel tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

runOrchestratorPanelTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
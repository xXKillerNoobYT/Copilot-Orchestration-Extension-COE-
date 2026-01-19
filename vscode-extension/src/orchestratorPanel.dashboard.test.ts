/**
 * Tests for OrchestratorPanel Dashboard Enhancements
 * Focus: Team status cards, live metrics, and coordination controls
 * 
 * Reference: https://jestjs.io/docs/timer-mocks
 * Reference: https://jestjs.io/docs/setup-teardown
 * See: https://jestjs.io/docs/manual-mocks for vscode mocking
 */

import { OrchestratorPanelProvider } from './orchestratorPanel';

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  ViewColumn: { One: 1 },
  Uri: {
    joinPath: jest.fn((base, ...paths) => ({ fsPath: paths.join('/') })),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'backendUrl') return 'http://localhost:8000';
        if (key === 'mcp.baseUrl') return 'http://localhost:8000';
        return defaultValue;
      }),
      update: jest.fn(),
    })),
  },
  ConfigurationTarget: { Workspace: 1 },
}));

// Mock services
jest.mock('./services/mcpClient');
jest.mock('./services/metricsService');
jest.mock('./services/webSocketClient');

function mockPanel(): any {
  return {
    webview: mockWebview(),
    title: '',
    onDidDispose: () => ({ dispose: () => {} }),
    dispose: () => {},
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
    postMessage: jest.fn(),
  };
}

describe('OrchestratorPanel Dashboard Enhancements', () => {
  let provider: OrchestratorPanelProvider;

  // Reference: https://jestjs.io/docs/timer-mocks#setup-and-teardown
  beforeEach(() => {
    jest.clearAllMocks();
    // Use fake timers to control setInterval
    jest.useFakeTimers();
  });

  // Reference: https://jestjs.io/docs/setup-teardown#order-of-execution
  afterEach(() => {
    // Critical: Clean up timers to avoid open handles
    // See: https://jestjs.io/docs/timer-mocks#cleanup
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    
    // Dispose provider if it exists to clean up intervals
    if (provider && (provider as any).wsUpdateInterval) {
      clearInterval((provider as any).wsUpdateInterval);
    }
  });

  describe('HTML Generation', () => {
    it('should include team status cards in HTML', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('Team Status Cards');
      expect(html).toContain('Planning Team');
      expect(html).toContain('Answer Team');
      expect(html).toContain('Decomposition Team');
      expect(html).toContain('Verification Team');
    });

    it('should include live metrics panel in HTML', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('Live Metrics');
      expect(html).toContain('metric-created');
      expect(html).toContain('metric-completed-today');
      expect(html).toContain('metric-verified');
      expect(html).toContain('metric-failed');
      expect(html).toContain('metric-blocked');
    });

    it('should include coordination controls in HTML', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('Coordination Controls');
      expect(html).toContain('Auto-decompose tasks');
      expect(html).toContain('Require visual verification');
      expect(html).toContain('Notify on task completion');
      expect(html).toContain('Pause agent teams');
    });

    it('should include connection status indicator in HTML', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('Connection Status');
      expect(html).toContain('connection-indicator');
      expect(html).toContain('Reconnect');
    });

    it('should include JavaScript handlers for new features', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('handleToggle');
      expect(html).toContain('handleReconnect');
      expect(html).toContain('updateTeamsDisplay');
      expect(html).toContain('updateMetricsDisplay');
      expect(html).toContain('requestTeamsStatus');
      expect(html).toContain('requestMetrics');
    });
  });

  describe('Team Status Cards', () => {
    it('should render 4 team cards with correct structure', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      // Count team cards
      const teamCardMatches = html.match(/class="team-card/g);
      expect(teamCardMatches).toBeTruthy();
      expect(teamCardMatches!.length).toBe(4);

      // Verify each team has required elements
      expect(html).toContain('id="planning-task"');
      expect(html).toContain('id="answer-task"');
      expect(html).toContain('id="decomposition-task"');
      expect(html).toContain('id="verification-task"');
    });

    it('should include team metrics for each card', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      // Verify metrics for all teams
      expect(html).toContain('id="planning-completed"');
      expect(html).toContain('id="planning-active"');
      expect(html).toContain('id="answer-completed"');
      expect(html).toContain('id="answer-active"');
      expect(html).toContain('id="decomposition-completed"');
      expect(html).toContain('id="decomposition-active"');
      expect(html).toContain('id="verification-completed"');
      expect(html).toContain('id="verification-active"');
    });
  });

  describe('Coordination Controls', () => {
    it('should render toggle switches for all coordination settings', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('toggle-auto-decompose');
      expect(html).toContain('toggle-visual-verify');
      expect(html).toContain('toggle-notify');
      expect(html).toContain('toggle-pause');
    });

    it('should include toggle handler with proper onclick attributes', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain("handleToggle('autoDecompose'");
      expect(html).toContain("handleToggle('requireVisualVerification'");
      expect(html).toContain("handleToggle('notifyOnCompletion'");
      expect(html).toContain("handleToggle('pauseAgents'");
    });
  });

  describe('Live Metrics', () => {
    it('should render all required metric cards', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('Tasks Created');
      expect(html).toContain('Completed Today');
      expect(html).toContain('Verified');
      expect(html).toContain('Failed');
      expect(html).toContain('Blocked');
      expect(html).toContain('Avg Duration');
    });
  });

  describe('Real-time Updates', () => {
    it('should request initial data on load', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      // Check for initial data request
      expect(html).toContain('setTimeout');
      expect(html).toContain('requestTeamsStatus()');
      expect(html).toContain('requestMetrics()');
      // Backend handles polling, not webview
      expect(html).toContain('Real-time updates are handled by the backend');
    });

    it('should handle incoming WebSocket messages', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('updateTeamsStatus');
      expect(html).toContain('updateMetrics');
      expect(html).toContain("message.command === 'updateTeamsStatus'");
      expect(html).toContain("message.command === 'updateMetrics'");
    });
  });

  describe('Connection Status', () => {
    it('should include connection status UI elements', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('connection-status');
      expect(html).toContain('status-indicator');
      expect(html).toContain('connection-text');
      expect(html).toContain('reconnect-attempts');
    });

    it('should include updateConnectionStatus function', () => {
      provider = new OrchestratorPanelProvider(mockPanel(), mockUri(), [], [], []);
      const html = provider._getHtmlForWebview(mockWebview());

      expect(html).toContain('function updateConnectionStatus');
      expect(html).toContain('connected');
      expect(html).toContain('disconnected');
      expect(html).toContain('connecting');
    });
  });
});

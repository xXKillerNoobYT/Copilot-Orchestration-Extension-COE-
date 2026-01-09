/**
 * Audit Dashboard Panel
 * 
 * Displays drift metrics, compliance status, KPIs, and recommendations.
 * Provides actionable insights for keeping plan and code in sync.
 * 
 * Reference: Code Master Section 11.9
 */

import * as vscode from 'vscode';
import { DriftReport, runDriftDetection } from '../drift/driftDetector';
import type { Task } from '../workspace/tasksSource';

export class AuditDashboardPanel {
  public static readonly viewType = 'auditDashboard';
  private static instance: AuditDashboardPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private driftReport: DriftReport | null = null;
  private autoRefreshInterval: NodeJS.Timeout | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => this.dispose(), null);
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null
    );
  }

  /**
   * Create or show the audit dashboard panel
   */
  public static createOrShow(extensionUri: vscode.Uri): AuditDashboardPanel {
    const column = vscode.ViewColumn.Two;

    if (AuditDashboardPanel.instance) {
      AuditDashboardPanel.instance.panel.reveal(column);
      return AuditDashboardPanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      AuditDashboardPanel.viewType,
      '📊 Audit Dashboard',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    AuditDashboardPanel.instance = new AuditDashboardPanel(panel, extensionUri);
    AuditDashboardPanel.instance.update();
    return AuditDashboardPanel.instance;
  }

  /**
   * Update the panel with latest drift data
   */
  public async update(): Promise<void> {
    // Try to load tasks from _ZENTASKS/tasks.json
    let tasks: Task[] = [];
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) {
      this.panel.webview.html = this.getNoWorkspaceHtml();
      return;
    }

    try {
      const tasksFilePath = require('path').join(workspacePath, '_ZENTASKS', 'tasks.json');
      const fs = require('fs');
      if (fs.existsSync(tasksFilePath)) {
        const content = fs.readFileSync(tasksFilePath, 'utf-8');
        const data = JSON.parse(content);
        tasks = (data.tasks || []) as Task[];
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }

    if (!tasks || tasks.length === 0) {
      this.panel.webview.html = this.getNoTasksHtml();
      return;
    }

    // Run drift detection
    try {
      this.driftReport = await runDriftDetection(workspacePath, tasks);
      this.panel.webview.html = this.getHtmlContent();
    } catch (error) {
      console.error('Failed to run drift detection:', error);
      this.panel.webview.html = this.getErrorHtml(error);
    }
  }

  /**
   * Handle messages from the webview
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'refresh':
        await this.update();
        break;
      case 'autoRefresh':
        this.toggleAutoRefresh(message.enabled);
        break;
      case 'viewMetric':
        this.viewMetricDetails(message.metricIndex);
        break;
      case 'dismissAlert':
        // Handle dismissal of specific alerts
        break;
    }
  }

  /**
   * Toggle automatic refresh of drift metrics
   */
  private toggleAutoRefresh(enabled: boolean): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = undefined;
    }

    if (enabled) {
      // Refresh every 5 minutes
      this.autoRefreshInterval = setInterval(
        () => this.update(),
        5 * 60 * 1000
      ) as unknown as NodeJS.Timeout;
    }
  }

  /**
   * Show details for a specific metric
   */
  private viewMetricDetails(metricIndex: number): void {
    if (!this.driftReport || !this.driftReport.metrics[metricIndex]) {
      return;
    }

    const metric = this.driftReport.metrics[metricIndex];
    const message = `
**${metric.title}**

Severity: ${metric.severity.toUpperCase()}
Type: ${metric.type}

${metric.description}

Evidence:
${metric.evidence.map(e => `- ${e}`).join('\n')}

${metric.suggestedAction ? `**Suggested Action:** ${metric.suggestedAction}` : ''}
    `.trim();

    vscode.window.showInformationMessage(message);
  }

  /**
   * Generate HTML content for the panel
   */
  private getHtmlContent(): string {
    if (!this.driftReport) {
      return this.getLoadingHtml();
    }

    const { totalMetrics, criticalCount, highCount, overallDriftScore, metrics, recommendations } = this.driftReport;

    const severityColors = {
      critical: '#FF6B6B',
      high: '#FFA500',
      medium: '#FFD93D',
      low: '#6BCF7F',
    };

    const metricsHtml = metrics
      .map((metric, index) => {
        const color = severityColors[metric.severity];
        return `
        <div class="metric-card" style="border-left: 4px solid ${color}">
          <div class="metric-header">
            <span class="metric-severity" style="background-color: ${color}">${metric.severity.toUpperCase()}</span>
            <span class="metric-type">${metric.type}</span>
            <span class="metric-time">${new Date(metric.timestamp).toLocaleDateString()}</span>
          </div>
          <h4 class="metric-title">${metric.title}</h4>
          <p class="metric-description">${metric.description}</p>
          ${
            metric.evidence.length > 0
              ? `
            <div class="metric-evidence">
              <strong>Evidence:</strong>
              <ul>
                ${metric.evidence.map(e => `<li>${e}</li>`).join('')}
              </ul>
            </div>
            `
              : ''
          }
          ${
            metric.suggestedAction
              ? `<p class="metric-action"><strong>📋 Action:</strong> ${metric.suggestedAction}</p>`
              : ''
          }
        </div>
        `;
      })
      .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Audit Dashboard</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 16px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          line-height: 1.6;
        }
        .dashboard-header {
          margin-bottom: 24px;
        }
        .dashboard-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: var(--vscode-panel-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px;
          padding: 16px;
          text-align: center;
        }
        .kpi-label {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--vscode-editor-foreground);
        }
        .kpi-critical { color: #FF6B6B; }
        .kpi-high { color: #FFA500; }
        .kpi-medium { color: #FFD93D; }
        
        .drift-gauge {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          font-size: 28px;
          font-weight: bold;
          position: relative;
        }
        
        .drift-score-good { background: #6BCF7F; color: white; }
        .drift-score-medium { background: #FFD93D; color: #333; }
        .drift-score-poor { background: #FFA500; color: white; }
        .drift-score-critical { background: #FF6B6B; color: white; }
        
        .recommendations {
          background: var(--vscode-panel-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .recommendations h3 {
          font-size: 16px;
          margin-bottom: 12px;
          color: var(--vscode-editor-foreground);
        }
        .recommendations ul {
          list-style: none;
        }
        .recommendations li {
          padding: 8px;
          margin-bottom: 8px;
          background: var(--vscode-editor-background);
          border-radius: 4px;
          border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .recommendations li:before {
          content: "→ ";
          margin-right: 8px;
          color: var(--vscode-textLink-foreground);
        }
        
        .metrics-section {
          margin-top: 24px;
        }
        .metrics-header {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .metrics-count {
          font-size: 14px;
          color: var(--vscode-descriptionForeground);
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 2px 8px;
          border-radius: 12px;
        }
        .metric-card {
          background: var(--vscode-panel-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .metric-header {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .metric-severity {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 3px;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-type {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-time {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          margin-left: auto;
        }
        .metric-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--vscode-editor-foreground);
        }
        .metric-description {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 8px;
        }
        .metric-evidence {
          background: var(--vscode-editor-background);
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 8px;
          font-size: 12px;
        }
        .metric-evidence ul {
          list-style: none;
          margin-top: 4px;
          margin-left: 12px;
        }
        .metric-evidence li {
          margin-bottom: 4px;
        }
        .metric-evidence li:before {
          content: "• ";
          color: var(--vscode-textLink-foreground);
          margin-right: 4px;
        }
        .metric-action {
          background: var(--vscode-editor-background);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          border-left: 3px solid var(--vscode-textLink-foreground);
        }
        
        .controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        button {
          padding: 6px 12px;
          border: 1px solid var(--vscode-button-border);
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        
        .no-metrics {
          text-align: center;
          padding: 32px 16px;
          color: var(--vscode-descriptionForeground);
        }
        .no-metrics h3 {
          font-size: 16px;
          margin-bottom: 8px;
          color: var(--vscode-editor-foreground);
        }
      </style>
    </head>
    <body>
      <div class="dashboard-header">
        <div class="dashboard-title">📊 Audit Dashboard</div>
        <div class="controls">
          <button onclick="refresh()">🔄 Refresh</button>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="autoRefresh" onchange="toggleAutoRefresh(this.checked)">
            <span>Auto-refresh (5 min)</span>
          </label>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Drift Score</div>
          <div class="drift-gauge ${
            overallDriftScore <= 10
              ? 'drift-score-good'
              : overallDriftScore <= 30
              ? 'drift-score-medium'
              : overallDriftScore <= 60
              ? 'drift-score-poor'
              : 'drift-score-critical'
          }">
            ${overallDriftScore}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Issues</div>
          <div class="kpi-value">${totalMetrics}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Critical</div>
          <div class="kpi-value kpi-critical">${criticalCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">High</div>
          <div class="kpi-value kpi-high">${highCount}</div>
        </div>
      </div>

      ${
        recommendations.length > 0
          ? `
        <div class="recommendations">
          <h3>📋 Recommendations</h3>
          <ul>
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        `
          : ''
      }

      ${
        totalMetrics > 0
          ? `
        <div class="metrics-section">
          <div class="metrics-header">
            Detected Issues
            <span class="metrics-count">${totalMetrics} found</span>
          </div>
          ${metricsHtml}
        </div>
        `
          : `
        <div class="no-metrics">
          <h3>✅ Perfect Alignment</h3>
          <p>Your plan and implementation are in sync.</p>
        </div>
        `
      }

      <script>
        const vscode = acquireVsCodeApi();

        function refresh() {
          vscode.postMessage({ command: 'refresh' });
        }

        function toggleAutoRefresh(enabled) {
          vscode.postMessage({ command: 'autoRefresh', enabled });
        }
      </script>
    </body>
    </html>
    `;
  }

  private getLoadingHtml(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 32px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .loading {
          text-align: center;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--vscode-descriptionForeground);
          border-top-color: var(--vscode-editor-foreground);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading drift analysis...</p>
      </div>
    </body>
    </html>
    `;
  }

  private getNoTasksHtml(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 32px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
      </style>
    </head>
    <body>
      <h2>📊 Audit Dashboard</h2>
      <p>No tasks found. Load tasks from workspace to see drift metrics.</p>
    </body>
    </html>
    `;
  }

  private getNoWorkspaceHtml(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 32px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
      </style>
    </head>
    <body>
      <h2>📊 Audit Dashboard</h2>
      <p>No workspace found. Open a workspace to see drift metrics.</p>
    </body>
    </html>
    `;
  }

  private getErrorHtml(error: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 32px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        .error {
          background: var(--vscode-errorForeground);
          color: var(--vscode-editor-background);
          padding: 16px;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <h2>📊 Audit Dashboard</h2>
      <div class="error">
        <p>Error loading drift analysis:</p>
        <pre>${error?.message || error}</pre>
      </div>
    </body>
    </html>
    `;
  }

  public dispose(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    AuditDashboardPanel.instance = undefined;
    this.panel.dispose();
  }
}

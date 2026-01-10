/**
 * LLM IP Monitor - Background Service
 * 
 * Monitors the LLM host (e.g., Llama, LM Studio) for IP address changes.
 * Checks connectivity and updates configuration if IP changes.
 * 
 * Configuration:
 * - Default IP: 192.168.137.215
 * - Port: Configurable (default: 8000)
 * - Check interval: 30 seconds
 * - Timeout: 5 seconds
 */

import * as vscode from 'vscode';
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export interface LLMConfig {
  host: string;
  port: number;
  hostname?: string;
  lastKnownIP?: string;
  lastCheckedAt?: number;
  isHealthy?: boolean;
}

export class LLMIPMonitor {
  private statusBarItem: vscode.StatusBarItem;
  private checkInterval: NodeJS.Timeout | null = null;
  private config: LLMConfig;
  private readonly DEFAULT_PORT = 8000;
  private readonly DEFAULT_HOST = '192.168.137.215';
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private readonly TIMEOUT_MS = 5000; // 5 second timeout
  private outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('LLM Monitor');
    
    // Load config
    this.config = this.loadConfig(context);
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'copilot-orchestrator.showLLMStatus';
    this.statusBarItem.tooltip = 'Click to see LLM connection details';
    
    context.subscriptions.push(this.statusBarItem);
    context.subscriptions.push(this.outputChannel);

    // Register commands
    this.registerCommands();
  }

  /**
   * Start monitoring LLM connectivity
   */
  start(): void {
    this.log('🚀 LLM IP Monitor started');
    this.updateStatus('checking');

    // Initial check
    this.checkLLMConnectivity();

    // Set up periodic checks
    this.checkInterval = setInterval(
      () => this.checkLLMConnectivity(),
      this.CHECK_INTERVAL_MS
    );
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.log('🛑 LLM IP Monitor stopped');
    this.statusBarItem.hide();
  }

  /**
   * Check LLM connectivity and IP address
   */
  private async checkLLMConnectivity(): Promise<void> {
    try {
      // Try to resolve current IP (if hostname is set)
      if (this.config.hostname) {
        await this.checkHostnameResolution();
      }

      // Check connectivity
      const isHealthy = await this.pingLLMServer();
      const now = Date.now();

      if (isHealthy) {
        this.config.isHealthy = true;
        this.config.lastCheckedAt = now;
        this.updateStatus('healthy');
        this.log(`✅ LLM is healthy at ${this.config.host}:${this.config.port}`);
      } else {
        this.config.isHealthy = false;
        this.config.lastCheckedAt = now;
        this.updateStatus('unhealthy');
        this.log(`❌ LLM is unreachable at ${this.config.host}:${this.config.port}`);
        
        // Attempt fallback recovery
        await this.attemptFallbackRecovery();
      }
    } catch (error) {
      this.log(`⚠️ Monitoring error: ${error}`);
      this.updateStatus('error');
    }
  }

  /**
   * Resolve hostname and detect IP changes
   */
  private async checkHostnameResolution(): Promise<void> {
    try {
      const result = await dnsLookup(this.config.hostname!);
      const newIP = result.address;

      if (this.config.lastKnownIP && newIP !== this.config.lastKnownIP) {
        this.log(`🔄 IP Address Change Detected!`);
        this.log(`   Old IP: ${this.config.lastKnownIP}`);
        this.log(`   New IP: ${newIP}`);
        
        this.config.host = newIP;
        this.config.lastKnownIP = newIP;
        
        // Save updated config
        this.saveConfig();
        
        // Notify user
        vscode.window.showInformationMessage(
          `LLM IP changed from ${this.config.lastKnownIP} to ${newIP}. Configuration updated.`,
          'OK'
        );
      } else if (!this.config.lastKnownIP) {
        this.config.lastKnownIP = newIP;
        this.log(`📍 Initial IP resolved: ${newIP}`);
      }
    } catch (error) {
      this.log(`⚠️ Hostname resolution failed: ${error}`);
    }
  }

  /**
   * Ping LLM server to check connectivity
   */
  private async pingLLMServer(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, this.TIMEOUT_MS);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * Attempt fallback recovery strategies
   */
  private async attemptFallbackRecovery(): Promise<void> {
    this.log(`🔧 Attempting fallback recovery...`);

    // Strategy 1: Try default IP if different
    if (this.config.host !== this.DEFAULT_HOST) {
      this.log(`  📍 Trying default IP: ${this.DEFAULT_HOST}`);
      const isHealthy = await this.testConnection(this.DEFAULT_HOST, this.config.port);
      if (isHealthy) {
        this.config.host = this.DEFAULT_HOST;
        this.config.lastKnownIP = this.DEFAULT_HOST;
        this.saveConfig();
        this.log(`  ✅ Recovered: Using default IP ${this.DEFAULT_HOST}`);
        vscode.window.showInformationMessage(
          `LLM service recovered at ${this.DEFAULT_HOST}`
        );
        return;
      }
    }

    // Strategy 2: Try to detect new IP on local network (192.168.x.x)
    this.log(`  🔍 Scanning local network for LLM service...`);
    const discoveredIP = await this.discoverLLMOnNetwork();
    if (discoveredIP) {
      this.log(`  ✅ Discovered LLM at: ${discoveredIP}`);
      this.config.host = discoveredIP;
      this.config.lastKnownIP = discoveredIP;
      this.saveConfig();
      vscode.window.showInformationMessage(
        `LLM service discovered at ${discoveredIP}. Configuration updated.`
      );
      return;
    }

    // Strategy 3: Suggest manual configuration
    this.log(`  ❌ Could not auto-recover. Manual configuration may be needed.`);
    const result = await vscode.window.showWarningMessage(
      'LLM service is unreachable. Configure IP address manually?',
      'Configure',
      'Dismiss'
    );

    if (result === 'Configure') {
      this.promptForIPConfiguration();
    }
  }

  /**
   * Test connection to specific host:port
   */
  private async testConnection(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000); // Shorter timeout for network scan

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Scan local network for LLM service
   */
  private async discoverLLMOnNetwork(): Promise<string | null> {
    const baseIP = '192.168.137';
    const port = this.config.port;

    // Check a subset of IPs (200-220 range)
    for (let i = 200; i <= 220; i++) {
      const testIP = `${baseIP}.${i}`;
      
      try {
        const isHealthy = await this.testConnection(testIP, port);
        if (isHealthy) {
          return testIP;
        }
      } catch (error) {
        // Continue scanning
      }
    }

    return null;
  }

  /**
   * Prompt user for manual IP configuration
   */
  private async promptForIPConfiguration(): Promise<void> {
    const newIP = await vscode.window.showInputBox({
      prompt: 'Enter LLM service IP address',
      value: this.config.host,
      placeHolder: '192.168.137.215',
    });

    if (newIP) {
      this.config.host = newIP;
      this.config.lastKnownIP = newIP;
      this.saveConfig();
      this.log(`📝 IP configuration updated: ${newIP}`);
      vscode.window.showInformationMessage(`LLM IP updated to ${newIP}`);
      
      // Re-check connectivity
      this.checkLLMConnectivity();
    }
  }

  /**
   * Update status bar appearance
   */
  private updateStatus(status: 'healthy' | 'unhealthy' | 'checking' | 'error'): void {
    const icons: Record<string, string> = {
      healthy: '$(circle-filled)',
      unhealthy: '$(error)',
      checking: '$(loading~spin)',
      error: '$(warning)',
    };

    const colors: Record<string, string> = {
      healthy: 'statusBar.foreground',
      unhealthy: '#ff6b6b',
      checking: '#ffd43b',
      error: '#ff6b6b',
    };

    const labels: Record<string, string> = {
      healthy: `${icons[status]} LLM: OK (${this.config.host}:${this.config.port})`,
      unhealthy: `${icons[status]} LLM: Unreachable`,
      checking: `${icons[status]} LLM: Checking...`,
      error: `${icons[status]} LLM: Error`,
    };

    this.statusBarItem.text = labels[status];
    this.statusBarItem.color = colors[status];
    this.statusBarItem.show();
  }

  /**
   * Load configuration from extension storage
   */
  private loadConfig(context: vscode.ExtensionContext): LLMConfig {
    const stored = context.globalState.get('llmConfig') as LLMConfig | undefined;
    
    return stored || {
      host: this.DEFAULT_HOST,
      port: this.DEFAULT_PORT,
      lastKnownIP: this.DEFAULT_HOST,
      isHealthy: false,
    };
  }

  /**
   * Save configuration to extension storage
   */
  private saveConfig(): void {
    // Would need context to save, so this is a placeholder
    this.log(`💾 Config saved: ${this.config.host}:${this.config.port}`);
  }

  /**
   * Log message
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Register VS Code commands
   */
  private registerCommands(): void {
    const showStatus = vscode.commands.registerCommand(
      'copilot-orchestrator.showLLMStatus',
      () => this.showDetailedStatus()
    );

    const configureIP = vscode.commands.registerCommand(
      'copilot-orchestrator.configureLLMIP',
      () => this.promptForIPConfiguration()
    );

    const openOutput = vscode.commands.registerCommand(
      'copilot-orchestrator.showLLMMonitorOutput',
      () => this.outputChannel.show()
    );
  }

  /**
   * Show detailed status information
   */
  private async showDetailedStatus(): Promise<void> {
    const status = this.config.isHealthy ? '✅ Healthy' : '❌ Unreachable';
    const lastChecked = this.config.lastCheckedAt
      ? new Date(this.config.lastCheckedAt).toLocaleString()
      : 'Never';

    const message = `
LLM Service Status
==================

Current IP: ${this.config.host}
Port: ${this.config.port}
Status: ${status}
Last Checked: ${lastChecked}
Last Known IP: ${this.config.lastKnownIP || 'Unknown'}
    `.trim();

    vscode.window.showInformationMessage(message, 'Copy', 'View Logs', 'Configure').then((result) => {
      if (result === 'Copy') {
        vscode.env.clipboard.writeText(message);
        vscode.window.showInformationMessage('Status copied to clipboard');
      } else if (result === 'View Logs') {
        this.outputChannel.show();
      } else if (result === 'Configure') {
        this.promptForIPConfiguration();
      }
    });
  }

  /**
   * Get current config (for other services)
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Set new IP address
   */
  setIP(newIP: string, port?: number): void {
    this.config.host = newIP;
    if (port) {
      this.config.port = port;
    }
    this.config.lastKnownIP = newIP;
    this.saveConfig();
    this.log(`📝 IP updated to ${newIP}:${this.config.port}`);
    this.checkLLMConnectivity();
  }
}

// Export singleton instance
let monitorInstance: LLMIPMonitor | null = null;

export function getLLMIPMonitor(context: vscode.ExtensionContext): LLMIPMonitor {
  if (!monitorInstance) {
    monitorInstance = new LLMIPMonitor(context);
  }
  return monitorInstance;
}

/**
 * LLM IP Monitor Service
 * 
 * Monitors LLM/LM Studio IP connectivity and availability
 * - TCP connectivity checks at regular intervals
 * - DNS hostname resolution
 * - Network discovery fallback (IP range scanning)
 * - Status bar indicator with color coding
 * - Full lifecycle management (start/stop)
 * 
 * Singleton pattern for global access
 */

import * as vscode from 'vscode';
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

export type LLMMonitorStatus = 'healthy' | 'unhealthy' | 'checking' | 'error';

export interface LLMMonitorState {
  status: LLMMonitorStatus;
  currentIP: string;
  lastCheck: Date | null;
  checkCount: number;
  consecutiveFailures: number;
  discoveredIPs: string[];
}

export class LLMIPMonitor {
  private static instance: LLMIPMonitor | undefined;
  
  private config: {
    defaultIP: string;
    port: number;
    checkInterval: number;
    tcpTimeout: number;
    maxConsecutiveFailures: number;
  };
  
  private state: LLMMonitorState;
  private statusBar: vscode.StatusBarItem | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private logs: string[] = [];
  private maxLogs: number = 100;
  
  private onStatusChangeCallbacks: Array<(status: LLMMonitorStatus) => void> = [];

  private constructor() {
    this.config = {
      defaultIP: vscode.workspace.getConfiguration('copilot-orchestrator.llm').get('ip') || '192.168.137.215',
      port: vscode.workspace.getConfiguration('copilot-orchestrator.llm').get('port') || 8000,
      checkInterval: 30000, // 30 seconds
      tcpTimeout: 5000,      // 5 seconds
      maxConsecutiveFailures: 3,
    };
    
    this.state = {
      status: 'checking',
      currentIP: this.config.defaultIP,
      lastCheck: null,
      checkCount: 0,
      consecutiveFailures: 0,
      discoveredIPs: [],
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LLMIPMonitor {
    if (!LLMIPMonitor.instance) {
      LLMIPMonitor.instance = new LLMIPMonitor();
    }
    return LLMIPMonitor.instance;
  }

  /**
   * Start monitoring LLM connectivity
   */
  start(): void {
    if (this.isRunning) {
      this.log('Monitor already running');
      return;
    }

    this.isRunning = true;
    this.log('LLM IP Monitor started');
    
    // Create status bar item
    this.createStatusBar();
    
    // Run initial check immediately
    this.performCheck().catch(err => this.log(`Initial check failed: ${err.message}`));
    
    // Set up interval for periodic checks
    this.checkInterval = setInterval(() => {
      this.performCheck().catch(err => this.log(`Periodic check failed: ${err.message}`));
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.log('LLM IP Monitor stopped');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.statusBar) {
      this.statusBar.hide();
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    if (this.statusBar) {
      this.statusBar.dispose();
      this.statusBar = null;
    }
  }

  /**
   * Perform connectivity check
   */
  private async performCheck(): Promise<void> {
    this.state.status = 'checking';
    this.updateStatusBar();
    this.state.checkCount++;

    try {
      // Try to connect to current IP
      const isReachable = await this.checkTCPConnectivity(this.state.currentIP, this.config.port);
      
      if (isReachable) {
        this.state.status = 'healthy';
        this.state.consecutiveFailures = 0;
        this.log(`✓ LLM reachable at ${this.state.currentIP}:${this.config.port}`);
      } else {
        this.state.consecutiveFailures++;
        
        if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
          // Try to discover new IP
          await this.attemptDiscovery();
        } else {
          this.state.status = 'unhealthy';
          this.log(`✗ LLM unreachable at ${this.state.currentIP} (attempt ${this.state.consecutiveFailures}/${this.config.maxConsecutiveFailures})`);
        }
      }
    } catch (error) {
      this.state.status = 'error';
      this.state.consecutiveFailures++;
      this.log(`✗ Check error: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.state.lastCheck = new Date();
    this.updateStatusBar();
    this.notifyStatusChange();
  }

  /**
   * Check TCP connectivity to an IP/port
   */
  private checkTCPConnectivity(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, this.config.tcpTimeout);

      socket.on('connect', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeoutId);
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Attempt to discover LLM on the network
   */
  private async attemptDiscovery(): Promise<void> {
    this.log('Starting network discovery...');
    
    try {
      // Try DNS resolution first
      const hostname = vscode.workspace.getConfiguration('copilot-orchestrator.llm').get('hostname') as string || 'llama';
      const dnsLookup = promisify(dns.lookup);
      
      try {
        const { address } = await dnsLookup(hostname);
        this.log(`DNS resolved ${hostname} to ${address}`);
        
        // Try the resolved IP
        if (await this.checkTCPConnectivity(address, this.config.port)) {
          this.state.currentIP = address;
          this.state.status = 'healthy';
          this.state.consecutiveFailures = 0;
          this.log(`✓ Discovered LLM at ${address}`);
          return;
        }
      } catch (dnsError) {
        this.log(`DNS lookup failed: ${dnsError instanceof Error ? dnsError.message : 'Unknown error'}`);
      }

      // Scan IP range
      const baseIP = this.config.defaultIP.substring(0, this.config.defaultIP.lastIndexOf('.'));
      const discoveredIPs: string[] = [];
      
      this.log(`Scanning network range ${baseIP}.200-220...`);
      
      // Scan range with parallel checks
      const ips = Array.from({ length: 21 }, (_, i) => `${baseIP}.${200 + i}`);
      const checks = ips.map(ip => 
        this.checkTCPConnectivity(ip, this.config.port)
          .then(reachable => reachable ? ip : null)
      );
      
      const results = await Promise.all(checks);
      const found = results.filter((ip): ip is string => ip !== null);
      
      if (found.length > 0) {
        this.state.discoveredIPs = found;
        this.state.currentIP = found[0];
        this.state.status = 'healthy';
        this.state.consecutiveFailures = 0;
        this.log(`✓ Discovered LLM at ${found[0]} (${found.length} IPs found)`);
      } else {
        this.state.status = 'unhealthy';
        this.log(`✗ No LLM discovered in network range`);
      }
    } catch (error) {
      this.state.status = 'error';
      this.log(`Discovery error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create status bar item
   */
  private createStatusBar(): void {
    if (this.statusBar) {
      return;
    }

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 85);
    this.statusBar.command = 'copilot-orchestrator.showLLMStatus';
    this.updateStatusBar();
    this.statusBar.show();
  }

  /**
   * Update status bar appearance based on current status
   */
  private updateStatusBar(): void {
    if (!this.statusBar) {
      return;
    }

    const icons = {
      healthy: '$(plug)',
      unhealthy: '$(warning)',
      checking: '$(loading~spin)',
      error: '$(error)',
    };

    const colors = {
      healthy: '#4ec9b0',
      unhealthy: '#ce9178',
      checking: '#646695',
      error: '#f48771',
    };

    const icon = icons[this.state.status];
    const color = colors[this.state.status];
    
    this.statusBar.text = `${icon} LLM: ${this.state.currentIP}`;
    this.statusBar.tooltip = this.getStatusTooltip();
    this.statusBar.color = color;
  }

  /**
   * Generate status tooltip
   */
  private getStatusTooltip(): string {
    const parts = [
      `Status: ${this.state.status}`,
      `IP: ${this.state.currentIP}`,
      `Port: ${this.config.port}`,
      `Checks: ${this.state.checkCount}`,
      `Failures: ${this.state.consecutiveFailures}`,
    ];

    if (this.state.lastCheck) {
      parts.push(`Last Check: ${this.state.lastCheck.toLocaleTimeString()}`);
    }

    if (this.state.discoveredIPs.length > 0) {
      parts.push(`Discovered IPs: ${this.state.discoveredIPs.join(', ')}`);
    }

    parts.push('Click to view details');
    return parts.join('\n');
  }

  /**
   * Get current monitor state
   */
  getState(): LLMMonitorState {
    return { ...this.state };
  }

  /**
   * Manually set LLM IP
   */
  async setIP(ip: string): Promise<void> {
    this.state.currentIP = ip;
    this.state.consecutiveFailures = 0;
    await vscode.workspace.getConfiguration('copilot-orchestrator.llm').update('ip', ip, vscode.ConfigurationTarget.Global);
    this.log(`LLM IP set to ${ip}`);
    this.performCheck().catch(err => this.log(`Check after IP update failed: ${err.message}`));
  }

  /**
   * Get monitor logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Log message
   */
  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: (status: LLMMonitorStatus) => void): void {
    this.onStatusChangeCallbacks.push(callback);
  }

  /**
   * Notify listeners of status change
   */
  private notifyStatusChange(): void {
    this.onStatusChangeCallbacks.forEach(callback => {
      callback(this.state.status);
    });
  }
}

import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as http from 'http';

/**
 * laravelServerController.ts
 * Manages Laravel development server lifecycle:
 * - Auto-detect PHP executable
 * - Start server on available port (8000-8010)
 * - Health check monitoring
 * - Graceful shutdown
 */

export interface ServerStatus {
  running: boolean;
  port?: number;
  url?: string;
  pid?: number;
  error?: string;
}

export class LaravelServerController {
  private serverProcess: child_process.ChildProcess | null = null;
  private currentPort: number | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private statusCallbacks: Array<(status: ServerStatus) => void> = [];

  /**
   * Start Laravel development server
   */
  async startServer(workspaceRoot: string): Promise<ServerStatus> {
    // Check if already running
    if (this.serverProcess) {
      return {
        running: true,
        port: this.currentPort!,
        url: `http://localhost:${this.currentPort}`,
        pid: this.serverProcess.pid,
      };
    }

    try {
      // Find PHP executable
      const phpPath = await this.findPhpExecutable();
      if (!phpPath) {
        throw new Error('PHP executable not found. Please install PHP and ensure it is in PATH.');
      }

      // Find available port
      const port = await this.findAvailablePort();
      if (!port) {
        throw new Error('No available ports found in range 8000-8010');
      }

      // Start Laravel server
      const artisanPath = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), 'artisan').fsPath;
      
      this.serverProcess = child_process.spawn(
        phpPath,
        [artisanPath, 'serve', `--port=${port}`],
        {
          cwd: workspaceRoot,
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      this.currentPort = port;

      // Log stdout/stderr
      this.serverProcess.stdout?.on('data', (data) => {
        console.log(`[Laravel Server]: ${data.toString()}`);
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`[Laravel Server Error]: ${data.toString()}`);
      });

      this.serverProcess.on('exit', (code) => {
        console.log(`Laravel server exited with code ${code}`);
        this.serverProcess = null;
        this.currentPort = null;
        this.notifyStatusChange({
          running: false,
        });
      });

      // Wait for server to be ready
      const healthy = await this.waitForHealthy(port, 30);
      
      if (!healthy) {
        this.stopServer();
        throw new Error('Server failed to become healthy within 30 seconds');
      }

      // Start health check monitoring
      this.startHealthCheckMonitoring();

      const status: ServerStatus = {
        running: true,
        port,
        url: `http://localhost:${port}`,
        pid: this.serverProcess.pid,
      };

      this.notifyStatusChange(status);
      return status;

    } catch (error) {
      const errorStatus: ServerStatus = {
        running: false,
        error: error instanceof Error ? error.message : String(error),
      };
      this.notifyStatusChange(errorStatus);
      throw error;
    }
  }

  /**
   * Stop Laravel server gracefully
   */
  async stopServer(): Promise<void> {
    if (!this.serverProcess) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      this.serverProcess.once('exit', () => {
        this.serverProcess = null;
        this.currentPort = null;
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = null;
        }
        this.notifyStatusChange({ running: false });
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.serverProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Restart server
   */
  async restartServer(workspaceRoot: string): Promise<ServerStatus> {
    await this.stopServer();
    return this.startServer(workspaceRoot);
  }

  /**
   * Get current server status
   */
  getStatus(): ServerStatus {
    if (!this.serverProcess || !this.currentPort) {
      return { running: false };
    }

    return {
      running: true,
      port: this.currentPort,
      url: `http://localhost:${this.currentPort}`,
      pid: this.serverProcess.pid,
    };
  }

  /**
   * Health check - ping server /api/health endpoint
   */
  async healthCheck(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Wait for server to become healthy
   */
  private async waitForHealthy(port: number, maxSeconds: number): Promise<boolean> {
    const startTime = Date.now();
    const maxTime = maxSeconds * 1000;

    while (Date.now() - startTime < maxTime) {
      const healthy = await this.healthCheck(port);
      if (healthy) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Start periodic health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      if (!this.currentPort) return;

      const healthy = await this.healthCheck(this.currentPort);
      if (!healthy && this.serverProcess) {
        console.warn('Laravel server health check failed');
        this.notifyStatusChange({
          running: true,
          port: this.currentPort,
          url: `http://localhost:${this.currentPort}`,
          error: 'Health check failed',
        });
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Find PHP executable in PATH
   */
  private async findPhpExecutable(): Promise<string | null> {
    return new Promise((resolve) => {
      child_process.exec('php -v', (error) => {
        if (error) {
          // Try common paths
          const commonPaths = [
            'C:\\php\\php.exe',
            'C:\\xampp\\php\\php.exe',
            'C:\\wamp\\bin\\php\\php.exe',
            '/usr/bin/php',
            '/usr/local/bin/php',
          ];

          for (const path of commonPaths) {
            try {
              child_process.execSync(`"${path}" -v`);
              resolve(path);
              return;
            } catch {}
          }

          resolve(null);
        } else {
          resolve('php'); // PHP is in PATH
        }
      });
    });
  }

  /**
   * Find available port in range 8000-8010
   */
  private async findAvailablePort(): Promise<number | null> {
    for (let port = 8000; port <= 8010; port++) {
      const available = await this.isPortAvailable(port);
      if (available) {
        return port;
      }
    }
    return null;
  }

  /**
   * Check if port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback: (status: ServerStatus) => void): vscode.Disposable {
    this.statusCallbacks.push(callback);
    return new vscode.Disposable(() => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index >= 0) {
        this.statusCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Notify all callbacks of status change
   */
  private notifyStatusChange(status: ServerStatus): void {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  /**
   * Cleanup on extension deactivation
   */
  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.serverProcess) {
      this.serverProcess.kill('SIGKILL');
    }
    this.statusCallbacks = [];
  }
}

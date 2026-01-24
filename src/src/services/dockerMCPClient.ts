/**
 * Docker MCP Gateway Client
 * 
 * Connects to Docker's MCP Toolkit Gateway using stdio transport.
 * Based on official Docker MCP documentation:
 * https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';

export interface DockerMCPTool {
    name: string;
    description: string;
    inputSchema: any;
}

export interface DockerMCPResponse {
    tools?: DockerMCPTool[];
    result?: any;
    error?: string;
}

/**
 * Docker MCP Gateway Client using stdio transport
 */
export class DockerMCPClient {
    private static instance: DockerMCPClient | undefined;
    private process: ChildProcessWithoutNullStreams | null = null;
    private messageBuffer: string = '';
    private requestCallbacks: Map<number, (response: any) => void> = new Map();
    private requestId: number = 0;

    private constructor() { }

    static getInstance(): DockerMCPClient {
        if (!DockerMCPClient.instance) {
            DockerMCPClient.instance = new DockerMCPClient();
        }
        return DockerMCPClient.instance;
    }

    /**
     * Start Docker MCP Gateway using stdio transport
     * Command: docker mcp gateway run
     */
    async start(): Promise<void> {
        if (this.process) {
            console.log('[DockerMCP] Gateway already running');
            return;
        }

        try {
            // Spawn Docker MCP Gateway process
            this.process = spawn('docker', ['mcp', 'gateway', 'run'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Handle stdout (MCP protocol messages)
            this.process.stdout.on('data', (data: Buffer) => {
                this.handleStdout(data);
            });

            // Handle stderr (logs)
            this.process.stderr.on('data', (data: Buffer) => {
                console.error('[DockerMCP] Gateway stderr:', data.toString());
            });

            // Handle process exit
            this.process.on('exit', (code: number | null) => {
                console.log(`[DockerMCP] Gateway exited with code ${code}`);
                this.process = null;
            });

            console.log('[DockerMCP] Gateway started successfully');
        } catch (error) {
            console.error('[DockerMCP] Failed to start gateway:', error);
            throw error;
        }
    }

    /**
     * Stop Docker MCP Gateway
     */
    stop(): void {
        if (this.process) {
            this.process.kill();
            this.process = null;
            console.log('[DockerMCP] Gateway stopped');
        }
        
        // Clear message buffer
        this.messageBuffer = '';
        
        // Clear pending callbacks
        this.requestCallbacks.clear();
    }

    /**
     * List available tools from Docker MCP Gateway
     * Uses Dynamic MCP to discover all installed MCP servers
     */
    async listTools(): Promise<DockerMCPTool[]> {
        if (!this.process) {
            await this.start();
        }

        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: ++this.requestId,
            method: 'tools/list',
            params: {}
        });

        return response.tools || [];
    }

    /**
     * Call a tool via Docker MCP Gateway
     */
    async callTool(toolName: string, args: any): Promise<any> {
        if (!this.process) {
            await this.start();
        }

        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: ++this.requestId,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.result;
    }

    /**
     * Send JSON-RPC request to Docker MCP Gateway via stdin
     */
    private sendRequest(request: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdin) {
                reject(new Error('Docker MCP Gateway not running'));
                return;
            }

            // Store callback for this request ID
            this.requestCallbacks.set(request.id, resolve);

            // Send request via stdin
            const message = JSON.stringify(request) + '\n';
            this.process.stdin.write(message);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.requestCallbacks.has(request.id)) {
                    this.requestCallbacks.delete(request.id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Handle stdout data from Docker MCP Gateway
     */
    private handleStdout(data: Buffer): void {
        this.messageBuffer += data.toString();

        // Process complete JSON-RPC messages (newline-delimited)
        const messages = this.messageBuffer.split('\n');
        this.messageBuffer = messages.pop() || ''; // Keep incomplete message

        for (const message of messages) {
            if (!message.trim()) continue;

            try {
                const response = JSON.parse(message);

                // Match response to request callback
                if (response.id && this.requestCallbacks.has(response.id)) {
                    const callback = this.requestCallbacks.get(response.id)!;
                    this.requestCallbacks.delete(response.id);
                    callback(response);
                }
            } catch (error) {
                console.error('[DockerMCP] Failed to parse response:', error);
            }
        }
    }

    /**
     * Check if Docker MCP is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const { execSync } = require('child_process');
            execSync('docker mcp version', { stdio: 'pipe' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Install MCP server from Docker's catalog
     */
    async installServer(serverName: string): Promise<void> {
        try {
            const { execSync } = require('child_process');
            execSync(`docker mcp install ${serverName}`, { stdio: 'inherit' });
            console.log(`[DockerMCP] Installed server: ${serverName}`);
        } catch (error) {
            console.error(`[DockerMCP] Failed to install server ${serverName}:`, error);
            throw error;
        }
    }

    /**
     * List installed MCP servers
     */
    async listInstalledServers(): Promise<string[]> {
        try {
            const { execSync } = require('child_process');
            const output = execSync('docker mcp list', { encoding: 'utf-8' });
            return output.split('\n').filter((line: string) => line.trim());
        } catch (error) {
            console.error('[DockerMCP] Failed to list servers:', error);
            return [];
        }
    }
}

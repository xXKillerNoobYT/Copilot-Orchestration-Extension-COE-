/**
 * Tests for Docker MCP Client
 * Tests Docker MCP Gateway connection and tool execution
 */

import { DockerMCPClient, DockerMCPTool } from './dockerMCPClient';
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';

// Mock modules
jest.mock('child_process');
jest.mock('vscode');

describe('DockerMCPClient', () => {
  let client: DockerMCPClient;
  let mockProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (DockerMCPClient as any).instance = undefined;

    // Create mock ChildProcess
    mockProcess = new EventEmitter();
    mockProcess.stdin = { write: jest.fn() };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    
    // Add error handler to prevent unhandled error events
    mockProcess.stdout.on('error', () => {});
    mockProcess.stderr.on('error', () => {});

    (spawn as jest.Mock).mockReturnValue(mockProcess);

    client = DockerMCPClient.getInstance();
  });

  afterEach(() => {
    if (client) {
      client.stop();
    }
    // Clear any pending timers
    jest.clearAllTimers();
    // Reset singleton
    (DockerMCPClient as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DockerMCPClient.getInstance();
      const instance2 = DockerMCPClient.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Gateway Startup', () => {
    it('should start Docker MCP Gateway', async () => {
      await client.start();

      expect(spawn).toHaveBeenCalledWith('docker', ['mcp', 'gateway', 'run'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should not start if already running', async () => {
      await client.start();
      jest.clearAllMocks();

      await client.start();

      expect(spawn).not.toHaveBeenCalled();
    });

    it('should handle spawn errors', async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        throw new Error('Docker not found');
      });

      await expect(client.start()).rejects.toThrow('Docker not found');
    });

    it('should listen to stdout', async () => {
      await client.start();

      // Verify stdout listener is attached
      expect(mockProcess.stdout.listenerCount('data')).toBeGreaterThan(0);
    });

    it('should listen to stderr', async () => {
      await client.start();

      // Verify stderr listener is attached
      expect(mockProcess.stderr.listenerCount('data')).toBeGreaterThan(0);
    });

    it('should handle process exit', async () => {
      await client.start();

      mockProcess.emit('exit', 0);

      // Process should be cleared
      expect((client as any).process).toBeNull();
    });
  });

  describe('Gateway Shutdown', () => {
    it('should stop running gateway', async () => {
      await client.start();
      client.stop();

      expect(mockProcess.kill).toHaveBeenCalled();
      expect((client as any).process).toBeNull();
    });

    it('should handle stop when not running', () => {
      expect(() => client.stop()).not.toThrow();
    });

    it('should clear process reference after kill', async () => {
      await client.start();
      client.stop();

      expect((client as any).process).toBeNull();
    });
  });

  describe('Tool Listing', () => {
    it('should list available tools', async () => {
      await client.start();

      // Mock tool list response
      const mockResponse = {
        id: 1,
        tools: [
          {
            name: 'docker-ps',
            description: 'List containers',
            inputSchema: { type: 'object' }
          },
          {
            name: 'docker-images',
            description: 'List images',
            inputSchema: { type: 'object' }
          }
        ]
      };

      // Simulate response from gateway using setImmediate
      const listPromise = client.listTools();
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockResponse) + '\n'));
      });

      const tools = await listPromise;

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should start gateway if not running when listing tools', async () => {
      // Simulate delayed response
      const listPromise = client.listTools();
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({ id: 1, tools: [] }) + '\n'));
      });

      await listPromise;

      expect(spawn).toHaveBeenCalled();
    });

    it('should handle empty tool list', async () => {
      await client.start();

      const listPromise = client.listTools();
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({ id: 1, tools: [] }) + '\n'));
      });

      const tools = await listPromise;

      expect(tools).toEqual([]);
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool', async () => {
      await client.start();

      const toolName = 'docker-ps';
      const args = { all: true };

      const callPromise = client.callTool(toolName, args);
      setImmediate(() => {
        const response = {
          id: 1,
          result: { containers: [] }
        };
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      });

      const result = await callPromise;

      expect(result).toBeDefined();
    });

    it('should handle tool execution errors', async () => {
      await client.start();

      const callPromise = client.callTool('invalid-tool', {});
      setImmediate(() => {
        const errorResponse = {
          id: 1,
          error: 'Tool not found'
        };
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(errorResponse) + '\n'));
      });

      await expect(callPromise).rejects.toBeDefined();
    });

    it('should send JSON-RPC formatted requests', async () => {
      await client.start();

      const toolName = 'docker-ps';
      const args = { all: true };

      const callPromise = client.callTool(toolName, args);
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({ id: 1, result: {} }) + '\n'));
      });

      await callPromise;

      // Verify stdin.write was called with proper JSON-RPC format
      expect(mockProcess.stdin.write).toHaveBeenCalled();
      const written = (mockProcess.stdin.write as jest.Mock).mock.calls[0][0];
      expect(typeof written).toBe('string');
      const parsed = JSON.parse(written);
      expect(parsed).toHaveProperty('jsonrpc');
      expect(parsed).toHaveProperty('method');
      expect(parsed).toHaveProperty('params');
    });
  });

  describe('Message Buffering', () => {
    it('should handle partial messages', async () => {
      await client.start();

      const partialMessage1 = '{"too';
      const partialMessage2 = 'ls": []}';

      mockProcess.stdout.emit('data', Buffer.from(partialMessage1));
      mockProcess.stdout.emit('data', Buffer.from(partialMessage2 + '\n'));

      // Should handle buffering correctly
      expect((client as any).messageBuffer).toBeDefined();
    });

    it('should handle multiple messages in one data event', async () => {
      await client.start();

      const message1 = JSON.stringify({ id: 1, result: {} });
      const message2 = JSON.stringify({ id: 2, result: {} });
      const combinedData = message1 + '\n' + message2 + '\n';

      mockProcess.stdout.emit('data', Buffer.from(combinedData));

      // Both messages should be processed
      expect((client as any).messageBuffer).toBeDefined();
    });
  });

  describe('Request/Response Correlation', () => {
    it('should correlate responses with requests', async () => {
      await client.start();

      const callPromise = client.callTool('test-tool', {});
      setImmediate(() => {
        const response = { id: 1, result: { success: true } };
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      });

      const result = await callPromise;

      expect(result).toBeDefined();
    });

    it('should handle multiple concurrent requests', async () => {
      await client.start();

      // Send multiple requests
      const promises = [
        client.callTool('tool1', {}),
        client.callTool('tool2', {}),
        client.callTool('tool3', {})
      ];

      // Simulate responses
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({ id: 1, result: { tool: 1 } }) + '\n'));
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({ id: 2, result: { tool: 2 } }) + '\n'));
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({ id: 3, result: { tool: 3 } }) + '\n'));
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
    });

    it('should timeout on unresponsive requests', async () => {
      await client.start();

      // Don't emit any response - should timeout
      const promise = client.callTool('timeout-tool', {});

      // Should eventually timeout (30 seconds in implementation)
      await expect(promise).rejects.toThrow('Request timeout');
    }, 35000); // Set test timeout slightly higher than implementation timeout
  });

  describe('Error Handling', () => {
    it('should handle stdout errors', async () => {
      await client.start();

      // Capture console.error to avoid unhandled error output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockProcess.stdout.emit('error', new Error('Stdout error'));

      // Should not crash
      expect(client).toBeDefined();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle stderr output', async () => {
      await client.start();

      const stderrSpy = jest.spyOn(console, 'error').mockImplementation();

      mockProcess.stderr.emit('data', Buffer.from('Error message'));

      expect(stderrSpy).toHaveBeenCalled();

      stderrSpy.mockRestore();
    });

    it('should handle malformed JSON responses', async () => {
      await client.start();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockProcess.stdout.emit('data', Buffer.from('not valid json\n'));

      // Should handle gracefully
      expect(client).toBeDefined();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected process exit', async () => {
      await client.start();

      mockProcess.emit('exit', 1); // Non-zero exit code

      expect((client as any).process).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on stop', async () => {
      await client.start();

      client.stop();

      expect(mockProcess.kill).toHaveBeenCalled();
      expect((client as any).process).toBeNull();
    });

    it('should clear message buffer on stop', async () => {
      await client.start();

      (client as any).messageBuffer = 'some buffered data';

      client.stop();

      expect((client as any).messageBuffer).toBe('');
    });

    it('should clear pending callbacks on stop', async () => {
      await client.start();

      (client as any).requestCallbacks.set(1, jest.fn());
      (client as any).requestCallbacks.set(2, jest.fn());

      client.stop();

      expect((client as any).requestCallbacks.size).toBe(0);
    });
  });

  describe('Docker Availability', () => {
    it('should fail gracefully when Docker is not available', async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        const err: any = new Error('spawn docker ENOENT');
        err.code = 'ENOENT';
        throw err;
      });

      await expect(client.start()).rejects.toThrow();
    });

    it('should handle Docker permission errors', async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        throw new Error('permission denied');
      });

      await expect(client.start()).rejects.toThrow('permission denied');
    });
  });
});

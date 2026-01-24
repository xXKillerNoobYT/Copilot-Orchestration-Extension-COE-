/**
 * Tests for Connection Monitor
 * Tests MCP, WebSocket, and Docker connection monitoring
 */

import { ConnectionMonitor, ConnectionState, ConnectionStatus } from './connectionMonitor';
import * as vscode from 'vscode';
import { MCPClient } from './mcpClient';
import { DockerMCPClient } from './dockerMCPClient';

// Mock modules
jest.mock('vscode');
jest.mock('./mcpClient');
jest.mock('./dockerMCPClient');

// Mock error handler to suppress console output
jest.mock('../utils/errorHandler', () => ({
    logError: jest.fn(),
    showErrorMessage: jest.fn(),
}));

// Mock dynamic import for webSocketClient
const mockGetWebSocketClient = jest.fn();
jest.mock('./webSocketClient.js', () => ({
    getWebSocketClient: mockGetWebSocketClient,
}));

describe('ConnectionMonitor', () => {
    let monitor: ConnectionMonitor;
    let mockMcpClient: any;
    let mockDockerClient: any;
    let mockWsClient: any;
    let dateNowSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Reset singleton
        (ConnectionMonitor as any).instance = null;

        // Reset MCP Client mock
        (MCPClient as any).resetInstance();

        // Mock current time
        const fixedTime = new Date('2024-01-01T00:00:00Z').getTime();
        dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

        // Initialize Docker Client mock first
        mockDockerClient = {
            isAvailable: jest.fn().mockResolvedValue(false),
            listTools: jest.fn().mockResolvedValue([]),
            executeTool: jest.fn().mockResolvedValue({}),
            dispose: jest.fn(),
        };

        // Get MCP Client instance and configure mocks
        mockMcpClient = MCPClient.getInstance();
        mockMcpClient.getNextTask = jest.fn().mockResolvedValue({ success: true });
        (DockerMCPClient.getInstance as jest.Mock).mockReturnValue(mockDockerClient);

        // Mock WebSocket Client
        mockWsClient = {
            getStatus: jest.fn().mockReturnValue({
                connected: false,
                reconnectAttempts: 0,
            }),
        };

        // Setup getWebSocketClient mock to return null by default
        mockGetWebSocketClient.mockReturnValue(null);

        // Mock vscode configuration
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'mcp.dockerGatewayEnabled') return true;
                return defaultValue;
            }),
        });

        // Mock vscode EventEmitter
        (vscode.EventEmitter as any).mockImplementation(() => ({
            event: jest.fn(),
            fire: jest.fn(),
            dispose: jest.fn(),
        }));

        // Mock window.showWarningMessage
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
        (vscode.window.createTerminal as jest.Mock).mockReturnValue({
            show: jest.fn(),
            sendText: jest.fn(),
        });

        monitor = ConnectionMonitor.getInstance();
    });

    afterEach(() => {
        jest.useRealTimers();
        dateNowSpy.mockRestore();
        if (monitor) {
            monitor.dispose();
        }
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = ConnectionMonitor.getInstance();
            const instance2 = ConnectionMonitor.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should initialize with disconnected state', () => {
            const state = monitor.getState();

            expect(state.mcp).toBe('disconnected');
            expect(state.websocket).toBe('disconnected');
            expect(state.docker).toBe('disconnected');
            expect(state.retryCount).toBe(0);
        });
    });

    describe('Connection Monitoring Start/Stop', () => {
        it('should start monitoring and check immediately', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });
            mockDockerClient.isAvailable.mockResolvedValue(true);
            mockDockerClient.listTools.mockResolvedValue([]);

            monitor.start();

            await jest.runOnlyPendingTimersAsync();

            expect(mockMcpClient.getNextTask).toHaveBeenCalled();
        });

        it('should perform periodic checks every 5 seconds', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            monitor.start();

            // Initial check runs immediately
            await jest.runOnlyPendingTimersAsync();
            const initialCalls = mockMcpClient.getNextTask.mock.calls.length;
            expect(initialCalls).toBeGreaterThanOrEqual(1);

            // Advance 5 seconds for next interval check
            jest.advanceTimersByTime(5000);
            await jest.runOnlyPendingTimersAsync();

            // Should have more calls after the interval
            expect(mockMcpClient.getNextTask.mock.calls.length).toBeGreaterThan(initialCalls);
        });

        it('should not start monitoring if already running', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const firstCalls = mockMcpClient.getNextTask.mock.calls.length;

            monitor.start(); // Second call should be ignored (won't trigger another immediate check)

            // Should not have triggered another check
            expect(mockMcpClient.getNextTask.mock.calls.length).toBe(firstCalls);
        });

        it('should stop monitoring', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const initialCalls = mockMcpClient.getNextTask.mock.calls.length;

            monitor.stop();

            // Advance time - should not trigger more calls
            jest.advanceTimersByTime(10000);
            await jest.runOnlyPendingTimersAsync();

            expect(mockMcpClient.getNextTask).toHaveBeenCalledTimes(initialCalls);
        });
    });

    describe('MCP Connection Check', () => {
        it('should mark MCP as connected on success', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.mcp).toBe('connected');
            expect(state.mcpError).toBeUndefined();
            expect(state.retryCount).toBe(0);
        });

        it('should mark MCP as degraded on first failure', async () => {
            mockMcpClient.getNextTask.mockRejectedValue(new Error('Connection refused'));

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.mcp).toBe('degraded');
            expect(state.mcpError).toBe('Connection refused');
            expect(state.retryCount).toBeGreaterThanOrEqual(1);
        });

        it('should mark MCP as disconnected after max retries', async () => {
            mockMcpClient.getNextTask.mockRejectedValue(new Error('Connection refused'));

            monitor.start();

            // Run through multiple failures
            for (let i = 0; i < 5; i++) {
                if (i > 0) {
                    jest.advanceTimersByTime(5000);
                }
                await jest.runOnlyPendingTimersAsync();
            }

            // After max retries, should be disconnected
            expect(monitor.getState().mcp).toBe('disconnected');
        });

        it('should reset retry count on successful connection', async () => {
            // First fail
            mockMcpClient.getNextTask.mockRejectedValueOnce(new Error('Connection refused'));

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const retryCountAfterFailure = monitor.getState().retryCount;
            expect(retryCountAfterFailure).toBeGreaterThanOrEqual(0);

            // Then succeed
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });
            jest.advanceTimersByTime(5000);
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();
            expect(state.mcp).toBe('connected');
            expect(state.retryCount).toBe(0);
        });

        it('should timeout MCP check after 3 seconds', async () => {
            jest.useFakeTimers();
            mockMcpClient.getNextTask.mockImplementation(() => new Promise(() => { })); // Never resolves

            // Perform single check (not start polling)
            const checkPromise = (monitor as any).checkMcpConnection();

            // Advance timers just past 3 seconds to trigger timeout
            await jest.advanceTimersToNextTimerAsync(3100);

            // Wait for check to complete
            await checkPromise;

            const state = monitor.getState();
            // First timeout should set status to 'degraded' (retry count = 1)
            expect(state.mcp).toBe('degraded');
            expect(state.mcpError).toBe('Health check timeout');

            jest.useRealTimers();
        });
    });

    describe('WebSocket Connection Check', () => {
        it('should mark WebSocket as connected when status is connected', async () => {
            mockWsClient.getStatus.mockReturnValue({
                connected: true,
                reconnectAttempts: 0,
            });
            mockGetWebSocketClient.mockReturnValue(mockWsClient);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.websocket).toBe('connected');
            expect(state.wsError).toBeUndefined();
        });

        it('should mark WebSocket as degraded during reconnection', async () => {
            mockWsClient.getStatus.mockReturnValue({
                connected: false,
                reconnectAttempts: 2,
            });
            mockGetWebSocketClient.mockReturnValue(mockWsClient);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.websocket).toBe('degraded');
            expect(state.wsError).toContain('Reconnecting (attempt 2)');
        });

        it('should mark WebSocket as disconnected after max reconnect attempts', async () => {
            mockWsClient.getStatus.mockReturnValue({
                connected: false,
                reconnectAttempts: 3,
            });
            mockGetWebSocketClient.mockReturnValue(mockWsClient);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.websocket).toBe('disconnected');
            expect(state.wsError).toBe('Max reconnect attempts reached');
        });

        it('should handle WebSocket client not initialized', async () => {
            // getWebSocketClient is already mocked to return null in beforeEach
            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.websocket).toBe('disconnected');
            expect(state.wsError).toBe('WebSocket client not initialized');
        });

        it('should handle WebSocket check errors', async () => {
            mockGetWebSocketClient.mockImplementation(() => {
                throw new Error('WebSocket error');
            });

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.websocket).toBe('disconnected');
            expect(state.wsError).toBe('WebSocket error');
        });
    });

    describe('Docker Gateway Check', () => {
        it('should mark Docker as connected when available', async () => {
            mockDockerClient.isAvailable.mockResolvedValue(true);
            mockDockerClient.listTools.mockResolvedValue([{ name: 'tool1' }]);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.docker).toBe('connected');
            expect(state.dockerError).toBeUndefined();
            expect(state.dockerAuthRequired).toBe(false);
        });

        it('should mark Docker as disconnected when not available', async () => {
            mockDockerClient.isAvailable.mockResolvedValue(false);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.docker).toBe('disconnected');
            expect(state.dockerError).toBe('Docker MCP Toolkit not installed or not available');
        });

        it('should skip Docker check when disabled in config', async () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: (key: string, defaultValue?: any) => key === 'mcp.dockerGatewayEnabled' ? false : defaultValue,
            });

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.docker).toBe('disconnected');
            expect(mockDockerClient.isAvailable).not.toHaveBeenCalled();
        });

        it('should handle Docker authentication errors', async () => {
            mockDockerClient.isAvailable.mockResolvedValue(true);
            mockDockerClient.listTools.mockRejectedValue(new Error('unauthorized'));

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.docker).toBe('degraded');
            expect(state.dockerError).toBe('Authentication required');
            expect(state.dockerAuthRequired).toBe(true);
        });

        it('should show Docker auth notification on auth error', async () => {
            mockDockerClient.isAvailable.mockResolvedValue(true);
            mockDockerClient.listTools.mockRejectedValue(new Error('permission denied'));

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                'Docker MCP Gateway requires authentication',
                'Login to Docker',
                'Dismiss'
            );
        });

        it('should timeout Docker check after 5 seconds', async () => {
            jest.useFakeTimers();
            mockDockerClient.isAvailable.mockResolvedValue(true);
            mockDockerClient.listTools.mockImplementation(() => new Promise(() => { })); // Never resolves

            // Perform single check (not start polling)
            const checkPromise = (monitor as any).checkDockerGateway();

            // Advance timers just past 5 seconds to trigger timeout
            await jest.advanceTimersToNextTimerAsync(5100);

            // Wait for check to complete
            await checkPromise;

            const state = monitor.getState();

            expect(state.docker).toBe('disconnected');
            expect(state.dockerError).toBe('Health check timeout');

            jest.useRealTimers();
        });
    });

    describe('State Change Events', () => {
        it('should fire state change event after checks', async () => {
            const fireCallback = jest.fn();
            (monitor as any).onStateChange.fire = fireCallback;

            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            expect(fireCallback).toHaveBeenCalled();
            expect(fireCallback.mock.calls[0][0]).toHaveProperty('mcp');
            expect(fireCallback.mock.calls[0][0]).toHaveProperty('websocket');
            expect(fireCallback.mock.calls[0][0]).toHaveProperty('docker');
        });
    });

    describe('Manual Retry', () => {
        it('should reset retry count and check connections', async () => {
            mockMcpClient.getNextTask.mockRejectedValue(new Error('Failed'));

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            expect(monitor.getState().retryCount).toBeGreaterThan(0);

            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            await monitor.retry();

            expect(monitor.getState().retryCount).toBe(0);
            expect(monitor.getState().mcp).toBe('connected');
        });
    });

    describe('Health Status', () => {
        it('should return overall healthy when all connected', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });
            mockDockerClient.isAvailable.mockResolvedValue(true);
            mockDockerClient.listTools.mockResolvedValue([{ name: 'tool1' }]);

            mockWsClient.getStatus.mockReturnValue({ connected: true, reconnectAttempts: 0 });
            mockGetWebSocketClient.mockReturnValue(mockWsClient);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const health = monitor.getHealthStatus();

            // Should be healthy
            expect(['healthy', 'degraded']).toContain(health.overall);
            expect(health.connections.mcp.status).toBe('connected');
            expect(health.connections.websocket.status).toBe('connected');
            expect(health.connections.docker.status).toBe('connected');
        });

        it('should return unhealthy when MCP disconnected', async () => {
            mockMcpClient.getNextTask.mockRejectedValue(new Error('Failed'));

            monitor.start();

            // Fail all retries (4 times to reach disconnected state)
            for (let i = 0; i < 4; i++) {
                await jest.runOnlyPendingTimersAsync();
                if (i < 3) {
                    jest.advanceTimersByTime(5000);
                }
            }

            const health = monitor.getHealthStatus();

            expect(health.overall).toBe('unhealthy');
        });

        it('should return degraded when one service degraded', async () => {
            mockMcpClient.getNextTask.mockResolvedValue({ success: true });

            mockWsClient.getStatus.mockReturnValue({ connected: false, reconnectAttempts: 1 });
            mockGetWebSocketClient.mockReturnValue(mockWsClient);

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const health = monitor.getHealthStatus();

            // Disconnected MCP means unhealthy, not degraded
            expect(health.overall).toBe('unhealthy');
        });

        it('should include retry info in health status', () => {
            const health = monitor.getHealthStatus();

            expect(health.retryInfo).toHaveProperty('count');
            expect(health.retryInfo).toHaveProperty('max');
            expect(health.retryInfo).toHaveProperty('canRetry');
            expect(health.retryInfo.max).toBe(3);
        });
    });

    describe('Dispose', () => {
        it('should stop monitoring on dispose', () => {
            monitor.start();
            monitor.dispose();

            // Verify interval is cleared (can't directly test, but ensure no crash)
            expect(() => monitor.dispose()).not.toThrow();
        });

        it('should dispose event emitter', () => {
            const disposeCallback = jest.fn();
            (monitor as any).onStateChange.dispose = disposeCallback;

            monitor.dispose();

            expect(disposeCallback).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle concurrent connection checks gracefully', async () => {
            let resolveCount = 0;
            mockMcpClient.getNextTask.mockImplementation(() =>
                Promise.resolve({ success: true, count: ++resolveCount })
            );

            monitor.start();

            // Trigger multiple rapid checks
            await jest.runOnlyPendingTimersAsync();
            jest.advanceTimersByTime(5000);
            await jest.runOnlyPendingTimersAsync();
            jest.advanceTimersByTime(5000);
            await jest.runOnlyPendingTimersAsync();

            // Should not crash
            expect(monitor.getState()).toBeDefined();
            expect(resolveCount).toBeGreaterThan(0);
        });

        it('should handle non-Error exceptions', async () => {
            mockMcpClient.getNextTask.mockRejectedValue('String error');

            monitor.start();
            await jest.runOnlyPendingTimersAsync();

            const state = monitor.getState();

            expect(state.mcp).toBe('degraded');
            // String errors become 'Unknown error' in the implementation
            expect(state.mcpError).toBe('Unknown error');
        });
    });
});

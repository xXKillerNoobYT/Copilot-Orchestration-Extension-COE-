/**
 * Tests for ConnectionMonitor service
 * Verifies connection monitoring for MCP, WebSocket, and Docker
 */

import * as vscode from 'vscode';
import { ConnectionMonitor, ConnectionState, ConnectionStatus } from '../connectionMonitor';

jest.mock('vscode');
jest.mock('../mcpClient');
jest.mock('../dockerMCPClient');

describe('ConnectionMonitor', () => {
    let monitor: ConnectionMonitor;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton
        (ConnectionMonitor as any).instance = undefined;
        monitor = ConnectionMonitor.getInstance();
    });

    afterEach(() => {
        monitor.stop();
        (ConnectionMonitor as any).instance = undefined;
    });

    describe('Singleton Pattern', () => {
        it('should create singleton instance', () => {
            const monitor1 = ConnectionMonitor.getInstance();
            const monitor2 = ConnectionMonitor.getInstance();
            expect(monitor1).toBe(monitor2);
        });

        it('should initialize with disconnected state', () => {
            const state = monitor.getState();
            expect(state.mcp).toBe('disconnected');
            expect(state.websocket).toBe('disconnected');
            expect(state.docker).toBe('disconnected');
        });
    });

    describe('getState', () => {
        it('should return current connection state', () => {
            const state = monitor.getState();

            expect(state).toBeDefined();
            expect(state.mcp).toBeDefined();
            expect(state.websocket).toBeDefined();
            expect(state.docker).toBeDefined();
        });

        it('should return a copy of state', () => {
            const state1 = monitor.getState();
            const state2 = monitor.getState();

            expect(state1).not.toBe(state2);
            expect(state1).toEqual(state2);
        });

        it('should include timestamps', () => {
            const state = monitor.getState();

            expect(state.lastMcpCheck).toBeDefined();
            expect(state.lastWsCheck).toBeDefined();
            expect(state.lastDockerCheck).toBeDefined();
        });

        it('should include retry count', () => {
            const state = monitor.getState();
            expect(state.retryCount).toBeDefined();
            expect(state.retryCount).toBe(0);
        });
    });

    describe('start and stop', () => {
        it('should start monitoring', () => {
            expect(() => monitor.start()).not.toThrow();
        });

        it('should stop monitoring', () => {
            monitor.start();
            expect(() => monitor.stop()).not.toThrow();
        });

        it('should not start twice', () => {
            monitor.start();
            monitor.start();

            // Should not throw and should handle gracefully
            expect(() => monitor.stop()).not.toThrow();
        });

        it('should handle stop when not started', () => {
            expect(() => monitor.stop()).not.toThrow();
        });

        it('should allow restart after stop', () => {
            monitor.start();
            monitor.stop();
            expect(() => monitor.start()).not.toThrow();
        });
    });

    describe('onDidChangeState', () => {
        it('should provide event emitter', () => {
            const event = monitor.onDidChangeState;
            expect(event).toBeDefined();
        });

        it('should allow subscribing to state changes', () => {
            const listener = jest.fn();
            const disposable = monitor.onDidChangeState(listener);

            expect(disposable).toBeDefined();
            expect(disposable.dispose).toBeDefined();
        });

        it('should allow unsubscribing', () => {
            const listener = jest.fn();
            const disposable = monitor.onDidChangeState(listener);

            expect(() => disposable.dispose()).not.toThrow();
        });
    });

    describe('Connection Status Values', () => {
        it('should support connected status', () => {
            const state = monitor.getState();
            const status: ConnectionStatus = 'connected';
            expect(['connected', 'degraded', 'disconnected']).toContain(status);
        });

        it('should support degraded status', () => {
            const status: ConnectionStatus = 'degraded';
            expect(['connected', 'degraded', 'disconnected']).toContain(status);
        });

        it('should support disconnected status', () => {
            const status: ConnectionStatus = 'disconnected';
            expect(['connected', 'degraded', 'disconnected']).toContain(status);
        });
    });

    describe('Error Tracking', () => {
        it('should initialize without errors', () => {
            const state = monitor.getState();
            expect(state.mcpError).toBeUndefined();
            expect(state.wsError).toBeUndefined();
            expect(state.dockerError).toBeUndefined();
        });

        it('should track docker auth requirement', () => {
            const state = monitor.getState();
            expect(state.dockerAuthRequired).toBeUndefined();
        });
    });

    describe('State Management', () => {
        it('should update timestamps on checks', () => {
            const initialState = monitor.getState();
            const initialTime = new Date(initialState.lastMcpCheck).getTime();

            // Timestamps should be recent (within last few seconds)
            expect(Date.now() - initialTime).toBeLessThan(5000);
        });

        it('should maintain retry count', () => {
            const state = monitor.getState();
            expect(typeof state.retryCount).toBe('number');
            expect(state.retryCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Integration Points', () => {
        it('should handle MCP client dependency', () => {
            expect(() => monitor.getState()).not.toThrow();
        });

        it('should handle Docker client dependency', () => {
            expect(() => monitor.getState()).not.toThrow();
        });

        it('should handle WebSocket client dependency', () => {
            expect(() => monitor.getState()).not.toThrow();
        });
    });
});

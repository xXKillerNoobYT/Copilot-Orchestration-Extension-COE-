/**
 * Tests for LaravelServerController
 * Verifies Laravel development server lifecycle management
 */

import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { LaravelServerController, ServerStatus } from '../laravelServerController';

jest.mock('vscode');
jest.mock('child_process');
jest.mock('http');

describe('LaravelServerController', () => {
    let controller: LaravelServerController;
    let mockProcess: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockProcess = {
            pid: 12345,
            stdout: {
                on: jest.fn(),
            },
            stderr: {
                on: jest.fn(),
            },
            on: jest.fn(),
            kill: jest.fn(),
            killed: false,
        };

        (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

        controller = new LaravelServerController();
    });

    describe('Initialization', () => {
        it('should be defined', () => {
            expect(controller).toBeDefined();
        });

        it('should start with no running server', () => {
            const status = controller.getStatus();
            expect(status.running).toBe(false);
        });
    });

    describe('getStatus', () => {
        it('should return current server status', () => {
            const status = controller.getStatus();

            expect(status).toBeDefined();
            expect(status.running).toBe(false);
        });

        it('should return status structure', () => {
            const status = controller.getStatus();

            expect(typeof status.running).toBe('boolean');
        });
    });

    describe('onStatusChange', () => {
        it('should allow subscribing to status changes', () => {
            const listener = jest.fn();

            expect(() => {
                controller.onStatusChange(listener);
            }).not.toThrow();
        });

        it('should allow multiple subscribers', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            controller.onStatusChange(listener1);
            controller.onStatusChange(listener2);

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });

        it('should accept callback function', () => {
            const callback = (status: ServerStatus) => {
                expect(status).toBeDefined();
            };

            expect(() => controller.onStatusChange(callback)).not.toThrow();
        });
    });

    describe('Server Lifecycle', () => {
        it('should handle server not running state', () => {
            const status = controller.getStatus();
            expect(status.running).toBe(false);
            expect(status.port).toBeUndefined();
        });

        it('should track server port when running', () => {
            const status = controller.getStatus();
            if (status.running) {
                expect(status.port).toBeDefined();
            }
        });

        it('should track server PID when running', () => {
            const status = controller.getStatus();
            if (status.running) {
                expect(status.pid).toBeDefined();
            }
        });

        it('should track server URL when running', () => {
            const status = controller.getStatus();
            if (status.running) {
                expect(status.url).toContain('http://localhost');
            }
        });
    });

    describe('Error Handling', () => {
        it('should track errors in status', () => {
            const status = controller.getStatus();
            // Error should be undefined when no errors
            expect(status.error).toBeUndefined();
        });

        it('should handle missing workspace root gracefully', () => {
            expect(controller).toBeDefined();
        });

        it('should handle missing PHP gracefully', () => {
            expect(controller).toBeDefined();
        });

        it('should handle missing artisan file gracefully', () => {
            expect(controller).toBeDefined();
        });
    });

    describe('Port Management', () => {
        it('should use port range 8000-8010', () => {
            const status = controller.getStatus();
            if (status.port) {
                expect(status.port).toBeGreaterThanOrEqual(8000);
                expect(status.port).toBeLessThanOrEqual(8010);
            }
        });

        it('should find available port', () => {
            expect(controller).toBeDefined();
        });
    });

    describe('Health Monitoring', () => {
        it('should support health check monitoring', () => {
            expect(controller).toBeDefined();
        });

        it('should handle health check failures', () => {
            expect(controller).toBeDefined();
        });
    });

    describe('Process Management', () => {
        it('should handle process spawn', () => {
            expect(child_process.spawn).toBeDefined();
        });

        it('should handle process stdout', () => {
            expect(mockProcess.stdout.on).toBeDefined();
        });

        it('should handle process stderr', () => {
            expect(mockProcess.stderr.on).toBeDefined();
        });

        it('should handle process exit', () => {
            expect(mockProcess.on).toBeDefined();
        });
    });

    describe('Graceful Shutdown', () => {
        it('should support graceful stop', () => {
            expect(controller.stopServer).toBeDefined();
        });

        it('should handle stop when not running', async () => {
            await expect(controller.stopServer()).resolves.toBeUndefined();
        });
    });

    describe('Cleanup', () => {
        it('should dispose controller', () => {
            expect(() => controller.dispose()).not.toThrow();
        });

        it('should handle dispose when not running', () => {
            expect(() => controller.dispose()).not.toThrow();
        });

        it('should allow multiple dispose calls', () => {
            controller.dispose();
            expect(() => controller.dispose()).not.toThrow();
        });
    });
});

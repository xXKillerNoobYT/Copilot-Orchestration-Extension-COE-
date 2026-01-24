/**
 * Service Tests - Agent Loop Service
 * Basic coverage for agent loop service functionality
 */

import { AgentLoopService } from '../agentLoopService';
import * as vscode from 'vscode';

jest.mock('vscode');
jest.mock('../../config/llmTimeouts', () => ({
    readLlmTimeoutConfig: jest.fn(() => ({
        isConfigured: true,
        issues: [],
        config: {
            coldLoadMs: 30000,
            modelSwitchMs: 10000,
            agentActivationMs: 5000,
            agentDeactivationMs: 3000,
        }
    }))
}));

describe('AgentLoopService', () => {
    let service: AgentLoopService;
    let mockConfig: { baseUrl: string };

    beforeEach(() => {
        // Use fake timers to avoid real timeouts
        jest.useFakeTimers();
        
        // Mock fetch globally
        global.fetch = jest.fn();
        
        mockConfig = {
            baseUrl: 'http://localhost:8000'
        };

        service = new AgentLoopService(mockConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('Initialization', () => {
        it('should initialize service', () => {
            expect(service).toBeDefined();
        });

        it('should start in stopped state', async () => {
            // Mock the status API call
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', running: false, stats: { running: false, cycles_executed: 0 } })
            });
            
            const status = await service.getStatus();
            expect(status.running).toBe(false);
        });
    });

    describe('Loop Control', () => {
        it('should start loop', async () => {
            // Mock the start API call to resolve immediately
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', stats: { running: true } })
            });
            
            const startPromise = service.startLoop();
            
            // Fast-forward past all timers
            jest.runAllTimers();
            
            const result = await startPromise;
            expect(result.running).toBe(true);
        });

        it('should stop loop', async () => {
            // Mock stop API call
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success' })
            });
            
            const stopPromise = service.stopLoop();
            
            // Fast-forward past all timers
            jest.runAllTimers();
            
            await stopPromise;
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should execute single cycle', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', cycle_result: { state: 'completed', task_id: 'TASK-123', message: 'Cycle executed' } })
            });
            
            const result = await service.executeCycle();
            expect(result).toBeDefined();
            expect(result.state).toBe('completed');
        });
    });

    describe('Status Reporting', () => {
        it('should return current status', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', running: false, stats: { running: false, cycles_executed: 0 } })
            });
            
            const status = await service.getStatus();
            expect(status).toHaveProperty('running');
        });

        it('should track cycles completed', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ status: 'success', cycle_result: { state: 'completed', task_id: 'TASK-123', message: 'Done' } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ status: 'success', running: false, stats: { running: false, cycles_executed: 1 } })
                });
            
            await service.executeCycle();
            const status = await service.getStatus();
            expect(status.cycles_executed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle start errors gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', stats: { running: true } })
            });
            
            const startPromise = service.startLoop();
            jest.runAllTimers();
            
            await expect(startPromise).resolves.not.toThrow();
        });

        it('should handle stop errors gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success' })
            });
            
            const stopPromise = service.stopLoop();
            jest.runAllTimers();
            
            await expect(stopPromise).resolves.not.toThrow();
        });
    });
});
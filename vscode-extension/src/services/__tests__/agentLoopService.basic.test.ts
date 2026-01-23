/**
 * Service Tests - Agent Loop Service
 * Basic coverage for agent loop service functionality
 */

import { AgentLoopService } from '../agentLoopService';
import * as vscode from 'vscode';

jest.mock('vscode');

describe('AgentLoopService', () => {
    let service: AgentLoopService;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        service = new AgentLoopService(mockContext);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize service', () => {
            expect(service).toBeDefined();
        });

        it('should start in stopped state', () => {
            const status = service.getStatus();
            expect(status.isRunning).toBe(false);
        });
    });

    describe('Loop Control', () => {
        it('should start loop', async () => {
            await service.start();
            const status = service.getStatus();
            expect(status.isRunning).toBe(true);
        });

        it('should stop loop', async () => {
            await service.start();
            await service.stop();
            const status = service.getStatus();
            expect(status.isRunning).toBe(false);
        });

        it('should execute single cycle', async () => {
            const result = await service.executeSingleCycle();
            expect(result).toBeDefined();
        });
    });

    describe('Status Reporting', () => {
        it('should return current status', () => {
            const status = service.getStatus();
            expect(status).toHaveProperty('isRunning');
            expect(status).toHaveProperty('cyclesCompleted');
        });

        it('should track cycles completed', async () => {
            await service.executeSingleCycle();
            const status = service.getStatus();
            expect(status.cyclesCompleted).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle start errors gracefully', async () => {
            await expect(service.start()).resolves.not.toThrow();
        });

        it('should handle stop errors gracefully', async () => {
            await expect(service.stop()).resolves.not.toThrow();
        });
    });
});
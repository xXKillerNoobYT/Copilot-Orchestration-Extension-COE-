/**
 * Programming Orchestrator Panel Tests
 * 
 * Tests for F024: Programming Orchestrator Dashboard
 */

import * as vscode from 'vscode';
import { ProgrammingOrchestratorPanel } from '../ProgrammingOrchestratorPanel';
import { BossAICoordinator, TeamStatus } from '../../orchestration/bossAI';
import { AgentTeam } from '../../routing/taskRouter';

// Mock vscode module
jest.mock('vscode');

describe('ProgrammingOrchestratorPanel', () => {
    let mockExtensionUri: vscode.Uri;
    let mockWebviewPanel: any;
    let mockWebview: any;
    let mockCoordinator: BossAICoordinator;

    beforeEach(() => {
        // Setup mocks
        mockExtensionUri = { fsPath: '/test/path', scheme: 'file' } as any;
        
        mockWebview = {
            html: '',
            postMessage: jest.fn(),
            onDidReceiveMessage: jest.fn(),
            cspSource: 'test-csp',
            asWebviewUri: jest.fn((uri) => uri),
        };

        mockWebviewPanel = {
            webview: mockWebview,
            onDidDispose: jest.fn(),
            reveal: jest.fn(),
            dispose: jest.fn(),
        };

        (vscode.window.createWebviewPanel as jest.Mock) = jest.fn().mockReturnValue(mockWebviewPanel);
        (vscode.Uri.joinPath as jest.Mock) = jest.fn((uri, ...paths) => ({
            ...uri,
            path: paths.join('/'),
        }));

        // Create coordinator
        mockCoordinator = new BossAICoordinator();

        // Clear singleton
        (ProgrammingOrchestratorPanel as any).currentPanel = undefined;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Panel Creation', () => {
        it('should create panel with correct title and options', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'programmingOrchestratorDashboard',
                'Programming Orchestrator',
                expect.any(Number),
                expect.objectContaining({
                    enableScripts: true,
                    retainContextWhenHidden: true,
                })
            );
        });

        it('should create coordinator if not provided', () => {
            const panel = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri);
            expect(panel).toBeDefined();
        });

        it('should reuse existing panel', () => {
            const panel1 = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);
            const panel2 = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            expect(panel1).toBe(panel2);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
        });

        it('should set HTML content on webview', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            expect(mockWebview.html).toContain('Programming Orchestrator');
            expect(mockWebview.html).toContain('dashboard-grid');
            expect(mockWebview.html).toContain('Live Metrics');
        });
    });

    describe('Live Updates', () => {
        it('should start live updates on creation', (done) => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            // Wait for first update (should happen within 500ms)
            setTimeout(() => {
                expect(mockWebview.postMessage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'dashboardUpdate',
                        data: expect.objectContaining({
                            teamStates: expect.any(Array),
                            metrics: expect.any(Object),
                            settings: expect.any(Object),
                        }),
                    })
                );
                done();
            }, 600);
        });

        it('should send dashboard updates with team states', (done) => {
            // Assign a task to simulate activity
            mockCoordinator.assignTask(AgentTeam.Planning, { id: 'test-1', title: 'Test Task' });

            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            setTimeout(() => {
                const calls = (mockWebview.postMessage as jest.Mock).mock.calls;
                const updateCall = calls.find(call => call[0].type === 'dashboardUpdate');

                expect(updateCall).toBeDefined();
                expect(updateCall[0].data.teamStates).toHaveLength(4); // 4 teams
                done();
            }, 600);
        });

        it('should update metrics periodically', (done) => {
            const panel = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            // Simulate task completion
            mockCoordinator.assignTask(AgentTeam.Planning, { id: 'test-1' });
            mockCoordinator.completeTask(AgentTeam.Planning, true, 100);

            setTimeout(() => {
                const calls = (mockWebview.postMessage as jest.Mock).mock.calls;
                const updates = calls.filter(call => call[0].type === 'dashboardUpdate');

                // Should have multiple updates within 1 second
                expect(updates.length).toBeGreaterThan(1);
                done();
            }, 1100);
        });
    });

    describe('Message Handling', () => {
        it('should handle ready message', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            messageHandler({ type: 'ready' });

            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'dashboardUpdate' })
            );
        });

        it('should handle settings update', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            const newSettings = {
                autoDecompose: false,
                requireVisualVerification: true,
            };

            messageHandler({ type: 'updateSettings', settings: newSettings });

            const updatedSettings = mockCoordinator.getSettings();
            expect(updatedSettings.autoDecompose).toBe(false);
            expect(updatedSettings.requireVisualVerification).toBe(true);
        });

        it('should handle refresh request', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            
            // Clear previous calls
            jest.clearAllMocks();
            
            messageHandler({ type: 'refreshDashboard' });

            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'dashboardUpdate' })
            );
        });
    });

    describe('Panel Lifecycle', () => {
        it('should clean up on dispose', () => {
            jest.useFakeTimers();
            
            const panel = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            // Trigger dispose
            const disposeHandler = (mockWebviewPanel.onDidDispose as jest.Mock).mock.calls[0][0];
            disposeHandler();

            // Fast-forward time to check if intervals are cleared
            jest.advanceTimersByTime(1000);

            // Should not send any more updates after disposal
            const callsBeforeDispose = (mockWebview.postMessage as jest.Mock).mock.calls.length;
            jest.advanceTimersByTime(1000);
            const callsAfterDispose = (mockWebview.postMessage as jest.Mock).mock.calls.length;

            expect(callsAfterDispose).toBe(callsBeforeDispose);

            jest.useRealTimers();
        });

        it('should allow recreation after disposal', () => {
            const panel1 = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);
            
            // Dispose
            const disposeHandler = (mockWebviewPanel.onDidDispose as jest.Mock).mock.calls[0][0];
            disposeHandler();

            // Create again
            const panel2 = ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
            expect(panel2).not.toBe(panel1);
        });
    });

    describe('Dashboard Content', () => {
        it('should include all 4 team status cards', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const html = mockWebview.html;
            expect(html).toContain('team-cards');
            expect(html).toContain('dashboard-grid');
        });

        it('should include metrics section', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const html = mockWebview.html;
            expect(html).toContain('metrics-section');
            expect(html).toContain('Tasks Created');
            expect(html).toContain('Tasks Completed');
            expect(html).toContain('Tasks Verified');
            expect(html).toContain('Agent Utilization');
            expect(html).toContain('Completion Rate');
        });

        it('should include coordination toggles', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const html = mockWebview.html;
            expect(html).toContain('toggle-auto-decompose');
            expect(html).toContain('toggle-visual-verification');
            expect(html).toContain('toggle-multi-team');
            expect(html).toContain('toggle-parallel');
        });

        it('should include plan selector', () => {
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            const html = mockWebview.html;
            expect(html).toContain('plan-select');
            expect(html).toContain('btn-load-plan');
            expect(html).toContain('btn-refresh');
        });
    });

    describe('Performance Requirements', () => {
        it('should update dashboard within 500ms latency requirement', (done) => {
            const startTime = Date.now();
            
            ProgrammingOrchestratorPanel.createOrShow(mockExtensionUri, mockCoordinator);

            // Check when first update arrives
            const checkUpdate = setInterval(() => {
                if ((mockWebview.postMessage as jest.Mock).mock.calls.length > 0) {
                    const latency = Date.now() - startTime;
                    expect(latency).toBeLessThan(500);
                    clearInterval(checkUpdate);
                    done();
                }
            }, 50);
        });
    });
});

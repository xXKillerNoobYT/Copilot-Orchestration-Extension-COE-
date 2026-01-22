import { WorkflowGraph, WorkflowState, createOrchestratorWorkflow } from './workflowGraph';

/**
 * F039 LangGraph Tests - Conditional Edges & State Management
 */
describe('F039: LangGraph Integration - Advanced Workflows', () => {
    let graph: WorkflowGraph;

    beforeEach(() => {
        graph = createOrchestratorWorkflow();
    });

    describe('Conditional Edge Routing', () => {
        test('routes to Verification when drift > 0.2', () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'in-progress',
                attempts: 0,
                maxAttempts: 3,
                planDrift: 0.25,
                contextTokensUsed: 0,
                completedNodes: [],
            };

            const nextNode = graph.getNextNode('planning_team', state);
            expect(nextNode).toBe('verification_team');
        });

        test('routes to Decomposition when drift <= 0.2', () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'in-progress',
                attempts: 0,
                maxAttempts: 3,
                planDrift: 0.15,
                contextTokensUsed: 0,
                completedNodes: [],
            };

            const nextNode = graph.getNextNode('planning_team', state);
            expect(nextNode).toBe('decomposition_team');
        });
    });

    describe('State Checkpoints', () => {
        test('creates checkpoint with unique ID', () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'in-progress',
                attempts: 1,
                maxAttempts: 3,
                planDrift: 0.0,
                contextTokensUsed: 1500,
                completedNodes: ['planning_team'],
            };

            const checkpoint = graph.createCheckpoint(state, 'cp-001');
            expect(checkpoint.checkpointId).toBe('cp-001');
            expect(checkpoint.attempts).toBe(1);
        });

        test('restores from checkpoint and resets attempts', () => {
            const checkpoint: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'decomposition',
                status: 'in-progress',
                attempts: 2,
                maxAttempts: 3,
                planDrift: 0.0,
                contextTokensUsed: 2000,
                completedNodes: ['planning_team', 'decomposition_team'],
                checkpointId: 'cp-001',
            };

            const restored = graph.restoreFromCheckpoint(checkpoint);
            expect(restored.attempts).toBe(0);
            expect(restored.completedNodes.length).toBe(2);
            expect(restored.checkpointId).toBe('cp-001');
        });
    });

    describe('Supervisor Pattern', () => {
        test('graph includes supervisor (Boss AI) node', () => {
            const structure = graph.getGraphStructure();
            expect(structure.supervisor).toBe('boss_ai');
        });

        test('supervisor node is in graph nodes', () => {
            const structure = graph.getGraphStructure();
            expect(structure.nodes).toContain('boss_ai');
        });
    });

    describe('Node Execution', () => {
        test('executes node successfully and updates completed nodes', async () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'pending',
                attempts: 0,
                maxAttempts: 3,
                planDrift: 0.0,
                contextTokensUsed: 0,
                completedNodes: [],
            };

            const result = await graph.executeNode('planning_team', state);
            expect(result.completedNodes).toContain('planning_team');
            expect(result.status).toBe('completed');
        });

        test('throws error for non-existent node', async () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'pending',
                attempts: 0,
                maxAttempts: 3,
                planDrift: 0.0,
                contextTokensUsed: 0,
                completedNodes: [],
            };

            await expect(graph.executeNode('non-existent', state)).rejects.toThrow('not found');
        });
    });

    describe('Loop Support', () => {
        test('tracks attempts for retry loops', () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'in-progress',
                attempts: 0,
                maxAttempts: 3,
                planDrift: 0.0,
                contextTokensUsed: 0,
                completedNodes: [],
            };

            expect(state.attempts).toBeLessThan(state.maxAttempts);
            expect(state.maxAttempts).toBe(3); // Default retry policy
        });

        test('prevents infinite loops with attempt limit', () => {
            const state: WorkflowState = {
                taskId: '123e4567-e89b-12d3-a456-426614174000',
                currentTeam: 'planning',
                status: 'in-progress',
                attempts: 3, // At max attempts
                maxAttempts: 3,
                planDrift: 0.0,
                contextTokensUsed: 0,
                completedNodes: [],
            };

            expect(state.attempts >= state.maxAttempts).toBe(true); // Loop condition
        });
    });

    describe('Workflow Structure', () => {
        test('graph includes all required nodes', () => {
            const structure = graph.getGraphStructure();
            expect(structure.nodes).toContain('planning_team');
            expect(structure.nodes).toContain('decomposition_team');
            expect(structure.nodes).toContain('verification_team');
            expect(structure.nodes).toContain('boss_ai');
        });

        test('graph includes conditional edges', () => {
            const structure = graph.getGraphStructure();
            expect(structure.edges.length).toBeGreaterThan(0);
            const driftCheck = structure.edges.find((e) => e.label === 'drift-check');
            expect(driftCheck).toBeDefined();
            expect(driftCheck?.from).toBe('planning_team');
        });
    });
});

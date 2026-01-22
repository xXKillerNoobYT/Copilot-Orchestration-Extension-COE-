/**
 * Tests for Boss AI Coordinator (F036)
 */

import { BossAICoordinator, TeamStatus } from './bossAI';
import { AgentTeam, Task } from '../routing/taskRouter';

describe('Boss AI Coordinator (F036)', () => {
  let coordinator: BossAICoordinator;

  beforeEach(() => {
    coordinator = new BossAICoordinator();
  });

  describe('Initialization', () => {
    test('initializes with default settings', () => {
      const settings = coordinator.getSettings();
      expect(settings.autoDecompose).toBe(true);
      expect(settings.requireVisualVerification).toBe(true);
      expect(settings.multiTeamHandoff).toBe(true);
      expect(settings.parallelExecution).toBe(false);
      expect(settings.maxRetries).toBe(3);
      expect(settings.timeout).toBe(30000);
    });

    test('initializes all 4 team states as Idle', () => {
      const teams = coordinator.getAllTeamStates();
      expect(teams.length).toBe(4);
      teams.forEach((team) => {
        expect(team.status).toBe(TeamStatus.Idle);
        expect(team.currentTask).toBeNull();
        expect(team.tasksCompleted).toBe(0);
      });
    });

    test('accepts custom settings', () => {
      const custom = new BossAICoordinator({ autoDecompose: false, maxRetries: 5 });
      const settings = custom.getSettings();
      expect(settings.autoDecompose).toBe(false);
      expect(settings.maxRetries).toBe(5);
    });
  });

  describe('Task Routing', () => {
    test('routes task with >1 hour to Decomposition', () => {
      const task: Task = { title: 'Complex task', estimatedHours: 2 };
      const team = coordinator.routeTaskToTeam(task);
      expect(team).toBe(AgentTeam.Decomposition);
    });

    test('routes done task to Verification', () => {
      const task: Task = { title: 'Done task', status: 'done' };
      const team = coordinator.routeTaskToTeam(task);
      expect(team).toBe(AgentTeam.Verification);
    });

    test('routes question to Answer Team', () => {
      const task: Task = { title: 'Question', type: 'question' };
      const team = coordinator.routeTaskToTeam(task);
      expect(team).toBe(AgentTeam.Answer);
    });

    test('routes default task to Planning', () => {
      const task: Task = { title: 'Default task' };
      const team = coordinator.routeTaskToTeam(task);
      expect(team).toBe(AgentTeam.Planning);
    });

    test('increments tasks created metric on routing', () => {
      const task: Task = { title: 'Test' };
      const beforeMetrics = coordinator.getMetrics();
      coordinator.routeTaskToTeam(task);
      const afterMetrics = coordinator.getMetrics();
      expect(afterMetrics.tasksCreated).toBe(beforeMetrics.tasksCreated + 1);
    });
  });

  describe('Task Assignment', () => {
    test('assigns task to team and updates state', () => {
      const task: Task = { title: 'Test task', id: 'task-1' };
      coordinator.assignTask(AgentTeam.Planning, task);
      
      const teamState = coordinator.getTeamState(AgentTeam.Planning);
      expect(teamState?.status).toBe(TeamStatus.Active);
      expect(teamState?.currentTask).toEqual(task);
      expect(teamState?.lastActivity).toBeInstanceOf(Date);
    });

    test('throws error for unknown team', () => {
      const task: Task = { title: 'Test' };
      expect(() => {
        coordinator.assignTask('UnknownTeam' as AgentTeam, task);
      }).toThrow();
    });
  });

  describe('Task Completion', () => {
    test('marks task as completed and updates metrics', () => {
      const task: Task = { title: 'Test task' };
      coordinator.assignTask(AgentTeam.Planning, task);
      
      const beforeMetrics = coordinator.getMetrics();
      coordinator.completeTask(AgentTeam.Planning, true, 1000);
      const afterMetrics = coordinator.getMetrics();
      
      const teamState = coordinator.getTeamState(AgentTeam.Planning);
      expect(teamState?.status).toBe(TeamStatus.Idle);
      expect(teamState?.currentTask).toBeNull();
      expect(teamState?.tasksCompleted).toBe(1);
      expect(afterMetrics.tasksCompleted).toBe(beforeMetrics.tasksCompleted + 1);
    });

    test('updates average response time', () => {
      const task: Task = { title: 'Test' };
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.completeTask(AgentTeam.Planning, true, 2000);
      
      const teamState = coordinator.getTeamState(AgentTeam.Planning);
      expect(teamState?.avgResponseTimeMs).toBe(2000);
      
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.completeTask(AgentTeam.Planning, true, 4000);
      
      const updatedState = coordinator.getTeamState(AgentTeam.Planning);
      expect(updatedState?.avgResponseTimeMs).toBe(3000); // (2000 + 4000) / 2
    });

    test('increments verified metric for Verification team', () => {
      const task: Task = { title: 'Test' };
      coordinator.assignTask(AgentTeam.Verification, task);
      
      const beforeMetrics = coordinator.getMetrics();
      coordinator.completeTask(AgentTeam.Verification, true, 500);
      const afterMetrics = coordinator.getMetrics();
      
      expect(afterMetrics.tasksVerified).toBe(beforeMetrics.tasksVerified + 1);
    });

    test('increases failure rate on failed completion', () => {
      const task: Task = { title: 'Test' };
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.completeTask(AgentTeam.Planning, false, 1000);
      
      const teamState = coordinator.getTeamState(AgentTeam.Planning);
      expect(teamState?.failureRate).toBeGreaterThan(0);
    });

    test('decreases failure rate on successful completion after failure', () => {
      const task: Task = { title: 'Test' };
      
      // Fail once
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.completeTask(AgentTeam.Planning, false, 1000);
      const afterFailure = coordinator.getTeamState(AgentTeam.Planning)?.failureRate || 0;
      
      // Success
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.completeTask(AgentTeam.Planning, true, 1000);
      const afterSuccess = coordinator.getTeamState(AgentTeam.Planning)?.failureRate || 0;
      
      expect(afterSuccess).toBeLessThan(afterFailure);
    });
  });

  describe('Error Handling', () => {
    test('handles team error and updates status', () => {
      const error = new Error('Test error');
      coordinator.handleTeamError(AgentTeam.Planning, error);
      
      const teamState = coordinator.getTeamState(AgentTeam.Planning);
      expect(teamState?.status).toBe(TeamStatus.Error);
      expect(teamState?.failureRate).toBeGreaterThan(0);
    });

    test('increases failure rate significantly on error', () => {
      const beforeState = coordinator.getTeamState(AgentTeam.Planning);
      const beforeRate = beforeState?.failureRate || 0;
      
      coordinator.handleTeamError(AgentTeam.Planning, new Error('Test'));
      
      const afterState = coordinator.getTeamState(AgentTeam.Planning);
      const afterRate = afterState?.failureRate || 0;
      
      expect(afterRate).toBeGreaterThanOrEqual(beforeRate + 0.2);
    });
  });

  describe('Drift Detection', () => {
    test('returns 0 for identical versions', () => {
      const drift = coordinator.detectDrift('v1.0.0', 'v1.0.0');
      expect(drift).toBe(0);
    });

    test('returns 0.2 for different versions', () => {
      const drift = coordinator.detectDrift('v1.0.0', 'v1.1.0');
      expect(drift).toBe(0.2);
    });
  });

  describe('Metrics Aggregation', () => {
    test('calculates agent utilization correctly', () => {
      const task: Task = { title: 'Test' };
      
      // 0% utilization initially
      let metrics = coordinator.getMetrics();
      expect(metrics.agentUtilization).toBe(0);
      
      // Assign to 2 teams (50% utilization)
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.assignTask(AgentTeam.Answer, task);
      
      metrics = coordinator.getMetrics();
      expect(metrics.agentUtilization).toBe(50); // 2/4 teams = 50%
    });

    test('calculates completion rate correctly', () => {
      const task: Task = { title: 'Test' };
      
      // Create 2 tasks
      coordinator.routeTaskToTeam(task);
      coordinator.routeTaskToTeam(task);
      
      // Complete 1 task
      coordinator.assignTask(AgentTeam.Planning, task);
      coordinator.completeTask(AgentTeam.Planning, true, 1000);
      
      const metrics = coordinator.getMetrics();
      expect(metrics.completionRate).toBe(50); // 1/2 completed = 50%
    });

    test('updates timestamp on metrics changes', () => {
      const before = coordinator.getMetrics().timestamp;
      
      // Wait a bit
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      return delay(10).then(() => {
        coordinator.routeTaskToTeam({ title: 'Test' });
        const after = coordinator.getMetrics().timestamp;
        expect(after.getTime()).toBeGreaterThan(before.getTime());
      });
    });
  });

  describe('Settings Management', () => {
    test('updates settings correctly', () => {
      coordinator.updateSettings({ autoDecompose: false, timeout: 60000 });
      const settings = coordinator.getSettings();
      
      expect(settings.autoDecompose).toBe(false);
      expect(settings.timeout).toBe(60000);
      // Other settings unchanged
      expect(settings.maxRetries).toBe(3);
    });
  });

  describe('Health Monitoring', () => {
    test('reports healthy when all teams are OK', () => {
      const health = coordinator.monitorHealth();
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    test('reports unhealthy when team is in error state', () => {
      coordinator.handleTeamError(AgentTeam.Planning, new Error('Test'));
      const health = coordinator.monitorHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues[0]).toContain('error state');
    });

    test('reports unhealthy when team has high failure rate', () => {
      // Simulate multiple failures
      const task: Task = { title: 'Test' };
      for (let i = 0; i < 6; i++) {
        coordinator.assignTask(AgentTeam.Planning, task);
        coordinator.completeTask(AgentTeam.Planning, false, 1000);
      }
      
      const health = coordinator.monitorHealth();
      expect(health.healthy).toBe(false);
      expect(health.issues.some(issue => issue.includes('failure rate'))).toBe(true);
    });

    test('detects stale tasks', () => {
      const task: Task = { title: 'Test' };
      coordinator.assignTask(AgentTeam.Planning, task);
      
      // Manually set last activity to 6 minutes ago
      const teamState = coordinator.getTeamState(AgentTeam.Planning);
      if (teamState) {
        teamState.lastActivity = new Date(Date.now() - 6 * 60 * 1000);
      }
      
      const health = coordinator.monitorHealth();
      expect(health.healthy).toBe(false);
      expect(health.issues.some(issue => issue.includes('stale task'))).toBe(true);
    });
  });

  describe('Team State Queries', () => {
    test('returns undefined for unknown team', () => {
      const state = coordinator.getTeamState('UnknownTeam' as AgentTeam);
      expect(state).toBeUndefined();
    });

    test('returns all team states', () => {
      const states = coordinator.getAllTeamStates();
      expect(states.length).toBe(4);
      expect(states.map(s => s.team)).toContain(AgentTeam.Planning);
      expect(states.map(s => s.team)).toContain(AgentTeam.Answer);
      expect(states.map(s => s.team)).toContain(AgentTeam.Decomposition);
      expect(states.map(s => s.team)).toContain(AgentTeam.Verification);
    });
  });
});

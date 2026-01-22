import { BossAICoordinator, TeamStatus } from './bossAI';
import { AgentTeam, Task } from '../routing/taskRouter';

describe('BossAICoordinator decomposition hook', () => {
  test('calls onDecomposition when autoDecompose enabled and team is Decomposition', async () => {
    const calls: Task[] = [];
    const coordinator = new BossAICoordinator(
      { autoDecompose: true },
      { onDecomposition: (task: Task) => { calls.push(task); } }
    );

    const task: Task = { id: 'T1', title: 'Big task', estimatedHours: 2 };
    const team = coordinator.routeTaskToTeam(task);
    expect(team).toBe(AgentTeam.Decomposition);

    // Allow async hook to run
    await new Promise(res => setTimeout(res, 10));
    expect(calls.length).toBe(1);
    expect(calls[0].id).toBe('T1');
  });
});

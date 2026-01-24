import { AgentTeam, routeTask, routeTasks, Task } from './taskRouter';

describe('Basic Task Routing Algorithm (F038)', () => {
  test('routes tasks with estimatedHours > 1 to Decomposition', () => {
    const task: Task = { title: 'Large task', estimatedHours: 2 };
    expect(routeTask(task)).toBe(AgentTeam.Decomposition);
  });

  test('does not route tasks with estimatedHours <= 1 to Decomposition', () => {
    const t1: Task = { title: 'Small task', estimatedHours: 1 };
    const t0: Task = { title: 'Unknown estimate', estimatedHours: 0 };
    expect(routeTask(t1)).not.toBe(AgentTeam.Decomposition);
    expect(routeTask(t0)).not.toBe(AgentTeam.Decomposition);
  });

  test("routes tasks with status 'done' to Verification", () => {
    const task: Task = { title: 'Completed task', status: 'done' };
    expect(routeTask(task)).toBe(AgentTeam.Verification);
  });

  test("routes tasks with status 'complete' to Verification (case-insensitive)", () => {
    const t1: Task = { title: 'Completed task', status: 'complete' };
    const t2: Task = { title: 'Completed task', status: 'COMPLETE' } as any;
    expect(routeTask(t1)).toBe(AgentTeam.Verification);
    expect(routeTask(t2)).toBe(AgentTeam.Verification);
  });

  test('routes questions to Answer Team', () => {
    const tQuestion: Task = { title: 'Question', type: 'question' };
    expect(routeTask(tQuestion)).toBe(AgentTeam.Answer);
  });

  test('routes tasks requiring context or with open questions to Answer Team', () => {
    const tContext: Task = { title: 'Needs context', requiresContext: true };
    const tOpenQ: Task = { title: 'Has open questions', hasOpenQuestions: true };
    expect(routeTask(tContext)).toBe(AgentTeam.Answer);
    expect(routeTask(tOpenQ)).toBe(AgentTeam.Answer);
  });

  test('default route is Planning Team', () => {
    const task: Task = { title: 'Default route', estimatedHours: 0.5, status: 'in_progress' };
    expect(routeTask(task)).toBe(AgentTeam.Planning);
  });

  test('batch routing returns array of agent teams', () => {
    const tasks: Task[] = [
      { title: 'Big', estimatedHours: 2 },
      { title: 'Done', status: 'done' },
      { title: 'Question', type: 'question' },
      { title: 'Default' },
    ];
    expect(routeTasks(tasks)).toEqual([
      AgentTeam.Decomposition,
      AgentTeam.Verification,
      AgentTeam.Answer,
      AgentTeam.Planning,
    ]);
  });
});

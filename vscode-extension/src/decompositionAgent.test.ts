import { DecompositionAgent } from './decompositionAgent';

describe('DecompositionAgent', () => {
  test('shouldDecompose returns true when estimated_effort > threshold', () => {
    const agent = new DecompositionAgent({ effortThresholdMinutes: 60 });
    const task: any = {
      id: 'task-1',
      name: 'Implement complex feature',
      description: 'A complex implementation',
      estimated_effort: 120,
      priority: 'high',
    };
    expect(agent.shouldDecompose(task)).toBe(true);
  });

  test('generateSubtasks produces 3–5 subtasks with dependencies', () => {
    const agent = new DecompositionAgent({ effortThresholdMinutes: 60 });
    const parent: any = {
      id: 'task-2',
      name: 'Implement feature XYZ',
      description: 'Feature XYZ requires analysis, implementation, testing, docs, and review',
      estimated_effort: 150,
      priority: 'medium',
    };

    const subtasks = agent.generateSubtasks(parent);
    expect(subtasks.length).toBeGreaterThanOrEqual(3);
    expect(subtasks.length).toBeLessThanOrEqual(5);
    expect(subtasks[0].dependency).toBeUndefined();
    for (let i = 1; i < subtasks.length; i++) {
      expect(typeof subtasks[i].dependency).toBe('string');
    }

    // Each subtask has estimated effort and proper types
    subtasks.forEach(s => {
      expect(s.estimated_effort).toBeGreaterThanOrEqual(15);
      expect(['feature', 'testing', 'documentation', 'maintenance']).toContain(s.task_type);
    });
  });
});

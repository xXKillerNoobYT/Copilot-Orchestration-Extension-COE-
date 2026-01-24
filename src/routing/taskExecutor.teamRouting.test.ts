import { TaskExecutor } from '../taskExecutor';
import { ParsedTask } from '../taskParser';
import { AgentTeam } from './taskRouter';

// Create a small harness exposing getTeamForTask via casting
const executor = new TaskExecutor({ enableVerification: false });
const getTeam = (executor as any).getTeamForTask.bind(executor) as (t: ParsedTask) => AgentTeam;

describe('TaskExecutor team routing (F038)', () => {
  test('routes completed tasks to Verification', () => {
    const task: ParsedTask = {
      id: 't1',
      title: 'Implement login',
      description: 'Done work',
      status: 'completed',
      dependencies: [],
      assignees: [],
      labels: [],
      subtasks: [],
      rawFrontMatter: {},
    } as any;
    expect(getTeam(task)).toBe(AgentTeam.Verification);
  });

  test('routes tasks with estimate > 1h to Decomposition', () => {
    const task: ParsedTask = {
      id: 't2',
      title: 'Implement billing system',
      description: 'Long task',
      estimate: '2h',
      dependencies: [],
      assignees: [],
      labels: [],
      subtasks: [],
      rawFrontMatter: {},
    } as any;
    expect(getTeam(task)).toBe(AgentTeam.Decomposition);
  });

  test('routes question-like tasks to Answer Team (title contains ?)', () => {
    const task: ParsedTask = {
      id: 't3',
      title: 'Question: Should we use Redis?',
      description: 'Exploration',
      dependencies: [],
      assignees: [],
      labels: [],
      subtasks: [],
      rawFrontMatter: {},
    } as any;
    expect(getTeam(task)).toBe(AgentTeam.Answer);
  });

  test('default route is Planning Team', () => {
    const task: ParsedTask = {
      id: 't4',
      title: 'Small refactor',
      description: 'Cleanup',
      dependencies: [],
      assignees: [],
      labels: [],
      subtasks: [],
      rawFrontMatter: {},
    } as any;
    expect(getTeam(task)).toBe(AgentTeam.Planning);
  });
});

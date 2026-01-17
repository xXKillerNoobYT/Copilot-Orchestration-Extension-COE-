export interface TaskMetricsResponse {
  counts: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    blocked: number;
    failed: number;
  };
  completionRate: number;
  averageCycleSeconds: number;
  averageCycleDisplay: string;
  lastUpdated: string;
}

export interface AgentMetricsResponse {
  counts: {
    total_agents: number;
    active_agents: number;
    total_executions: number;
  };
  avgExecutionsPerAgent: number;
  currentRunningExecutions: number;
  utilization: number;
  busiestAgent: { agent_id: string; name?: string; executions: number } | null;
  lastUpdated: string;
}

export interface ErrorMetricsResponse {
  failures: {
    total_executions: number;
    failed_executions: number;
    failure_rate: number;
  };
  recent_errors: Array<{ task_id: string; agent_id: string | null; message: string | null; completed_at: string | null }>;
  lastUpdated: string;
}

export class MetricsService {
  constructor(private readonly baseUrl: string) {}

  async getTaskMetrics(timeRange: string = '24h'): Promise<TaskMetricsResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/metrics/tasks?range=${timeRange}`);
    if (!res.ok) throw new Error(`Failed to fetch task metrics (${res.status})`);
    return res.json() as Promise<TaskMetricsResponse>;
  }

  async getAgentMetrics(timeRange: string = '24h'): Promise<AgentMetricsResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/metrics/agents?range=${timeRange}`);
    if (!res.ok) throw new Error(`Failed to fetch agent metrics (${res.status})`);
    return res.json() as Promise<AgentMetricsResponse>;
  }

  async getErrorMetrics(timeRange: string = '24h'): Promise<ErrorMetricsResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/metrics/errors?range=${timeRange}`);
    if (!res.ok) throw new Error(`Failed to fetch error metrics (${res.status})`);
    return res.json() as Promise<ErrorMetricsResponse>;
  }
}

export const createMetricsService = (baseUrl: string) => new MetricsService(baseUrl);

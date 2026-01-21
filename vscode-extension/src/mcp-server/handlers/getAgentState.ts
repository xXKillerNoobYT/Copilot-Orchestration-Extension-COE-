/**
 * Handler for copilot_orchestrator_get_agent_state tool
 * Integrates with Laravel backend AgentRepository and TaskQueueService
 */

import { MCPHandlerBase } from './MCPHandlerBase';

class GetAgentStateHandler extends MCPHandlerBase {
  /**
   * Fetch agent state and metrics from backend
   */
  async execute(args: any) {
    const { agentName } = args || {};

    try {
      return await this.executeWithRetry(
        async () => {
          const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';

          // Fetch agent state from backend
          // If agentName is provided, get specific agent; otherwise get all agents
          const encodedName = agentName
            ? encodeURIComponent(agentName).replace(/%20/g, '+')
            : '';
          const endpoint = agentName
            ? `/api/v1/agents?name=${encodedName}`
            : '/api/v1/agents';

          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const agents = data.agents || data.data || [];

          // Transform agent data to expected format
          const agentStates: Record<string, any> = {};

          for (const agent of Array.isArray(agents) ? agents : [agents]) {
            const name = agent.name || agent.id;
            agentStates[name] = {
              status: this.mapAgentStatus(agent.status),
              currentTask: agent.current_task_id,
              queueDepth: agent.queue_depth || 0,
              avgTaskTime: agent.avg_task_duration || 'N/A',
              successRate: agent.success_rate || 0,
              tasksCompleted: agent.tasks_completed || 0,
              tasksActive: agent.tasks_active || 0,
              lastActivity: agent.last_activity_at,
              capabilities: agent.capabilities || [],
              type: agent.agent_type,
            };
          }

          // If specific agent requested but not found, return appropriate response
          if (agentName && Object.keys(agentStates).length === 0) {
            throw new Error(`Agent '${agentName}' not found`);
          }

          return this.formatSuccess({
            agents: agentName ? { [agentName]: agentStates[agentName] } : agentStates,
            timestamp: new Date().toISOString(),
            systemStatus: this.determineSystemStatus(Object.values(agentStates)),
          });
        },
        'handleGetAgentState',
        args
      );
    } catch (error) {
      return this.formatError(error as Error);
    }
  }

  /**
   * Map backend agent status to expected format
   */
  private mapAgentStatus(backendStatus: string): 'active' | 'idle' | 'error' {
    const statusMap: Record<string, 'active' | 'idle' | 'error'> = {
      'working': 'active',
      'busy': 'active',
      'active': 'active',
      'available': 'idle',
      'idle': 'idle',
      'ready': 'idle',
      'error': 'error',
      'blocked': 'error',
      'failed': 'error',
    };

    return statusMap[backendStatus.toLowerCase()] || 'idle';
  }

  /**
   * Determine overall system status based on agent states
   */
  private determineSystemStatus(agentStates: any[]): 'operational' | 'degraded' | 'offline' {
    if (agentStates.length === 0) {
      return 'offline';
    }

    const errorCount = agentStates.filter(s => s.status === 'error').length;
    const errorRate = errorCount / agentStates.length;

    if (errorRate > 0.5) {
      return 'offline';
    } else if (errorRate > 0.2) {
      return 'degraded';
    } else {
      return 'operational';
    }
  }
}

// Create singleton instance
const handler = new GetAgentStateHandler();

/**
 * Export handler function for MCP server
 */
export async function handleGetAgentState(args: any) {
  return handler.execute(args);
}


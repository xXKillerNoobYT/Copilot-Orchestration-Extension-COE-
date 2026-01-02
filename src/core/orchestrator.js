/**
 * Agent Orchestrator - Coordinates multiple coding agents
 * Manages agent lifecycle, task distribution, and execution
 */

const agentRegistry = require('./agent-registry');

class AgentOrchestrator {
  constructor() {
    this.activeTasks = new Map();
    this.taskQueue = [];
  }

  /**
   * Execute a task with a specific agent
   * @param {string} agentName - Name of the agent to use
   * @param {object} task - Task configuration
   * @returns {Promise<object>} Task result
   */
  async executeTask(agentName, task) {
    const agent = agentRegistry.get(agentName);
    
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const taskId = this.generateTaskId();
    this.activeTasks.set(taskId, {
      agent: agentName,
      task,
      status: 'running',
      startedAt: new Date().toISOString()
    });

    console.log(`🚀 Starting task ${taskId} with agent ${agentName}`);

    try {
      const result = await this.runAgent(agent, task);
      this.activeTasks.get(taskId).status = 'completed';
      this.activeTasks.get(taskId).completedAt = new Date().toISOString();
      console.log(`✓ Task ${taskId} completed successfully`);
      return result;
    } catch (error) {
      this.activeTasks.get(taskId).status = 'failed';
      this.activeTasks.get(taskId).error = error.message;
      console.error(`✗ Task ${taskId} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run an agent with a task
   * @private
   */
  async runAgent(agent, task) {
    // Placeholder for agent execution logic
    // In a real implementation, this would invoke the agent's handler
    return {
      success: true,
      agent: agent.name,
      task: task.name || 'unnamed',
      message: 'Task executed (placeholder)'
    };
  }

  /**
   * Generate a unique task ID
   * @private
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get status of all active tasks
   */
  getActiveTasksStatus() {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Queue a task for later execution
   */
  queueTask(agentName, task) {
    this.taskQueue.push({ agentName, task });
    console.log(`📋 Task queued for agent ${agentName}`);
  }
}

module.exports = new AgentOrchestrator();

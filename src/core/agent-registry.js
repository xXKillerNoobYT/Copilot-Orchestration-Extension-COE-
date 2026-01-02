/**
 * Agent Registry - Central registry for all coding agents
 * This module manages the registration and retrieval of coding agents
 */

class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  /**
   * Register a new coding agent
   * @param {string} name - Agent name
   * @param {object} config - Agent configuration
   */
  register(name, config) {
    if (this.agents.has(name)) {
      console.warn(`Agent ${name} already registered. Overwriting...`);
    }
    this.agents.set(name, {
      name,
      ...config,
      registeredAt: new Date().toISOString()
    });
    console.log(`✓ Registered agent: ${name}`);
  }

  /**
   * Get an agent by name
   * @param {string} name - Agent name
   * @returns {object|null} Agent configuration or null
   */
  get(name) {
    return this.agents.get(name) || null;
  }

  /**
   * List all registered agents
   * @returns {Array} List of all agents
   */
  listAll() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   * @param {string} type - Agent type
   * @returns {Array} List of agents of specified type
   */
  getByType(type) {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }
}

module.exports = new AgentRegistry();

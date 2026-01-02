/**
 * Kiosk Server - Interactive coding environment interface
 * Provides a terminal-based interface for agent orchestration
 */

const readline = require('readline');
const agentRegistry = require('../core/agent-registry');
const orchestrator = require('../core/orchestrator');

// Import all agents
const codeGenerator = require('../agents/code-generator');
const codeReviewer = require('../agents/code-reviewer');
const refactoringAgent = require('../agents/refactoring-agent');
const documentationAgent = require('../agents/documentation-agent');
const testingAgent = require('../agents/testing-agent');

class KioskServer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'COE> '
    });
    
    this.commands = new Map();
    this.setupCommands();
    this.registerAgents();
  }

  /**
   * Register all available agents
   */
  registerAgents() {
    console.log('\n🔧 Registering coding agents...\n');
    agentRegistry.register('code-generator', codeGenerator);
    agentRegistry.register('code-reviewer', codeReviewer);
    agentRegistry.register('refactoring-agent', refactoringAgent);
    agentRegistry.register('documentation-agent', documentationAgent);
    agentRegistry.register('testing-agent', testingAgent);
    console.log('');
  }

  /**
   * Setup kiosk commands
   */
  setupCommands() {
    this.commands.set('help', this.showHelp.bind(this));
    this.commands.set('list', this.listAgents.bind(this));
    this.commands.set('info', this.showAgentInfo.bind(this));
    this.commands.set('run', this.runAgent.bind(this));
    this.commands.set('status', this.showStatus.bind(this));
    this.commands.set('clear', this.clearScreen.bind(this));
    this.commands.set('exit', this.exit.bind(this));
  }

  /**
   * Start the kiosk interface
   */
  start() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Copilot Orchestration Extension - Kiosk Mode');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Type "help" for available commands\n');
    
    this.rl.prompt();
    
    this.rl.on('line', async (line) => {
      const input = line.trim();
      if (input) {
        await this.processCommand(input);
      }
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\nGoodbye! 👋');
      process.exit(0);
    });
  }

  /**
   * Process user command
   */
  async processCommand(input) {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.commands.get(command);
    if (handler) {
      try {
        await handler(args);
      } catch (error) {
        console.error('Error:', error.message);
      }
    } else {
      console.log(`Unknown command: ${command}. Type "help" for available commands.`);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('\n📖 Available Commands:');
    console.log('  help                 - Show this help message');
    console.log('  list                 - List all registered agents');
    console.log('  info <agent-name>    - Show detailed agent information');
    console.log('  run <agent-name>     - Run an agent (interactive mode)');
    console.log('  status               - Show status of active tasks');
    console.log('  clear                - Clear the screen');
    console.log('  exit                 - Exit kiosk mode\n');
  }

  /**
   * List all registered agents
   */
  listAgents() {
    const agents = agentRegistry.listAll();
    console.log('\n🤖 Registered Agents:\n');
    agents.forEach(agent => {
      console.log(`  • ${agent.name} (${agent.type})`);
      console.log(`    ${agent.description}`);
    });
    console.log('');
  }

  /**
   * Show detailed agent information
   */
  showAgentInfo(args) {
    if (args.length === 0) {
      console.log('Usage: info <agent-name>');
      return;
    }

    const agent = agentRegistry.get(args[0]);
    if (!agent) {
      console.log(`Agent not found: ${args[0]}`);
      return;
    }

    console.log(`\n📋 Agent Information: ${agent.name}\n`);
    console.log(`  Type: ${agent.type}`);
    console.log(`  Description: ${agent.description}`);
    console.log(`  Capabilities:`);
    agent.capabilities.forEach(cap => console.log(`    • ${cap}`));
    console.log(`  Registered: ${agent.registeredAt}\n`);
  }

  /**
   * Run an agent
   */
  async runAgent(args) {
    if (args.length === 0) {
      console.log('Usage: run <agent-name>');
      return;
    }

    const agentName = args[0];
    const agent = agentRegistry.get(agentName);
    
    if (!agent) {
      console.log(`Agent not found: ${agentName}`);
      return;
    }

    console.log(`\n▶ Running agent: ${agentName}\n`);
    
    // Execute with sample parameters
    const result = await orchestrator.executeTask(agentName, {
      name: 'sample-task',
      params: {}
    });

    console.log('Result:', result);
    console.log('');
  }

  /**
   * Show status of active tasks
   */
  showStatus() {
    const tasks = orchestrator.getActiveTasksStatus();
    console.log(`\n📊 Active Tasks: ${tasks.length}\n`);
    
    if (tasks.length === 0) {
      console.log('  No active tasks\n');
      return;
    }

    tasks.forEach(task => {
      console.log(`  • Agent: ${task.agent}`);
      console.log(`    Status: ${task.status}`);
      console.log(`    Started: ${task.startedAt}`);
      if (task.completedAt) {
        console.log(`    Completed: ${task.completedAt}`);
      }
      console.log('');
    });
  }

  /**
   * Clear the screen
   */
  clearScreen() {
    console.clear();
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Copilot Orchestration Extension - Kiosk Mode');
    console.log('═══════════════════════════════════════════════════════\n');
  }

  /**
   * Exit kiosk mode
   */
  exit() {
    this.rl.close();
  }
}

// Start kiosk if run directly
if (require.main === module) {
  const kiosk = new KioskServer();
  kiosk.start();
}

module.exports = KioskServer;

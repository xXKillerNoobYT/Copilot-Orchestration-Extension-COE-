/**
 * Main Entry Point for Copilot Orchestration Extension
 */

const agentRegistry = require('./core/agent-registry');
const orchestrator = require('./core/orchestrator');

// Import all agents
const codeGenerator = require('./agents/code-generator');
const codeReviewer = require('./agents/code-reviewer');
const refactoringAgent = require('./agents/refactoring-agent');
const documentationAgent = require('./agents/documentation-agent');
const testingAgent = require('./agents/testing-agent');

/**
 * Initialize the application
 */
function initialize() {
  console.log('🚀 Initializing Copilot Orchestration Extension...\n');
  
  // Register all agents
  console.log('Registering agents...');
  agentRegistry.register('code-generator', codeGenerator);
  agentRegistry.register('code-reviewer', codeReviewer);
  agentRegistry.register('refactoring-agent', refactoringAgent);
  agentRegistry.register('documentation-agent', documentationAgent);
  agentRegistry.register('testing-agent', testingAgent);
  
  console.log(`\n✓ Registered ${agentRegistry.listAll().length} agents\n`);
}

/**
 * Run a demo of the orchestration system
 */
async function runDemo() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Running Orchestration Demo');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Example: Run code generation
  console.log('Demo 1: Code Generation');
  await orchestrator.executeTask('code-generator', {
    name: 'generate-sample',
    params: {
      specification: 'Create a simple REST API',
      language: 'javascript',
      template: 'express-api'
    }
  });
  
  console.log('\nDemo 2: Code Review');
  await orchestrator.executeTask('code-reviewer', {
    name: 'review-sample',
    params: {
      code: 'function example() { return true; }',
      language: 'javascript',
      rules: ['standard']
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   Demo Complete');
  console.log('═══════════════════════════════════════════════════════\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const devMode = args.includes('--dev');
  
  initialize();
  
  if (devMode) {
    console.log('Development mode enabled\n');
    await runDemo();
  } else {
    console.log('Copilot Orchestration Extension initialized.');
    console.log('Run with --dev flag to see demo, or use npm run kiosk for interactive mode.\n');
  }
  
  // List registered agents
  console.log('Available agents:');
  agentRegistry.listAll().forEach(agent => {
    console.log(`  • ${agent.name} - ${agent.description}`);
  });
  console.log('');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  initialize,
  agentRegistry,
  orchestrator
};

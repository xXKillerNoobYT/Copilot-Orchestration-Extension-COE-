/**
 * Manual verification of Markdown export dependency graph visualization
 * This file demonstrates the generated Mermaid diagram output
 */

import { generateMarkdown } from '../markdownExporter';
import type { PlanJSON } from '../../planBuilder/planGenerator';

// Create a test plan with dependencies
const testPlan: PlanJSON = {
  metadata: {
    name: 'Sample Project',
    status: 'draft',
    version: '1.0.0',
    author: 'Test User',
    created_at: '2026-01-11T00:00:00Z',
    updated_at: '2026-01-11T00:00:00Z'
  },
  project: {
    name: 'Sample Project',
    type: 'web',
    description: 'A sample project with dependencies',
    status: 'planning'
  },
  architecture: {
    pattern: 'microservices',
    description: 'Microservices',
    components: [],
    rationale: ''
  },
  features: [
    {
      id: 'feat-db',
      name: 'Database Setup',
      description: 'Initialize PostgreSQL',
      priority: 'critical',
      status: 'pending',
      acceptance_criteria: [],
      dependencies: [],
      effort_estimate: 4
    },
    {
      id: 'feat-api',
      name: 'API Endpoints',
      description: 'REST API',
      priority: 'high',
      status: 'pending',
      acceptance_criteria: [],
      dependencies: ['feat-db'],
      effort_estimate: 12
    },
    {
      id: 'feat-ui',
      name: 'Frontend UI',
      description: 'React components',
      priority: 'high',
      status: 'pending',
      acceptance_criteria: [],
      dependencies: ['feat-api'],
      effort_estimate: 16
    },
    {
      id: 'feat-auth',
      name: 'Authentication',
      description: 'User login system',
      priority: 'high',
      status: 'pending',
      acceptance_criteria: [],
      dependencies: ['feat-db'],
      effort_estimate: 8
    },
    {
      id: 'feat-security',
      name: 'Security Hardening',
      description: 'Security improvements',
      priority: 'medium',
      status: 'pending',
      acceptance_criteria: [],
      dependencies: ['feat-auth', 'feat-api'],
      effort_estimate: 6
    }
  ],
  timeline: {
    start_date: '2026-01-15',
    end_date: '2026-02-15',
    phases: [],
    milestones: []
  },
  team: {
    structure: 'distributed',
    members: [],
    communication_plan: ''
  },
  success_criteria: [],
  risks: [],
  assumptions: [],
  constraints: []
};

// Generate and display markdown
const markdown = generateMarkdown(testPlan);

// Extract and display just the dependency graph section
const lines = markdown.split('\n');
let inGraph = false;
let graphLines: string[] = [];

for (const line of lines) {
  if (line.includes('### Feature Dependency Graph')) {
    inGraph = true;
  }
  if (inGraph) {
    graphLines.push(line);
    if (line.includes('```') && graphLines.length > 2) {
      break;
    }
  }
}

console.log('Generated Dependency Graph:');
console.log('============================');
console.log(graphLines.join('\n'));
console.log('');
console.log('Full Markdown Output (first 100 lines):');
console.log('========================================');
console.log(markdown.split('\n').slice(0, 100).join('\n'));

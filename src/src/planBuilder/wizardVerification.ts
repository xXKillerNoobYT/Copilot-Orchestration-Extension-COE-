/**
 * Manual Verification Script for Five Core Wizard Questions
 * 
 * This script demonstrates the wizard flow and validates the implementation.
 * Run with: node dist/wizardVerification.js (after compilation)
 */

import { WizardService, type WizardAnswers } from './services/WizardService';

console.log('🧙 Five Core Wizard Questions - Manual Verification\n');
console.log('=' .repeat(60));

// Simulate a complete wizard session
const sampleAnswers: WizardAnswers = {
  // Q1: What are you building?
  projectName: 'Task Management System',
  projectType: 'ui',
  projectDescription: 'A modern task management system with real-time collaboration features, integrations with popular tools, and advanced analytics',
  objectives: [
    'Enable teams to collaborate in real-time on tasks',
    'Integrate with Slack, Teams, and email',
    'Provide insights through analytics dashboard',
    'Support customizable workflows',
  ],
  
  // Q2: Who are the users/stakeholders?
  primaryUsers: [
    'Project managers',
    'Team leads',
    'Individual contributors',
  ],
  secondaryUsers: [
    'Executives (dashboard viewers)',
    'External contractors',
  ],
  stakeholders: [
    'CTO',
    'Head of Product',
    'Engineering Director',
  ],
  userNeeds: 'Teams need a centralized system to track tasks, see progress at a glance, get notifications about blockers, and integrate seamlessly with existing tools without context switching',
  
  // Q3: What are success criteria?
  successCriteria: [
    'Users can create and assign tasks in under 30 seconds',
    'Real-time updates appear within 1 second',
    '90% of users rate the interface as intuitive',
    'Zero data loss incidents',
  ],
  metrics: [
    'Task creation time',
    'User engagement rate',
    'System uptime',
    'Integration usage',
  ],
  nonFunctionalRequirements: [
    'Support 1000+ concurrent users',
    'Page load time under 1.5 seconds',
    'Mobile responsive design',
    'WCAG 2.1 AA accessibility compliant',
  ],
  userAcceptanceCriteria: 'Users can sign up, create a workspace, invite team members, create tasks with assignees and due dates, receive notifications, and view analytics - all with an intuitive UI',
  
  // Q4: What are constraints?
  timeline: '4 months to MVP (June 2024), full launch September 2024',
  technologyConstraints: [
    'Must use React 18+ for frontend',
    'Backend must be Node.js/TypeScript',
    'Database must be PostgreSQL',
    'Must deploy on Azure',
    'Must support SSO via Azure AD',
  ],
  resourceLimits: 'Team: 4 fullstack developers, 1 UX designer, 1 QA engineer. Budget: $150k for development, $30k for infrastructure',
  dependencies: [
    'Azure AD integration for SSO',
    'Slack API for notifications',
    'SendGrid for email notifications',
    'Stripe for billing (future)',
  ],
  
  // Q5: What are risks?
  technicalRisks: [
    'Real-time sync complexity with offline support',
    'Database performance with large datasets',
    'Third-party API rate limits',
  ],
  resourceRisks: [
    'Key developer availability (1 person part-time)',
    'Potential budget overrun on infrastructure',
  ],
  businessRisks: [
    'Strong competition from established players',
    'User adoption challenges',
    'Changing compliance requirements (GDPR updates)',
  ],
  mitigations: [
    'Use WebSocket with reconnection strategy',
    'Implement database indexing and caching layer',
    'Build retry logic with exponential backoff for APIs',
    'Cross-train team members on critical components',
    'Set up cost monitoring alerts on Azure',
  ],
};

console.log('\n📝 Step 1: Validating Wizard Answers...\n');
const validation = WizardService.validateAnswers(sampleAnswers);

if (validation.valid) {
  console.log('✅ All answers are valid!\n');
} else {
  console.log('❌ Validation failed with errors:');
  validation.errors.forEach(error => console.log(`  - ${error}`));
  process.exit(1);
}

console.log('📊 Step 2: Generating Project Plan...\n');

async function generateAndVerifyPlan() {
  try {
    const plan = await WizardService.generatePlan(sampleAnswers);
    
    console.log('✅ Plan generated successfully!\n');
    console.log('📋 Plan Summary:');
    console.log(`  Project: ${plan.project.name} (${plan.project.type})`);
    console.log(`  Objectives: ${plan.project.objectives.length}`);
    console.log(`  Primary Users: ${plan.users.primary.length}`);
    console.log(`  Stakeholders: ${plan.users.stakeholders.length}`);
    console.log(`  Acceptance Criteria: ${plan.acceptanceCriteria.length}`);
    console.log(`  Success Metrics: ${plan.successMetrics.length}`);
    console.log(`  Non-Functional Requirements: ${plan.nonFunctionalRequirements.length}`);
    console.log(`  Tasks: ${plan.tasks.length}`);
    console.log(`  Risks: ${plan.risks.technical.length} technical, ${plan.risks.resource.length} resource, ${plan.risks.business.length} business`);
    console.log(`  Mitigations: ${plan.risks.mitigations.length}\n`);
    
    // Show task breakdown by phase
    console.log('📅 Task Breakdown by Phase:');
    const phases = new Map<string, number>();
    plan.tasks.forEach(task => {
      phases.set(task.phase, (phases.get(task.phase) || 0) + 1);
    });
    phases.forEach((count, phase) => {
      console.log(`  ${phase}: ${count} tasks`);
    });
    console.log('');
    
    // Show sample acceptance criteria
    console.log('✅ Sample Acceptance Criteria (first 3):');
    plan.acceptanceCriteria.slice(0, 3).forEach((criteria, i) => {
      console.log(`  ${i + 1}. ${criteria}`);
    });
    console.log('');
    
    // Show sample tasks
    console.log('📋 Sample Tasks (first 3):');
    plan.tasks.slice(0, 3).forEach((task, i) => {
      console.log(`  ${i + 1}. [${task.phase}] ${task.title}`);
      console.log(`     Priority: ${task.priority}, Est. Hours: ${task.estimatedHours}`);
      console.log(`     Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`);
    });
    console.log('');
    
    // Export to markdown
    console.log('📄 Step 3: Exporting to Markdown...\n');
    const markdown = WizardService.exportPlan(plan, 'markdown');
    console.log('✅ Markdown export successful!');
    console.log(`   Length: ${markdown.length} characters`);
    console.log(`   Sections: ${(markdown.match(/^##/gm) || []).length}\n`);
    
    // Show markdown preview
    console.log('📖 Markdown Preview (first 500 characters):');
    console.log('-'.repeat(60));
    console.log(markdown.substring(0, 500) + '...\n');
    console.log('-'.repeat(60));
    
    console.log('\n🎉 Verification Complete!\n');
    console.log('Summary:');
    console.log('  ✅ Answer validation working');
    console.log('  ✅ Plan generation working');
    console.log('  ✅ Acceptance criteria auto-generated');
    console.log('  ✅ Tasks decomposed by phase');
    console.log('  ✅ Markdown export working');
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error generating plan:', error);
    process.exit(1);
  }
}

generateAndVerifyPlan();

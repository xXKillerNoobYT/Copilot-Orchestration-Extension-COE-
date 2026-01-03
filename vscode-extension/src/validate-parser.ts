/**
 * Task Parser Validation Test
 * 
 * This script demonstrates the enhanced task parser with validation capabilities.
 * Run with: node --loader ts-node/esm validate-parser.ts
 */

import { parseTaskFile, normalizeEffort, isValidTaskType, isValidAgentType } from './taskParser';
import { promises as fs } from 'fs';
import * as path from 'path';

async function validateExampleTask() {
  console.log('🔍 Task Parser Validation Test\n');
  
  // Read the example task file
  const examplePath = path.join(__dirname, '../sample-tasks/EXAMPLE-complete-task.md');
  const content = await fs.readFile(examplePath, 'utf-8');
  
  console.log('📄 Parsing: EXAMPLE-complete-task.md\n');
  
  // Parse with full validation
  const result = parseTaskFile(content, {
    fileName: examplePath,
    validateSchema: true,
    normalizeEffort: true,
    failOnInvalid: false
  });
  
  // Display results
  if (result.task) {
    console.log('✅ Task Parsed Successfully\n');
    console.log('Task Details:');
    console.log(`  ID: ${result.task.id}`);
    console.log(`  Title: ${result.task.title}`);
    console.log(`  Type: ${result.task.type}`);
    console.log(`  Priority: ${result.task.priority}`);
    console.log(`  Status: ${result.task.status}`);
    console.log(`  Assignees: ${result.task.assignees.join(', ')}`);
    console.log(`  Labels: ${result.task.labels.join(', ')}`);
    console.log(`  Estimate: ${result.task.estimate}`);
    
    if (result.task.estimate) {
      const minutes = normalizeEffort(result.task.estimate);
      const hours = minutes / 60;
      console.log(`  Normalized Effort: ${minutes} minutes (${hours} hours)`);
    }
    
    console.log(`  Dependencies: ${result.task.dependencies.join(', ')}`);
    console.log(`  Subtasks: ${result.task.subtasks.length}`);
    
    if (result.task.github_issue_id) {
      console.log(`  GitHub Issue: #${result.task.github_issue_id}`);
    }
    
    if (result.task.context_bundle) {
      console.log(`  Context Bundle: ${result.task.context_bundle}`);
    }
    
    // Display subtasks
    if (result.task.subtasks.length > 0) {
      console.log('\n  Subtasks:');
      result.task.subtasks.forEach((subtask, index) => {
        const statusIcon = subtask.status === 'completed' ? '✅' : 
                          subtask.status === 'in_progress' ? '🔄' : '⏳';
        console.log(`    ${index + 1}. ${statusIcon} ${subtask.id}: ${subtask.title} (${subtask.status})`);
      });
    }
  } else {
    console.log('❌ Task Parsing Failed\n');
  }
  
  // Display validation errors
  if (result.errors.length > 0) {
    console.log('\n❌ Validation Errors:');
    result.errors.forEach(error => {
      console.log(`  • ${error.field}: ${error.message}`);
      if (error.suggestion) {
        console.log(`    💡 ${error.suggestion}`);
      }
    });
  }
  
  // Display validation warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Validation Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  • ${warning.field}: ${warning.message}`);
      if (warning.suggestion) {
        console.log(`    💡 ${warning.suggestion}`);
      }
    });
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Validation Summary');
  console.log('═'.repeat(60));
  console.log(`Tasks Parsed: ${result.task ? 1 : 0}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Result: ${result.task && result.errors.length === 0 ? '✅ VALID' : '❌ INVALID'}`);
  console.log('═'.repeat(60) + '\n');
}

// Run validation tests
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    Copilot Orchestration Extension - Parser Validation    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Test type validators
  console.log('🧪 Testing Type Validators\n');
  
  const typeTests = [
    { value: 'feature', valid: true },
    { value: 'bug', valid: true },
    { value: 'feat', valid: false },
    { value: 'task', valid: false }
  ];
  
  console.log('TaskType Validation:');
  typeTests.forEach(test => {
    const result = isValidTaskType(test.value);
    const icon = result === test.valid ? '✅' : '❌';
    console.log(`  ${icon} "${test.value}" → ${result ? 'valid' : 'invalid'} (expected: ${test.valid ? 'valid' : 'invalid'})`);
  });
  
  const agentTests = [
    { value: 'coder', valid: true },
    { value: 'planner', valid: true },
    { value: 'developer', valid: false },
    { value: 'designer', valid: false }
  ];
  
  console.log('\nAgentType Validation:');
  agentTests.forEach(test => {
    const result = isValidAgentType(test.value);
    const icon = result === test.valid ? '✅' : '❌';
    console.log(`  ${icon} "${test.value}" → ${result ? 'valid' : 'invalid'} (expected: ${test.valid ? 'valid' : 'invalid'})`);
  });
  
  // Test effort normalization
  console.log('\n🧪 Testing Effort Normalization\n');
  
  const effortTests = [
    { input: '2h', expected: 120 },
    { input: '30m', expected: 30 },
    { input: '3d', expected: 1440 },
    { input: '1w', expected: 2400 },
    { input: '2h 30m', expected: 150 },
    { input: '240', expected: 240 }
  ];
  
  effortTests.forEach(test => {
    const result = normalizeEffort(test.input);
    const icon = result === test.expected ? '✅' : '❌';
    console.log(`  ${icon} "${test.input}" → ${result} minutes (expected: ${test.expected})`);
  });
  
  console.log('\n' + '─'.repeat(60) + '\n');
  
  // Validate example task
  await validateExampleTask();
  
  console.log('✨ Validation Complete!\n');
}

// Execute tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

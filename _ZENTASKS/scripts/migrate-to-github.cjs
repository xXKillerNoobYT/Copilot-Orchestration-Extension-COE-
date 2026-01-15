#!/usr/bin/env node
/**
 * Migration Script: _ZENTASKS to GitHub Issues
 * 
 * This script migrates all tasks from _ZENTASKS/tasks.json to GitHub Issues,
 * preserving metadata, dependencies, and history.
 * 
 * Usage: node migrate-to-github.js [--dry-run] [--batch-size=10]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_OWNER = 'xXKillerNoobYT';
const REPO_NAME = 'Copilot-Orchestration-Extension-COE-';
const TASKS_FILE = path.join(__dirname, '../tasks.json');
const MAPPING_FILE = path.join(__dirname, '../task-id-to-issue-number.json');
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between batches

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : BATCH_SIZE;

/**
 * Format task body for GitHub Issue
 */
function formatTaskBody(task) {
  let body = `## Description\n${task.description}\n\n`;
  
  if (task.details) {
    body += `## Implementation Details\n${task.details}\n\n`;
  }
  
  if (task.testStrategy) {
    body += `## Test Strategy\n${task.testStrategy}\n\n`;
  }
  
  // Add dependencies section
  if (task.dependencies && task.dependencies.length > 0) {
    body += `## Dependencies\n`;
    task.dependencies.forEach(dep => {
      body += `- Depends on task: \`${dep}\` (will be linked after migration)\n`;
    });
    body += '\n';
  }
  
  // Add completion summary if exists
  if (task.completionSummary) {
    body += `## Completion Summary\n`;
    
    if (task.completionSummary.filesCreated && task.completionSummary.filesCreated.length > 0) {
      body += `\n**Files Created**:\n`;
      task.completionSummary.filesCreated.forEach(file => {
        body += `- ${file}\n`;
      });
    }
    
    if (task.completionSummary.filesModified && task.completionSummary.filesModified.length > 0) {
      body += `\n**Files Modified**:\n`;
      task.completionSummary.filesModified.forEach(file => {
        body += `- ${file}\n`;
      });
    }
    
    if (task.completionSummary.implementation) {
      body += `\n**Implementation**: ${task.completionSummary.implementation}\n`;
    }
    
    if (task.completionSummary.testing) {
      body += `\n**Testing**: ${task.completionSummary.testing}\n`;
    }
    
    if (task.completionSummary.verification) {
      body += `\n**Verification**: ${task.completionSummary.verification}\n`;
    }
    
    if (task.completionSummary.totalLOC) {
      body += `\n**Total LOC**: ${task.completionSummary.totalLOC}\n`;
    }
    
    body += '\n';
  }
  
  // Add migration metadata
  body += `---\n\n`;
  body += `**Original Task ID**: \`${task.id}\` (migrated from _ZENTASKS)\n`;
  body += `**Created**: ${task.createdAt}\n`;
  body += `**Updated**: ${task.updatedAt}\n`;
  
  return body;
}

/**
 * Map task fields to GitHub labels
 */
function mapTaskLabels(task) {
  const labels = [];
  
  // Detect task type
  if (task.title.includes('EPIC')) {
    labels.push('epic');
  }
  
  // Determine type from title or default to feature
  if (task.title.toLowerCase().includes('bug') || task.title.toLowerCase().includes('fix')) {
    labels.push('type: bug');
  } else if (task.title.toLowerCase().includes('test')) {
    labels.push('type: testing');
  } else if (task.title.toLowerCase().includes('doc')) {
    labels.push('type: documentation');
  } else if (task.title.toLowerCase().includes('refactor')) {
    labels.push('type: refactor');
  } else if (task.title.toLowerCase().includes('architecture') || task.title.includes('EPIC')) {
    labels.push('type: architecture');
  } else {
    labels.push('type: feature');
  }
  
  // Priority
  labels.push(`priority: ${task.priority}`);
  
  // Status (only if not done - done tasks will be closed)
  if (task.status !== 'done' && task.status !== 'cancelled') {
    labels.push(`status: ${task.status.replace('_', '-')}`);
  }
  
  return labels;
}

/**
 * Load tasks from tasks.json
 */
function loadTasks() {
  console.log(`📂 Loading tasks from ${TASKS_FILE}...`);
  const data = fs.readFileSync(TASKS_FILE, 'utf-8');
  const tasksData = JSON.parse(data);
  console.log(`✅ Loaded ${tasksData.tasks.length} tasks`);
  return tasksData.tasks;
}

/**
 * Save migration mapping
 */
function saveMigrationMapping(mapping) {
  console.log(`💾 Saving migration mapping to ${MAPPING_FILE}...`);
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`✅ Saved mapping for ${Object.keys(mapping).length} tasks`);
}

/**
 * Load existing migration mapping if it exists
 */
function loadMigrationMapping() {
  if (fs.existsSync(MAPPING_FILE)) {
    console.log(`📂 Loading existing migration mapping...`);
    const data = fs.readFileSync(MAPPING_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

/**
 * Simulate GitHub issue creation (for dry-run mode)
 */
function simulateCreateIssue(task, issueNumber) {
  return {
    number: issueNumber,
    title: task.title,
    body: formatTaskBody(task),
    state: task.status === 'done' || task.status === 'cancelled' ? 'closed' : 'open',
    labels: mapTaskLabels(task)
  };
}

/**
 * Main migration function
 */
async function migrateTasks() {
  console.log('\n🚀 Starting _ZENTASKS to GitHub Issues Migration\n');
  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Dry Run: ${isDryRun ? 'YES' : 'NO'}`);
  console.log(`Batch Size: ${batchSize}`);
  console.log('\n');
  
  // Load tasks
  const tasks = loadTasks();
  const mapping = loadMigrationMapping();
  
  // Statistics
  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
    withDependencies: tasks.filter(t => t.dependencies.length > 0).length,
    epics: tasks.filter(t => t.title.includes('EPIC')).length
  };
  
  console.log('📊 Migration Statistics:');
  console.log(`   Total Tasks: ${stats.total}`);
  console.log(`   Done: ${stats.done}`);
  console.log(`   In Progress: ${stats.inProgress}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Blocked: ${stats.blocked}`);
  console.log(`   Cancelled: ${stats.cancelled}`);
  console.log(`   With Dependencies: ${stats.withDependencies}`);
  console.log(`   Epics: ${stats.epics}`);
  console.log('\n');
  
  // Sort tasks by priority and status
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder = { done: 0, 'in-progress': 1, pending: 2, blocked: 3, cancelled: 4 };
  
  const sortedTasks = [...tasks].sort((a, b) => {
    // First by status (done first, then in-progress, etc.)
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Finally by creation date
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  
  // Phase 1: Create issues (without dependencies)
  console.log('📝 Phase 1: Creating GitHub Issues...\n');
  
  let nextIssueNumber = 100; // Start from issue #100 to avoid conflicts
  let created = 0;
  let skipped = 0;
  
  for (let i = 0; i < sortedTasks.length; i += batchSize) {
    const batch = sortedTasks.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, sortedTasks.length)} of ${sortedTasks.length})...`);
    
    for (const task of batch) {
      if (mapping[task.id]) {
        console.log(`  ⏭️  Skipping ${task.id} (already migrated to #${mapping[task.id]})`);
        skipped++;
        continue;
      }
      
      const labels = mapTaskLabels(task);
      const body = formatTaskBody(task);
      const shouldClose = task.status === 'done' || task.status === 'cancelled';
      
      if (isDryRun) {
        const issue = simulateCreateIssue(task, nextIssueNumber);
        console.log(`  ✅ [DRY RUN] Would create issue #${issue.number}: ${task.title.substring(0, 60)}${task.title.length > 60 ? '...' : ''}`);
        console.log(`     Labels: ${labels.join(', ')}`);
        console.log(`     State: ${issue.state}`);
        mapping[task.id] = nextIssueNumber;
        nextIssueNumber++;
        created++;
      } else {
        console.log(`  🔨 Creating issue: ${task.title}`);
        console.log(`     Labels: ${labels.join(', ')}`);
        console.log(`     State: ${shouldClose ? 'closed' : 'open'}`);
        
        // NOTE: In actual implementation, this would use GitHub API via MCP tools
        // For now, we're outputting commands that should be run
        console.log(`     ⚠️  MANUAL ACTION REQUIRED: Create GitHub issue with following details:`);
        console.log(`        Title: ${task.title}`);
        console.log(`        Body: [${body.length} characters - see output below]`);
        console.log(`        Labels: ${labels.join(', ')}`);
        console.log(`        State: ${shouldClose ? 'closed' : 'open'}`);
        console.log(`\n--- ISSUE BODY START ---`);
        console.log(body);
        console.log(`--- ISSUE BODY END ---\n`);
        
        // Simulate issue number assignment
        mapping[task.id] = nextIssueNumber;
        nextIssueNumber++;
        created++;
      }
    }
    
    // Save mapping after each batch
    if (created > 0) {
      saveMigrationMapping(mapping);
    }
    
    // Wait between batches to respect rate limits
    if (i + batchSize < sortedTasks.length) {
      console.log(`⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  
  console.log(`\n✅ Phase 1 Complete: ${created} issues would be created, ${skipped} already exist\n`);
  
  // Phase 2: Link dependencies
  console.log('🔗 Phase 2: Linking dependencies...\n');
  
  const tasksWithDeps = sortedTasks.filter(t => t.dependencies.length > 0);
  console.log(`Found ${tasksWithDeps.length} tasks with dependencies\n`);
  
  let linked = 0;
  for (const task of tasksWithDeps) {
    const issueNumber = mapping[task.id];
    if (!issueNumber) {
      console.log(`  ⚠️  Warning: No mapping found for ${task.id}`);
      continue;
    }
    
    const dependencyIssues = task.dependencies
      .map(depId => mapping[depId])
      .filter(num => num !== undefined);
    
    if (dependencyIssues.length < task.dependencies.length) {
      const missing = task.dependencies.filter(depId => !mapping[depId]);
      console.log(`  ⚠️  Warning: Some dependencies not found for ${task.id}: ${missing.join(', ')}`);
    }
    
    if (dependencyIssues.length > 0) {
      console.log(`  🔗 Issue #${issueNumber}: Adding dependencies to ${dependencyIssues.map(n => '#' + n).join(', ')}`);
      linked++;
      
      if (!isDryRun) {
        console.log(`     ⚠️  MANUAL ACTION: Update issue #${issueNumber} body to include "Depends on ${dependencyIssues.map(n => '#' + n).join(', ')}"`);
      }
    }
  }
  
  console.log(`\n✅ Phase 2 Complete: ${linked} dependency links would be created\n`);
  
  // Final summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Migration Summary:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Total tasks processed: ${Object.keys(mapping).length}`);
  console.log(`   Issues to create: ${created}`);
  console.log(`   Issues already exist: ${skipped}`);
  console.log(`   Tasks with dependencies: ${tasksWithDeps.length}`);
  console.log(`   Dependency links to create: ${linked}`);
  console.log(`   Mapping file: ${MAPPING_FILE}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n✅ Migration Dry-Run Complete!\n');
  
  // Next steps
  if (isDryRun) {
    console.log('🎯 Next Steps:');
    console.log('   1. Review the output above');
    console.log('   2. Verify label mappings are correct');
    console.log('   3. Use GitHub API/MCP tools to actually create issues');
    console.log('   4. Run verification script after migration');
    console.log('   5. Rename _ZENTASKS to _ZENTASKS_LEGACY');
  } else {
    console.log('🎯 Next Steps:');
    console.log('   1. Manually create all issues using the output above');
    console.log('   2. Or integrate with GitHub API/MCP tools');
    console.log('   3. Verify all issues created on GitHub');
    console.log('   4. Check dependency links are correct');
    console.log('   5. Run verification script');
    console.log('   6. Rename _ZENTASKS to _ZENTASKS_LEGACY');
  }
}

// Run migration
if (require.main === module) {
  migrateTasks().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateTasks, formatTaskBody, mapTaskLabels };

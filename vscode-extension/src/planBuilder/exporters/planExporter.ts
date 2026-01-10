/**
 * Plan Exporter Service
 * 
 * Exports plans in multiple formats:
 * - JSON: Complete plan data serialization
 * - Markdown: Formatted README with sections and task lists
 * - PDF: HTML template ready for browser printing
 * - GitHub Issues: Creates GitHub issues from tasks
 * - Mermaid: Diagram exports (architecture, dependencies, timeline)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PlanTask {
  id: string;
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies?: string[];
  assignee?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export interface PlanData {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  createdAt?: string;
  tasks: PlanTask[];
  sections?: { [key: string]: string[] }; // Section name to task IDs
}

export type ExportFormat = 'json' | 'markdown' | 'pdf' | 'github' | 'mermaid-architecture' | 'mermaid-dependencies' | 'mermaid-timeline';

export class PlanExporter {
  /**
   * Export plan to selected format
   */
  static async exportPlan(plan: PlanData, format: ExportFormat, outputPath: string): Promise<string> {
    switch (format) {
      case 'json':
        return this.exportJSON(plan, outputPath);
      case 'markdown':
        return this.exportMarkdown(plan, outputPath);
      case 'pdf':
        return this.exportPDF(plan, outputPath);
      case 'github':
        return this.exportGitHub(plan, outputPath);
      case 'mermaid-architecture':
        return this.exportMermaidArchitecture(plan, outputPath);
      case 'mermaid-dependencies':
        return this.exportMermaidDependencies(plan, outputPath);
      case 'mermaid-timeline':
        return this.exportMermaidTimeline(plan, outputPath);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export plan as JSON
   */
  private static exportJSON(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_plan.json`);
    const filepath = path.join(outputPath, filename);
    
    const content = JSON.stringify(plan, null, 2);
    fs.writeFileSync(filepath, content, 'utf-8');
    
    return filepath;
  }

  /**
   * Export plan as Markdown README
   */
  private static exportMarkdown(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_README.md`);
    const filepath = path.join(outputPath, filename);
    
    const lines: string[] = [];
    
    // Header
    lines.push(`# ${plan.name}\n`);
    
    if (plan.description) {
      lines.push(`${plan.description}\n`);
    }

    // Metadata
    lines.push('## Plan Information\n');
    if (plan.version) lines.push(`- **Version**: ${plan.version}`);
    if (plan.author) lines.push(`- **Author**: ${plan.author}`);
    if (plan.createdAt) lines.push(`- **Created**: ${plan.createdAt}`);
    lines.push('');

    // Overview Statistics
    const completed = plan.tasks.filter(t => t.status === 'completed').length;
    const inProgress = plan.tasks.filter(t => t.status === 'in_progress').length;
    const blocked = plan.tasks.filter(t => t.status === 'blocked').length;
    const totalHours = plan.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    lines.push('## Overview\n');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Tasks | ${plan.tasks.length} |`);
    lines.push(`| Completed | ${completed} |`);
    lines.push(`| In Progress | ${inProgress} |`);
    lines.push(`| Blocked | ${blocked} |`);
    lines.push(`| Estimated Hours | ${totalHours} |`);
    lines.push('');

    // Tasks by Section
    if (plan.sections && Object.keys(plan.sections).length > 0) {
      lines.push('## Tasks by Section\n');
      
      for (const [section, taskIds] of Object.entries(plan.sections)) {
        lines.push(`### ${section}\n`);
        
        for (const taskId of taskIds) {
          const task = plan.tasks.find(t => t.id === taskId);
          if (task) {
            const priority = task.priority ? ` \`${task.priority}\`` : '';
            const status = task.status ? ` [${task.status}]` : '';
            lines.push(`- **${task.title}** (${task.id})${priority}${status}`);
            
            if (task.description) {
              lines.push(`  - ${task.description}`);
            }
            if (task.estimatedHours) {
              lines.push(`  - Estimated: ${task.estimatedHours}h`);
            }
            if (task.assignee) {
              lines.push(`  - Assignee: ${task.assignee}`);
            }
            if (task.dependencies && task.dependencies.length > 0) {
              lines.push(`  - Depends on: ${task.dependencies.join(', ')}`);
            }
          }
        }
        lines.push('');
      }
    } else {
      // All tasks in one section
      lines.push('## All Tasks\n');
      for (const task of plan.tasks) {
        const priority = task.priority ? ` \`${task.priority}\`` : '';
        const status = task.status ? ` [${task.status}]` : '';
        lines.push(`- **${task.title}** (${task.id})${priority}${status}`);
        
        if (task.description) {
          lines.push(`  - ${task.description}`);
        }
        if (task.estimatedHours) {
          lines.push(`  - Estimated: ${task.estimatedHours}h`);
        }
        if (task.assignee) {
          lines.push(`  - Assignee: ${task.assignee}`);
        }
        if (task.dependencies && task.dependencies.length > 0) {
          lines.push(`  - Depends on: ${task.dependencies.join(', ')}`);
        }
      }
      lines.push('');
    }

    // Task Statistics by Priority
    const priorities = ['critical', 'high', 'medium', 'low'];
    const byPriority = priorities.map(p => 
      plan.tasks.filter(t => t.priority === p).length
    );

    if (byPriority.some(count => count > 0)) {
      lines.push('## Tasks by Priority\n');
      lines.push(`| Priority | Count |`);
      lines.push(`|----------|-------|`);
      priorities.forEach((p, i) => {
        if (byPriority[i] > 0) {
          lines.push(`| ${p} | ${byPriority[i]} |`);
        }
      });
      lines.push('');
    }

    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    
    return filepath;
  }

  /**
   * Export plan as PDF-ready HTML
   */
  private static exportPDF(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_plan.html`);
    const filepath = path.join(outputPath, filename);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(plan.name)} - Plan</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 40px;
    }
    
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 10px;
    }
    
    h2 {
      font-size: 1.8em;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #0066cc;
    }
    
    h3 {
      font-size: 1.3em;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #333;
    }
    
    .description {
      font-size: 1.1em;
      color: #666;
      margin-bottom: 20px;
    }
    
    .metadata {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    
    .metadata p {
      margin: 5px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background: #0066cc;
      color: white;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .task {
      margin: 15px 0;
      padding: 15px;
      border-left: 4px solid #0066cc;
      background: #f9f9f9;
    }
    
    .task-title {
      font-weight: 600;
      font-size: 1.1em;
      color: #1a1a1a;
    }
    
    .task-id {
      color: #666;
      font-size: 0.9em;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: 600;
      margin-left: 10px;
    }
    
    .badge.critical { background: #ff4444; color: white; }
    .badge.high { background: #ff8c00; color: white; }
    .badge.medium { background: #ffcc00; color: #333; }
    .badge.low { background: #44aa44; color: white; }
    
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 0.85em;
      margin-left: 10px;
    }
    
    .status.completed { background: #44aa44; color: white; }
    .status.in_progress { background: #4488ff; color: white; }
    .status.blocked { background: #ff4444; color: white; }
    .status.pending { background: #cccccc; color: #333; }
    
    .task-details {
      margin-top: 8px;
      font-size: 0.95em;
      color: #666;
    }
    
    .task-details p {
      margin: 4px 0;
    }
    
    @media print {
      body { background: white; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${this.escapeHtml(plan.name)}</h1>
    
    ${plan.description ? `<p class="description">${this.escapeHtml(plan.description)}</p>` : ''}
    
    <div class="metadata">
      ${plan.version ? `<p><strong>Version:</strong> ${this.escapeHtml(plan.version)}</p>` : ''}
      ${plan.author ? `<p><strong>Author:</strong> ${this.escapeHtml(plan.author)}</p>` : ''}
      ${plan.createdAt ? `<p><strong>Created:</strong> ${this.escapeHtml(plan.createdAt)}</p>` : ''}
    </div>
    
    <h2>All Tasks</h2>
    ${plan.tasks.map(task => `
      <div class="task">
        <div class="task-title">
          ${this.escapeHtml(task.title)}
          <span class="task-id">(${task.id})</span>
          ${task.priority ? `<span class="badge ${task.priority}">${task.priority}</span>` : ''}
          ${task.status ? `<span class="status ${task.status}">${task.status}</span>` : ''}
        </div>
        <div class="task-details">
          ${task.description ? `<p>${this.escapeHtml(task.description)}</p>` : ''}
          ${task.assignee ? `<p><strong>Assignee:</strong> ${this.escapeHtml(task.assignee)}</p>` : ''}
          ${task.estimatedHours ? `<p><strong>Estimated:</strong> ${task.estimatedHours}h</p>` : ''}
          ${task.dueDate ? `<p><strong>Due:</strong> ${this.escapeHtml(task.dueDate)}</p>` : ''}
          ${task.dependencies && task.dependencies.length > 0 ? `<p><strong>Depends on:</strong> ${task.dependencies.join(', ')}</p>` : ''}
        </div>
      </div>
    `).join('')}
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 0.9em;">
      <p>Generated on ${new Date().toISOString()}</p>
      <p style="margin-top: 10px;">Use your browser's Print function (Ctrl+P or Cmd+P) to save as PDF</p>
    </div>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(filepath, html, 'utf-8');
    return filepath;
  }

  /**
   * Export tasks as GitHub issues (generates markdown for issue creation)
   */
  private static exportGitHub(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_github_issues.md`);
    const filepath = path.join(outputPath, filename);
    
    const lines: string[] = [];
    lines.push(`# GitHub Issues Export - ${plan.name}\n`);
    lines.push('This file contains issue templates for creating GitHub issues from the plan.\n');
    lines.push('---\n');
    
    for (const task of plan.tasks) {
      lines.push(`## Issue: ${task.title}\n`);
      lines.push(`\`\`\`yaml`);
      lines.push(`Title: ${task.title} (${task.id})`);
      lines.push(`Type: Task`);
      if (task.priority) lines.push(`Priority: ${task.priority}`);
      if (task.assignee) lines.push(`Assignee: ${task.assignee}`);
      if (task.dueDate) lines.push(`DueDate: ${task.dueDate}`);
      lines.push(`\`\`\`\n`);
      
      lines.push(`**Description:**\n`);
      if (task.description) {
        lines.push(task.description);
      } else {
        lines.push('(No description provided)');
      }
      lines.push('');
      
      if (task.estimatedHours) {
        lines.push(`**Effort:** ${task.estimatedHours} hours\n`);
      }
      
      if (task.dependencies && task.dependencies.length > 0) {
        lines.push(`**Depends on:** ${task.dependencies.join(', ')}\n`);
      }
      
      lines.push('---\n');
    }
    
    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  /**
   * Export architecture flow as Mermaid diagram
   */
  private static exportMermaidArchitecture(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_architecture.mmd`);
    const filepath = path.join(outputPath, filename);
    
    const lines: string[] = [];
    lines.push('graph TD');
    
    // Group tasks by section
    if (plan.sections && Object.keys(plan.sections).length > 0) {
      let subgraphCounter = 1;
      for (const [section, taskIds] of Object.entries(plan.sections)) {
        const subgraphId = `SG${subgraphCounter}`;
        lines.push(`    subgraph ${subgraphId}["${section}"]`);
        
        for (const taskId of taskIds) {
          const task = plan.tasks.find(t => t.id === taskId);
          if (task) {
            const priority = task.priority ? `[${task.priority}]` : '';
            lines.push(`        ${taskId}["${task.title} ${priority}"]`);
          }
        }
        
        lines.push(`    end`);
        subgraphCounter++;
      }
    } else {
      for (const task of plan.tasks) {
        const priority = task.priority ? `[${task.priority}]` : '';
        lines.push(`    ${task.id}["${task.title} ${priority}"]`);
      }
    }
    
    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  /**
   * Export task dependencies as Mermaid diagram
   */
  private static exportMermaidDependencies(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_dependencies.mmd`);
    const filepath = path.join(outputPath, filename);
    
    const lines: string[] = [];
    lines.push('graph LR');
    
    const taskMap = new Set(plan.tasks.map(t => t.id));
    const edges = new Set<string>();
    
    for (const task of plan.tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const dep of task.dependencies) {
          if (taskMap.has(dep)) {
            edges.add(`    ${dep} --> ${task.id}`);
          }
        }
      }
    }
    
    if (edges.size === 0) {
      lines.push(`    ${plan.tasks[0]?.id || 'TASK'}["No dependencies"]`);
    } else {
      lines.push(...edges);
    }
    
    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  /**
   * Export timeline as Mermaid gantt chart
   */
  private static exportMermaidTimeline(plan: PlanData, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.name}_timeline.mmd`);
    const filepath = path.join(outputPath, filename);
    
    const lines: string[] = [];
    lines.push(`gantt`);
    lines.push(`    title ${plan.name} - Project Timeline`);
    lines.push(`    dateFormat YYYY-MM-DD`);
    
    const today = new Date();
    let currentDate = new Date(today);
    
    for (const task of plan.tasks) {
      const duration = task.estimatedHours ? Math.ceil(task.estimatedHours / 8) : 1;
      const startDate = currentDate.toISOString().split('T')[0];
      
      // Calculate end date
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + duration);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const status = task.status === 'completed' ? 'done' : 
                     task.status === 'in_progress' ? 'active' : 'crit';
      
      lines.push(`    ${task.id}           :${status}, ${startDate}, ${endDateStr}`);
      
      currentDate = new Date(endDate);
    }
    
    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  /**
   * Sanitize filename
   */
  private static sanitizeFilename(filename: string): string {
    return filename.replace(/[<>:"|?*\/\\]/g, '_').substring(0, 255);
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (c) => map[c]);
  }
}

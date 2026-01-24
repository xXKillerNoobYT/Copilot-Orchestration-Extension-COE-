import * as vscode from 'vscode';
import { PlanJSON } from '../planBuilder/planGenerator';
import { TaskDecompositionEngine } from './taskDecomposition';
import { DependencyInferenceEngine } from './dependencyInference';
import { PriorityAssignmentEngine } from './priorityAssignment';
import type { GeneratedTask } from './taskDecomposition';

/**
 * taskGenerator.ts
 * Orchestrates all task generation services to produce valid _ZENTASKS/tasks.json
 * Combines: decomposition → dependency inference → priority assignment → JSON output
 */

export interface TaskGeneratorOptions {
  mode: 'replace' | 'merge' | 'append';
  outputPath?: string; // Default: _ZENTASKS/tasks.json
  validateSchema?: boolean;
  autoCommit?: boolean;
}

export interface TaskGenerationResult {
  tasks: GeneratedTask[];
  outputPath: string;
  warnings: string[];
  errors: string[];
  summary: {
    total_tasks: number;
    by_priority: Map<string, number>;
    by_type: Map<string, number>;
    total_estimated_hours: number;
  };
}

export class TaskGenerator {
  private decompositionEngine: TaskDecompositionEngine;
  private dependencyEngine: DependencyInferenceEngine;
  private priorityEngine: PriorityAssignmentEngine;

  constructor() {
    this.decompositionEngine = new TaskDecompositionEngine({
      maxTaskSizeHours: 16,
      maxSubtasksPerFeature: 5,
      autoAssignAgents: true,
      includeTestTasks: true,
      includeDocTasks: true,
    });
    this.dependencyEngine = new DependencyInferenceEngine();
    this.priorityEngine = new PriorityAssignmentEngine();
  }

  /**
   * Generate tasks from plan and output to JSON file
   */
  async generate(
    plan: PlanJSON,
    options: TaskGeneratorOptions
  ): Promise<TaskGenerationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Step 1: Decompose plan features into tasks
      const decompositionResult = this.decompositionEngine.decompose(plan);
      warnings.push(...decompositionResult.warnings);

      // Step 2: Infer dependencies
      const dependencyResult = this.dependencyEngine.infer(decompositionResult.tasks);
      warnings.push(...dependencyResult.warnings);

      // Report cycles
      if (dependencyResult.cycles.length > 0) {
        dependencyResult.cycles.forEach(cycle => {
          errors.push(`Circular dependency detected: ${cycle.join(' → ')}`);
        });
      }

      // Step 3: Get critical path
      const criticalPath = this.dependencyEngine.getCriticalPath(dependencyResult.tasks);

      // Step 4: Assign priorities
      const priorityResult = this.priorityEngine.assignPriorities(
        dependencyResult.tasks,
        criticalPath
      );
      warnings.push(...priorityResult.warnings);

      // Step 5: Propagate priorities through dependency chains
      const finalTasks = this.priorityEngine.propagatePriorities(priorityResult.tasks);

      // Step 6: Validate dependencies
      const validationErrors = this.dependencyEngine.validateDependencies(finalTasks);
      errors.push(...validationErrors);

      // Step 7: Format tasks for JSON output
      const formattedTasks = this.formatTasks(finalTasks);

      // Step 8: Write to file
      const outputPath = options.outputPath || await this.getDefaultOutputPath();
      await this.writeTasks(formattedTasks, outputPath, options.mode);

      // Step 9: Generate summary
      const summary = this.generateSummary(finalTasks);

      return {
        tasks: finalTasks,
        outputPath,
        warnings,
        errors,
        summary,
      };
    } catch (error) {
      errors.push(`Task generation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Format tasks for JSON output (match tasks.json schema)
   */
  private formatTasks(tasks: GeneratedTask[]): any[] {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      details: task.details,
      testStrategy: task.testStrategy,
      status: task.status || 'pending',
      priority: task.priority,
      dependencies: task.dependencies,
      type: task.type,
      estimatedHours: task.estimatedHours,
      assignedAgent: task.assignedAgent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Write tasks to JSON file
   */
  private async writeTasks(
    tasks: any[],
    outputPath: string,
    mode: 'replace' | 'merge' | 'append'
  ): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    let existingTasks: any[] = [];
    
    // Load existing tasks if merging/appending
    if (mode === 'merge' || mode === 'append') {
      try {
        const content = await fs.readFile(outputPath, 'utf-8');
        existingTasks = JSON.parse(content);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
        existingTasks = [];
      }
    }

    let finalTasks: any[];

    if (mode === 'replace') {
      finalTasks = tasks;
    } else if (mode === 'append') {
      finalTasks = [...existingTasks, ...tasks];
    } else {
      // merge mode: update existing tasks, add new ones
      const existingMap = new Map(existingTasks.map((t: any) => [t.id, t]));
      
      tasks.forEach(task => {
        existingMap.set(task.id, task);
      });
      
      finalTasks = Array.from(existingMap.values());
    }

    // Write to file
    await fs.writeFile(
      outputPath,
      JSON.stringify(finalTasks, null, 2),
      'utf-8'
    );
  }

  /**
   * Get default output path (_ZENTASKS/tasks.json)
   */
  private async getDefaultOutputPath(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const path = require('path');
    return path.join(workspaceRoot, '_ZENTASKS', 'tasks.json');
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(tasks: GeneratedTask[]): {
    total_tasks: number;
    by_priority: Map<string, number>;
    by_type: Map<string, number>;
    total_estimated_hours: number;
  } {
    const byPriority = new Map<string, number>();
    const byType = new Map<string, number>();
    let totalHours = 0;

    tasks.forEach(task => {
      // Count by priority
      byPriority.set(task.priority, (byPriority.get(task.priority) || 0) + 1);

      // Count by type
      byType.set(task.type, (byType.get(task.type) || 0) + 1);

      // Sum hours
      totalHours += task.estimatedHours || 0;
    });

    return {
      total_tasks: tasks.length,
      by_priority: byPriority,
      by_type: byType,
      total_estimated_hours: totalHours,
    };
  }

  /**
   * Get execution order (respects dependencies and priorities)
   */
  getExecutionOrder(tasks: GeneratedTask[]): GeneratedTask[] {
    return this.priorityEngine.getExecutionOrder(tasks);
  }

  /**
   * Validate generated tasks against schema
   */
  validateTasks(tasks: GeneratedTask[]): string[] {
    const errors: string[] = [];

    tasks.forEach(task => {
      // Required fields
      if (!task.id) errors.push(`Task missing id: ${task.title}`);
      if (!task.title) errors.push(`Task ${task.id} missing title`);
      if (!task.description) errors.push(`Task ${task.id} missing description`);
      if (!task.priority) errors.push(`Task ${task.id} missing priority`);
      if (!task.status) errors.push(`Task ${task.id} missing status`);

      // Valid enums
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (task.priority && !validPriorities.includes(task.priority)) {
        errors.push(`Task ${task.id} has invalid priority: ${task.priority}`);
      }

      const validStatuses = ['pending', 'in-progress', 'done', 'blocked', 'cancelled'];
      if (task.status && !validStatuses.includes(task.status)) {
        errors.push(`Task ${task.id} has invalid status: ${task.status}`);
      }

      const validTypes = [
        'feature',
        'bug',
        'refactor',
        'maintenance',
        'architecture',
        'testing',
        'documentation',
      ];
      if (task.type && !validTypes.includes(task.type)) {
        errors.push(`Task ${task.id} has invalid type: ${task.type}`);
      }

      // Dependencies exist
      if (task.dependencies) {
        const taskIds = new Set(tasks.map(t => t.id));
        task.dependencies.forEach(depId => {
          if (!taskIds.has(depId)) {
            errors.push(`Task ${task.id} depends on non-existent task: ${depId}`);
          }
        });
      }
    });

    return errors;
  }

  /**
   * Preview generation without writing to file
   */
  async preview(plan: PlanJSON): Promise<TaskGenerationResult> {
    // Run generation pipeline without writing
    const warnings: string[] = [];
    const errors: string[] = [];

    const decompositionResult = this.decompositionEngine.decompose(plan);
    warnings.push(...decompositionResult.warnings);

    const dependencyResult = this.dependencyEngine.infer(decompositionResult.tasks);
    warnings.push(...dependencyResult.warnings);

    if (dependencyResult.cycles.length > 0) {
      dependencyResult.cycles.forEach(cycle => {
        errors.push(`Circular dependency: ${cycle.join(' → ')}`);
      });
    }

    const criticalPath = this.dependencyEngine.getCriticalPath(dependencyResult.tasks);
    const priorityResult = this.priorityEngine.assignPriorities(
      dependencyResult.tasks,
      criticalPath
    );
    warnings.push(...priorityResult.warnings);

    const finalTasks = this.priorityEngine.propagatePriorities(priorityResult.tasks);
    const validationErrors = this.validateTasks(finalTasks);
    errors.push(...validationErrors);

    return {
      tasks: finalTasks,
      outputPath: '<preview mode - not written>',
      warnings,
      errors,
      summary: this.generateSummary(finalTasks),
    };
  }
}

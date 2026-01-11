import { PlanJSON, Feature } from '../planBuilder/planGenerator';

/**
 * taskDecomposition.ts
 * Converts plan features into executable tasks with descriptions, details, test strategies
 * Uses templates for common patterns (API endpoint, UI component, database migration)
 */

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  details: string;
  testStrategy: string;
  status: 'pending';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  type: 'feature' | 'bug' | 'refactor' | 'maintenance' | 'architecture' | 'testing' | 'documentation';
  estimatedHours?: number;
  assignedAgent?: string | null;
}

export interface TaskTemplate {
  type: string;
  titlePattern: string;
  descriptionPattern: string;
  detailsPattern: string;
  testStrategyPattern: string;
  defaultPriority: 'critical' | 'high' | 'medium' | 'low';
  estimateMultiplier: number;
}

export interface DecompositionOptions {
  includeTestTasks?: boolean;
  includeDocTasks?: boolean;
  autoAssignAgents?: boolean;
  maxSubtasksPerFeature?: number;
  minTaskSizeHours?: number;
  maxTaskSizeHours?: number;
}

export interface DecompositionResult {
  tasks: GeneratedTask[];
  summary: {
    total_tasks: number;
    tasks_per_feature: Map<string, number>;
    total_estimated_hours: number;
    task_types: Map<string, number>;
  };
  warnings: string[];
}

/**
 * TaskDecompositionEngine
 * Converts plan features into structured, executable tasks
 */
export class TaskDecompositionEngine {
  private taskCounter = 1;
  private options: Required<DecompositionOptions>;
  private templates: Map<string, TaskTemplate>;

  constructor(options: DecompositionOptions = {}) {
    this.options = {
      includeTestTasks: options.includeTestTasks ?? true,
      includeDocTasks: options.includeDocTasks ?? true,
      autoAssignAgents: options.autoAssignAgents ?? true,
      maxSubtasksPerFeature: options.maxSubtasksPerFeature ?? 5,
      minTaskSizeHours: options.minTaskSizeHours ?? 2,
      maxTaskSizeHours: options.maxTaskSizeHours ?? 16,
    };

    this.templates = this.initializeTemplates();
  }

  /**
   * Decompose plan into tasks
   */
  decompose(plan: PlanJSON): DecompositionResult {
    const tasks: GeneratedTask[] = [];
    const warnings: string[] = [];
    const tasksPerFeature = new Map<string, number>();
    const taskTypes = new Map<string, number>();

    if (!plan.features || plan.features.length === 0) {
      warnings.push('No features found in plan');
      return {
        tasks: [],
        summary: {
          total_tasks: 0,
          tasks_per_feature: new Map(),
          total_estimated_hours: 0,
          task_types: new Map(),
        },
        warnings,
      };
    }

    // Process each feature
    plan.features.forEach(feature => {
      const featureTasks = this.decomposeFeature(feature, plan);
      tasks.push(...featureTasks);
      tasksPerFeature.set(feature.id, featureTasks.length);

      // Count task types
      featureTasks.forEach(task => {
        taskTypes.set(task.type, (taskTypes.get(task.type) || 0) + 1);
      });
    });

    // Calculate totals
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

    // Add infrastructure/setup tasks if needed
    if (this.shouldAddInfrastructureTasks(plan)) {
      const infraTasks = this.generateInfrastructureTasks(plan);
      tasks.unshift(...infraTasks);
      infraTasks.forEach(task => {
        taskTypes.set(task.type, (taskTypes.get(task.type) || 0) + 1);
      });
    }

    return {
      tasks,
      summary: {
        total_tasks: tasks.length,
        tasks_per_feature: tasksPerFeature,
        total_estimated_hours: totalEstimatedHours,
        task_types: taskTypes,
      },
      warnings,
    };
  }

  /**
   * Decompose a single feature into tasks
   */
  private decomposeFeature(feature: Feature, plan: PlanJSON): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];

    // 1. Implementation task
    const implTask = this.createImplementationTask(feature, plan);
    tasks.push(implTask);

    // 2. Testing task (if enabled)
    if (this.options.includeTestTasks) {
      const testTask = this.createTestingTask(feature, implTask.id);
      tasks.push(testTask);
    }

    // 3. Documentation task (if enabled)
    if (this.options.includeDocTasks) {
      const docTask = this.createDocumentationTask(feature, implTask.id);
      tasks.push(docTask);
    }

    // 4. Check if feature needs breaking down
    if (feature.effort_estimate > this.options.maxTaskSizeHours) {
      const subtasks = this.breakDownLargeFeature(feature, plan);
      tasks.push(...subtasks);
    }

    return tasks;
  }

  /**
   * Create implementation task from feature
   */
  private createImplementationTask(feature: Feature, plan: PlanJSON): GeneratedTask {
    const template = this.selectTemplate(feature, plan);
    const taskId = this.generateTaskId();

    return {
      id: taskId,
      title: this.applyPattern(template.titlePattern, feature, 'Implement'),
      description: this.applyPattern(template.descriptionPattern, feature, ''),
      details: this.applyPattern(template.detailsPattern, feature, '') + this.generateTechnicalDetails(feature, plan),
      testStrategy: feature.acceptance_criteria.join('; '),
      status: 'pending',
      priority: this.mapPriority(feature.priority),
      dependencies: this.mapFeatureDependencies(feature),
      type: 'feature',
      estimatedHours: Math.min(feature.effort_estimate, this.options.maxTaskSizeHours),
      assignedAgent: this.assignAgent(feature, 'implementation'),
    };
  }

  /**
   * Create testing task
   */
  private createTestingTask(feature: Feature, implTaskId: string): GeneratedTask {
    return {
      id: this.generateTaskId(),
      title: `Test: ${feature.name}`,
      description: `Write comprehensive tests for ${feature.name}. Ensure all acceptance criteria are covered.`,
      details: `Test Types:\n- Unit tests for core logic\n- Integration tests for feature interactions\n- Edge case validation\n\nAcceptance Criteria:\n${feature.acceptance_criteria.map(c => `- ${c}`).join('\n')}`,
      testStrategy: 'All tests pass with >80% coverage; edge cases validated; integration tests confirm feature works end-to-end',
      status: 'pending',
      priority: this.mapPriority(feature.priority),
      dependencies: [implTaskId],
      type: 'testing',
      estimatedHours: Math.ceil(feature.effort_estimate * 0.3),
      assignedAgent: 'Testing Agent',
    };
  }

  /**
   * Create documentation task
   */
  private createDocumentationTask(feature: Feature, implTaskId: string): GeneratedTask {
    return {
      id: this.generateTaskId(),
      title: `Document: ${feature.name}`,
      description: `Create comprehensive documentation for ${feature.name} including usage examples, API reference, and troubleshooting.`,
      details: `Documentation Requirements:\n- README updates\n- API documentation\n- Usage examples\n- Configuration guide\n- Troubleshooting section\n\nEnsure all ${feature.name} functionality is documented.`,
      testStrategy: 'Documentation is complete, accurate, and includes working examples; reviewed by team',
      status: 'pending',
      priority: feature.priority === 'critical' ? 'high' : 'medium',
      dependencies: [implTaskId],
      type: 'documentation',
      estimatedHours: Math.ceil(feature.effort_estimate * 0.2),
      assignedAgent: null,
    };
  }

  /**
   * Break down large features into subtasks
   */
  private breakDownLargeFeature(feature: Feature, plan: PlanJSON): GeneratedTask[] {
    const subtasks: GeneratedTask[] = [];
    const numSubtasks = Math.min(
      Math.ceil(feature.effort_estimate / this.options.maxTaskSizeHours),
      this.options.maxSubtasksPerFeature
    );

    for (let i = 0; i < numSubtasks; i++) {
      const subtask: GeneratedTask = {
        id: this.generateTaskId(),
        title: `${feature.name} - Part ${i + 1}/${numSubtasks}`,
        description: `Implement part ${i + 1} of ${numSubtasks} for ${feature.name}. ${feature.description}`,
        details: `This is subtask ${i + 1} of a larger feature.\n\n${feature.description}\n\nFocus: Break down implementation into logical components.`,
        testStrategy: `Verify part ${i + 1} functions correctly; integration with other parts tested`,
        status: 'pending',
        priority: this.mapPriority(feature.priority),
        dependencies: i > 0 ? [this.formatTaskId(this.taskCounter - 1)] : [],
        type: 'feature',
        estimatedHours: Math.ceil(feature.effort_estimate / numSubtasks),
        assignedAgent: this.assignAgent(feature, 'implementation'),
      };
      subtasks.push(subtask);
    }

    return subtasks;
  }

  /**
   * Generate infrastructure/setup tasks
   */
  private generateInfrastructureTasks(plan: PlanJSON): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];

    // Project setup task
    tasks.push({
      id: this.generateTaskId(),
      title: `Project Setup: ${plan.project.name}`,
      description: `Initialize project structure, dependencies, and configuration for ${plan.project.name}`,
      details: `Setup Requirements:\n- Initialize ${plan.project.type} project\n- Configure build tools\n- Setup ${plan.architecture.pattern} architecture\n- Install dependencies\n- Configure linting/formatting\n- Setup version control`,
      testStrategy: 'Project builds successfully; all tools configured; team can start development',
      status: 'pending',
      priority: 'critical',
      dependencies: [],
      type: 'architecture',
      estimatedHours: 4,
      assignedAgent: 'Auto Zen',
    });

    // Architecture setup
    if (plan.architecture) {
      tasks.push({
        id: this.generateTaskId(),
        title: `Architecture: Implement ${plan.architecture.pattern} pattern`,
        description: `Setup ${plan.architecture.pattern} architecture with ${plan.architecture.components.join(', ')}`,
        details: `Architecture Pattern: ${plan.architecture.pattern}\n\nComponents:\n${plan.architecture.components.map(c => `- ${c}`).join('\n')}\n\nRationale: ${plan.architecture.rationale}`,
        testStrategy: 'Architecture is in place; components are structured correctly; patterns are followed',
        status: 'pending',
        priority: 'high',
        dependencies: [this.formatTaskId(1)],
        type: 'architecture',
        estimatedHours: 8,
        assignedAgent: 'Plan Agent',
      });
    }

    return tasks;
  }

  // =========================================================================
  // TEMPLATE MANAGEMENT
  // =========================================================================

  private initializeTemplates(): Map<string, TaskTemplate> {
    const templates = new Map<string, TaskTemplate>();

    templates.set('api-endpoint', {
      type: 'api-endpoint',
      titlePattern: '{action} {name} API endpoint',
      descriptionPattern: 'Implement {name} API endpoint with {description}',
      detailsPattern: 'Endpoint: {name}\nMethod: {method}\nRequest/Response: {schema}',
      testStrategyPattern: 'Test API endpoint: success cases, error handling, validation, authentication',
      defaultPriority: 'high',
      estimateMultiplier: 1.0,
    });

    templates.set('ui-component', {
      type: 'ui-component',
      titlePattern: '{action} {name} UI component',
      descriptionPattern: 'Build {name} component for {description}',
      detailsPattern: 'Component: {name}\nProps: {props}\nState: {state}\nEvents: {events}',
      testStrategyPattern: 'Test component rendering, user interactions, edge cases, accessibility',
      defaultPriority: 'medium',
      estimateMultiplier: 1.2,
    });

    templates.set('database', {
      type: 'database',
      titlePattern: '{action} {name} database schema',
      descriptionPattern: 'Create database schema for {name} with {description}',
      detailsPattern: 'Tables: {tables}\nRelationships: {relationships}\nIndices: {indices}',
      testStrategyPattern: 'Test migrations, data integrity, query performance, rollback',
      defaultPriority: 'high',
      estimateMultiplier: 0.8,
    });

    templates.set('default', {
      type: 'default',
      titlePattern: '{action} {name}',
      descriptionPattern: '{description}',
      detailsPattern: 'Feature: {name}\n\n{description}',
      testStrategyPattern: 'Verify feature works as expected; test edge cases; validate acceptance criteria',
      defaultPriority: 'medium',
      estimateMultiplier: 1.0,
    });

    return templates;
  }

  private selectTemplate(feature: Feature, plan: PlanJSON): TaskTemplate {
    const name = feature.name.toLowerCase();
    const desc = feature.description.toLowerCase();

    if (name.includes('api') || desc.includes('endpoint')) {
      return this.templates.get('api-endpoint')!;
    }
    if (name.includes('component') || name.includes('ui') || desc.includes('interface')) {
      return this.templates.get('ui-component')!;
    }
    if (name.includes('database') || name.includes('schema') || desc.includes('migration')) {
      return this.templates.get('database')!;
    }

    return this.templates.get('default')!;
  }

  private applyPattern(pattern: string, feature: Feature, action: string): string {
    return pattern
      .replace('{action}', action)
      .replace('{name}', feature.name)
      .replace('{description}', feature.description);
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private generateTaskId(): string {
    const id = this.formatTaskId(this.taskCounter);
    this.taskCounter++;
    return id;
  }

  private formatTaskId(counter: number): string {
    return `TASK-${String(counter).padStart(4, '0')}`;
  }

  private mapPriority(featurePriority: string): 'critical' | 'high' | 'medium' | 'low' {
    const mapping: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    return mapping[featurePriority] || 'medium';
  }

  private mapFeatureDependencies(feature: Feature): string[] {
    // Convert feature dependencies to task IDs
    // This would need the full feature list to map properly
    return feature.dependencies.map(depId => {
      // Simplified: in reality would look up the corresponding task ID
      return depId.replace('FEAT-', 'TASK-');
    });
  }

  private assignAgent(feature: Feature, taskType: 'implementation' | 'testing' | 'documentation'): string | null {
    if (!this.options.autoAssignAgents) {
      return null;
    }

    if (taskType === 'testing') {
      return 'Testing Agent';
    }

    if (taskType === 'documentation') {
      return null;
    }

    // Auto Zen for implementation
    return 'Auto Zen';
  }

  private generateTechnicalDetails(feature: Feature, plan: PlanJSON): string {
    let details = '';

    details += `\n\nArchitecture Context: ${plan.architecture.pattern}`;
    details += `\n\nAcceptance Criteria:\n${feature.acceptance_criteria.map(c => `- ${c}`).join('\n')}`;

    if (feature.dependencies.length > 0) {
      details += `\n\nDependencies:\n${feature.dependencies.map(d => `- ${d}`).join('\n')}`;
    }

    return details;
  }

  private shouldAddInfrastructureTasks(plan: PlanJSON): boolean {
    // Add infrastructure tasks if plan has architecture or project setup needs
    return plan.architecture !== undefined || plan.project.status === 'planning';
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createDecompositionEngine(options?: DecompositionOptions): TaskDecompositionEngine {
  return new TaskDecompositionEngine(options);
}

export function decomposeplan(plan: PlanJSON, options?: DecompositionOptions): DecompositionResult {
  const engine = new TaskDecompositionEngine(options);
  return engine.decompose(plan);
}

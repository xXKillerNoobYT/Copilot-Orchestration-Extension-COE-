/**
 * Wizard Service
 * 
 * Processes wizard answers and generates structured project plans with acceptance criteria.
 * Integrates with the plan decomposition engine.
 */

export interface WizardAnswers {
  projectName: string;
  projectType: 'api' | 'ui' | 'service' | 'library' | 'other';
  projectDescription: string;
  objectives: string[];
  
  primaryUsers: string[];
  secondaryUsers: string[];
  stakeholders: string[];
  userNeeds: string;
  
  successCriteria: string[];
  metrics: string[];
  nonFunctionalRequirements: string[];
  userAcceptanceCriteria: string;
  
  timeline: string;
  technologyConstraints: string[];
  resourceLimits: string;
  dependencies: string[];
  
  technicalRisks: string[];
  resourceRisks: string[];
  businessRisks: string[];
  mitigations: string[];
}

export interface GeneratedPlan {
  project: {
    name: string;
    type: string;
    description: string;
    objectives: string[];
  };
  
  users: {
    primary: string[];
    secondary: string[];
    stakeholders: string[];
    needs: string;
  };
  
  acceptanceCriteria: string[];
  
  successMetrics: string[];
  
  nonFunctionalRequirements: string[];
  
  constraints: {
    timeline: string;
    technology: string[];
    resources: string;
    dependencies: string[];
  };
  
  risks: {
    technical: string[];
    resource: string[];
    business: string[];
    mitigations: string[];
  };
  
  tasks: GeneratedTask[];
  
  metadata: {
    createdAt: Date;
    createdBy: string;
    version: string;
  };
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  dependencies: string[];
  acceptanceCriteria: string[];
}

export class WizardService {
  // Constants for maintainability
  private static readonly MAX_USER_NEEDS_PREVIEW_LENGTH = 100;
  private static readonly MAX_TASK_TITLE_LENGTH = 50;
  
  /**
   * Process wizard answers and generate a structured project plan
   */
  static async generatePlan(answers: WizardAnswers): Promise<GeneratedPlan> {
    // Generate acceptance criteria from success criteria
    const acceptanceCriteria = this.generateAcceptanceCriteria(answers);
    
    // Decompose into tasks based on answers
    const tasks = await this.decomposeTasks(answers);
    
    // Build the complete plan
    const plan: GeneratedPlan = {
      project: {
        name: answers.projectName,
        type: answers.projectType,
        description: answers.projectDescription,
        objectives: answers.objectives,
      },
      
      users: {
        primary: answers.primaryUsers,
        secondary: answers.secondaryUsers,
        stakeholders: answers.stakeholders,
        needs: answers.userNeeds,
      },
      
      acceptanceCriteria,
      
      successMetrics: answers.metrics,
      
      nonFunctionalRequirements: answers.nonFunctionalRequirements,
      
      constraints: {
        timeline: answers.timeline,
        technology: answers.technologyConstraints,
        resources: answers.resourceLimits,
        dependencies: answers.dependencies,
      },
      
      risks: {
        technical: answers.technicalRisks,
        resource: answers.resourceRisks,
        business: answers.businessRisks,
        mitigations: answers.mitigations,
      },
      
      tasks,
      
      metadata: {
        createdAt: new Date(),
        createdBy: 'wizard',
        version: '1.0.0',
      },
    };
    
    return plan;
  }
  
  /**
   * Generate acceptance criteria from wizard answers
   */
  private static generateAcceptanceCriteria(answers: WizardAnswers): string[] {
    const criteria: string[] = [];
    
    // Add success criteria as-is
    criteria.push(...answers.successCriteria);
    
    // Generate criteria from user needs
    if (answers.userNeeds) {
      const preview = answers.userNeeds.substring(0, this.MAX_USER_NEEDS_PREVIEW_LENGTH);
      const suffix = answers.userNeeds.length > this.MAX_USER_NEEDS_PREVIEW_LENGTH ? '...' : '';
      criteria.push(`User needs are met: ${preview}${suffix}`);
    }
    
    // Generate criteria from objectives
    answers.objectives.forEach((obj, index) => {
      criteria.push(`Objective ${index + 1} achieved: ${obj}`);
    });
    
    // Add non-functional requirements as criteria
    answers.nonFunctionalRequirements.forEach(req => {
      criteria.push(`NFR satisfied: ${req}`);
    });
    
    // Add user acceptance criteria if provided
    if (answers.userAcceptanceCriteria) {
      const uacLines = answers.userAcceptanceCriteria.split('\n').filter(line => line.trim());
      criteria.push(...uacLines);
    }
    
    return criteria;
  }
  
  /**
   * Decompose project into tasks based on answers
   */
  private static async decomposeTasks(answers: WizardAnswers): Promise<GeneratedTask[]> {
    const tasks: GeneratedTask[] = [];
    
    // Phase 1: Project Setup
    tasks.push({
      id: 'task-setup-01',
      title: 'Project Initialization',
      description: `Initialize ${answers.projectName} project structure`,
      phase: 'setup',
      priority: 'high',
      estimatedHours: 4,
      dependencies: [],
      acceptanceCriteria: [
        'Project repository created',
        'Basic project structure in place',
        'Development environment configured',
      ],
    });
    
    // Phase 2: Core Development (based on project type)
    if (answers.projectType === 'api') {
      tasks.push({
        id: 'task-api-01',
        title: 'API Foundation',
        description: 'Set up API framework and routing',
        phase: 'development',
        priority: 'high',
        estimatedHours: 8,
        dependencies: ['task-setup-01'],
        acceptanceCriteria: [
          'API framework configured',
          'Basic routing in place',
          'Error handling implemented',
        ],
      });
    } else if (answers.projectType === 'ui') {
      tasks.push({
        id: 'task-ui-01',
        title: 'UI Foundation',
        description: 'Set up UI framework and component library',
        phase: 'development',
        priority: 'high',
        estimatedHours: 8,
        dependencies: ['task-setup-01'],
        acceptanceCriteria: [
          'UI framework configured',
          'Component library integrated',
          'Routing configured',
        ],
      });
    }
    
    // Generate tasks from objectives
    answers.objectives.forEach((objective, index) => {
      const titlePreview = objective.substring(0, this.MAX_TASK_TITLE_LENGTH);
      tasks.push({
        id: `task-objective-${index + 1}`,
        title: `Implement: ${titlePreview}`,
        description: objective,
        phase: 'development',
        priority: index < 2 ? 'high' : 'medium',
        estimatedHours: 12,
        dependencies: index === 0 ? ['task-setup-01'] : [`task-objective-${index}`],
        acceptanceCriteria: [
          `${objective} is fully implemented`,
          'Unit tests passing',
          'Code reviewed and approved',
        ],
      });
    });
    
    // Phase 3: Testing & Quality Assurance
    tasks.push({
      id: 'task-qa-01',
      title: 'Quality Assurance',
      description: 'Comprehensive testing and quality checks',
      phase: 'qa',
      priority: 'high',
      estimatedHours: 16,
      dependencies: tasks.filter(t => t.phase === 'development').map(t => t.id),
      acceptanceCriteria: [
        'All success criteria validated',
        'Non-functional requirements tested',
        'User acceptance testing completed',
      ],
    });
    
    // Phase 4: Deployment
    tasks.push({
      id: 'task-deploy-01',
      title: 'Deployment & Go-Live',
      description: 'Deploy to production and monitor',
      phase: 'deployment',
      priority: 'high',
      estimatedHours: 8,
      dependencies: ['task-qa-01'],
      acceptanceCriteria: [
        'Deployed to production environment',
        'Monitoring configured',
        'Documentation published',
        `Timeline met: ${answers.timeline}`,
      ],
    });
    
    // Add risk mitigation tasks if mitigations provided
    if (answers.mitigations.length > 0) {
      answers.mitigations.forEach((mitigation, index) => {
        tasks.push({
          id: `task-risk-mitigation-${index + 1}`,
          title: `Risk Mitigation: ${mitigation.substring(0, 40)}`,
          description: mitigation,
          phase: 'risk-management',
          priority: 'medium',
          estimatedHours: 4,
          dependencies: [],
          acceptanceCriteria: [
            `Mitigation strategy implemented: ${mitigation}`,
          ],
        });
      });
    }
    
    return tasks;
  }
  
  /**
   * Validate wizard answers completeness
   */
  static validateAnswers(answers: Partial<WizardAnswers>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Q1 validation
    if (!answers.projectName?.trim()) {
      errors.push('Project name is required');
    }
    if (!answers.projectType) {
      errors.push('Project type is required');
    }
    if (!answers.projectDescription?.trim()) {
      errors.push('Project description is required');
    }
    if (!answers.objectives || answers.objectives.length < 3) {
      errors.push('At least 3 objectives are required');
    }
    
    // Q2 validation
    if (!answers.primaryUsers || answers.primaryUsers.length < 1) {
      errors.push('At least one primary user is required');
    }
    if (!answers.stakeholders || answers.stakeholders.length < 1) {
      errors.push('At least one stakeholder is required');
    }
    if (!answers.userNeeds?.trim()) {
      errors.push('User needs description is required');
    }
    
    // Q3 validation
    if (!answers.successCriteria || answers.successCriteria.length < 1) {
      errors.push('At least one success criterion is required');
    }
    if (!answers.nonFunctionalRequirements || answers.nonFunctionalRequirements.length < 1) {
      errors.push('At least one non-functional requirement is required');
    }
    
    // Q4 validation
    if (!answers.timeline?.trim()) {
      errors.push('Timeline/deadline is required');
    }
    if (!answers.technologyConstraints || answers.technologyConstraints.length < 1) {
      errors.push('At least one technology constraint is required');
    }
    if (!answers.resourceLimits?.trim()) {
      errors.push('Resource limits description is required');
    }
    if (!answers.dependencies || answers.dependencies.length < 1) {
      errors.push('At least one dependency is required');
    }
    
    // Q5 validation
    if (!answers.technicalRisks || answers.technicalRisks.length < 1) {
      errors.push('At least one technical risk is required');
    }
    if (!answers.resourceRisks || answers.resourceRisks.length < 1) {
      errors.push('At least one resource risk is required');
    }
    if (!answers.businessRisks || answers.businessRisks.length < 1) {
      errors.push('At least one business risk is required');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Export plan to various formats
   */
  static exportPlan(plan: GeneratedPlan, format: 'json' | 'markdown' | 'yaml'): string {
    if (format === 'json') {
      return JSON.stringify(plan, null, 2);
    }
    
    if (format === 'markdown') {
      return this.exportToMarkdown(plan);
    }
    
    // YAML export would go here
    return JSON.stringify(plan, null, 2);
  }
  
  /**
   * Export plan to markdown format
   */
  private static exportToMarkdown(plan: GeneratedPlan): string {
    let md = `# ${plan.project.name}\n\n`;
    
    md += `## Project Overview\n\n`;
    md += `**Type:** ${plan.project.type}\n\n`;
    md += `**Description:** ${plan.project.description}\n\n`;
    
    md += `### Objectives\n\n`;
    plan.project.objectives.forEach(obj => {
      md += `- ${obj}\n`;
    });
    md += '\n';
    
    md += `## Users & Stakeholders\n\n`;
    md += `### Primary Users\n\n`;
    plan.users.primary.forEach(user => {
      md += `- ${user}\n`;
    });
    md += '\n';
    
    if (plan.users.secondary.length > 0) {
      md += `### Secondary Users\n\n`;
      plan.users.secondary.forEach(user => {
        md += `- ${user}\n`;
      });
      md += '\n';
    }
    
    md += `### Key Stakeholders\n\n`;
    plan.users.stakeholders.forEach(stakeholder => {
      md += `- ${stakeholder}\n`;
    });
    md += '\n';
    
    md += `## Acceptance Criteria\n\n`;
    plan.acceptanceCriteria.forEach(criterion => {
      md += `- [ ] ${criterion}\n`;
    });
    md += '\n';
    
    md += `## Tasks\n\n`;
    const phases = [...new Set(plan.tasks.map(t => t.phase))];
    phases.forEach(phase => {
      md += `### Phase: ${phase}\n\n`;
      const phaseTasks = plan.tasks.filter(t => t.phase === phase);
      phaseTasks.forEach(task => {
        md += `#### ${task.title}\n\n`;
        md += `${task.description}\n\n`;
        md += `- **Priority:** ${task.priority}\n`;
        md += `- **Estimated Hours:** ${task.estimatedHours}\n`;
        md += `- **Dependencies:** ${task.dependencies.join(', ') || 'None'}\n\n`;
        md += `**Acceptance Criteria:**\n\n`;
        task.acceptanceCriteria.forEach(criterion => {
          md += `- [ ] ${criterion}\n`;
        });
        md += '\n';
      });
    });
    
    md += `## Risks\n\n`;
    md += `### Technical Risks\n\n`;
    plan.risks.technical.forEach(risk => {
      md += `- ${risk}\n`;
    });
    md += '\n';
    
    md += `### Resource Risks\n\n`;
    plan.risks.resource.forEach(risk => {
      md += `- ${risk}\n`;
    });
    md += '\n';
    
    md += `### Business Risks\n\n`;
    plan.risks.business.forEach(risk => {
      md += `- ${risk}\n`;
    });
    md += '\n';
    
    if (plan.risks.mitigations.length > 0) {
      md += `### Mitigation Strategies\n\n`;
      plan.risks.mitigations.forEach(mitigation => {
        md += `- ${mitigation}\n`;
      });
      md += '\n';
    }
    
    return md;
  }
}

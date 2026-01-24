import { z } from 'zod';

/**
 * planGenerator.ts
 * Transforms wizard answers (Q1-Q5) into Code Master plan.json format
 * with full type safety and Zod schema validation.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WizardAnswers {
  q1ProjectOverview?: {
    name: string;
    description: string;
    type: 'web' | 'api' | 'cli' | 'library';
  };
  q2Architecture?: {
    pattern: string;
    notes: string;
  };
  q3Features?: {
    features: Array<{
      name: string;
      description: string;
      priority: 'Critical' | 'High' | 'Medium' | 'Low';
      dependsOn: number | null;
    }>;
  };
  q4Timeline?: {
    milestones: Array<{
      name: string;
      date: string;
      phase: 'planning' | 'design' | 'development' | 'testing' | 'deployment';
      dependsOn: number | null;
    }>;
  };
  q5Team?: {
    teamMembers: Array<{
      role: string;
      skills: string[];
      agentMapping: string | null;
      availability: 'full-time' | 'part-time' | 'consulting';
    }>;
  };
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  acceptance_criteria: string[];
  dependencies: string[];
  effort_estimate: number;
}

export interface Milestone {
  id: string;
  name: string;
  target_date: string;
  phase: 'planning' | 'design' | 'development' | 'testing' | 'deployment';
  completion_status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[];
}

export interface TeamRole {
  id: string;
  role_name: string;
  responsibilities: string[];
  skills: string[];
  agent_mapping: string | null;
  availability: 'full-time' | 'part-time' | 'consulting';
}

export interface Architecture {
  pattern: string;
  description: string;
  components: string[];
  rationale: string;
}

export interface PlanJSON {
  metadata: {
    version: string;
    created_at: string;
    updated_at: string;
    author: string;
    status: 'draft' | 'approved' | 'in-progress' | 'completed';
    name: string;
  };
  project: {
    name: string;
    description: string;
    type: 'web' | 'api' | 'cli' | 'library';
    status: 'planning' | 'in-progress' | 'completed';
  };
  architecture: Architecture;
  features: Feature[];
  timeline: {
    start_date: string;
    end_date: string;
    milestones: Milestone[];
    phases: Array<{
      name: string;
      start_date: string;
      end_date: string;
    }>;
  };
  team: {
    members: TeamRole[];
    structure: string;
    communication_plan: string;
  };
  success_criteria: string[];
  risks: Array<{
    id: string;
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  assumptions: string[];
  constraints: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

const FeatureSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Feature name required').max(100),
  description: z.string().min(10, 'Description too short').max(500),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  acceptance_criteria: z.array(z.string()),
  dependencies: z.array(z.string()),
  effort_estimate: z.number().min(1).max(1000),
});

const MilestoneSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phase: z.enum(['planning', 'design', 'development', 'testing', 'deployment']),
  completion_status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  dependencies: z.array(z.string()),
});

const TeamRoleSchema = z.object({
  id: z.string(),
  role_name: z.string().min(1).max(100),
  responsibilities: z.array(z.string()),
  skills: z.array(z.string()),
  agent_mapping: z.string().nullable(),
  availability: z.enum(['full-time', 'part-time', 'consulting']),
});

const ArchitectureSchema = z.object({
  pattern: z.string(),
  description: z.string(),
  components: z.array(z.string()),
  rationale: z.string(),
});

const PlanJSONSchema = z.object({
  metadata: z.object({
    version: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    author: z.string(),
    status: z.enum(['draft', 'approved', 'in-progress', 'completed']),
    name: z.string().min(1, 'Project name is required'),
  }),
  project: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string(),
    type: z.enum(['web', 'api', 'cli', 'library']),
    status: z.enum(['planning', 'in-progress', 'completed']),
  }),
  architecture: ArchitectureSchema,
  features: z.array(FeatureSchema),
  timeline: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    milestones: z.array(MilestoneSchema),
    phases: z.array(z.object({
      name: z.string(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })),
  }),
  team: z.object({
    members: z.array(TeamRoleSchema),
    structure: z.string(),
    communication_plan: z.string(),
  }),
  success_criteria: z.array(z.string()),
  risks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
  })),
  assumptions: z.array(z.string()),
  constraints: z.array(z.string()),
});

// ============================================================================
// PLAN GENERATOR CLASS
// ============================================================================

export class PlanGenerator {
  private wizardAnswers: WizardAnswers;

  constructor(answers: WizardAnswers) {
    this.wizardAnswers = answers;
  }

  /**
   * Generate complete plan.json from wizard answers
   */
  generate(): PlanJSON {
    const projectInfo = this.wizardAnswers.q1ProjectOverview || this.getDefaultProjectInfo();
    const architecture = this.generateArchitecture();
    const features = this.generateFeatures();
    const timeline = this.generateTimeline();
    const team = this.generateTeamStructure();

    const plan: PlanJSON = {
      metadata: this.generateMetadata(projectInfo.name),
      project: {
        name: projectInfo.name,
        description: projectInfo.description,
        type: projectInfo.type,
        status: 'planning',
      },
      architecture,
      features,
      timeline,
      team,
      success_criteria: this.generateSuccessCriteria(features),
      risks: this.generateRisks(),
      assumptions: this.generateAssumptions(),
      constraints: this.generateConstraints(),
    };

    return plan;
  }

  /**
   * Validate generated plan against schema
   */
  validate(plan: PlanJSON): ValidationResult {
    try {
      PlanJSONSchema.parse(plan);
      return {
        valid: true,
        errors: [],
      };
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError<any>;
        const errors = zodError.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
          severity: 'error' as const,
        }));
        return {
          valid: false,
          errors,
        };
      }
      return {
        valid: false,
        errors: [
          {
            field: 'unknown',
            message: 'Unknown validation error',
            severity: 'error',
          },
        ],
      };
    }
  }

  // =========================================================================
  // PRIVATE HELPER METHODS
  // =========================================================================

  private generateMetadata(projectName: string) {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      created_at: now,
      updated_at: now,
      author: 'COE Plan Builder',
      status: 'draft' as const,
      name: projectName,
    };
  }

  private generateArchitecture(): Architecture {
    const q2 = this.wizardAnswers.q2Architecture;
    const patterns: Record<string, string> = {
      mvc: 'Model-View-Controller with separate concerns for data, presentation, and logic',
      microservices: 'Independent, loosely-coupled services with API-based communication',
      serverless: 'Event-driven functions running on managed infrastructure',
      monolithic: 'Single unified codebase deployed as one unit',
      'modular-monolith': 'Single deployment unit organized into independent modules',
    };

    return {
      pattern: q2?.pattern || 'mvc',
      description: patterns[q2?.pattern || 'mvc'] || 'Standard architecture pattern',
      components: this.inferComponents(q2?.pattern || 'mvc'),
      rationale: q2?.notes || 'Selected based on project requirements',
    };
  }

  private inferComponents(pattern: string): string[] {
    const components: Record<string, string[]> = {
      mvc: ['Models', 'Views', 'Controllers', 'Services', 'Database'],
      microservices: ['API Gateway', 'Services', 'Databases', 'Message Queue', 'Cache'],
      serverless: ['Functions', 'API Gateway', 'Databases', 'Event Sources', 'Storage'],
      monolithic: ['Backend', 'Frontend', 'Database', 'Cache', 'Static Assets'],
      'modular-monolith': ['Core Module', 'Feature Modules', 'Shared Services', 'Database', 'API'],
    };
    return components[pattern] || [];
  }

  private generateFeatures(): Feature[] {
    const q3 = this.wizardAnswers.q3Features;
    if (!q3 || !q3.features || q3.features.length === 0) {
      return [];
    }

    return q3.features.map((f, idx) => ({
      id: `FEAT-${String(idx + 1).padStart(3, '0')}`,
      name: f.name,
      description: f.description,
      priority: f.priority.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
      status: 'pending',
      acceptance_criteria: this.generateAcceptanceCriteria(f.name),
      dependencies: f.dependsOn !== null && f.dependsOn !== undefined ? [`FEAT-${String(f.dependsOn + 1).padStart(3, '0')}`] : [],
      effort_estimate: this.estimateEffort(f.priority),
    }));
  }

  private generateAcceptanceCriteria(featureName: string): string[] {
    return [
      `${featureName} can be accessed by authorized users`,
      `${featureName} handles errors gracefully`,
      `${featureName} includes comprehensive logging`,
      `${featureName} has unit test coverage > 80%`,
      `${featureName} is documented in README`,
    ];
  }

  private estimateEffort(priority: string): number {
    const estimates: Record<string, number> = {
      Critical: 40,
      High: 30,
      Medium: 20,
      Low: 10,
    };
    return estimates[priority] || 20;
  }

  private generateTimeline() {
    const q4 = this.wizardAnswers.q4Timeline;
    const milestones = q4?.milestones || [];

    // Calculate dates
    const startDate = milestones.length > 0 ? milestones[0].date : new Date().toISOString().split('T')[0];
    const endDate = milestones.length > 0
      ? milestones[milestones.length - 1].date
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      start_date: startDate,
      end_date: endDate,
      milestones: milestones.map((m, idx) => ({
        id: `MILE-${String(idx + 1).padStart(3, '0')}`,
        name: m.name,
        target_date: m.date,
        phase: m.phase as 'planning' | 'design' | 'development' | 'testing' | 'deployment',
        completion_status: 'pending' as const,
        dependencies: m.dependsOn !== null && m.dependsOn !== undefined ? [`MILE-${String(m.dependsOn + 1).padStart(3, '0')}`] : [],
      })),
      phases: this.inferPhases(startDate, endDate),
    };
  }

  private inferPhases(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysPerPhase = totalDays / 5;

    const phases = [
      { name: 'Planning', phase: 'planning' },
      { name: 'Design', phase: 'design' },
      { name: 'Development', phase: 'development' },
      { name: 'Testing', phase: 'testing' },
      { name: 'Deployment', phase: 'deployment' },
    ];

    return phases.map((p, idx) => {
      const phaseStart = new Date(startDate.getTime() + idx * daysPerPhase * 24 * 60 * 60 * 1000);
      const phaseEnd = new Date(startDate.getTime() + (idx + 1) * daysPerPhase * 24 * 60 * 60 * 1000);
      return {
        name: p.name,
        start_date: phaseStart.toISOString().split('T')[0],
        end_date: phaseEnd.toISOString().split('T')[0],
      };
    });
  }

  private generateTeamStructure() {
    const q5 = this.wizardAnswers.q5Team;
    const members = q5?.teamMembers || [];

    return {
      members: members.map((m, idx) => ({
        id: `ROLE-${String(idx + 1).padStart(3, '0')}`,
        role_name: m.role,
        responsibilities: this.generateResponsibilities(m.role),
        skills: m.skills,
        agent_mapping: m.agentMapping || null,
        availability: m.availability,
      })),
      structure: this.inferStructure(members),
      communication_plan: 'Daily standups, weekly planning sessions, async updates via Slack',
    };
  }

  private generateResponsibilities(role: string): string[] {
    const roleResponsibilities: Record<string, string[]> = {
      'frontend-engineer': [
        'Build responsive UI components',
        'Implement client-side logic',
        'Optimize performance',
        'Write unit tests',
      ],
      'backend-engineer': [
        'Design API endpoints',
        'Implement business logic',
        'Manage databases',
        'Ensure security',
      ],
      'qa-engineer': [
        'Design test cases',
        'Execute manual tests',
        'Report bugs',
        'Verify fixes',
      ],
      'devops-engineer': [
        'Manage infrastructure',
        'Setup CI/CD',
        'Monitor systems',
        'Handle deployments',
      ],
    };
    return roleResponsibilities[role] || ['Contribute to project success', 'Collaborate with team'];
  }

  private inferStructure(members: any[]): string {
    const roleCount = new Map();
    members.forEach(m => {
      roleCount.set(m.role, (roleCount.get(m.role) || 0) + 1);
    });

    if (members.length === 0) return 'Solo development';
    if (members.length <= 2) return 'Small team (1-2 members)';
    if (members.length <= 5) return 'Medium team (3-5 members)';
    return 'Large team (6+ members)';
  }

  private generateSuccessCriteria(features: Feature[]): string[] {
    return [
      `All ${features.length} features implemented and tested`,
      'Project deployed to production',
      'Performance benchmarks met',
      'Team trained on the solution',
      'Documentation complete',
      'Zero critical bugs in production',
    ];
  }

  private generateRisks() {
    return [
      {
        id: 'RISK-001',
        description: 'Scope creep during implementation',
        probability: 'high' as const,
        impact: 'high' as const,
        mitigation: 'Maintain strict change control process',
      },
      {
        id: 'RISK-002',
        description: 'Technical debt accumulation',
        probability: 'medium' as const,
        impact: 'medium' as const,
        mitigation: 'Reserve 20% time for refactoring',
      },
      {
        id: 'RISK-003',
        description: 'Team availability issues',
        probability: 'low' as const,
        impact: 'high' as const,
        mitigation: 'Cross-train team members',
      },
    ];
  }

  private generateAssumptions(): string[] {
    return [
      'Team has necessary skills',
      'Requirements are stable',
      'Resources are available',
      'Infrastructure is in place',
    ];
  }

  private generateConstraints(): string[] {
    return [
      'Budget limitations',
      'Time constraints',
      'Technology choices',
      'Compliance requirements',
    ];
  }

  private getDefaultProjectInfo() {
    return {
      name: 'Unnamed Project',
      description: 'Project description not provided',
      type: 'web' as const,
    };
  }
}

// ============================================================================
// EXPORT FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a plan generator from wizard answers
 */
export function createPlanGenerator(answers: WizardAnswers): PlanGenerator {
  return new PlanGenerator(answers);
}

/**
 * Generate and validate plan in one step
 */
export function generateAndValidatePlan(answers: WizardAnswers): {
  plan: PlanJSON | null;
  validation: ValidationResult;
} {
  const generator = createPlanGenerator(answers);
  const plan = generator.generate();
  const validation = generator.validate(plan);

  return {
    plan: validation.valid ? plan : null,
    validation,
  };
}

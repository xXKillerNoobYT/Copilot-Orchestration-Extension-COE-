import { PlanJSON, Feature, Milestone, TeamRole } from './planGenerator';

/**
 * planValidator.ts
 * Comprehensive validation engine for plan.json files
 * Validates schema, dependencies, completeness, timeline, and team structure
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    total_errors: number;
    total_warnings: number;
    sections_validated: string[];
  };
}

export interface ValidatorOptions {
  strict?: boolean;
  checkDependencies?: boolean;
  checkTimeline?: boolean;
  checkTeam?: boolean;
  maxFeatures?: number;
  maxMilestones?: number;
}

/**
 * PlanValidator - Comprehensive validation for plan.json files
 */
export class PlanValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private options: Required<ValidatorOptions>;

  constructor(options: ValidatorOptions = {}) {
    this.options = {
      strict: options.strict ?? true,
      checkDependencies: options.checkDependencies ?? true,
      checkTimeline: options.checkTimeline ?? true,
      checkTeam: options.checkTeam ?? true,
      maxFeatures: options.maxFeatures ?? 100,
      maxMilestones: options.maxMilestones ?? 50,
    };
  }

  /**
   * Main validation entry point
   */
  validate(plan: PlanJSON): ValidationResult {
    this.errors = [];
    this.warnings = [];

    const sectionsValidated: string[] = [];

    // Run all validation checks
    this.validateMetadata(plan);
    sectionsValidated.push('metadata');

    this.validateProject(plan);
    sectionsValidated.push('project');

    this.validateArchitecture(plan);
    sectionsValidated.push('architecture');

    this.validateFeatures(plan);
    sectionsValidated.push('features');

    if (this.options.checkDependencies) {
      this.validateDependencies(plan);
      sectionsValidated.push('dependencies');
    }

    if (this.options.checkTimeline) {
      this.validateTimeline(plan);
      sectionsValidated.push('timeline');
    }

    if (this.options.checkTeam) {
      this.validateTeam(plan);
      sectionsValidated.push('team');
    }

    this.validateCompleteness(plan);
    sectionsValidated.push('completeness');

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        total_errors: this.errors.length,
        total_warnings: this.warnings.length,
        sections_validated: sectionsValidated,
      },
    };
  }

  // =========================================================================
  // SECTION VALIDATORS
  // =========================================================================

  private validateMetadata(plan: PlanJSON): void {
    if (!plan.metadata) {
      this.addError('metadata', 'Metadata section is missing', 'metadata is required');
      return;
    }

    const m = plan.metadata;

    if (!m.version) {
      this.addError('metadata.version', 'Version is required');
    } else if (!this.isValidSemver(m.version)) {
      this.addError('metadata.version', `Invalid semver format: ${m.version}`, 'Use format: X.Y.Z');
    }

    if (!m.created_at) {
      this.addError('metadata.created_at', 'Created timestamp is required');
    } else if (!this.isValidISO8601(m.created_at)) {
      this.addError('metadata.created_at', 'Invalid ISO 8601 timestamp');
    }

    if (!m.updated_at) {
      this.addError('metadata.updated_at', 'Updated timestamp is required');
    } else if (!this.isValidISO8601(m.updated_at)) {
      this.addError('metadata.updated_at', 'Invalid ISO 8601 timestamp');
    }

    if (m.created_at && m.updated_at) {
      if (new Date(m.updated_at) < new Date(m.created_at)) {
        this.addError('metadata.updated_at', 'Updated timestamp cannot be before created timestamp');
      }
    }

    if (!m.name || m.name.trim().length === 0) {
      this.addError('metadata.name', 'Plan name is required');
    } else if (m.name.length > 100) {
      this.addWarning('metadata.name', 'Plan name is very long (>100 chars)', 'Consider shortening');
    }

    const validStatuses = ['draft', 'approved', 'in-progress', 'completed'];
    if (!m.status || !validStatuses.includes(m.status)) {
      this.addError('metadata.status', `Invalid status: ${m.status}`, `Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  private validateProject(plan: PlanJSON): void {
    if (!plan.project) {
      this.addError('project', 'Project section is missing');
      return;
    }

    const p = plan.project;

    if (!p.name || p.name.trim().length === 0) {
      this.addError('project.name', 'Project name is required');
    } else if (p.name.length < 3) {
      this.addError('project.name', 'Project name too short (min 3 chars)');
    }

    if (!p.description || p.description.trim().length === 0) {
      this.addError('project.description', 'Project description is required');
    } else if (p.description.length < 20) {
      this.addWarning('project.description', 'Project description is very brief', 'Consider adding more details');
    }

    const validTypes = ['web', 'api', 'cli', 'library'];
    if (!p.type || !validTypes.includes(p.type)) {
      this.addError('project.type', `Invalid project type: ${p.type}`, `Must be one of: ${validTypes.join(', ')}`);
    }

    const validProjectStatuses = ['planning', 'in-progress', 'completed'];
    if (!p.status || !validProjectStatuses.includes(p.status)) {
      this.addError('project.status', `Invalid status: ${p.status}`, `Must be one of: ${validProjectStatuses.join(', ')}`);
    }
  }

  private validateArchitecture(plan: PlanJSON): void {
    if (!plan.architecture) {
      this.addError('architecture', 'Architecture section is missing');
      return;
    }

    const a = plan.architecture;

    if (!a.pattern || a.pattern.trim().length === 0) {
      this.addError('architecture.pattern', 'Architecture pattern is required');
    }

    if (!a.description || a.description.trim().length === 0) {
      this.addWarning('architecture.description', 'Architecture description is missing', 'Add rationale for pattern choice');
    }

    if (!a.components || a.components.length === 0) {
      this.addWarning('architecture.components', 'No components defined', 'List main architectural components');
    }

    if (!a.rationale || a.rationale.trim().length === 0) {
      this.addWarning('architecture.rationale', 'Architecture rationale is missing', 'Explain why this pattern was chosen');
    }
  }

  private validateFeatures(plan: PlanJSON): void {
    if (!plan.features || !Array.isArray(plan.features)) {
      this.addError('features', 'Features array is missing or invalid');
      return;
    }

    if (plan.features.length === 0) {
      this.addWarning('features', 'No features defined', 'Add at least one feature');
      return;
    }

    if (plan.features.length > this.options.maxFeatures) {
      this.addWarning('features', `Too many features (${plan.features.length})`, `Consider breaking into phases (max: ${this.options.maxFeatures})`);
    }

    const featureIds = new Set<string>();
    const featureNames = new Set<string>();

    plan.features.forEach((feature, idx) => {
      const prefix = `features[${idx}]`;

      // Validate ID
      if (!feature.id) {
        this.addError(`${prefix}.id`, 'Feature ID is required');
      } else if (featureIds.has(feature.id)) {
        this.addError(`${prefix}.id`, `Duplicate feature ID: ${feature.id}`);
      } else {
        featureIds.add(feature.id);
      }

      // Validate name
      if (!feature.name || feature.name.trim().length === 0) {
        this.addError(`${prefix}.name`, 'Feature name is required');
      } else if (featureNames.has(feature.name)) {
        this.addWarning(`${prefix}.name`, `Duplicate feature name: ${feature.name}`);
      } else {
        featureNames.add(feature.name);
      }

      // Validate description
      if (!feature.description || feature.description.trim().length === 0) {
        this.addError(`${prefix}.description`, 'Feature description is required');
      } else if (feature.description.length < 10) {
        this.addWarning(`${prefix}.description`, 'Feature description is very brief');
      }

      // Validate priority
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!feature.priority || !validPriorities.includes(feature.priority)) {
        this.addError(`${prefix}.priority`, `Invalid priority: ${feature.priority}`, `Must be one of: ${validPriorities.join(', ')}`);
      }

      // Validate status
      const validStatuses = ['pending', 'in-progress', 'completed'];
      if (!feature.status || !validStatuses.includes(feature.status)) {
        this.addError(`${prefix}.status`, `Invalid status: ${feature.status}`);
      }

      // Validate acceptance criteria
      if (!feature.acceptance_criteria || feature.acceptance_criteria.length === 0) {
        this.addWarning(`${prefix}.acceptance_criteria`, 'No acceptance criteria defined');
      }

      // Validate effort estimate
      if (feature.effort_estimate === undefined || feature.effort_estimate === null) {
        this.addWarning(`${prefix}.effort_estimate`, 'Effort estimate is missing');
      } else if (feature.effort_estimate <= 0) {
        this.addError(`${prefix}.effort_estimate`, 'Effort estimate must be positive');
      } else if (feature.effort_estimate > 1000) {
        this.addWarning(`${prefix}.effort_estimate`, 'Very large effort estimate', 'Consider breaking into smaller features');
      }
    });
  }

  private validateDependencies(plan: PlanJSON): void {
    if (!plan.features) return;

    const featureIds = new Set(plan.features.map(f => f.id));

    // Check for orphan dependencies
    plan.features.forEach((feature, idx) => {
      feature.dependencies.forEach(depId => {
        if (!featureIds.has(depId)) {
          this.addError(`features[${idx}].dependencies`, `Orphan dependency: ${depId} does not exist`);
        }
      });
    });

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(plan.features);
    if (circularDeps.length > 0) {
      circularDeps.forEach(cycle => {
        this.addError('features.dependencies', `Circular dependency detected: ${cycle.join(' → ')}`);
      });
    }

    // Check milestone dependencies
    if (plan.timeline?.milestones) {
      const milestoneIds = new Set(plan.timeline.milestones.map(m => m.id));

      plan.timeline.milestones.forEach((milestone, idx) => {
        milestone.dependencies.forEach(depId => {
          if (!milestoneIds.has(depId)) {
            this.addError(`timeline.milestones[${idx}].dependencies`, `Orphan milestone dependency: ${depId}`);
          }
        });
      });

      // Check for circular milestone dependencies
      const circularMilestones = this.detectCircularMilestoneDependencies(plan.timeline.milestones);
      if (circularMilestones.length > 0) {
        circularMilestones.forEach(cycle => {
          this.addError('timeline.milestones.dependencies', `Circular milestone dependency: ${cycle.join(' → ')}`);
        });
      }
    }
  }

  private validateTimeline(plan: PlanJSON): void {
    if (!plan.timeline) {
      this.addError('timeline', 'Timeline section is missing');
      return;
    }

    const t = plan.timeline;

    // Validate dates
    if (!t.start_date) {
      this.addError('timeline.start_date', 'Start date is required');
    } else if (!this.isValidDate(t.start_date)) {
      this.addError('timeline.start_date', `Invalid date format: ${t.start_date}`);
    }

    if (!t.end_date) {
      this.addError('timeline.end_date', 'End date is required');
    } else if (!this.isValidDate(t.end_date)) {
      this.addError('timeline.end_date', `Invalid date format: ${t.end_date}`);
    }

    if (t.start_date && t.end_date) {
      if (new Date(t.end_date) <= new Date(t.start_date)) {
        this.addError('timeline.end_date', 'End date must be after start date');
      }

      const duration = (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24);
      if (duration < 7) {
        this.addWarning('timeline', 'Timeline is very short (<7 days)', 'Consider extending timeline');
      } else if (duration > 365) {
        this.addWarning('timeline', 'Timeline is very long (>1 year)', 'Consider breaking into phases');
      }
    }

    // Validate milestones
    if (!t.milestones || t.milestones.length === 0) {
      this.addWarning('timeline.milestones', 'No milestones defined', 'Add milestones to track progress');
    } else {
      if (t.milestones.length > this.options.maxMilestones) {
        this.addWarning('timeline.milestones', `Too many milestones (${t.milestones.length})`, `Consider consolidating (max: ${this.options.maxMilestones})`);
      }

      this.validateMilestones(t.milestones, t.start_date, t.end_date);
    }

    // Validate phases
    if (!t.phases || t.phases.length === 0) {
      this.addWarning('timeline.phases', 'No phases defined');
    } else {
      this.validatePhases(t.phases, t.start_date, t.end_date);
    }
  }

  private validateMilestones(milestones: Milestone[], timelineStart: string, timelineEnd: string): void {
    const milestoneIds = new Set<string>();
    const milestoneDates = new Map<string, Date>();

    milestones.forEach((milestone, idx) => {
      const prefix = `timeline.milestones[${idx}]`;

      if (!milestone.id) {
        this.addError(`${prefix}.id`, 'Milestone ID is required');
      } else if (milestoneIds.has(milestone.id)) {
        this.addError(`${prefix}.id`, `Duplicate milestone ID: ${milestone.id}`);
      } else {
        milestoneIds.add(milestone.id);
      }

      if (!milestone.name || milestone.name.trim().length === 0) {
        this.addError(`${prefix}.name`, 'Milestone name is required');
      }

      if (!milestone.target_date) {
        this.addError(`${prefix}.target_date`, 'Target date is required');
      } else if (!this.isValidDate(milestone.target_date)) {
        this.addError(`${prefix}.target_date`, 'Invalid date format');
      } else {
        const date = new Date(milestone.target_date);
        milestoneDates.set(milestone.id, date);

        // Check if milestone is within timeline bounds
        if (timelineStart && date < new Date(timelineStart)) {
          this.addError(`${prefix}.target_date`, 'Milestone date is before timeline start');
        }
        if (timelineEnd && date > new Date(timelineEnd)) {
          this.addError(`${prefix}.target_date`, 'Milestone date is after timeline end');
        }
      }

      const validPhases = ['planning', 'design', 'development', 'testing', 'deployment'];
      if (!milestone.phase || !validPhases.includes(milestone.phase)) {
        this.addError(`${prefix}.phase`, `Invalid phase: ${milestone.phase}`);
      }

      const validStatuses = ['pending', 'in-progress', 'completed'];
      if (!milestone.completion_status || !validStatuses.includes(milestone.completion_status)) {
        this.addError(`${prefix}.completion_status`, `Invalid status: ${milestone.completion_status}`);
      }
    });

    // Validate logical date ordering
    const sortedDates = Array.from(milestoneDates.values()).sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < sortedDates.length; i++) {
      if (sortedDates[i].getTime() - sortedDates[i - 1].getTime() < 24 * 60 * 60 * 1000) {
        this.addWarning('timeline.milestones', 'Some milestones are very close together (<1 day)');
        break;
      }
    }
  }

  private validatePhases(phases: Array<{name: string; start_date: string; end_date: string}>, timelineStart: string, timelineEnd: string): void {
    phases.forEach((phase, idx) => {
      const prefix = `timeline.phases[${idx}]`;

      if (!phase.name) {
        this.addError(`${prefix}.name`, 'Phase name is required');
      }

      if (!this.isValidDate(phase.start_date)) {
        this.addError(`${prefix}.start_date`, 'Invalid start date');
      }

      if (!this.isValidDate(phase.end_date)) {
        this.addError(`${prefix}.end_date`, 'Invalid end date');
      }

      if (phase.start_date && phase.end_date) {
        if (new Date(phase.end_date) <= new Date(phase.start_date)) {
          this.addError(`${prefix}.end_date`, 'Phase end date must be after start date');
        }
      }
    });
  }

  private validateTeam(plan: PlanJSON): void {
    if (!plan.team) {
      this.addError('team', 'Team section is missing');
      return;
    }

    const t = plan.team;

    if (!t.members || t.members.length === 0) {
      this.addError('team.members', 'At least one team member is required');
      return;
    }

    const roleIds = new Set<string>();
    const roleNames = new Set<string>();

    t.members.forEach((member, idx) => {
      const prefix = `team.members[${idx}]`;

      if (!member.id) {
        this.addError(`${prefix}.id`, 'Role ID is required');
      } else if (roleIds.has(member.id)) {
        this.addError(`${prefix}.id`, `Duplicate role ID: ${member.id}`);
      } else {
        roleIds.add(member.id);
      }

      if (!member.role_name || member.role_name.trim().length === 0) {
        this.addError(`${prefix}.role_name`, 'Role name is required');
      } else {
        roleNames.add(member.role_name);
      }

      if (!member.skills || member.skills.length === 0) {
        this.addWarning(`${prefix}.skills`, 'No skills defined for this role');
      }

      if (!member.responsibilities || member.responsibilities.length === 0) {
        this.addWarning(`${prefix}.responsibilities`, 'No responsibilities defined');
      }

      const validAvailability = ['full-time', 'part-time', 'consulting'];
      if (!member.availability || !validAvailability.includes(member.availability)) {
        this.addError(`${prefix}.availability`, `Invalid availability: ${member.availability}`);
      }
    });

    // Check for skill coverage
    const allSkills = new Set<string>();
    t.members.forEach(m => m.skills.forEach(s => allSkills.add(s)));

    if (allSkills.size < 3) {
      this.addWarning('team', 'Very limited skill diversity', 'Consider adding more varied skills');
    }
  }

  private validateCompleteness(plan: PlanJSON): void {
    const requiredSections = ['metadata', 'project', 'architecture', 'features', 'timeline', 'team'];
    const missingSections = requiredSections.filter(section => !plan[section as keyof PlanJSON]);

    if (missingSections.length > 0) {
      this.addError('plan', `Missing required sections: ${missingSections.join(', ')}`);
    }

    // Check optional but recommended sections
    if (!plan.success_criteria || plan.success_criteria.length === 0) {
      this.addWarning('success_criteria', 'No success criteria defined', 'Add measurable success criteria');
    }

    if (!plan.risks || plan.risks.length === 0) {
      this.addWarning('risks', 'No risks identified', 'Consider potential project risks');
    }

    if (!plan.assumptions || plan.assumptions.length === 0) {
      this.addWarning('assumptions', 'No assumptions documented');
    }

    if (!plan.constraints || plan.constraints.length === 0) {
      this.addWarning('constraints', 'No constraints documented');
    }
  }

  // =========================================================================
  // CIRCULAR DEPENDENCY DETECTION
  // =========================================================================

  private detectCircularDependencies(features: Feature[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjList = new Map<string, string[]>();

    // Build adjacency list
    features.forEach(f => {
      adjList.set(f.id, f.dependencies);
    });

    // DFS to detect cycles
    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart).concat(neighbor);
          cycles.push(cycle);
        }
      }

      recursionStack.delete(nodeId);
    };

    features.forEach(f => {
      if (!visited.has(f.id)) {
        dfs(f.id, []);
      }
    });

    return cycles;
  }

  private detectCircularMilestoneDependencies(milestones: Milestone[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjList = new Map<string, string[]>();

    milestones.forEach(m => {
      adjList.set(m.id, m.dependencies);
    });

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart).concat(neighbor);
          cycles.push(cycle);
        }
      }

      recursionStack.delete(nodeId);
    };

    milestones.forEach(m => {
      if (!visited.has(m.id)) {
        dfs(m.id, []);
      }
    });

    return cycles;
  }

  // =========================================================================
  // VALIDATION HELPERS
  // =========================================================================

  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  private isValidISO8601(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && timestamp.includes('T');
  }

  private isValidDate(dateStr: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
  }

  private addError(field: string, message: string, suggestion?: string): void {
    this.errors.push({
      field,
      message,
      severity: 'error',
      suggestion,
    });
  }

  private addWarning(field: string, message: string, suggestion?: string): void {
    this.warnings.push({
      field,
      message,
      severity: 'warning',
      suggestion,
    });
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a validator with default options
 */
export function createValidator(options?: ValidatorOptions): PlanValidator {
  return new PlanValidator(options);
}

/**
 * Quick validate function
 */
export function validatePlan(plan: PlanJSON, options?: ValidatorOptions): ValidationResult {
  const validator = new PlanValidator(options);
  return validator.validate(plan);
}

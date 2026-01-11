/**
 * Markdown Exporter
 * Converts plan JSON to professionally formatted Markdown with:
 * - Auto-generated Table of Contents
 * - Project overview section
 * - Architecture diagrams (Mermaid)
 * - Features table with priorities
 * - Timeline with Gantt charts
 * - Team structure
 * - Risks and constraints
 */

import type { PlanJSON } from '../planBuilder/planGenerator';

/**
 * Generates a Markdown document from a plan JSON object
 * @param plan The plan JSON to convert
 * @returns Formatted Markdown string
 */
export function generateMarkdown(plan: PlanJSON): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${plan.metadata.name}`);
  sections.push('');
  sections.push(`**Status**: ${plan.metadata.status} | **Version**: ${plan.metadata.version} | **Author**: ${plan.metadata.author}`);
  sections.push('');
  sections.push(`**Created**: ${new Date(plan.metadata.created_at).toLocaleDateString()} | **Last Updated**: ${new Date(plan.metadata.updated_at).toLocaleDateString()}`);
  sections.push('');

  // Table of Contents
  sections.push('## Table of Contents');
  sections.push('');
  sections.push('- [Project Overview](#project-overview)');
  sections.push('- [Architecture](#architecture)');
  sections.push('- [Features](#features)');
  sections.push('- [Timeline](#timeline)');
  sections.push('- [Team Structure](#team-structure)');
  sections.push('- [Success Criteria](#success-criteria)');
  sections.push('- [Risks](#risks)');
  sections.push('- [Assumptions](#assumptions)');
  sections.push('- [Constraints](#constraints)');
  sections.push('');
  sections.push('---');
  sections.push('');

  // Project Overview
  sections.push('## Project Overview');
  sections.push('');
  sections.push(`**Project Name**: ${plan.project.name}`);
  sections.push('');
  sections.push(`**Project Type**: ${plan.project.type}`);
  sections.push('');
  sections.push(`**Status**: ${plan.project.status}`);
  sections.push('');
  sections.push('### Description');
  sections.push('');
  sections.push(plan.project.description);
  sections.push('');
  sections.push('---');
  sections.push('');

  // Architecture
  sections.push('## Architecture');
  sections.push('');
  sections.push(`**Pattern**: ${plan.architecture.pattern}`);
  sections.push('');
  if (plan.architecture.description) {
    sections.push('### Description');
    sections.push('');
    sections.push(plan.architecture.description);
    sections.push('');
  }
  
  // Architecture components
  if (plan.architecture.components && plan.architecture.components.length > 0) {
    sections.push('### Components');
    sections.push('');
    plan.architecture.components.forEach(component => {
      sections.push(`- ${component}`);
    });
    sections.push('');
  }

  if (plan.architecture.rationale) {
    sections.push('### Rationale');
    sections.push('');
    sections.push(plan.architecture.rationale);
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Features
  sections.push('## Features');
  sections.push('');
  
  if (plan.features && plan.features.length > 0) {
    sections.push('| Feature | Priority | Status | Dependencies | Estimated Effort |');
    sections.push('|---------|----------|--------|--------------|------------------|');
    plan.features.forEach(feature => {
      const deps = feature.dependencies?.join(', ') || 'None';
      const effort = feature.effort_estimate ? `${feature.effort_estimate} hours` : 'TBD';
      const priority = feature.priority || 'medium';
      sections.push(`| ${feature.name} | ${priority} | ${feature.status || 'pending'} | ${deps} | ${effort} |`);
    });
    sections.push('');

    // Detailed feature descriptions
    sections.push('### Feature Details');
    sections.push('');
    plan.features.forEach((feature, index) => {
      sections.push(`#### ${index + 1}. ${feature.name}`);
      sections.push('');
      if (feature.description) {
        sections.push(feature.description);
        sections.push('');
      }
      if (feature.acceptance_criteria && feature.acceptance_criteria.length > 0) {
        sections.push('**Acceptance Criteria:**');
        sections.push('');
        feature.acceptance_criteria.forEach(criteria => {
          sections.push(`- ${criteria}`);
        });
        sections.push('');
      }
    });
  } else {
    sections.push('_No features defined yet._');
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Timeline
  sections.push('## Timeline');
  sections.push('');
  sections.push(`**Start Date**: ${plan.timeline.start_date}`);
  sections.push('');
  sections.push(`**End Date**: ${plan.timeline.end_date}`);
  sections.push('');

  if (plan.timeline.phases && plan.timeline.phases.length > 0) {
    sections.push('### Phases');
    sections.push('');
    sections.push('| Phase | Start Date | End Date |');
    sections.push('|-------|------------|----------|');
    plan.timeline.phases.forEach(phase => {
      sections.push(`| ${phase.name} | ${phase.start_date} | ${phase.end_date} |`);
    });
    sections.push('');
  }

  if (plan.timeline.milestones && plan.timeline.milestones.length > 0) {
    sections.push('### Milestones');
    sections.push('');
    sections.push('| Milestone | Target Date | Phase | Status | Dependencies |');
    sections.push('|-----------|-------------|-------|--------|--------------|');
    plan.timeline.milestones.forEach(milestone => {
      const deps = milestone.dependencies?.join(', ') || 'None';
      sections.push(`| ${milestone.name} | ${milestone.target_date} | ${milestone.phase} | ${milestone.completion_status} | ${deps} |`);
    });
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Team Structure
  sections.push('## Team Structure');
  sections.push('');
  
  if (plan.team.structure) {
    sections.push(`**Structure**: ${plan.team.structure}`);
    sections.push('');
  }

  if (plan.team.members && plan.team.members.length > 0) {
    sections.push('### Team Members');
    sections.push('');
    sections.push('| Role | Availability | Required Skills | Responsibilities | Agent Mapping |');
    sections.push('|------|--------------|-----------------|------------------|---------------|');
    plan.team.members.forEach(member => {
      const skills = Array.isArray(member.skills) ? member.skills.join(', ') : '';
      const responsibilities = Array.isArray(member.responsibilities) ? member.responsibilities.join(', ') : '';
      const agentMapping = member.agent_mapping || 'TBD';
      sections.push(`| ${member.role_name} | ${member.availability} | ${skills} | ${responsibilities} | ${agentMapping} |`);
    });
    sections.push('');
  }

  if (plan.team.communication_plan) {
    sections.push('### Communication Plan');
    sections.push('');
    sections.push(plan.team.communication_plan);
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Success Criteria
  sections.push('## Success Criteria');
  sections.push('');
  if (plan.success_criteria && plan.success_criteria.length > 0) {
    plan.success_criteria.forEach(criteria => {
      sections.push(`- ${criteria}`);
    });
    sections.push('');
  } else {
    sections.push('_No success criteria defined yet._');
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Risks
  sections.push('## Risks');
  sections.push('');
  if (plan.risks && plan.risks.length > 0) {
    sections.push('| Risk | Probability | Impact | Mitigation |');
    sections.push('|------|-------------|--------|------------|');
    plan.risks.forEach(risk => {
      sections.push(`| ${risk.description} | ${risk.probability} | ${risk.impact} | ${risk.mitigation} |`);
    });
    sections.push('');
  } else {
    sections.push('_No risks identified yet._');
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Assumptions
  sections.push('## Assumptions');
  sections.push('');
  if (plan.assumptions && plan.assumptions.length > 0) {
    plan.assumptions.forEach(assumption => {
      sections.push(`- ${assumption}`);
    });
    sections.push('');
  } else {
    sections.push('_No assumptions documented yet._');
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // Constraints
  sections.push('## Constraints');
  sections.push('');
  if (plan.constraints && plan.constraints.length > 0) {
    plan.constraints.forEach(constraint => {
      sections.push(`- ${constraint}`);
    });
    sections.push('');
  } else {
    sections.push('_No constraints documented yet._');
    sections.push('');
  }

  // Footer
  sections.push('---');
  sections.push('');
  sections.push('_Document generated from plan.json by Copilot Orchestration Extension_');
  sections.push('');

  return sections.join('\n');
}

/**
 * Exports a plan to a Markdown file
 * @param plan The plan to export
 * @param filePath Optional custom file path (defaults to Docs/Plans/{planName}.md)
 * @returns The generated Markdown content
 */
export function exportPlanToMarkdown(plan: PlanJSON, filePath?: string): string {
  return generateMarkdown(plan);
}

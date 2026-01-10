/**
 * Plan Builder Integration Service
 * Orchestrates the complete workflow from wizard completion through task creation
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { LlmClient } from '../llm/openaiClient';
import { createOpenAIClient } from '../llm/openaiClient';
import { generateArchitectureSuggestions } from './architectureSuggestions';
import { decomposeProjectPlan, generateTaskYAML } from './taskDecomposition';
import { generateDependencySummary } from './dependencyAnalysis';
import { extractDesignDataFromWizard, validateDesignPayload, convertToDesignTokens } from './designHandoff';
import type { SuggestionResponse, ArchitectureContext } from './architectureSuggestions';
import type { DecompositionResult, GeneratedTask } from './taskDecomposition';
import type { DesignHandoffPayload } from './designHandoff';

export interface PlanCompletionResult {
  success: boolean;
  taskCount: number;
  tasksCreated: string[];
  architectureSuggestions: SuggestionResponse;
  decompositionResult: DecompositionResult;
  dependencySummary: string;
  designHandoff?: DesignHandoffPayload;
  errorMessage?: string;
}

/**
 * Convert wizard state to architecture context
 */
function convertWizardStateToArchitectureContext(wizardState: Record<string, unknown>): ArchitectureContext {
  return {
    projectName: (wizardState['project_name'] as string) || 'New Project',
    projectType: (wizardState['project_category'] as string) || 'web_app',
    techStack: (wizardState['project_tech_stack'] as string)?.split(',').map(s => s.trim()) || [],
    teamSize: (wizardState['team_size'] as number) || 3,
    scale: (wizardState['project_scale'] as string) || 'medium',
    integrations: (wizardState['project_integrations'] as string[]) || [],
    timeline: (wizardState['project_timeline'] as string) || 'standard'
  };
}

/**
 * Get or create LLM client (reuse if available)
 */
function getOrCreateLlmClient(): LlmClient {
  // In production, this would be a singleton or cached instance
  // For now, create a new one each time (in real use, config would be cached)
  try {
    // Try to create from existing LLM config
    // This will use the LLM configuration from VS Code settings
    return createOpenAIClient({} as any); // Config would come from settings in real use
  } catch {
    throw new Error('LLM client not configured. Please configure LLM settings first.');
  }
}

/**
 * Process completed plan and create tasks
 */
export async function processPlanCompletion(
  wizardState: Record<string, unknown>,
  workspaceRoot: string | undefined
): Promise<PlanCompletionResult> {
  const result: PlanCompletionResult = {
    success: false,
    taskCount: 0,
    tasksCreated: [],
    architectureSuggestions: {} as SuggestionResponse,
    decompositionResult: {} as DecompositionResult,
    dependencySummary: ''
  };

  try {
    // Get workspace root
    if (!workspaceRoot) {
      throw new Error('No workspace root found');
    }

    // Get LLM client
    const llmClient = getOrCreateLlmClient();

    // Step 1: Generate architecture suggestions
    console.log('[PlanIntegration] Generating architecture suggestions...');
    const archContext = convertWizardStateToArchitectureContext(wizardState);
    const suggestions = await generateArchitectureSuggestions(archContext, llmClient);
    result.architectureSuggestions = suggestions;
    console.log('[PlanIntegration] Architecture suggestions generated');

    // Step 2: Decompose into tasks
    console.log('[PlanIntegration] Decomposing plan into tasks...');
    const decomposition = await decomposeProjectPlan(wizardState, llmClient, suggestions);
    result.decompositionResult = decomposition;
    console.log(`[PlanIntegration] Generated ${decomposition.tasks.length} tasks`);

    // Step 3: Create task files in _ZENTASKS folder
    console.log('[PlanIntegration] Creating task files...');
    const zenTasksDir = path.join(workspaceRoot, '_ZENTASKS');
    
    // Ensure _ZENTASKS directory exists
    try {
      await fs.mkdir(zenTasksDir, { recursive: true });
    } catch (e) {
      console.warn('[PlanIntegration] Could not create _ZENTASKS directory:', e);
    }

    // Create a task file for each generated task
    for (const task of decomposition.tasks) {
      try {
        const taskFileName = `TASK-${task.id}.md`;
        const taskFilePath = path.join(zenTasksDir, taskFileName);
        const taskContent = generateTaskYAML(task);

        await fs.writeFile(taskFilePath, taskContent, 'utf-8');
        result.tasksCreated.push(taskFileName);
        console.log(`[PlanIntegration] Created task file: ${taskFileName}`);
      } catch (error) {
        console.error(`[PlanIntegration] Failed to create task file for ${task.id}:`, error);
      }
    }

    // Step 4: Generate dependency summary
    console.log('[PlanIntegration] Generating dependency analysis...');
    result.dependencySummary = generateDependencySummary(decomposition.tasks);

    // Step 5: Extract design data for handoff to design editor
    console.log('[PlanIntegration] Extracting design data for handoff...');
    const designData = extractDesignDataFromWizard(wizardState);
    const validation = validateDesignPayload(designData);
    
    if (validation.valid) {
      result.designHandoff = designData;
      console.log('[PlanIntegration] Design data extracted successfully');
    } else {
      console.warn('[PlanIntegration] Design data validation failed:', validation.errors);
      // Still continue - design handoff is optional
    }

    result.taskCount = result.tasksCreated.length;
    result.success = true;

    console.log('[PlanIntegration] Plan processing completed successfully');
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errorMessage = message;
    console.error('[PlanIntegration] Error processing plan:', message);
    return result;
  }
}

/**
 * Display plan completion results to user
 */
export function displayCompletionResults(result: PlanCompletionResult): void {
  if (result.success) {
    vscode.window.showInformationMessage(
      `✓ Plan processed! Created ${result.taskCount} tasks.`
    );
  } else {
    vscode.window.showErrorMessage(
      `Failed to process plan: ${result.errorMessage}`
    );
  }
}

/**
 * Open task decomposition summary in new editor
 */
export async function openDecompositionSummary(result: PlanCompletionResult): Promise<void> {
  const summary = generateSummaryContent(result);

  // Create untitled document with summary
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: summary
  });

  await vscode.window.showTextDocument(doc);
}

/**
 * Generate human-readable summary of plan processing
 */
export function generateSummaryContent(result: PlanCompletionResult): string {
  let content = '# Plan Processing Summary\n\n';

  if (!result.success) {
    content += `⚠️ **Error**: ${result.errorMessage}\n\n`;
    return content;
  }

  // Architecture suggestions
  content += '## Architecture Recommendations\n\n';
  if (result.architectureSuggestions.suggestions) {
    for (const suggestion of result.architectureSuggestions.suggestions.slice(0, 3)) {
      content += `### ${suggestion.pattern}\n`;
      content += `${suggestion.rationale}\n\n`;
      content += `**Frameworks**: ${suggestion.frameworks.join(', ')}\n\n`;
    }
  }

  // Decomposition results
  content += '## Task Decomposition\n\n';
  content += `**Total Tasks**: ${result.taskCount}\n`;
  content += `**Critical Path Length**: ${result.decompositionResult.criticalPath?.length || 0} tasks\n`;
  content += `**Milestones**: ${result.decompositionResult.milestones?.length || 0}\n\n`;

  // Critical path
  if (result.decompositionResult.criticalPath && result.decompositionResult.criticalPath.length > 0) {
    content += '### Critical Path\n';
    for (const taskId of result.decompositionResult.criticalPath) {
      const task = result.decompositionResult.tasks?.find(t => t.id === taskId);
      if (task) {
        content += `- ${task.title} (${task.estimate.value} ${task.estimate.unit})\n`;
      }
    }
    content += '\n';
  }

  // Milestones
  if (result.decompositionResult.milestones && result.decompositionResult.milestones.length > 0) {
    content += '### Milestones\n';
    for (const milestone of result.decompositionResult.milestones) {
      content += `- **${milestone.name}** (${milestone.targetDate})\n`;
      for (const taskId of milestone.tasks) {
        const task = result.decompositionResult.tasks?.find(t => t.id === taskId);
        if (task) {
          content += `  - ${task.title}\n`;
        }
      }
    }
    content += '\n';
  }

  // Risk factors
  if (result.decompositionResult.riskFactors && result.decompositionResult.riskFactors.length > 0) {
    content += '## Risk Factors\n';
    for (const risk of result.decompositionResult.riskFactors) {
      content += `- ${risk}\n`;
    }
    content += '\n';
  }

  // Recommendations
  if (result.decompositionResult.recommendations && result.decompositionResult.recommendations.length > 0) {
    content += '## Recommendations\n';
    for (const rec of result.decompositionResult.recommendations) {
      content += `- ${rec}\n`;
    }
    content += '\n';
  }

  // Dependency analysis
  content += '## Dependency Analysis\n\n';
  content += result.dependencySummary;

  // Created tasks
  content += '\n## Created Task Files\n\n';
  for (const fileName of result.tasksCreated) {
    content += `- [${fileName}](./_ZENTASKS/${fileName})\n`;
  }

  return content;
}

/**
 * Open a specific task file in editor
 */
export async function openTaskFile(taskFileName: string, workspaceRoot: string): Promise<void> {
  const taskPath = path.join(workspaceRoot, '_ZENTASKS', taskFileName);
  
  try {
    const doc = await vscode.workspace.openTextDocument(taskPath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open task file: ${taskFileName}`);
  }
}

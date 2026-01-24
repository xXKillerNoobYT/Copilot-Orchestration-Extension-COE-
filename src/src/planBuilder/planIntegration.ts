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
import { extractDesignDataFromWizard, validateDesignPayload, type DesignHandoffPayload } from './designHandoff';
import { computePlanDiff, formatDiffSummary, type Plan } from './planDiff';
import { savePlan } from './planPersistence';
import { getPlanPersistenceService } from '../services/planPersistence';
import type { SuggestionResponse, ArchitectureContext } from './architectureSuggestions';
import type { DecompositionResult, GeneratedTask } from './taskDecomposition';

export interface PlanCompletionResult {
  success: boolean;
  taskCount: number;
  tasksCreated: string[];
  architectureSuggestions: SuggestionResponse;
  decompositionResult: DecompositionResult;
  dependencySummary: string;
  designHandoff?: DesignHandoffPayload;
  planDiff?: string;
  errorMessage?: string;
}

/**
 * Trigger task regeneration after plan changes
 */
export async function triggerTaskRegeneration(
  wizardState: Record<string, unknown>,
  workspaceRoot: string | undefined,
  showSummary: boolean = true
): Promise<PlanCompletionResult> {
  const result = await processPlanCompletion(wizardState, workspaceRoot);
  
  if (result.success && showSummary) {
    const action = await vscode.window.showInformationMessage(
      `✓ Generated ${result.taskCount} tasks successfully`,
      'Open Tasks',
      'View Summary'
    );
    
    if (action === 'Open Tasks') {
      await openTasksFolder(workspaceRoot);
    } else if (action === 'View Summary') {
      await openDecompositionSummary(result);
    }
  }
  
  return result;
}

/**
 * Open _ZENTASKS folder in explorer
 */
async function openTasksFolder(workspaceRoot: string | undefined): Promise<void> {
  if (!workspaceRoot) {
    return;
  }
  
  const tasksPath = path.join(workspaceRoot, '_ZENTASKS');
  const uri = vscode.Uri.file(tasksPath);
  
  try {
    await vscode.commands.executeCommand('revealInExplorer', uri);
  } catch (error) {
    console.warn('[PlanIntegration] Could not reveal tasks folder:', error);
  }
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

    // Step 1: Save plan to backend to get plan ID
    console.log('[PlanIntegration] Saving plan to backend...');
    const projectName = (wizardState['project_name'] as string) || 'New Project';
    const savedPlan = await savePlan(wizardState, projectName);
    
    if (!savedPlan) {
      throw new Error('Failed to save plan to backend');
    }
    
    console.log(`[PlanIntegration] Plan saved with ID: ${savedPlan.id}`);

    // Step 2: Generate architecture suggestions
    console.log('[PlanIntegration] Generating architecture suggestions...');
    const archContext = convertWizardStateToArchitectureContext(wizardState);
    const suggestions = await generateArchitectureSuggestions(archContext, llmClient);
    result.architectureSuggestions = suggestions;
    console.log('[PlanIntegration] Architecture suggestions generated');

    // Step 3: Call backend decomposition API
    console.log('[PlanIntegration] Calling backend decomposition API...');
    const persistence = getPlanPersistenceService();
    const decompositionResponse = await persistence.decomposePlan(savedPlan.id, {
      autoCreate: true, // Create tasks in database
      microtaskSize: 45, // Target 45-minute subtasks
    });

    if (!decompositionResponse.success) {
      throw new Error('Backend decomposition failed');
    }

    console.log(`[PlanIntegration] Backend generated ${decompositionResponse.tasks.length} tasks`);

    // Convert backend task format to local GeneratedTask format for compatibility
    const decomposition: DecompositionResult = {
      tasks: decompositionResponse.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        taskType: (task.type || 'feature') as 'feature' | 'bug' | 'refactor' | 'maintenance' | 'architecture' | 'testing' | 'documentation',
        priority: (task.priority || 'medium') as 'critical' | 'high' | 'medium' | 'low',
        estimate: {
          value: task.estimate_hours || 4,
          unit: 'hours' as const,
        },
        dependencies: task.dependencies || [],
        status: 'pending' as const,
      })),
      criticalPath: decompositionResponse.metadata?.critical_path || [],
      milestones: [],
      riskFactors: [],
      recommendations: [],
    };

    result.decompositionResult = decomposition;

    // Step 4: Create task files in _ZENTASKS folder
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

    // Step 5: Generate dependency summary
    console.log('[PlanIntegration] Generating dependency analysis...');
    result.dependencySummary = generateDependencySummary(decomposition.tasks);

    // Step 6: Extract design data for handoff to design editor
    console.log('[PlanIntegration] Extracting design data for handoff...');
    const designData = extractDesignDataFromWizard(wizardState);
    const validation = validateDesignPayload(designData);
    
    if (validation.valid) {
      result.designHandoff = designData;
      console.log('[PlanIntegration] Design data extracted successfully');
    } else {
      console.warn('[PlanIntegration] Design data validation failed:', validation.errors);
      // Continue without blocking task creation; design handoff is optional
    }

    result.taskCount = result.tasksCreated.length;
    result.success = true;

    console.log('[PlanIntegration] Plan processing completed successfully');
    vscode.window.showInformationMessage(
      `✓ Plan "${projectName}" saved and ${result.taskCount} tasks created!`
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errorMessage = message;
    console.error('[PlanIntegration] Error processing plan:', message, error);
    vscode.window.showErrorMessage(`Failed to process plan: ${message}`);
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

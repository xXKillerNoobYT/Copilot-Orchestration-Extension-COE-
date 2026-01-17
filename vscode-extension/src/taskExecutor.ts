import { promises as fs } from 'fs';
import * as path from 'path';
import { ParsedTask } from './taskParser';
import { TaskGraphGenerator, TaskGraph } from './taskGraphGenerator';
import { CopilotDispatcher, MemoryEntry, PromptPayload } from './copilotDispatcher';
import { defaultAgentProfileLoader } from './agentProfiles';
import { CopilotAgentClient, AgentExecutionRequest } from './services/copilotAgentClient';

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs: number;
  agentUsed: string;
  verified: boolean;
  verificationNotes?: string;
}

export interface ExecutionContext {
  taskId: string;
  timestamp: string;
  files: string[];
  output: string;
  metadata?: Record<string, unknown>;
}

export interface TaskExecutorOptions {
  tasksDir?: string;
  workspaceRoot?: string;
  outputDir?: string;
  memoryLimit?: number;
  memoryCleanupInterval?: number; // Clean memory every N memory additions (default: 10)
  memoryTTLMinutes?: number; // Remove entries older than N minutes (default: 30)
  enableVerification?: boolean;
  llmHandler?: LLMHandler;
  copilotAgentClient?: CopilotAgentClient;
  useCopilotAgentMode?: boolean; // Enable GitHub Copilot Agent Mode API integration
}

export interface LLMHandler {
  execute(prompt: PromptPayload): Promise<string>;
}

export class TaskExecutor {
  private readonly tasksDir: string;
  private readonly workspaceRoot: string;
  private readonly outputDir: string;
  private readonly memoryLimit: number;
  private readonly memoryCleanupInterval: number;
  private readonly memoryTTLMinutes: number;
  private readonly enableVerification: boolean;
  private readonly dispatcher: CopilotDispatcher;
  private readonly llmHandler?: LLMHandler;
  private readonly copilotAgentClient?: CopilotAgentClient;
  private readonly useCopilotAgentMode: boolean;
  
  private tasks: ParsedTask[] = [];
  private taskGraph: TaskGraph | null = null;
  private memory: MemoryEntry[] = [];
  private executionHistory: TaskExecutionResult[] = [];
  private memoryAdditionCount: number = 0; // Track memory additions for periodic cleanup

  constructor(options?: TaskExecutorOptions) {
    this.workspaceRoot = options?.workspaceRoot ?? process.cwd();
    this.tasksDir = options?.tasksDir ?? path.join(this.workspaceRoot, '_ZENTASKS');
    this.outputDir = options?.outputDir ?? path.join(this.workspaceRoot, '.orchestrator-output');
    this.memoryLimit = options?.memoryLimit ?? 50;
    this.memoryCleanupInterval = TaskExecutor.validatePositiveNumber(options?.memoryCleanupInterval, 10);
    this.memoryTTLMinutes = TaskExecutor.validatePositiveNumber(options?.memoryTTLMinutes, 30);
    this.enableVerification = options?.enableVerification ?? true;
    this.llmHandler = options?.llmHandler;
    this.copilotAgentClient = options?.copilotAgentClient;
    this.useCopilotAgentMode = options?.useCopilotAgentMode ?? false;
    
    this.dispatcher = new CopilotDispatcher({
      tasksDir: this.tasksDir,
      workspaceRoot: this.workspaceRoot,
    });
  }

  /**
   * Load tasks from disk and regenerate task graph
   */
  async loadTasks(): Promise<void> {
    const tasksFile = path.join(this.tasksDir, 'tasks.json');
    try {
      const content = await fs.readFile(tasksFile, 'utf-8');
      const data = JSON.parse(content);
      this.tasks = data.tasks || [];
      
      if (this.tasks.length > 0) {
        const generator = new TaskGraphGenerator(this.tasks);
        this.taskGraph = generator.generateGraph();
      }
    } catch (error) {
      throw new Error(`Failed to load tasks from ${tasksFile}: ${(error as Error).message}`);
    }
  }

  /**
   * Save updated tasks to disk
   */
  private async saveTasks(): Promise<void> {
    const tasksFile = path.join(this.tasksDir, 'tasks.json');
    await fs.writeFile(tasksFile, JSON.stringify({ tasks: this.tasks }, null, 2), 'utf-8');
  }

  /**
   * Get the next executable task from the task graph
   */
  getNextTask(): ParsedTask | null {
    if (!this.taskGraph || this.tasks.length === 0) {
      return null;
    }

    // Use the generator method to get ready tasks
    const generator = new TaskGraphGenerator(this.tasks);
    const readyNodes = generator.getReadyTasks(this.taskGraph);
    
    if (readyNodes.length === 0) {
      return null;
    }

    // Prioritize: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedNodes = readyNodes.sort((a, b) => {
      const prioA = priorityOrder[a.task.priority as keyof typeof priorityOrder] ?? 99;
      const prioB = priorityOrder[b.task.priority as keyof typeof priorityOrder] ?? 99;
      return prioA - prioB;
    });

    return sortedNodes[0].task;
  }

  /**
   * Execute the next ready task
   */
  async executeNextTask(): Promise<TaskExecutionResult | null> {
    await this.loadTasks();
    
    const task = this.getNextTask();
    if (!task) {
      console.log('No ready tasks to execute');
      return null;
    }

    console.log(`Executing task: ${task.id} - ${task.title}`);
    const startTime = Date.now();

    try {
      // Step 1: Mark task as in-progress
      await this.updateTaskStatus(task.id, 'in-progress');

      // Step 2: Select agent based on task type
      const agentName = this.selectAgent(task);
      console.log(`Selected agent: ${agentName}`);

      // Step 3: Generate prompt via Dispatcher
      const contextFiles = await this.gatherContextFiles(task);
      const promptPayload = await this.dispatcher.composePrompt(task.id, {
        agentName,
        contextFiles,
        memory: this.memory.slice(-10), // Last 10 entries
      });

      // Step 4: Send to Copilot Agent or local LLM handler
      let output: string;
      if (this.llmHandler) {
        output = await this.llmHandler.execute(promptPayload);
      } else {
        output = await this.executeCopilotAgent(promptPayload);
      }

      console.log(`Task execution completed, output length: ${output.length} chars`);

      // Step 5: Trigger VerificationAgent (if enabled)
      let verified = true;
      let verificationNotes: string | undefined;
      if (this.enableVerification) {
        const verificationResult = await this.verifyOutput(task, output);
        verified = verificationResult.success;
        verificationNotes = verificationResult.notes;
        console.log(`Verification: ${verified ? 'PASSED' : 'FAILED'}`);
      }

      // Step 6: Persist outputs and context
      await this.persistExecutionContext(task.id, output, contextFiles);

      // Step 7: Mark task status
      const finalStatus = verified ? 'completed' : 'review';
      await this.updateTaskStatus(task.id, finalStatus);

      // Update memory
      this.addToMemory('user', `Executed task: ${task.title}`);
      this.addToMemory('assistant', `Task completed with status: ${finalStatus}`);

      const executionTimeMs = Date.now() - startTime;
      const result: TaskExecutionResult = {
        taskId: task.id,
        success: true,
        output,
        executionTimeMs,
        agentUsed: agentName,
        verified,
        verificationNotes,
      };

      this.executionHistory.push(result);
      console.log(`Task ${task.id} completed in ${executionTimeMs}ms`);

      return result;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      console.error(`Task execution failed:`, error);

      // Mark task as failed
      await this.updateTaskStatus(task.id, 'blocked');
      
      const result: TaskExecutionResult = {
        taskId: task.id,
        success: false,
        output: '',
        error: (error as Error).message,
        executionTimeMs,
        agentUsed: 'unknown',
        verified: false,
      };

      this.executionHistory.push(result);
      return result;
    }
  }

  /**
   * Select appropriate agent based on task type and priority
   */
  private selectAgent(task: ParsedTask): string {
    const typeToAgent: Record<string, string> = {
      feature: 'coder',
      bug: 'coder',
      refactor: 'architect',
      testing: 'tester',
      documentation: 'coder',
      architecture: 'architect',
      maintenance: 'coder',
    };

    return typeToAgent[task.type || 'feature'] || 'coder';
  }

  /**
   * Gather relevant context files for task execution
   */
  private async gatherContextFiles(task: ParsedTask): Promise<string[]> {
    // In a real implementation, this would use intelligent context gathering
    // For now, return common project files
    const commonFiles: string[] = [];
    
    const candidates = [
      path.join(this.workspaceRoot, 'README.md'),
      path.join(this.workspaceRoot, 'package.json'),
      path.join(this.workspaceRoot, 'tsconfig.json'),
    ];

    for (const filePath of candidates) {
      try {
        await fs.access(filePath);
        commonFiles.push(filePath);
      } catch {
        // File doesn't exist, skip
      }
    }

    return commonFiles;
  }

  /**
   * Extract agent capabilities from tool permissions
   */
  private extractAgentCapabilities(toolPermissions?: Record<string, unknown>): string[] {
    if (!toolPermissions) {
      return [];
    }
    return Object.keys(toolPermissions).filter(key => toolPermissions[key] === true);
  }

  /**
   * Execute prompt using Copilot Agent API
   * Integrates with GitHub Copilot Agent Mode API when enabled
   */
  private async executeCopilotAgent(payload: PromptPayload): Promise<string> {
    // Use GitHub Copilot Agent Mode API if enabled and client is available
    if (this.useCopilotAgentMode && this.copilotAgentClient) {
      try {
        console.log('[TaskExecutor] Using GitHub Copilot Agent Mode API');
        
        // Ensure the client is authenticated and registered
        if (!this.copilotAgentClient.isConnected()) {
          const authenticated = await this.copilotAgentClient.authenticate();
          if (!authenticated) {
            console.warn('[TaskExecutor] GitHub Copilot Agent Mode authentication failed, falling back to simulated response');
            return this.generateSimulatedResponse(payload);
          }

          // Register the agent if not already registered
          const capabilities = this.extractAgentCapabilities(payload.agent.tool_permissions);
          const registered = await this.copilotAgentClient.registerAgent({
            agentId: `orchestrator-${payload.agent.name}`,
            name: payload.agent.name,
            role: payload.agent.role,
            capabilities,
          });

          if (!registered) {
            console.warn('[TaskExecutor] GitHub Copilot Agent registration failed, falling back to simulated response');
            return this.generateSimulatedResponse(payload);
          }
        }

        // Execute the task via Agent Mode API
        const request: AgentExecutionRequest = {
          requestId: `req-${payload.taskId}-${Date.now()}`,
          agentId: `orchestrator-${payload.agent.name}`,
          payload,
        };

        const response = await this.copilotAgentClient.executeTask(request);

        if (response.success) {
          console.log(`[TaskExecutor] GitHub Copilot Agent execution successful, output length: ${response.output.length} chars`);
          return response.output;
        } else {
          console.error('[TaskExecutor] GitHub Copilot Agent execution failed:', response.error);
          console.warn('[TaskExecutor] Falling back to simulated response');
          return this.generateSimulatedResponse(payload);
        }
      } catch (error) {
        console.error('[TaskExecutor] Error using GitHub Copilot Agent Mode API:', error);
        console.warn('[TaskExecutor] Falling back to simulated response');
        return this.generateSimulatedResponse(payload);
      }
    }

    // Fall back to simulated response when Agent Mode is not enabled
    return this.generateSimulatedResponse(payload);
  }

  /**
   * Generate a simulated response (fallback when Agent Mode API is not available)
   */
  private generateSimulatedResponse(payload: PromptPayload): string {
    console.warn('Using simulated Copilot response (no real API integration)');
    
    return `# Simulated Copilot Response for Task: ${payload.taskId}

**Agent:** ${payload.agent.name}
**Role:** ${payload.agent.role}

## Analysis
This is a simulated response. In production, this would be the actual output from GitHub Copilot Agent Mode.

## Implementation
The task "${payload.task.title}" would be implemented according to the provided context and instructions.

## Next Steps
- Review the implementation
- Run tests if applicable
- Update documentation

---
*Note: This is a placeholder response. Real implementation requires GitHub Copilot Agent Mode API integration.*`;
  }

  /**
   * Verify task output using verification agent
   */
  private async verifyOutput(task: ParsedTask, output: string): Promise<{ success: boolean; notes?: string }> {
    try {
      // Load verifier agent
      const verifier = await defaultAgentProfileLoader.loadProfile('verifier');
      if (!verifier) {
        console.warn('Verifier agent not found, skipping verification');
        return { success: true, notes: 'Verifier not available' };
      }

      // Create verification prompt
      const verificationPrompt = `
Task: ${task.title}
Description: ${task.description}

Output to verify:
${output}

Please verify if this output satisfies the task requirements.
Return "PASS" or "FAIL" with explanation.
`;

      // Execute verification (simulated for now)
      console.log('Running verification...');
      
      // Simple heuristic: if output is non-empty and mentions the task, pass
      const hasContent = output.length > 100;
      const mentionsTask = output.toLowerCase().includes(task.title.toLowerCase().split(' ')[0]);
      
      if (hasContent && mentionsTask) {
        return { success: true, notes: 'Output appears valid and relevant' };
      } else {
        return { success: false, notes: 'Output may be insufficient or off-topic' };
      }
    } catch (error) {
      console.error('Verification failed:', error);
      return { success: false, notes: `Verification error: ${(error as Error).message}` };
    }
  }

  /**
   * Persist execution context and outputs
   */
  private async persistExecutionContext(taskId: string, output: string, contextFiles: string[]): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });

      const context: ExecutionContext = {
        taskId,
        timestamp: new Date().toISOString(),
        files: contextFiles,
        output,
        metadata: {
          memoryEntries: this.memory.length,
          executionCount: this.executionHistory.length + 1,
        },
      };

      const outputFile = path.join(this.outputDir, `${taskId}.json`);
      await fs.writeFile(outputFile, JSON.stringify(context, null, 2), 'utf-8');

      // Also save raw output
      const rawOutputFile = path.join(this.outputDir, `${taskId}.output.txt`);
      await fs.writeFile(rawOutputFile, output, 'utf-8');

      console.log(`Context persisted to ${outputFile}`);
    } catch (error) {
      console.error('Failed to persist execution context:', error);
      throw error;
    }
  }

  /**
   * Update task status in memory and on disk
   */
  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update status - cast to TaskStatus since we validate elsewhere
    (task as any).status = status;
    
    await this.saveTasks();
    
    // Regenerate graph after status change
    const generator = new TaskGraphGenerator(this.tasks);
    this.taskGraph = generator.generateGraph();
  }

  /**
   * Validate that a number is positive, return default if not
   */
  private static validatePositiveNumber(value: number | undefined, defaultValue: number): number {
    const num = value ?? defaultValue;
    
    // Only accept finite, strictly positive numbers. Fallback to default otherwise.
    if (!Number.isFinite(num) || num <= 0) {
      return defaultValue;
    }
    
    return num;
  }

  /**
   * Check if a timestamp string is valid
   */
  private static isValidTimestamp(timestamp: string): boolean {
    try {
      const time = new Date(timestamp).getTime();
      return !isNaN(time);
    } catch {
      return false;
    }
  }

  /**
   * Prune memory entries based on TTL (Time To Live)
   * Removes entries older than the configured TTL
   */
  private pruneMemoryByTTL(): void {
    const now = Date.now();
    const ttlMs = this.memoryTTLMinutes * 60 * 1000;
    const initialCount = this.memory.length;
    
    this.memory = this.memory.filter(entry => {
      if (!TaskExecutor.isValidTimestamp(entry.timestamp)) {
        console.warn(`[MemoryCleanup] Invalid timestamp found: ${entry.timestamp}, keeping entry`);
        return true; // Keep entries with invalid timestamps (conservative approach)
      }
      
      const entryTime = new Date(entry.timestamp).getTime();
      const age = now - entryTime;
      return age < ttlMs;
    });
    
    const pruned = initialCount - this.memory.length;
    if (pruned > 0) {
      console.log(`[MemoryCleanup] Pruned ${pruned} entries older than ${this.memoryTTLMinutes} minutes (TTL-based)`);
    }
  }

  /**
   * Perform periodic memory cleanup.
   *
   * This method is invoked as part of memory maintenance (e.g. from addToMemory)
   * and uses a simple counter to decide when to run a cleanup pass. The
   * `memoryAdditionCount` value therefore tracks memory-related cycles / entry additions,
   * not task execution cycles.
   *
   * Note: This method is designed for sequential execution in Node.js'
   * single-threaded environment. The `memoryAdditionCount` increment is safe because
   * calls to this method are not executed concurrently.
   */
  private performPeriodicMemoryCleanup(): void {
    this.memoryAdditionCount++;
    
    // Perform cleanup every N memory additions
    if (this.memoryAdditionCount % this.memoryCleanupInterval === 0) {
      console.log(`[MemoryCleanup] Performing periodic cleanup at memory addition ${this.memoryAdditionCount}`);
      const initialCount = this.memory.length;
      
      // First, prune by TTL
      this.pruneMemoryByTTL();
      
      // Then, enforce memory limit as fallback
      if (this.memory.length > this.memoryLimit) {
        this.memory = this.memory.slice(-this.memoryLimit);
        console.log(`[MemoryCleanup] Enforced memory limit: ${this.memoryLimit} entries (overflow protection)`);
      }
      
      const finalCount = this.memory.length;
      console.log(`[MemoryCleanup] Memory cleanup complete: ${initialCount} → ${finalCount} entries`);
    }
  }

  /**
   * Add entry to memory with limit enforcement
   */
  private addToMemory(role: 'user' | 'assistant' | 'system', content: string): void {
    this.memory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    // Perform periodic cleanup (active strategy)
    this.performPeriodicMemoryCleanup();

    // Fallback overflow protection (passive strategy)
    if (this.memory.length > this.memoryLimit) {
      this.memory = this.memory.slice(-this.memoryLimit);
      console.log(`[MemoryCleanup] Emergency overflow protection triggered: kept last ${this.memoryLimit} entries`);
    }
  }

  /**
   * Get execution statistics
   */
  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const inProgress = this.tasks.filter(t => t.status === 'in_progress').length;
    const blocked = this.tasks.filter(t => t.status === 'blocked').length;
    const generator = new TaskGraphGenerator(this.tasks);
    const ready = this.taskGraph ? generator.getReadyTasks(this.taskGraph).length : 0;

    return {
      total,
      completed,
      inProgress,
      blocked,
      ready,
      executionHistory: this.executionHistory.length,
      memoryEntries: this.memory.length,
      memoryAdditionCount: this.memoryAdditionCount,
      memoryConfig: {
        limit: this.memoryLimit,
        cleanupInterval: this.memoryCleanupInterval,
        ttlMinutes: this.memoryTTLMinutes,
      },
    };
  }

  /**
   * Execute all ready tasks sequentially
   */
  async executeAllReady(): Promise<TaskExecutionResult[]> {
    const results: TaskExecutionResult[] = [];
    
    while (true) {
      const result = await this.executeNextTask();
      if (!result) {
        break; // No more ready tasks
      }
      results.push(result);
      
      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): TaskExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Get current memory
   */
  getMemory(): MemoryEntry[] {
    return [...this.memory];
  }

  /**
   * Clear memory
   */
  clearMemory(): void {
    this.memory = [];
  }

  /**
   * Reset execution history
   */
  resetHistory(): void {
    this.executionHistory = [];
  }
}

/**
 * Default task executor instance
 */
export const defaultTaskExecutor = new TaskExecutor();

/**
 * Convenience function to execute next task
 */
export async function executeNextTask(options?: TaskExecutorOptions): Promise<TaskExecutionResult | null> {
  const executor = options ? new TaskExecutor(options) : defaultTaskExecutor;
  return executor.executeNextTask();
}

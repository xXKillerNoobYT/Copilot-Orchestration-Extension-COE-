/**
 * Task Graph Generator - Main Export File
 * 
 * A comprehensive utility module for parsing structured task files and generating
 * dependency-resolved task graphs with cycle detection, topological sorting,
 * and visualization support.
 * 
 * @module taskGraph
 */

// Export task parser types and functions
export {
  TaskStatus,
  TaskPriority,
  TaskType,
  AgentType,
  TaskFrontMatter,
  ParsedTask,
  ValidationError,
  ParserOptions,
  ParseResult,
  parseTaskMarkdown,
  parseTaskFile,
  parseTasksFromDirectory,
  isValidTaskType,
  isValidTaskPriority,
  isValidTaskStatus,
  isValidAgentType,
  normalizeEffort,
} from './taskParser';

// Export task graph generator types and classes
export {
  TaskNode,
  TaskGraph,
  GraphStats,
  TaskGraphGenerator,
  generateTaskGraph,
  getExecutionOrder,
  detectCycles,
  getReadyTasks,
  exportToDot,
  exportToMermaid,
} from './taskGraphGenerator';

// Agent profiles
export {
  AgentProfile,
  ToolPermissions,
  ExecutionConstraints,
  PromptTemplates,
  AgentProfileLoader,
  defaultAgentProfileLoader,
} from './agentProfiles';

// Copilot dispatcher
export {
  CopilotDispatcher,
  defaultCopilotDispatcher,
  PromptPayload,
  PromptMessage,
  MemoryEntry,
  ContextFile,
  ComposeOptions,
} from './copilotDispatcher';

// Orchestrator panel
export {
  OrchestratorPanelProvider,
  MemoryEntry as PanelMemoryEntry,
  ContextBundle,
} from './orchestratorPanel';

// Task executor
export {
  TaskExecutor,
  defaultTaskExecutor,
  executeNextTask,
  TaskExecutionResult,
  ExecutionContext,
  TaskExecutorOptions,
  LLMHandler,
} from './taskExecutor';

// Testing agent
export {
  TestingAgent,
  defaultTestingAgent,
  TestResult,
  TestCase,
  TestGenerationOptions,
} from './testingAgent';

// Verification agent
export {
  VerificationAgent,
  defaultVerificationAgent,
  verifyAndReport,
  VerificationResult,
  ChecklistItem,
  Issue,
  VerificationOptions,
} from './verificationAgent';

// LLM configuration helper
export {
  readLlmConfig,
  isValidBaseUrl,
  redactSecret,
  LlmConfig,
  LlmConfigState,
} from './config/llmConfig';

// LLM client
export { createOpenAIClient, LlmClient, ChatMessage, ChatRole } from './llm/openaiClient';

// Re-export demo and test functions for convenience
export { runTaskGraphDemo } from './taskGraphDemo';
export { runAllTests } from './taskGraphTest';

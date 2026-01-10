/**
 * Core types and interfaces for the ContextManager module
 */

/**
 * Types of context that can be stored
 */
export enum ContextType {
  ARCHITECTURE_SNAPSHOT = 'architecture_snapshot',
  TASK_COMPLETION = 'task_completion',
  INTERMEDIATE_OUTPUT = 'intermediate_output',
  AGENT_RESPONSE = 'agent_response'
}

/**
 * Storage format options
 */
export enum StorageFormat {
  JSON = 'json',
  YAML = 'yaml'
}

/**
 * Base context metadata
 */
export interface ContextMetadata {
  id: string;
  taskId: string;
  type: ContextType;
  timestamp: Date;
  version: string;
  tags?: string[];
  expiresAt?: Date;
  size?: number;
}

/**
 * Architecture snapshot context
 */
export interface ArchitectureSnapshot {
  metadata: ContextMetadata;
  components: {
    name: string;
    type: string;
    dependencies: string[];
    description?: string;
  }[];
  relationships: {
    from: string;
    to: string;
    type: string;
  }[];
  notes?: string;
}

/**
 * Task completion context
 */
export interface TaskCompletion {
  metadata: ContextMetadata;
  taskId: string;
  status: 'completed' | 'failed' | 'cancelled';
  result?: any;
  duration?: number;
  resourcesUsed?: {
    cpu?: number;
    memory?: number;
    tokens?: number;
  };
  outputs?: string[];
  errors?: string[];
}

/**
 * Intermediate output context
 */
export interface IntermediateOutput {
  metadata: ContextMetadata;
  taskId: string;
  step: string;
  data: any;
  isPartial: boolean;
  continuationToken?: string;
}

/**
 * Agent response context
 */
export interface AgentResponse {
  metadata: ContextMetadata;
  agentId: string;
  taskId: string;
  prompt: string;
  response: string;
  model?: string;
  tokensUsed?: number;
  confidence?: number;
}

/**
 * Union type of all context types
 */
export type ContextData = 
  | ArchitectureSnapshot 
  | TaskCompletion 
  | IntermediateOutput 
  | AgentResponse;

/**
 * Context query options
 */
export interface ContextQuery {
  taskId?: string;
  type?: ContextType;
  tags?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  includeExpired?: boolean;
}

/**
 * Pruning policy configuration
 */
export interface PruningPolicy {
  maxAge?: number; // in days
  maxSizePerTask?: number; // in bytes
  maxTotalSize?: number; // in bytes
  maxItemsPerTask?: number;
  keepTypes?: ContextType[];
}

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  dataDir: string;
  storageFormat: StorageFormat;
  pruningPolicy?: PruningPolicy;
  enableCompression?: boolean;
  enableEncryption?: boolean;
  maxMemoryCache?: number; // in MB
}

/**
 * Storage adapter interface
 */
export interface IStorageAdapter {
  save(key: string, data: ContextData): Promise<void>;
  load(key: string): Promise<ContextData | null>;
  delete(key: string): Promise<void>;
  list(pattern?: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  getSize(key: string): Promise<number>;
}

/**
 * Context reference for linking contexts
 */
export interface ContextReference {
  contextId: string;
  taskId: string;
  type: ContextType;
  path: string;
  timestamp: Date;
}

/**
 * Context statistics
 */
export interface ContextStats {
  totalContexts: number;
  totalSize: number;
  byType: Record<ContextType, number>;
  byTask: Record<string, number>;
  oldestContext?: Date;
  newestContext?: Date;
}

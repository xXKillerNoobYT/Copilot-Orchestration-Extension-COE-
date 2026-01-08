/**
 * Validation schemas using Zod for runtime type safety
 */

import { z } from 'zod';
import { ContextType, StorageFormat } from './types';

/**
 * Context metadata schema
 */
export const contextMetadataSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  type: z.nativeEnum(ContextType),
  timestamp: z.date(),
  version: z.string().min(1),
  tags: z.array(z.string()).optional(),
  expiresAt: z.date().optional(),
  size: z.number().positive().optional()
});

/**
 * Architecture snapshot schema
 */
export const architectureSnapshotSchema = z.object({
  metadata: contextMetadataSchema,
  components: z.array(z.object({
    name: z.string(),
    type: z.string(),
    dependencies: z.array(z.string()),
    description: z.string().optional()
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string()
  })),
  notes: z.string().optional()
});

/**
 * Task completion schema
 */
export const taskCompletionSchema = z.object({
  metadata: contextMetadataSchema,
  taskId: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  result: z.any().optional(),
  duration: z.number().positive().optional(),
  resourcesUsed: z.object({
    cpu: z.number().optional(),
    memory: z.number().optional(),
    tokens: z.number().optional()
  }).optional(),
  outputs: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional()
});

/**
 * Intermediate output schema
 */
export const intermediateOutputSchema = z.object({
  metadata: contextMetadataSchema,
  taskId: z.string(),
  step: z.string(),
  data: z.any(),
  isPartial: z.boolean(),
  continuationToken: z.string().optional()
});

/**
 * Agent response schema
 */
export const agentResponseSchema = z.object({
  metadata: contextMetadataSchema,
  agentId: z.string(),
  taskId: z.string(),
  prompt: z.string(),
  response: z.string(),
  model: z.string().optional(),
  tokensUsed: z.number().positive().optional(),
  confidence: z.number().min(0).max(1).optional()
});

/**
 * Context query schema
 */
export const contextQuerySchema = z.object({
  taskId: z.string().optional(),
  type: z.nativeEnum(ContextType).optional(),
  tags: z.array(z.string()).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  limit: z.number().positive().optional(),
  includeExpired: z.boolean().optional()
});

/**
 * Pruning policy schema
 */
export const pruningPolicySchema = z.object({
  maxAge: z.number().positive().optional(),
  maxSizePerTask: z.number().positive().optional(),
  maxTotalSize: z.number().positive().optional(),
  maxItemsPerTask: z.number().positive().optional(),
  keepTypes: z.array(z.nativeEnum(ContextType)).optional()
});

/**
 * Context manager config schema
 */
export const contextManagerConfigSchema = z.object({
  dataDir: z.string().min(1),
  storageFormat: z.nativeEnum(StorageFormat),
  pruningPolicy: pruningPolicySchema.optional(),
  enableCompression: z.boolean().optional(),
  enableEncryption: z.boolean().optional(),
  maxMemoryCache: z.number().positive().optional()
});

/**
 * Validate context data based on type
 */
export function validateContextData(data: any, type: ContextType): boolean {
  try {
    switch (type) {
      case ContextType.ARCHITECTURE_SNAPSHOT:
        architectureSnapshotSchema.parse(data);
        break;
      case ContextType.TASK_COMPLETION:
        taskCompletionSchema.parse(data);
        break;
      case ContextType.INTERMEDIATE_OUTPUT:
        intermediateOutputSchema.parse(data);
        break;
      case ContextType.AGENT_RESPONSE:
        agentResponseSchema.parse(data);
        break;
      default:
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

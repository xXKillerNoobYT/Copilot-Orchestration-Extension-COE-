import { estimateTokens } from './tokenizer';

export type Priority = 'high' | 'medium' | 'low';

export interface ContextItem {
  id?: string;
  content: string;
  tokens?: number;
  timestamp?: number;
  priority?: Priority;
}

export interface ContextLimiterConfig {
  globalLimit?: number; // default 5000
  minFloor?: number; // default 3500
  summarizationThreshold?: number; // fraction of limit, default 0.8
}

export interface ContextLimiterStatus {
  tokensUsed: number;
  limit: number;
  percentageUsed: number; // 0..1
  summarizationApplied: boolean;
  autoRecovery: boolean;
}

export interface EnforceResult {
  items: ContextItem[];
  status: ContextLimiterStatus;
}

/**
 * ContextLimiter implements F037 acceptance criteria for beta:
 * - Global context limit enforced (default: 5,000 tokens)
 * - Minimum floor (3,500 tokens) prevents underflow
 * - Basic summarization when >80% limit
 * - Auto-recovery on overflow (fresh start with handover)
 * - Status API for sidebar display (handled by UI elsewhere)
 */
export class ContextLimiter {
  private readonly limit: number;
  private readonly minFloor: number;
  private readonly threshold: number; // fraction

  constructor(config: ContextLimiterConfig = {}) {
    const minFloor = config.minFloor ?? 3500;
    const configured = config.globalLimit ?? 5000;
    // Enforce floor to prevent underflow
    this.limit = Math.max(configured, minFloor);
    this.minFloor = minFloor;
    this.threshold = config.summarizationThreshold ?? 0.8;
  }

  /**
   * Compute tokens for all items if not provided.
   */
  private withTokens(items: ContextItem[]): ContextItem[] {
    return items.map((it) => ({
      ...it,
      tokens: typeof it.tokens === 'number' ? it.tokens : estimateTokens(it.content),
    }));
  }

  /**
   * Apply basic summarization to low/medium priority items.
   * Strategy: truncate content to 200 chars and recalc tokens.
   */
  private summarize(items: ContextItem[]): ContextItem[] {
    return items.map((it) => {
      if (it.priority === 'high') return it; // preserve high-priority
      const truncated = it.content.length > 200 ? it.content.slice(0, 200) : it.content;
      const summarized = `Summary: ${truncated}`;
      return {
        ...it,
        content: summarized,
        tokens: estimateTokens(summarized),
      };
    });
  }

  /**
   * Enforce global limit and apply summarization/auto-recovery as needed.
   */
  enforce(items: ContextItem[]): EnforceResult {
    let processed = this.withTokens(items);
    const totalTokens = processed.reduce((sum, it) => sum + (it.tokens ?? 0), 0);

    const percentageUsed = totalTokens / this.limit;
    const overThreshold = percentageUsed > this.threshold;
    const overflow = totalTokens > this.limit;

    let summarizationApplied = false;
    let autoRecovery = false;

    if (overflow) {
      // Auto-recovery: start fresh (handover to next task/context cycle)
      summarizationApplied = false;
      autoRecovery = true;
      return {
        items: [],
        status: {
          tokensUsed: totalTokens,
          limit: this.limit,
          percentageUsed,
          summarizationApplied,
          autoRecovery,
        },
      };
    }

    if (overThreshold) {
      processed = this.summarize(processed);
      summarizationApplied = true;
    }

    const finalTokens = processed.reduce((sum, it) => sum + (it.tokens ?? 0), 0);
    return {
      items: processed,
      status: {
        tokensUsed: finalTokens,
        limit: this.limit,
        percentageUsed: finalTokens / this.limit,
        summarizationApplied,
        autoRecovery,
      },
    };
  }

  getConfig() {
    return {
      limit: this.limit,
      minFloor: this.minFloor,
      threshold: this.threshold,
    };
  }
}

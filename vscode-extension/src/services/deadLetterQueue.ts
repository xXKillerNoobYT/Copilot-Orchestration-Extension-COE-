/**
 * Dead Letter Queue Service
 * Manages failed MCP messages with SQLite persistence
 * 
 * Features:
 * - Persist failed messages with error details
 * - Query with filtering (status, handler, type, date)
 * - Replay failed messages
 * - Archive old entries (7 days)
 * - Delete archived entries (30 days)
 */

import * as Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface DeadLetterEntry {
  id: string;
  messageId: string;
  messageType: string;
  originalPayload: object;
  errorMessage: string;
  errorStack?: string;
  retryCount: number;
  firstFailedAt: Date;
  lastRetryAt?: Date;
  handlerName?: string;
  taskId?: string;
  metadata?: Record<string, any>;
  status: 'failed' | 'retrying' | 'archived' | 'replayed';
}

export interface DeadLetterFilters {
  status?: string;
  handlerName?: string;
  messageType?: string;
  since?: Date;
  limit?: number;  // Maximum number of entries to return (default: 100)
}

export class DeadLetterQueueService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeSchema();
  }

  /**
   * Initialize database schema if it doesn't exist
   */
  private initializeSchema(): void {
    try {
      // Check if table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='dead_letter_queue'
      `).get();

      if (!tableExists) {
        console.log('[DeadLetterQueue] Creating dead_letter_queue table...');
        
        // Create table
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS dead_letter_queue (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            message_type TEXT NOT NULL,
            original_payload TEXT NOT NULL,
            error_message TEXT NOT NULL,
            error_stack TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            first_failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_retry_at TIMESTAMP,
            handler_name TEXT,
            task_id TEXT,
            metadata TEXT,
            status TEXT DEFAULT 'failed',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create indexes
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status);
          CREATE INDEX IF NOT EXISTS idx_dlq_message_type ON dead_letter_queue(message_type);
          CREATE INDEX IF NOT EXISTS idx_dlq_handler_name ON dead_letter_queue(handler_name);
          CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
          CREATE INDEX IF NOT EXISTS idx_dlq_task_id ON dead_letter_queue(task_id);
        `);

        console.log('[DeadLetterQueue] Table and indexes created successfully');
      }
    } catch (error) {
      console.error('[DeadLetterQueue] Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * Add failed message to dead-letter queue
   */
  async addFailedMessage(
    messageId: string,
    messageType: string,
    payload: object,
    error: Error,
    handlerName?: string,
    taskId?: string,
    retryCount: number = 0
  ): Promise<string> {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO dead_letter_queue 
        (id, message_id, message_type, original_payload, error_message, error_stack, 
         retry_count, handler_name, task_id, first_failed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        messageId,
        messageType,
        JSON.stringify(payload),
        error.message,
        error.stack || null,
        retryCount,
        handlerName || null,
        taskId || null,
        now,
        now
      );

      console.log(`[DeadLetterQueue] Added entry ${id} for message ${messageId}`);
      return id;
    } catch (error) {
      console.error('[DeadLetterQueue] Failed to add message:', error);
      throw new Error(`Failed to add message to dead-letter queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all dead-letter entries with filtering
   */
  async getEntries(filters?: DeadLetterFilters): Promise<DeadLetterEntry[]> {
    try {
      let query = 'SELECT * FROM dead_letter_queue WHERE 1=1';
      const params: any[] = [];

      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters?.handlerName) {
        query += ' AND handler_name = ?';
        params.push(filters.handlerName);
      }
      if (filters?.messageType) {
        query += ' AND message_type = ?';
        params.push(filters.messageType);
      }
      if (filters?.since) {
        query += ' AND created_at >= ?';
        params.push(filters.since.toISOString());
      }

      // Use configurable limit with a default of 100, validate and clamp to prevent abuse
      let limit = 100;
      if (filters?.limit !== undefined && filters.limit !== null) {
        const parsedLimit = Number(filters.limit);
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          // Ensure integer and cap at a reasonable maximum
          limit = Math.min(Math.floor(parsedLimit), 1000);
        }
      }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const rows = this.db.prepare(query).all(...params) as any[];
      return rows.map(row => this.mapRow(row));
    } catch (error) {
      console.error('[DeadLetterQueue] Failed to get entries:', error);
      throw new Error(`Failed to retrieve dead-letter queue entries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Replay a dead-letter message
   */
  async replayMessage(id: string): Promise<boolean> {
    try {
      const entry = this.db.prepare('SELECT * FROM dead_letter_queue WHERE id = ?')
        .get(id) as any;

      if (!entry) {
        throw new Error(`Dead letter entry ${id} not found`);
      }

      // Mark as replayed
      const result = this.db.prepare('UPDATE dead_letter_queue SET status = ?, last_retry_at = ? WHERE id = ?')
        .run('replayed', new Date().toISOString(), id);

      if (result.changes > 0) {
        console.log(`[DeadLetterQueue] Message ${id} marked for replay`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[DeadLetterQueue] Failed to replay message ${id}:`, error);
      throw new Error(`Failed to replay message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Archive old dead-letter entries
   */
  async archiveOldEntries(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = this.db.prepare(`
        UPDATE dead_letter_queue 
        SET status = 'archived' 
        WHERE created_at < ? AND status = 'failed'
      `).run(cutoffDate.toISOString());

      const archived = result.changes;
      if (archived > 0) {
        console.log(`[DeadLetterQueue] Archived ${archived} old entries`);
      }

      return archived;
    } catch (error) {
      console.error('[DeadLetterQueue] Failed to archive entries:', error);
      throw new Error(`Failed to archive old entries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete archived entries
   */
  async deleteArchivedEntries(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = this.db.prepare(`
        DELETE FROM dead_letter_queue 
        WHERE status = 'archived' AND created_at < ?
      `).run(cutoffDate.toISOString());

      const deleted = result.changes;
      if (deleted > 0) {
        console.log(`[DeadLetterQueue] Deleted ${deleted} archived entries`);
      }

      return deleted;
    } catch (error) {
      console.error('[DeadLetterQueue] Failed to delete archived entries:', error);
      throw new Error(`Failed to delete archived entries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get entry by ID
   */
  async getEntry(id: string): Promise<DeadLetterEntry | null> {
    try {
      const row = this.db.prepare('SELECT * FROM dead_letter_queue WHERE id = ?')
        .get(id) as any;

      return row ? this.mapRow(row) : null;
    } catch (error) {
      console.error(`[DeadLetterQueue] Failed to get entry ${id}:`, error);
      throw new Error(`Failed to retrieve entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get total count of entries by status
   */
  async getCountByStatus(): Promise<Record<string, number>> {
    try {
      const rows = this.db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM dead_letter_queue 
        GROUP BY status
      `).all() as any[];

      const counts: Record<string, number> = {};
      rows.forEach(row => {
        counts[row.status] = row.count;
      });

      return counts;
    } catch (error) {
      console.error('[DeadLetterQueue] Failed to get counts:', error);
      return {};
    }
  }

  /**
   * Map database row to DeadLetterEntry
   */
  private mapRow(row: any): DeadLetterEntry {
    return {
      id: row.id,
      messageId: row.message_id,
      messageType: row.message_type,
      originalPayload: JSON.parse(row.original_payload),
      errorMessage: row.error_message,
      errorStack: row.error_stack,
      retryCount: row.retry_count,
      firstFailedAt: new Date(row.first_failed_at),
      lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at) : undefined,
      handlerName: row.handler_name,
      taskId: row.task_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status,
    };
  }
}

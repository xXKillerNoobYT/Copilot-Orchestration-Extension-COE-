/**
 * Audit Logger for MCP Server
 * Logs all actions with timestamps and metadata to SQLite with WAL mode
 * Emits WebSocket events for state changes
 */

import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id?: number;
  timestamp: string;
  action: string;
  toolName: string;
  args: any;
  result?: any;
  error?: string;
  duration_ms?: number;
  agent?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

/**
 * WebSocket event for state changes
 */
export interface WebSocketEvent {
  type: string;
  timestamp: string;
  data: any;
}

/**
 * Audit logger with SQLite persistence and WebSocket integration
 */
export class AuditLogger {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private wsCallback: ((event: WebSocketEvent) => void) | null = null;

  constructor(dbPath?: string) {
    // Default to workspace storage or temp directory
    this.dbPath = dbPath || path.join(process.cwd(), '.mcp-audit.db');
  }

  /**
   * Initialize database with WAL mode
   */
  public initialize(): void {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database.default(this.dbPath);

    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL');

    // Create audit_log table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        args TEXT,
        result TEXT,
        error TEXT,
        duration_ms INTEGER,
        agent TEXT,
        task_id TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_tool_name ON audit_log(tool_name);
      CREATE INDEX IF NOT EXISTS idx_audit_task_id ON audit_log(task_id);
      CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent);
    `);

    console.log(`[AuditLogger] Initialized with WAL mode at ${this.dbPath}`);
  }

  /**
   * Set WebSocket callback for real-time events
   */
  public setWebSocketCallback(callback: (event: WebSocketEvent) => void): void {
    this.wsCallback = callback;
  }

  /**
   * Log an action with metadata
   */
  public log(entry: AuditLogEntry): number {
    if (!this.db) {
      throw new Error('AuditLogger not initialized. Call initialize() first.');
    }

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (
        timestamp, action, tool_name, args, result, error, 
        duration_ms, agent, task_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.timestamp,
      entry.action,
      entry.toolName,
      JSON.stringify(entry.args || {}),
      entry.result ? JSON.stringify(entry.result) : null,
      entry.error || null,
      entry.duration_ms || null,
      entry.agent || null,
      entry.taskId || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null
    );

    // Emit WebSocket event for state changes
    this.emitEvent({
      type: this.getEventType(entry.toolName),
      timestamp: entry.timestamp,
      data: {
        id: result.lastInsertRowid,
        ...entry
      }
    });

    return result.lastInsertRowid as number;
  }

  /**
   * Get audit log entries with optional filtering
   */
  public getEntries(filter?: {
    toolName?: string;
    taskId?: string;
    agent?: string;
    since?: string;
    limit?: number;
  }): AuditLogEntry[] {
    if (!this.db) {
      throw new Error('AuditLogger not initialized. Call initialize() first.');
    }

    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (filter?.toolName) {
      query += ' AND tool_name = ?';
      params.push(filter.toolName);
    }

    if (filter?.taskId) {
      query += ' AND task_id = ?';
      params.push(filter.taskId);
    }

    if (filter?.agent) {
      query += ' AND agent = ?';
      params.push(filter.agent);
    }

    if (filter?.since) {
      query += ' AND timestamp >= ?';
      params.push(filter.since);
    }

    query += ' ORDER BY id DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      action: row.action,
      toolName: row.tool_name,
      args: row.args ? JSON.parse(row.args) : {},
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      duration_ms: row.duration_ms || undefined,
      agent: row.agent || undefined,
      taskId: row.task_id || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Get statistics for monitoring
   */
  public getStats(): {
    totalEntries: number;
    entriesByTool: Record<string, number>;
    entriesByAgent: Record<string, number>;
    errorCount: number;
    avgDuration: number;
  } {
    if (!this.db) {
      throw new Error('AuditLogger not initialized. Call initialize() first.');
    }

    const totalEntries = this.db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as any;
    const errorCount = this.db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE error IS NOT NULL').get() as any;
    const avgDuration = this.db.prepare('SELECT AVG(duration_ms) as avg FROM audit_log WHERE duration_ms IS NOT NULL').get() as any;

    const byTool = this.db.prepare('SELECT tool_name, COUNT(*) as count FROM audit_log GROUP BY tool_name').all() as any[];
    const byAgent = this.db.prepare('SELECT agent, COUNT(*) as count FROM audit_log WHERE agent IS NOT NULL GROUP BY agent').all() as any[];

    return {
      totalEntries: totalEntries.count,
      entriesByTool: byTool.reduce((acc, row) => ({ ...acc, [row.tool_name]: row.count }), {}),
      entriesByAgent: byAgent.reduce((acc, row) => ({ ...acc, [row.agent]: row.count }), {}),
      errorCount: errorCount.count,
      avgDuration: avgDuration.avg || 0
    };
  }

  /**
   * Clear all audit log entries (use with caution)
   */
  public clear(): void {
    if (!this.db) {
      throw new Error('AuditLogger not initialized. Call initialize() first.');
    }

    this.db.exec('DELETE FROM audit_log');
    console.log('[AuditLogger] Cleared all audit log entries');
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[AuditLogger] Database connection closed');
    }
  }

  /**
   * Emit WebSocket event
   */
  private emitEvent(event: WebSocketEvent): void {
    if (this.wsCallback) {
      try {
        this.wsCallback(event);
      } catch (error) {
        console.error('[AuditLogger] Error emitting WebSocket event:', error);
      }
    }
  }

  /**
   * Map tool name to WebSocket event type
   */
  private getEventType(toolName: string): string {
    const eventMap: Record<string, string> = {
      'copilot_orchestrator_get_next_task': 'taskRequested',
      'copilot_orchestrator_report_task_status': 'taskUpdated',
      'copilot_orchestrator_report_observation': 'observationLogged',
      'copilot_orchestrator_report_test_failure': 'testFailureReported',
      'copilot_orchestrator_report_verification_result': 'verificationCompleted',
      'copilot_orchestrator_ask_user_question': 'questionAsked'
    };

    return eventMap[toolName] || 'actionLogged';
  }
}

/**
 * Singleton instance for global access
 */
let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get or create audit logger instance
 */
export function getAuditLogger(dbPath?: string): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(dbPath);
  }
  return auditLoggerInstance;
}

/**
 * Reset audit logger instance (for testing)
 */
export function resetAuditLogger(): void {
  if (auditLoggerInstance) {
    auditLoggerInstance.close();
    auditLoggerInstance = null;
  }
}

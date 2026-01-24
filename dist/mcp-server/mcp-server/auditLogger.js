/**
 * Audit Logger for MCP Server
 * Logs all actions with timestamps and metadata to SQLite with WAL mode
 * Emits WebSocket events for state changes
 */
import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
/**
 * Audit logger with SQLite persistence and WebSocket integration
 */
export class AuditLogger {
    constructor(dbPath) {
        this.db = null;
        this.wsCallback = null;
        // Default to workspace storage or temp directory
        this.dbPath = dbPath || path.join(process.cwd(), '.mcp-audit.db');
    }
    /**
     * Initialize database with WAL mode
     */
    initialize() {
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
    setWebSocketCallback(callback) {
        this.wsCallback = callback;
    }
    /**
     * Log an action with metadata
     */
    log(entry) {
        if (!this.db) {
            throw new Error('AuditLogger not initialized. Call initialize() first.');
        }
        const stmt = this.db.prepare(`
      INSERT INTO audit_log (
        timestamp, action, tool_name, args, result, error, 
        duration_ms, agent, task_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(entry.timestamp, entry.action, entry.toolName, JSON.stringify(entry.args || {}), entry.result ? JSON.stringify(entry.result) : null, entry.error || null, entry.duration_ms || null, entry.agent || null, entry.taskId || null, entry.metadata ? JSON.stringify(entry.metadata) : null);
        // Emit WebSocket event for state changes
        this.emitEvent({
            type: this.getEventType(entry.toolName),
            timestamp: entry.timestamp,
            data: {
                id: result.lastInsertRowid,
                ...entry
            }
        });
        return result.lastInsertRowid;
    }
    /**
     * Get audit log entries with optional filtering
     */
    getEntries(filter) {
        if (!this.db) {
            throw new Error('AuditLogger not initialized. Call initialize() first.');
        }
        let query = 'SELECT * FROM audit_log WHERE 1=1';
        const params = [];
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
        const rows = stmt.all(...params);
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
    getStats() {
        if (!this.db) {
            throw new Error('AuditLogger not initialized. Call initialize() first.');
        }
        const totalEntries = this.db.prepare('SELECT COUNT(*) as count FROM audit_log').get();
        const errorCount = this.db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE error IS NOT NULL').get();
        const avgDuration = this.db.prepare('SELECT AVG(duration_ms) as avg FROM audit_log WHERE duration_ms IS NOT NULL').get();
        const byTool = this.db.prepare('SELECT tool_name, COUNT(*) as count FROM audit_log GROUP BY tool_name').all();
        const byAgent = this.db.prepare('SELECT agent, COUNT(*) as count FROM audit_log WHERE agent IS NOT NULL GROUP BY agent').all();
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
    clear() {
        if (!this.db) {
            throw new Error('AuditLogger not initialized. Call initialize() first.');
        }
        this.db.exec('DELETE FROM audit_log');
        console.log('[AuditLogger] Cleared all audit log entries');
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[AuditLogger] Database connection closed');
        }
    }
    /**
     * Emit WebSocket event
     */
    emitEvent(event) {
        if (this.wsCallback) {
            try {
                this.wsCallback(event);
            }
            catch (error) {
                console.error('[AuditLogger] Error emitting WebSocket event:', error);
            }
        }
    }
    /**
     * Map tool name to WebSocket event type
     */
    getEventType(toolName) {
        const eventMap = {
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
let auditLoggerInstance = null;
/**
 * Get or create audit logger instance
 */
export function getAuditLogger(dbPath) {
    if (!auditLoggerInstance) {
        auditLoggerInstance = new AuditLogger(dbPath);
    }
    return auditLoggerInstance;
}
/**
 * Reset audit logger instance (for testing)
 */
export function resetAuditLogger() {
    if (auditLoggerInstance) {
        auditLoggerInstance.close();
        auditLoggerInstance = null;
    }
}

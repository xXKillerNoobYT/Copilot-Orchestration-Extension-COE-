/**
 * Task Manager Service
 * Central service for task CRUD operations, priority queue management,
 * and database interactions with optimistic locking
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// Task interfaces matching database schema
export interface Task {
  id: string;
  project_id: string;
  parent_task_id?: string;
  github_issue_id?: number;
  github_issue_url?: string;
  name: string;
  description?: string;
  task_type: 'feature' | 'bug' | 'refactor' | 'maintenance' | 'architecture' | 'testing' | 'documentation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'in_progress' | 'testing' | 'review' | 'completed' | 'failed' | 'blocked' | 'cancelled';
  assigned_agent?: string;
  assigned_github_agent?: string;
  branch_name?: string;
  context_bundle_path?: string;
  estimated_effort?: number;  // minutes
  actual_effort?: number;      // minutes
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  version: number;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'relates_to' | 'duplicates';
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  task_id: string;
  action: string;
  agent_type?: string;
  user_id?: string;
  details?: string;  // JSON string
  timestamp: string;
}

export interface TaskFilter {
  filter?: 'ready' | 'blocked' | 'all';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  agentType?: string;
  status?: Task['status'];
  projectId?: string;
}

export interface CreateTaskInput {
  project_id: string;
  parent_task_id?: string;
  github_issue_id?: number;
  github_issue_url?: string;
  name: string;
  description?: string;
  task_type: Task['task_type'];
  priority?: Task['priority'];
  status?: Task['status'];
  assigned_agent?: string;
  assigned_github_agent?: string;
  branch_name?: string;
  context_bundle_path?: string;
  estimated_effort?: number;
  actual_effort?: number;
}

export interface UpdateTaskInput {
  status?: Task['status'];
  assigned_agent?: string;
  actual_effort?: number;
  started_at?: string;
  completed_at?: string;
  description?: string;
  priority?: Task['priority'];
}

/**
 * TaskManager - Singleton service for task database operations
 */
export class TaskManager {
  private static instance: TaskManager | null = null;
  private db: Database.Database;
  private dbPath: string;

  private constructor(dbPath?: string) {
    // Use provided path or default to extension storage
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'tasks.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database connection
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');  // Enable WAL mode
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    // Initialize schema
    this.initializeSchema();
  }

  /**
   * Get TaskManager singleton instance
   */
  static getInstance(dbPath?: string): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager(dbPath);
    }
    return TaskManager.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static resetInstance(): void {
    if (TaskManager.instance) {
      TaskManager.instance.db.close();
      TaskManager.instance = null;
    }
  }

  /**
   * Initialize database schema from schema.sql
   */
  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('[TaskManager] schema.sql not found, skipping initialization');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
    console.log('[TaskManager] Database schema initialized');
  }

  /**
   * Create a new task
   */
  createTask(input: CreateTaskInput): Task {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, project_id, parent_task_id, github_issue_id, github_issue_url,
        name, description, task_type, priority, status,
        assigned_agent, assigned_github_agent, branch_name, context_bundle_path,
        estimated_effort, actual_effort, created_at, updated_at, version
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, 1
      )
    `);

    stmt.run(
      id,
      input.project_id,
      input.parent_task_id || null,
      input.github_issue_id || null,
      input.github_issue_url || null,
      input.name,
      input.description || null,
      input.task_type,
      input.priority || 'medium',
      input.status || 'pending',
      input.assigned_agent || null,
      input.assigned_github_agent || null,
      input.branch_name || null,
      input.context_bundle_path || null,
      input.estimated_effort || null,
      input.actual_effort || null,
      now,
      now
    );

    return this.getTaskById(id)!;
  }

  /**
   * Get task by ID
   */
  getTaskById(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id) as Task | null;
  }

  /**
   * Get next task from priority queue with filters
   */
  getNextTask(filters: TaskFilter = {}): Task | null {
    let query = `
      SELECT t.* 
      FROM tasks t
      WHERE 1=1
    `;
    const params: any[] = [];

    // Apply filters
    if (filters.filter === 'ready') {
      // Only tasks with no blocking dependencies
      query += ` 
        AND t.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 
          FROM task_dependencies td
          JOIN tasks dep_task ON td.depends_on_task_id = dep_task.id
          WHERE td.task_id = t.id 
            AND td.dependency_type = 'blocks'
            AND dep_task.status NOT IN ('completed', 'cancelled')
        )
      `;
    } else if (filters.filter === 'blocked') {
      query += ` AND t.status = 'blocked'`;
    } else if (filters.status) {
      query += ` AND t.status = ?`;
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ` AND t.priority = ?`;
      params.push(filters.priority);
    }

    if (filters.agentType) {
      query += ` AND (t.assigned_agent = ? OR t.assigned_agent IS NULL)`;
      params.push(filters.agentType);
    }

    if (filters.projectId) {
      query += ` AND t.project_id = ?`;
      params.push(filters.projectId);
    }

    // Priority ordering
    query += `
      ORDER BY 
        CASE t.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.created_at ASC
      LIMIT 1
    `;

    const stmt = this.db.prepare(query);
    return stmt.get(...params) as Task | null;
  }

  /**
   * Update task status with optimistic locking
   * @throws Error if version mismatch (concurrent modification)
   */
  updateTaskStatus(
    taskId: string,
    status: Task['status'],
    details: UpdateTaskInput = {},
    expectedVersion: number
  ): Task {
    const task = this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Optimistic locking check
    if (task.version !== expectedVersion) {
      throw new Error(
        `Concurrent modification detected. Expected version ${expectedVersion}, found ${task.version}`
      );
    }

    const now = new Date().toISOString();
    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, now];

    // Build dynamic UPDATE based on provided fields
    if (details.assigned_agent !== undefined) {
      updates.push('assigned_agent = ?');
      params.push(details.assigned_agent);
    }
    if (details.actual_effort !== undefined) {
      updates.push('actual_effort = ?');
      params.push(details.actual_effort);
    }
    if (details.started_at !== undefined) {
      updates.push('started_at = ?');
      params.push(details.started_at);
    }
    if (details.completed_at !== undefined) {
      updates.push('completed_at = ?');
      params.push(details.completed_at);
    }
    if (details.description !== undefined) {
      updates.push('description = ?');
      params.push(details.description);
    }
    if (details.priority !== undefined) {
      updates.push('priority = ?');
      params.push(details.priority);
    }

    // Auto-set timestamps based on status
    if (status === 'in_progress' && !task.started_at && !details.started_at) {
      updates.push('started_at = ?');
      params.push(now);
    }
    if (status === 'completed' && !task.completed_at && !details.completed_at) {
      updates.push('completed_at = ?');
      params.push(now);
    }

    // Add WHERE clause params
    params.push(taskId, expectedVersion);

    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = ? AND version = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      throw new Error(`Failed to update task ${taskId} - version mismatch`);
    }

    // Log to audit trail
    this.logAuditEntry({
      task_id: taskId,
      action: 'status_updated',
      details: JSON.stringify({ status, ...details }),
    });

    return this.getTaskById(taskId)!;
  }

  /**
   * Get queue depth (count of pending tasks)
   */
  getQueueDepth(filters: TaskFilter = {}): number {
    let query = 'SELECT COUNT(*) as count FROM tasks WHERE status = ?';
    const params: any[] = ['pending'];

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (filters.projectId) {
      query += ' AND project_id = ?';
      params.push(filters.projectId);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  /**
   * Add task dependency
   */
  addDependency(
    taskId: string,
    dependsOnTaskId: string,
    type: 'blocks' | 'relates_to' | 'duplicates' = 'blocks'
  ): TaskDependency {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, taskId, dependsOnTaskId, type, now);

    return {
      id,
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
      dependency_type: type,
      created_at: now,
    };
  }

  /**
   * Get task dependencies
   */
  getDependencies(taskId: string): TaskDependency[] {
    const stmt = this.db.prepare(
      'SELECT * FROM task_dependencies WHERE task_id = ?'
    );
    return stmt.all(taskId) as TaskDependency[];
  }

  /**
   * Log audit entry
   */
  logAuditEntry(entry: {
    task_id: string;
    action: string;
    agent_type?: string;
    user_id?: string;
    details?: string;
  }): AuditLogEntry {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, task_id, action, agent_type, user_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.task_id,
      entry.action,
      entry.agent_type || null,
      entry.user_id || null,
      entry.details || null,
      now
    );

    return {
      id,
      ...entry,
      timestamp: now,
    };
  }

  /**
   * Get audit log for a task
   */
  getAuditLog(taskId: string): AuditLogEntry[] {
    const stmt = this.db.prepare(
      'SELECT * FROM audit_log WHERE task_id = ? ORDER BY timestamp DESC'
    );
    return stmt.all(taskId) as AuditLogEntry[];
  }

  /**
   * Log activity (alias for logAuditEntry, used by MCP handlers)
   * Accepts flexible metadata and converts to audit log format
   */
  logActivity(entry: Record<string, any>): AuditLogEntry {
    // Extract known fields, rest goes into details
    const { taskId, activity, agent, ...metadata } = entry;
    
    return this.logAuditEntry({
      task_id: taskId || 'unknown',
      action: activity || entry.type || 'activity_logged',
      agent_type: agent,
      details: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
    });
  }

  /**
   * Get all tasks with filters
   */
  getAllTasks(filters: TaskFilter = {}): Task[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (filters.projectId) {
      query += ' AND project_id = ?';
      params.push(filters.projectId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Task[];
  }

  /**
   * Delete task
   */
  deleteTask(taskId: string): void {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(taskId);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Factory function to get TaskManager singleton
 * (compatible with MCP handler service factory pattern)
 */
export function getTaskManager(): TaskManager {
  return TaskManager.getInstance();
}


-- SQLite Database Schema for Copilot Orchestration Extension
-- Optimized for task management, agent coordination, and audit logging
-- Uses WAL mode for better concurrent read/write performance

-- Enable Write-Ahead Logging (WAL) mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- TASKS TABLE
-- Core task management with optimistic locking and hierarchical support
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,  -- UUID
    project_id TEXT NOT NULL,      -- Project identifier
    parent_task_id TEXT,            -- For subtasks (nullable)
    github_issue_id INTEGER,        -- Linked GitHub Issue number
    github_issue_url TEXT,          -- Full GitHub Issue URL
    
    -- Task Details
    name TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK(task_type IN (
        'feature', 'bug', 'refactor', 'maintenance', 
        'architecture', 'testing', 'documentation'
    )),
    
    -- Status and Priority
    priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK(status IN (
        'pending', 'approved', 'in_progress', 'testing', 
        'review', 'completed', 'failed', 'blocked', 'cancelled'
    )) DEFAULT 'pending',
    
    -- Assignment
    assigned_agent TEXT,            -- AI agent assigned to task
    assigned_github_agent TEXT,     -- GitHub Copilot agent
    branch_name TEXT,                -- Git branch for this task
    context_bundle_path TEXT,        -- Path to context bundle file
    
    -- Effort Tracking
    estimated_effort INTEGER,        -- Estimated minutes
    actual_effort INTEGER,           -- Actual minutes spent
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    
    -- Optimistic Locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Foreign Key Constraint
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_github_issue ON tasks(github_issue_id);

-- Compound index for priority queue queries
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority 
    ON tasks(status, priority, created_at);

-- ============================================================================
-- TASK DEPENDENCIES TABLE
-- Manages task relationships and blocking dependencies
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id TEXT PRIMARY KEY NOT NULL,  -- UUID
    task_id TEXT NOT NULL,
    depends_on_task_id TEXT NOT NULL,
    dependency_type TEXT NOT NULL CHECK(dependency_type IN (
        'blocks', 'relates_to', 'duplicates'
    )) DEFAULT 'blocks',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Prevent duplicate dependencies and self-dependencies
    UNIQUE(task_id, depends_on_task_id),
    CHECK(task_id != depends_on_task_id)
);

-- Indexes for dependency graph queries
CREATE INDEX IF NOT EXISTS idx_deps_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_deps_depends_on ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- AUDIT LOG TABLE
-- Comprehensive logging of all task actions for debugging and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY NOT NULL,  -- UUID
    task_id TEXT NOT NULL,
    action TEXT NOT NULL,          -- e.g., 'created', 'status_updated', 'assigned'
    agent_type TEXT,                -- Agent that performed the action
    user_id TEXT,                   -- Human user (if applicable)
    details TEXT,                   -- JSON blob with additional context
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_task ON audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_type);

-- ============================================================================
-- METRICS TABLE
-- Stores time-series metrics for dashboard and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY NOT NULL,  -- UUID
    metric_name TEXT NOT NULL,     -- e.g., 'tasks_created', 'avg_completion_time'
    value REAL NOT NULL,
    category TEXT NOT NULL,        -- e.g., 'task', 'agent', 'performance'
    metadata TEXT,                  -- JSON blob for additional context
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);

-- Compound index for time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp 
    ON metrics(metric_name, timestamp);

-- ============================================================================
-- TRIGGERS
-- Automatic updates for common operations
-- ============================================================================

-- Auto-update updated_at timestamp on task modifications
CREATE TRIGGER IF NOT EXISTS update_task_timestamp 
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    UPDATE tasks 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Auto-increment version on task updates (optimistic locking)
CREATE TRIGGER IF NOT EXISTS increment_task_version 
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN NEW.version = OLD.version
BEGIN
    UPDATE tasks 
    SET version = version + 1
    WHERE id = NEW.id;
END;

-- Auto-log task status changes to audit log
CREATE TRIGGER IF NOT EXISTS log_task_status_change 
AFTER UPDATE OF status ON tasks
FOR EACH ROW
WHEN NEW.status != OLD.status
BEGIN
    INSERT INTO audit_log (id, task_id, action, details, timestamp)
    VALUES (
        hex(randomblob(16)),
        NEW.id,
        'status_changed',
        json_object('old_status', OLD.status, 'new_status', NEW.status),
        datetime('now')
    );
END;

-- ============================================================================
-- VIEWS
-- Convenient read-only views for common queries
-- ============================================================================

-- View: Tasks with dependency counts
CREATE VIEW IF NOT EXISTS v_tasks_with_counts AS
SELECT 
    t.*,
    COUNT(DISTINCT td_blocks.id) AS blocking_dependency_count,
    COUNT(DISTINCT td_related.id) AS related_dependency_count,
    COUNT(DISTINCT st.id) AS subtask_count
FROM tasks t
LEFT JOIN task_dependencies td_blocks 
    ON t.id = td_blocks.depends_on_task_id AND td_blocks.dependency_type = 'blocks'
LEFT JOIN task_dependencies td_related 
    ON t.id = td_related.depends_on_task_id AND td_related.dependency_type = 'relates_to'
LEFT JOIN tasks st 
    ON t.id = st.parent_task_id
GROUP BY t.id;

-- View: Ready tasks (no blocking dependencies, status = pending)
CREATE VIEW IF NOT EXISTS v_ready_tasks AS
SELECT t.* 
FROM tasks t
WHERE t.status = 'pending'
  AND NOT EXISTS (
      SELECT 1 
      FROM task_dependencies td
      JOIN tasks dep_task ON td.depends_on_task_id = dep_task.id
      WHERE td.task_id = t.id 
        AND td.dependency_type = 'blocks'
        AND dep_task.status NOT IN ('completed', 'cancelled')
  )
ORDER BY 
    CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    t.created_at ASC;

-- View: Task metrics summary
CREATE VIEW IF NOT EXISTS v_task_metrics AS
SELECT 
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
    AVG(CASE WHEN status = 'completed' THEN actual_effort END) AS avg_completion_time,
    SUM(estimated_effort) AS total_estimated_effort,
    SUM(actual_effort) AS total_actual_effort
FROM tasks;

-- ============================================================================
-- INITIAL DATA
-- Sample data for testing (optional)
-- ============================================================================

-- Uncomment to insert sample data for development
-- INSERT INTO tasks (id, project_id, name, description, task_type, priority, status)
-- VALUES ('sample-task-1', 'default', 'Sample Task', 'This is a sample task for testing', 'feature', 'medium', 'pending');


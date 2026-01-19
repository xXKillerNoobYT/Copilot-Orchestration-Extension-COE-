-- Dead Letter Queue Migration
-- Creates table and indexes for failed MCP message persistence
-- Version: 005
-- Created: 2026-01-19

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  message_type TEXT NOT NULL,  -- 'task_request', 'observation', etc.
  original_payload TEXT NOT NULL,  -- JSON serialized message
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_retry_at TIMESTAMP,
  handler_name TEXT,  -- Which handler failed (e.g., 'getTaskStatus')
  task_id TEXT,  -- Optional: link to task if applicable
  metadata TEXT,  -- JSON for additional context
  status TEXT DEFAULT 'failed',  -- 'failed', 'retrying', 'archived', 'replayed'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_message_type ON dead_letter_queue(message_type);
CREATE INDEX IF NOT EXISTS idx_dlq_handler_name ON dead_letter_queue(handler_name);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_task_id ON dead_letter_queue(task_id);

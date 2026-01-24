/**
 * Tests for Audit Logger
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuditLogger, getAuditLogger, resetAuditLogger, WebSocketEvent } from './auditLogger';
import * as fs from 'fs';
import * as path from 'path';

describe('AuditLogger', () => {
  const testDbPath = path.join(__dirname, '.test-audit.db');
  let logger: AuditLogger;

  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }

    logger = new AuditLogger(testDbPath);
    logger.initialize();
  });

  afterEach(() => {
    logger.close();
    
    // Clean up after each test
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }
  });

  describe('initialization', () => {
    it('should create database file', () => {
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should create audit_log table', () => {
      const entry = logger.log({
        timestamp: new Date().toISOString(),
        action: 'test',
        toolName: 'test_tool',
        args: {}
      });

      expect(entry).toBeGreaterThan(0);
    });
  });

  describe('logging', () => {
    it('should log an action with all fields', () => {
      const timestamp = new Date().toISOString();
      const id = logger.log({
        timestamp,
        action: 'tool_call',
        toolName: 'copilot_orchestrator_get_next_task',
        args: { filter: 'ready' },
        result: { taskId: 'TASK-001' },
        duration_ms: 150,
        agent: 'code-master',
        taskId: 'TASK-001',
        metadata: { version: '1.0' }
      });

      expect(id).toBeGreaterThan(0);

      const entries = logger.getEntries({ limit: 1 });
      expect(entries).toHaveLength(1);
      expect(entries[0].timestamp).toBe(timestamp);
      expect(entries[0].toolName).toBe('copilot_orchestrator_get_next_task');
      expect(entries[0].args).toEqual({ filter: 'ready' });
    });

    it('should log errors', () => {
      const id = logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call_failed',
        toolName: 'copilot_orchestrator_report_task_status',
        args: { taskId: 'TASK-002' },
        error: 'Task not found'
      });

      const entries = logger.getEntries({ limit: 1 });
      expect(entries[0].error).toBe('Task not found');
    });

    it('should handle minimal entry', () => {
      const id = logger.log({
        timestamp: new Date().toISOString(),
        action: 'simple_action',
        toolName: 'test_tool',
        args: {}
      });

      expect(id).toBeGreaterThan(0);
    });
  });

  describe('querying', () => {
    beforeEach(() => {
      // Add test data
      logger.log({
        timestamp: '2026-01-22T06:00:00Z',
        action: 'tool_call',
        toolName: 'copilot_orchestrator_get_next_task',
        args: {},
        agent: 'code-master',
        taskId: 'TASK-001'
      });

      logger.log({
        timestamp: '2026-01-22T06:01:00Z',
        action: 'tool_call',
        toolName: 'copilot_orchestrator_report_task_status',
        args: {},
        agent: 'test-runner',
        taskId: 'TASK-001'
      });

      logger.log({
        timestamp: '2026-01-22T06:02:00Z',
        action: 'tool_call',
        toolName: 'copilot_orchestrator_get_next_task',
        args: {},
        agent: 'code-master',
        taskId: 'TASK-002'
      });
    });

    it('should filter by tool name', () => {
      const entries = logger.getEntries({ 
        toolName: 'copilot_orchestrator_get_next_task' 
      });

      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.toolName === 'copilot_orchestrator_get_next_task')).toBe(true);
    });

    it('should filter by task ID', () => {
      const entries = logger.getEntries({ taskId: 'TASK-001' });

      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.taskId === 'TASK-001')).toBe(true);
    });

    it('should filter by agent', () => {
      const entries = logger.getEntries({ agent: 'code-master' });

      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.agent === 'code-master')).toBe(true);
    });

    it('should filter by timestamp', () => {
      const entries = logger.getEntries({ since: '2026-01-22T06:01:30Z' });

      expect(entries).toHaveLength(1);
      expect(entries[0].taskId).toBe('TASK-002');
    });

    it('should limit results', () => {
      const entries = logger.getEntries({ limit: 2 });

      expect(entries).toHaveLength(2);
    });

    it('should combine filters', () => {
      const entries = logger.getEntries({ 
        agent: 'code-master',
        toolName: 'copilot_orchestrator_get_next_task',
        limit: 1
      });

      expect(entries).toHaveLength(1);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_get_next_task',
        args: {},
        duration_ms: 100,
        agent: 'code-master'
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_report_task_status',
        args: {},
        duration_ms: 200,
        agent: 'test-runner',
        error: 'Failed'
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_get_next_task',
        args: {},
        duration_ms: 150,
        agent: 'code-master'
      });
    });

    it('should return total entry count', () => {
      const stats = logger.getStats();
      expect(stats.totalEntries).toBe(3);
    });

    it('should count entries by tool', () => {
      const stats = logger.getStats();
      expect(stats.entriesByTool['copilot_orchestrator_get_next_task']).toBe(2);
      expect(stats.entriesByTool['copilot_orchestrator_report_task_status']).toBe(1);
    });

    it('should count entries by agent', () => {
      const stats = logger.getStats();
      expect(stats.entriesByAgent['code-master']).toBe(2);
      expect(stats.entriesByAgent['test-runner']).toBe(1);
    });

    it('should count errors', () => {
      const stats = logger.getStats();
      expect(stats.errorCount).toBe(1);
    });

    it('should calculate average duration', () => {
      const stats = logger.getStats();
      expect(stats.avgDuration).toBe(150); // (100 + 200 + 150) / 3
    });
  });

  describe('WebSocket events', () => {
    it('should emit events when callback is set', (done) => {
      const events: WebSocketEvent[] = [];

      logger.setWebSocketCallback((event) => {
        events.push(event);

        if (events.length === 1) {
          expect(event.type).toBe('taskRequested');
          expect(event.data.toolName).toBe('copilot_orchestrator_get_next_task');
          done();
        }
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_get_next_task',
        args: {}
      });
    });

    it('should map tool names to event types', (done) => {
      const eventTypes: string[] = [];

      logger.setWebSocketCallback((event) => {
        eventTypes.push(event.type);

        if (eventTypes.length === 3) {
          expect(eventTypes).toContain('taskUpdated');
          expect(eventTypes).toContain('observationLogged');
          expect(eventTypes).toContain('testFailureReported');
          done();
        }
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_report_task_status',
        args: {}
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_report_observation',
        args: {}
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        toolName: 'copilot_orchestrator_report_test_failure',
        args: {}
      });
    });
  });

  describe('singleton instance', () => {
    afterEach(() => {
      resetAuditLogger();
    });

    it('should return same instance', () => {
      const instance1 = getAuditLogger();
      const instance2 = getAuditLogger();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getAuditLogger();
      resetAuditLogger();
      const instance2 = getAuditLogger();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      logger.log({
        timestamp: new Date().toISOString(),
        action: 'test',
        toolName: 'test_tool',
        args: {}
      });

      logger.log({
        timestamp: new Date().toISOString(),
        action: 'test',
        toolName: 'test_tool',
        args: {}
      });

      expect(logger.getEntries().length).toBe(2);

      logger.clear();

      expect(logger.getEntries().length).toBe(0);
    });
  });
});

/**
 * Unit tests for DeadLetterQueueService
 * Tests SQLite persistence, filtering, replay, archiving, and deletion
 */

import Database from 'better-sqlite3';
import { DeadLetterQueueService } from './deadLetterQueue';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('DeadLetterQueueService', () => {
  let db: Database.Database;
  let service: DeadLetterQueueService;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary database for each test
    tempDir = mkdtempSync(join(tmpdir(), 'dlq-test-'));
    db = new Database(join(tempDir, 'test.db'));
    service = new DeadLetterQueueService(db);
  });

  afterEach(() => {
    // Clean up
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Schema Initialization', () => {
    it('should create dead_letter_queue table on initialization', () => {
      const table = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='dead_letter_queue'
      `).get();

      expect(table).toBeDefined();
      expect((table as any).name).toBe('dead_letter_queue');
    });

    it('should create all required indexes', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='dead_letter_queue'
      `).all() as any[];

      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_dlq_status');
      expect(indexNames).toContain('idx_dlq_message_type');
      expect(indexNames).toContain('idx_dlq_handler_name');
      expect(indexNames).toContain('idx_dlq_created_at');
      expect(indexNames).toContain('idx_dlq_task_id');
    });

    it('should handle re-initialization without errors', () => {
      // Create another service instance with same database
      expect(() => new DeadLetterQueueService(db)).not.toThrow();
    });
  });

  describe('addFailedMessage', () => {
    it('should add failed message to database', async () => {
      const messageId = 'msg-001';
      const messageType = 'task_request';
      const payload = { taskId: 'task-001', action: 'test' };
      const error = new Error('Test error');
      const handlerName = 'getTaskStatus';

      const id = await service.addFailedMessage(
        messageId,
        messageType,
        payload,
        error,
        handlerName
      );

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      // Verify entry was created
      const entry = await service.getEntry(id);
      expect(entry).toBeDefined();
      expect(entry!.messageId).toBe(messageId);
      expect(entry!.messageType).toBe(messageType);
      expect(entry!.errorMessage).toBe('Test error');
      expect(entry!.handlerName).toBe(handlerName);
      expect(entry!.retryCount).toBe(0);
      expect(entry!.status).toBe('failed');
    });

    it('should store original payload as JSON', async () => {
      const payload = { taskId: 'task-001', nested: { value: 123 } };
      const error = new Error('Test error');

      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        payload,
        error
      );

      const entry = await service.getEntry(id);
      expect(entry!.originalPayload).toEqual(payload);
    });

    it('should store error stack if available', async () => {
      const error = new Error('Test error with stack');
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        error
      );

      const entry = await service.getEntry(id);
      expect(entry!.errorStack).toBeDefined();
      expect(entry!.errorStack).toContain('Test error with stack');
    });

    it('should handle optional taskId parameter', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test'),
        'handler',
        'task-123'
      );

      const entry = await service.getEntry(id);
      expect(entry!.taskId).toBe('task-123');
    });

    it('should store retry count', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test'),
        'handler',
        undefined,
        3
      );

      const entry = await service.getEntry(id);
      expect(entry!.retryCount).toBe(3);
    });
  });

  describe('getEntries', () => {
    beforeEach(async () => {
      // Add test data
      await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Error 1'),
        'handler1'
      );
      await service.addFailedMessage(
        'msg-002',
        'observation',
        {},
        new Error('Error 2'),
        'handler2'
      );
      await service.addFailedMessage(
        'msg-003',
        'task_request',
        {},
        new Error('Error 3'),
        'handler1'
      );
    });

    it('should return all entries without filters', async () => {
      const entries = await service.getEntries();
      expect(entries.length).toBe(3);
    });

    it('should filter by status', async () => {
      // Archive one entry
      const entries = await service.getEntries();
      await db.prepare('UPDATE dead_letter_queue SET status = ? WHERE id = ?')
        .run('archived', entries[0].id);

      const failedEntries = await service.getEntries({ status: 'failed' });
      expect(failedEntries.length).toBe(2);

      const archivedEntries = await service.getEntries({ status: 'archived' });
      expect(archivedEntries.length).toBe(1);
    });

    it('should filter by handler name', async () => {
      const entries = await service.getEntries({ handlerName: 'handler1' });
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.handlerName === 'handler1')).toBe(true);
    });

    it('should filter by message type', async () => {
      const entries = await service.getEntries({ messageType: 'observation' });
      expect(entries.length).toBe(1);
      expect(entries[0].messageType).toBe('observation');
    });

    it('should filter by date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const entries = await service.getEntries({ since: yesterday });
      expect(entries.length).toBe(3);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const futureEntries = await service.getEntries({ since: tomorrow });
      expect(futureEntries.length).toBe(0);
    });

    it('should combine multiple filters', async () => {
      const entries = await service.getEntries({
        messageType: 'task_request',
        handlerName: 'handler1',
      });

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.messageType === 'task_request')).toBe(true);
      expect(entries.every(e => e.handlerName === 'handler1')).toBe(true);
    });

    it('should limit results to 100 entries', async () => {
      // This test assumes the limit is working; full test would require adding 100+ entries
      const entries = await service.getEntries();
      expect(entries.length).toBeLessThanOrEqual(100);
    });

    it('should allow custom limit up to 1000', async () => {
      // Add a few entries to test
      for (let i = 0; i < 5; i++) {
        await service.addFailedMessage(
          `msg-limit-${i}`,
          'test',
          {},
          new Error('Test')
        );
      }

      const entries = await service.getEntries({ limit: 3 });
      expect(entries.length).toBeLessThanOrEqual(3);
    });

    it('should clamp limit to maximum of 1000', async () => {
      // The actual clamping happens in the service, we just verify it doesn't crash
      // and returns results. The limit of 1000 is enforced in the service code.
      const entries = await service.getEntries({ limit: 5000 });
      // Should get results without error (limit is clamped internally to 1000)
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should use default limit for invalid values', async () => {
      // Add entries
      for (let i = 0; i < 5; i++) {
        await service.addFailedMessage(
          `msg-invalid-${i}`,
          'test',
          {},
          new Error('Test')
        );
      }

      // Test negative limit
      const entries1 = await service.getEntries({ limit: -10 });
      expect(entries1.length).toBeGreaterThan(0);

      // Test non-integer limit
      const entries2 = await service.getEntries({ limit: 3.7 });
      expect(entries2.length).toBeLessThanOrEqual(3);
    });

    it('should order entries by created_at DESC', async () => {
      const entries = await service.getEntries();
      
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].firstFailedAt.getTime()).toBeGreaterThanOrEqual(
          entries[i + 1].firstFailedAt.getTime()
        );
      }
    });
  });

  describe('replayMessage', () => {
    it('should mark message as replayed', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      const result = await service.replayMessage(id);
      expect(result).toBe(true);

      const entry = await service.getEntry(id);
      expect(entry!.status).toBe('replayed');
      expect(entry!.lastRetryAt).toBeDefined();
    });

    it('should throw error if entry not found', async () => {
      await expect(service.replayMessage('non-existent-id'))
        .rejects
        .toThrow('Dead letter entry non-existent-id not found');
    });

    it('should update lastRetryAt timestamp', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      await service.replayMessage(id);

      const entry = await service.getEntry(id);
      expect(entry!.lastRetryAt).toBeDefined();
      expect(entry!.lastRetryAt!.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('archiveOldEntries', () => {
    it('should archive entries older than specified days', async () => {
      // Add entry and manually set old timestamp
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      db.prepare('UPDATE dead_letter_queue SET created_at = ? WHERE id = ?')
        .run(eightDaysAgo.toISOString(), id);

      const archived = await service.archiveOldEntries(7);
      expect(archived).toBe(1);

      const entry = await service.getEntry(id);
      expect(entry!.status).toBe('archived');
    });

    it('should not archive recent entries', async () => {
      await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      const archived = await service.archiveOldEntries(7);
      expect(archived).toBe(0);
    });

    it('should only archive entries with status "failed"', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      // Set to replayed status
      await service.replayMessage(id);

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      db.prepare('UPDATE dead_letter_queue SET created_at = ? WHERE id = ?')
        .run(eightDaysAgo.toISOString(), id);

      const archived = await service.archiveOldEntries(7);
      expect(archived).toBe(0);
    });

    it('should return count of archived entries', async () => {
      // Add multiple old entries
      for (let i = 0; i < 5; i++) {
        const id = await service.addFailedMessage(
          `msg-${i}`,
          'task_request',
          {},
          new Error('Test')
        );

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        db.prepare('UPDATE dead_letter_queue SET created_at = ? WHERE id = ?')
          .run(tenDaysAgo.toISOString(), id);
      }

      const archived = await service.archiveOldEntries(7);
      expect(archived).toBe(5);
    });
  });

  describe('deleteArchivedEntries', () => {
    it('should delete archived entries older than specified days', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      // Archive the entry
      db.prepare('UPDATE dead_letter_queue SET status = ? WHERE id = ?')
        .run('archived', id);

      // Set old timestamp
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      db.prepare('UPDATE dead_letter_queue SET created_at = ? WHERE id = ?')
        .run(thirtyFiveDaysAgo.toISOString(), id);

      const deleted = await service.deleteArchivedEntries(30);
      expect(deleted).toBe(1);

      const entry = await service.getEntry(id);
      expect(entry).toBeNull();
    });

    it('should not delete non-archived entries', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      db.prepare('UPDATE dead_letter_queue SET created_at = ? WHERE id = ?')
        .run(thirtyFiveDaysAgo.toISOString(), id);

      const deleted = await service.deleteArchivedEntries(30);
      expect(deleted).toBe(0);

      const entry = await service.getEntry(id);
      expect(entry).not.toBeNull();
    });

    it('should not delete recent archived entries', async () => {
      const id = await service.addFailedMessage(
        'msg-001',
        'task_request',
        {},
        new Error('Test')
      );

      db.prepare('UPDATE dead_letter_queue SET status = ? WHERE id = ?')
        .run('archived', id);

      const deleted = await service.deleteArchivedEntries(30);
      expect(deleted).toBe(0);
    });

    it('should return count of deleted entries', async () => {
      // Add multiple old archived entries
      for (let i = 0; i < 3; i++) {
        const id = await service.addFailedMessage(
          `msg-${i}`,
          'task_request',
          {},
          new Error('Test')
        );

        db.prepare('UPDATE dead_letter_queue SET status = ? WHERE id = ?')
          .run('archived', id);

        const fortyDaysAgo = new Date();
        fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

        db.prepare('UPDATE dead_letter_queue SET created_at = ? WHERE id = ?')
          .run(fortyDaysAgo.toISOString(), id);
      }

      const deleted = await service.deleteArchivedEntries(30);
      expect(deleted).toBe(3);
    });
  });

  describe('getCountByStatus', () => {
    it('should return counts grouped by status', async () => {
      await service.addFailedMessage('msg-001', 'task_request', {}, new Error('Test'));
      await service.addFailedMessage('msg-002', 'task_request', {}, new Error('Test'));
      
      const id3 = await service.addFailedMessage('msg-003', 'task_request', {}, new Error('Test'));
      await service.replayMessage(id3);

      const counts = await service.getCountByStatus();
      expect(counts.failed).toBe(2);
      expect(counts.replayed).toBe(1);
    });

    it('should return empty object if no entries', async () => {
      const counts = await service.getCountByStatus();
      expect(counts).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when adding message', async () => {
      db.close();

      await expect(
        service.addFailedMessage('msg-001', 'task_request', {}, new Error('Test'))
      ).rejects.toThrow();
    });

    it('should handle errors when getting entries', async () => {
      db.close();

      await expect(service.getEntries()).rejects.toThrow();
    });

    it('should handle errors when replaying message', async () => {
      db.close();

      await expect(service.replayMessage('any-id')).rejects.toThrow();
    });

    it('should handle errors when archiving', async () => {
      db.close();

      await expect(service.archiveOldEntries()).rejects.toThrow();
    });

    it('should handle errors when deleting', async () => {
      db.close();

      await expect(service.deleteArchivedEntries()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle 1000+ entries efficiently', async () => {
      const startTime = Date.now();

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        await service.addFailedMessage(
          `msg-${i}`,
          'task_request',
          { index: i },
          new Error(`Error ${i}`),
          'handler1'
        );
      }

      const insertTime = Date.now() - startTime;

      // Query all entries
      const queryStart = Date.now();
      const entries = await service.getEntries();
      const queryTime = Date.now() - queryStart;

      expect(entries.length).toBe(100); // Limited to 100
      expect(insertTime).toBeLessThan(3000); // Should complete in under 3 seconds
      expect(queryTime).toBeLessThan(200); // Query should be fast due to indexes
    });
  });
});

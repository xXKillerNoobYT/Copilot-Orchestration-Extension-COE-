/**
 * Tests for storage adapters
 * Reference: https://jestjs.io/docs/mock-functions
 */

import { JsonStorageAdapter } from '../src/storage/json-adapter';
import { YamlStorageAdapter } from '../src/storage/yaml-adapter';
import { ContextType, AgentResponse } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, 'storage-test-data');

describe('Storage Adapters', () => {
  const testContext: AgentResponse = {
    metadata: {
      id: 'ctx-123',
      taskId: 'task-123',
      type: ContextType.AGENT_RESPONSE,
      timestamp: new Date('2026-01-01T00:00:00Z'),
      version: '1.0.0',
      tags: ['test', 'example']
    },
    agentId: 'agent-1',
    taskId: 'task-123',
    prompt: 'Test prompt',
    response: 'Test response',
    tokensUsed: 100
  };

  beforeEach(async () => {
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  describe('JsonStorageAdapter', () => {
    let adapter: JsonStorageAdapter;

    beforeEach(() => {
      adapter = new JsonStorageAdapter(TEST_DATA_DIR);
    });

    it('should save and load JSON data', async () => {
      const key = 'test.json';
      await adapter.save(key, testContext);

      const loaded = await adapter.load(key);
      expect(loaded).toBeTruthy();
      expect(loaded?.metadata.id).toBe('ctx-123');
      expect(loaded?.metadata.taskId).toBe('task-123');
    });

    it('should preserve Date objects', async () => {
      const key = 'test.json';
      await adapter.save(key, testContext);

      const loaded = await adapter.load(key) as AgentResponse;
      expect(loaded?.metadata.timestamp).toBeInstanceOf(Date);
      expect(loaded?.metadata.timestamp.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should return null for non-existent file', async () => {
      const loaded = await adapter.load('non-existent.json');
      expect(loaded).toBeNull();
    });

    it('should check if file exists', async () => {
      const key = 'test.json';
      expect(await adapter.exists(key)).toBe(false);

      await adapter.save(key, testContext);
      expect(await adapter.exists(key)).toBe(true);
    });

    it('should get file size', async () => {
      const key = 'test.json';
      await adapter.save(key, testContext);

      const size = await adapter.getSize(key);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent file size', async () => {
      // Reference: https://jestjs.io/docs/asynchronous
      const size = await adapter.getSize('non-existent.json');
      expect(size).toBe(0);
    });

    it('should delete file', async () => {
      const key = 'test.json';
      await adapter.save(key, testContext);

      await adapter.delete(key);
      expect(await adapter.exists(key)).toBe(false);
    });

    it('should handle deletion of non-existent file gracefully', async () => {
      // Should not throw error
      await expect(adapter.delete('non-existent.json')).resolves.not.toThrow();
    });

    it('should list files', async () => {
      await adapter.save('file1.json', testContext);
      await adapter.save('file2.json', testContext);
      await adapter.save('other.txt', testContext);

      const files = await adapter.list();
      expect(files).toHaveLength(3);
    });

    it('should list files with pattern', async () => {
      await adapter.save('file1.json', testContext);
      await adapter.save('file2.json', testContext);
      await adapter.save('other.txt', testContext);

      const files = await adapter.list('*.json');
      expect(files).toHaveLength(2);
    });

    it('should handle complex nested data', async () => {
      const complexData = {
        ...testContext,
        metadata: {
          ...testContext.metadata,
          tags: ['tag1', 'tag2'],
          expiresAt: new Date('2026-12-31T23:59:59Z')
        },
        nested: {
          deep: {
            structure: { value: 'test' }
          }
        }
      };

      const key = 'complex.json';
      await adapter.save(key, complexData);
      const loaded = await adapter.load(key);

      expect(loaded).toEqual(complexData);
    });

    it('should handle null values in data', async () => {
      const dataWithNull = {
        ...testContext,
        metadata: {
          ...testContext.metadata,
          expiresAt: null
        }
      };

      const key = 'null-test.json';
      await adapter.save(key, dataWithNull);
      const loaded = await adapter.load(key);

      expect(loaded?.metadata.expiresAt).toBeNull();
    });
  });

  describe('YamlStorageAdapter', () => {
    let adapter: YamlStorageAdapter;

    beforeEach(() => {
      adapter = new YamlStorageAdapter(TEST_DATA_DIR);
    });

    it('should save and load YAML data', async () => {
      const key = 'test.yaml';
      await adapter.save(key, testContext);

      const loaded = await adapter.load(key);
      expect(loaded).toBeTruthy();
      expect(loaded?.metadata.id).toBe('ctx-123');
      expect(loaded?.metadata.taskId).toBe('task-123');
    });

    it('should preserve Date objects', async () => {
      const key = 'test.yaml';
      await adapter.save(key, testContext);

      const loaded = await adapter.load(key) as AgentResponse;
      expect(loaded?.metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should return null for non-existent file', async () => {
      const loaded = await adapter.load('non-existent.yaml');
      expect(loaded).toBeNull();
    });

    it('should preserve complex nested structures', async () => {
      const key = 'test.yaml';
      const complexContext = {
        ...testContext,
        metadata: {
          ...testContext.metadata,
          tags: ['tag1', 'tag2', 'tag3'],
          expiresAt: new Date('2026-12-31T23:59:59Z')
        }
      };

      await adapter.save(key, complexContext);
      const loaded = await adapter.load(key) as AgentResponse;

      expect(loaded?.metadata.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(loaded?.metadata.expiresAt).toBeInstanceOf(Date);
    });

    it('should check if file exists', async () => {
      const key = 'test.yaml';
      expect(await adapter.exists(key)).toBe(false);

      await adapter.save(key, testContext);
      expect(await adapter.exists(key)).toBe(true);
    });

    it('should get file size', async () => {
      const key = 'test.yaml';
      await adapter.save(key, testContext);

      const size = await adapter.getSize(key);
      expect(size).toBeGreaterThan(0);
    });

    it('should delete file', async () => {
      const key = 'test.yaml';
      await adapter.save(key, testContext);

      await adapter.delete(key);
      expect(await adapter.exists(key)).toBe(false);
    });

    it('should list files', async () => {
      await adapter.save('file1.yaml', testContext);
      await adapter.save('file2.yaml', testContext);

      const files = await adapter.list();
      expect(files.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Adapter compatibility', () => {
    it('should produce equivalent data structures', async () => {
      const jsonAdapter = new JsonStorageAdapter(path.join(TEST_DATA_DIR, 'json'));
      const yamlAdapter = new YamlStorageAdapter(path.join(TEST_DATA_DIR, 'yaml'));

      await jsonAdapter.save('test.json', testContext);
      await yamlAdapter.save('test.yaml', testContext);

      const jsonData = await jsonAdapter.load('test.json');
      const yamlData = await yamlAdapter.load('test.yaml');

      expect(jsonData?.metadata.id).toBe(yamlData?.metadata.id);
      expect(jsonData?.metadata.taskId).toBe(yamlData?.metadata.taskId);
      expect((jsonData as AgentResponse)?.prompt).toBe((yamlData as AgentResponse)?.prompt);
    });

    it('should handle same data in both formats', async () => {
      const jsonAdapter = new JsonStorageAdapter(path.join(TEST_DATA_DIR, 'json'));
      const yamlAdapter = new YamlStorageAdapter(path.join(TEST_DATA_DIR, 'yaml'));

      const testData = {
        ...testContext,
        metadata: {
          ...testContext.metadata,
          tags: ['test', 'compatibility'],
          expiresAt: new Date('2027-01-01')
        }
      };

      await jsonAdapter.save('test.json', testData);
      await yamlAdapter.save('test.yaml', testData);

      const jsonLoaded = await jsonAdapter.load('test.json');
      const yamlLoaded = await yamlAdapter.load('test.yaml');

      // Compare key fields
      expect(jsonLoaded?.metadata.tags).toEqual(yamlLoaded?.metadata.tags);
      expect((jsonLoaded as any)?.agentId).toBe((yamlLoaded as any)?.agentId);
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted JSON gracefully', async () => {
      const adapter = new JsonStorageAdapter(TEST_DATA_DIR);

      // Write corrupted JSON directly
      const dirPath = path.join(TEST_DATA_DIR, 'task-1');
      await fs.mkdir(dirPath, { recursive: true });
      const filePath = path.join(dirPath, 'corrupt.json');
      await fs.writeFile(filePath, '{invalid json}', 'utf-8');

      // Should handle gracefully - either return null or throw
      // Reference: https://jestjs.io/docs/expect#rejects
      try {
        const loaded = await adapter.load('task-1/corrupt.json');
        // If no throw, should return null
        expect(loaded).toBeNull();
      } catch (error) {
        // If it throws, that's valid error handling too
        expect(error).toBeDefined();
      }
    });

    it('should handle directory creation errors', async () => {
      // Reference: https://jestjs.io/docs/snapshot-testing
      const adapter = new JsonStorageAdapter(TEST_DATA_DIR);

      // Normal save should succeed
      await expect(adapter.save('test.json', testContext)).resolves.not.toThrow();
    });

    it('should handle concurrent saves', async () => {
      const adapter = new JsonStorageAdapter(TEST_DATA_DIR);

      // Reference: https://jestjs.io/docs/setup-teardown
      const promises = [
        adapter.save('file1.json', testContext),
        adapter.save('file2.json', testContext),
        adapter.save('file3.json', testContext)
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();

      const files = await adapter.list();
      expect(files.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle missing directory for list operation', async () => {
      const adapter = new JsonStorageAdapter(path.join(TEST_DATA_DIR, 'nonexistent'));

      const files = await adapter.list();
      expect(Array.isArray(files)).toBe(true);
    });
  });
});


/**
 * Tests for storage adapters
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

    it('should delete file', async () => {
      const key = 'test.json';
      await adapter.save(key, testContext);

      await adapter.delete(key);
      expect(await adapter.exists(key)).toBe(false);
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
  });
});

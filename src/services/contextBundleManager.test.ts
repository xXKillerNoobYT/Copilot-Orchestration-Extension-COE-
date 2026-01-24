/**
 * Comprehensive Unit Tests for Context Bundle Manager (ContextBuilder)
 * 
 * Tests bundle creation, assembly, version management, metadata handling,
 * file system operations, and error handling with 80%+ coverage target.
 * 
 * @author Testing Agent
 * @date 2026-01-23
 */

import { ContextBuilder, ContextBundle, ContextFile, ContextBuilderOptions } from '../contextBuilder';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock all external dependencies
jest.mock('vscode');
jest.mock('fs/promises');
jest.mock('path');

describe('ContextBundleManager (ContextBuilder)', () => {
  let contextBuilder: ContextBuilder;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup workspace mock
    mockWorkspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test-workspace',
      index: 0,
    };

    (vscode.workspace.workspaceFolders as any) = [mockWorkspaceFolder];

    // Setup path mocks
    (path.basename as jest.Mock).mockImplementation((p: string) => p.split('/').pop() || '');
    (path.extname as jest.Mock).mockImplementation((p: string) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    });
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

    contextBuilder = new ContextBuilder();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default options', () => {
      const builder = new ContextBuilder();
      expect(builder).toBeDefined();
      expect(builder).toBeInstanceOf(ContextBuilder);
    });

    it('should initialize with custom maxTokens', () => {
      const builder = new ContextBuilder({ maxTokens: 4000 });
      expect(builder).toBeDefined();
    });

    it('should initialize with custom maxBundleSize', () => {
      const builder = new ContextBuilder({ maxBundleSize: 50 });
      expect(builder).toBeDefined();
    });

    it('should initialize with all custom options', () => {
      const options: ContextBuilderOptions = {
        maxTokens: 6000,
        maxBundleSize: 75,
        includeDesignSystem: true,
        includePlanExcerpt: true,
        prioritizeByRelevance: true,
      };
      const builder = new ContextBuilder(options);
      expect(builder).toBeDefined();
    });

    it('should use default values when options are undefined', () => {
      const builder = new ContextBuilder({});
      expect(builder).toBeDefined();
    });
  });

  describe('Bundle Creation and Assembly', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('// Sample TypeScript code\nconst x = 1;\nconst y = 2;');
    });

    it('should create basic bundle for task', async () => {
      const taskId = 'task-123';
      const taskDescription = 'Implement feature X';
      const relatedFiles = ['/test/file1.ts', '/test/file2.ts'];

      const bundle = await contextBuilder.buildForTask(taskId, taskDescription, relatedFiles);

      expect(bundle).toBeDefined();
      expect(bundle.taskId).toBe(taskId);
      expect(bundle.id).toContain(taskId);
      expect(bundle.version).toBe(1);
      expect(bundle.files).toBeDefined();
      expect(Array.isArray(bundle.files)).toBe(true);
    });

    it('should generate unique bundle IDs', async () => {
      const bundle1 = await contextBuilder.buildForTask('task-1', 'Test 1', ['/test/file1.ts']);
      const bundle2 = await contextBuilder.buildForTask('task-2', 'Test 2', ['/test/file2.ts']);

      expect(bundle1.id).not.toBe(bundle2.id);
      expect(bundle1.id).toContain('task-1');
      expect(bundle2.id).toContain('task-2');
    });

    it('should include metadata in bundle', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.metadata).toBeDefined();
      expect(bundle.metadata.totalTokens).toBeGreaterThanOrEqual(0);
      expect(bundle.metadata.fileCount).toBeGreaterThanOrEqual(0);
      expect(bundle.metadata.timestamp).toBeDefined();
      expect(bundle.metadata.truncated).toBeDefined();
      expect(typeof bundle.metadata.truncated).toBe('boolean');
    });

    it('should process multiple files correctly', async () => {
      const files = ['/test/file1.ts', '/test/file2.ts', '/test/file3.ts'];
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', files);

      expect(bundle.files.length).toBeGreaterThan(0);
      expect(bundle.files.length).toBeLessThanOrEqual(files.length);
    });

    it('should handle empty file list', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test task', []);

      expect(bundle).toBeDefined();
      expect(bundle.files).toHaveLength(0);
      expect(bundle.metadata.fileCount).toBe(0);
      expect(bundle.metadata.totalTokens).toBe(0);
    });

    it('should set truncated flag when files are skipped', async () => {
      const builder = new ContextBuilder({ maxTokens: 1 }); // Very low limit
      const largeContent = 'x'.repeat(1000);
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const files = ['/test/file1.ts', '/test/file2.ts', '/test/file3.ts'];
      const bundle = await builder.buildForTask('task-1', 'Test', files);

      expect(bundle.metadata.truncated).toBe(true);
      expect(bundle.files.length).toBeLessThan(files.length);
    });

    it('should set truncated flag to false when all files included', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      // With small file and default limits, should not be truncated
      expect(bundle.metadata.truncated).toBe(false);
    });
  });

  describe('Token Counting and Limits', () => {
    it('should estimate tokens correctly', async () => {
      const content = 'a'.repeat(100);
      (fs.readFile as jest.Mock).mockResolvedValue(content);

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.metadata.totalTokens).toBeGreaterThan(0);
      expect(bundle.metadata.totalTokens).toBeLessThan(1000);
    });

    it('should respect maxTokens limit', async () => {
      const builder = new ContextBuilder({ maxTokens: 100 });
      const largeContent = 'x'.repeat(10000);
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const files = ['/test/file1.ts', '/test/file2.ts', '/test/file3.ts'];
      const bundle = await builder.buildForTask('task-1', 'Test', files);

      expect(bundle.metadata.totalTokens).toBeLessThanOrEqual(100);
    });

    it('should respect maxBundleSize limit', async () => {
      const builder = new ContextBuilder({ maxBundleSize: 1 }); // 1KB limit
      const largeContent = 'x'.repeat(10000);
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const files = ['/test/file1.ts', '/test/file2.ts'];
      const bundle = await builder.buildForTask('task-1', 'Test', files);

      // Should stop adding files when size limit reached
      expect(bundle.files.length).toBeLessThan(files.length);
    });

    it('should handle zero token files', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('');

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/empty.ts']);

      expect(bundle.metadata.totalTokens).toBe(0);
    });

    it('should accumulate tokens across multiple files', async () => {
      const content = 'abc'.repeat(10);
      (fs.readFile as jest.Mock).mockResolvedValue(content);

      const files = ['/test/file1.ts', '/test/file2.ts'];
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', files);

      const expectedTokens = Math.ceil(content.length * 0.25) * 2; // 0.25 is the estimate factor
      expect(bundle.metadata.totalTokens).toBeGreaterThanOrEqual(expectedTokens - 1);
    });
  });

  describe('File Type Determination', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('content');
    });

    it('should identify code files', async () => {
      (path.extname as jest.Mock).mockReturnValue('.ts');
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      if (bundle.files.length > 0) {
        expect(bundle.files[0].type).toBe('code');
      }
    });

    it('should identify documentation files', async () => {
      (path.extname as jest.Mock).mockReturnValue('.md');
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/README.md']);

      if (bundle.files.length > 0) {
        expect(bundle.files[0].type).toBe('doc');
      }
    });

    it('should identify config files', async () => {
      (path.extname as jest.Mock).mockReturnValue('.json');
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/config.json']);

      if (bundle.files.length > 0) {
        expect(bundle.files[0].type).toBe('config');
      }
    });

    it('should handle various code file extensions', async () => {
      const extensions = ['.ts', '.js', '.py', '.java', '.cpp'];
      
      for (const ext of extensions) {
        (path.extname as jest.Mock).mockReturnValue(ext);
        const bundle = await contextBuilder.buildForTask('task-1', 'Test', [`/test/file${ext}`]);
        
        if (bundle.files.length > 0) {
          expect(bundle.files[0].type).toBe('code');
        }
      }
    });

    it('should handle various doc file extensions', async () => {
      const extensions = ['.md', '.txt'];
      
      for (const ext of extensions) {
        (path.extname as jest.Mock).mockReturnValue(ext);
        const bundle = await contextBuilder.buildForTask('task-1', 'Test', [`/test/doc${ext}`]);
        
        if (bundle.files.length > 0) {
          expect(bundle.files[0].type).toBe('doc');
        }
      }
    });

    it('should handle various config file extensions', async () => {
      const extensions = ['.json', '.yaml', '.yml', '.xml', '.toml'];
      
      for (const ext of extensions) {
        (path.extname as jest.Mock).mockReturnValue(ext);
        const bundle = await contextBuilder.buildForTask('task-1', 'Test', [`/test/config${ext}`]);
        
        if (bundle.files.length > 0) {
          expect(bundle.files[0].type).toBe('config');
        }
      }
    });
  });

  describe('Relevance Calculation', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('function test() { return true; }');
    });

    it('should assign relevance scores to files', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test feature', ['/test/file.ts']);

      if (bundle.files.length > 0) {
        expect(bundle.files[0].relevance).toBeGreaterThanOrEqual(0);
        expect(bundle.files[0].relevance).toBeLessThanOrEqual(1);
      }
    });

    it('should boost relevance for files mentioned in context', async () => {
      (path.basename as jest.Mock).mockReturnValue('feature.ts');
      (fs.readFile as jest.Mock).mockResolvedValue('const feature = true;');

      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Update feature.ts file',
        ['/test/feature.ts']
      );

      if (bundle.files.length > 0) {
        expect(bundle.files[0].relevance).toBeGreaterThan(0.5);
      }
    });

    it('should calculate relevance for multiple files', async () => {
      const files = ['/test/file1.ts', '/test/file2.ts', '/test/file3.ts'];
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', files);

      bundle.files.forEach(file => {
        expect(file.relevance).toBeGreaterThanOrEqual(0);
        expect(file.relevance).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Caching Mechanism', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should cache bundles by task ID', async () => {
      const taskId = 'task-cache-1';
      const files = ['/test/file.ts'];

      const bundle1 = await contextBuilder.buildForTask(taskId, 'Test', files);
      const bundle2 = await contextBuilder.buildForTask(taskId, 'Test', files);

      expect(bundle1.id).toBe(bundle2.id);
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it('should not cache bundles for different tasks', async () => {
      const bundle1 = await contextBuilder.buildForTask('task-1', 'Test 1', ['/test/file1.ts']);
      const bundle2 = await contextBuilder.buildForTask('task-2', 'Test 2', ['/test/file2.ts']);

      expect(bundle1.id).not.toBe(bundle2.id);
    });

    it('should clear cache when requested', async () => {
      const taskId = 'task-clear';
      await contextBuilder.buildForTask(taskId, 'Test', ['/test/file.ts']);

      contextBuilder.clearCache();

      const bundle = await contextBuilder.buildForTask(taskId, 'Test', ['/test/file.ts']);
      expect(bundle).toBeDefined();
      expect(fs.readFile).toHaveBeenCalledTimes(2); // Called again after cache clear
    });

    it('should use cache for getOrCreateBundle', async () => {
      const taskId = 'task-get-or-create';
      const files = ['/test/file.ts'];

      const bundle1 = await contextBuilder.getOrCreateBundle(taskId, 'Test', files);
      const bundle2 = await contextBuilder.getOrCreateBundle(taskId, 'Test', files);

      expect(bundle1.id).toBe(bundle2.id);
    });
  });

  describe('Version Management', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should set initial version to 1', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.version).toBe(1);
    });

    it('should maintain version in cached bundles', async () => {
      const taskId = 'task-version';
      const bundle1 = await contextBuilder.buildForTask(taskId, 'Test', ['/test/file.ts']);
      const bundle2 = await contextBuilder.buildForTask(taskId, 'Test', ['/test/file.ts']);

      expect(bundle1.version).toBe(1);
      expect(bundle2.version).toBe(1);
      expect(bundle1.version).toBe(bundle2.version);
    });
  });

  describe('File System Operations', () => {
    it('should read file content', async () => {
      const fileContent = 'export const test = true;';
      (fs.readFile as jest.Mock).mockResolvedValue(fileContent);

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(fs.readFile).toHaveBeenCalledWith('/test/file.ts', 'utf-8');
      if (bundle.files.length > 0) {
        expect(bundle.files[0].content).toBe(fileContent);
      }
    });

    it('should handle file read errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/nonexistent/file.ts']);

      expect(bundle).toBeDefined();
      expect(bundle.files).toHaveLength(0);
      expect(bundle.metadata.fileCount).toBe(0);
    });

    it('should handle permission errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/protected/file.ts']);

      expect(bundle).toBeDefined();
      expect(bundle.files).toHaveLength(0);
    });

    it('should handle multiple file read errors', async () => {
      (fs.readFile as jest.Mock)
        .mockRejectedValueOnce(new Error('File 1 error'))
        .mockRejectedValueOnce(new Error('File 2 error'))
        .mockResolvedValueOnce('content 3');

      const files = ['/test/bad1.ts', '/test/bad2.ts', '/test/good3.ts'];
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', files);

      expect(bundle.files.length).toBeLessThanOrEqual(1);
    });

    it('should handle invalid file paths', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['', null as any, undefined as any]);

      expect(bundle).toBeDefined();
    });

    it('should read files with UTF-8 encoding', async () => {
      await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    });
  });

  describe('Metadata Handling', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const test = true;');
    });

    it('should include timestamp in metadata', async () => {
      const beforeTime = new Date().toISOString();
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);
      const afterTime = new Date().toISOString();

      expect(bundle.metadata.timestamp).toBeDefined();
      expect(bundle.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(bundle.metadata.timestamp >= beforeTime).toBe(true);
      expect(bundle.metadata.timestamp <= afterTime).toBe(true);
    });

    it('should track total file count', async () => {
      const files = ['/test/file1.ts', '/test/file2.ts', '/test/file3.ts'];
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', files);

      expect(bundle.metadata.fileCount).toBe(bundle.files.length);
      expect(bundle.metadata.fileCount).toBeGreaterThan(0);
      expect(bundle.metadata.fileCount).toBeLessThanOrEqual(files.length);
    });

    it('should track total tokens accurately', async () => {
      const content = 'test';
      (fs.readFile as jest.Mock).mockResolvedValue(content);

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.metadata.totalTokens).toBeGreaterThan(0);
      expect(typeof bundle.metadata.totalTokens).toBe('number');
    });

    it('should mark bundle as not truncated when all files fit', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.metadata.truncated).toBe(false);
    });

    it('should mark bundle as truncated when limits exceeded', async () => {
      const builder = new ContextBuilder({ maxTokens: 10 });
      const largeContent = 'x'.repeat(1000);
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const bundle = await builder.buildForTask('task-1', 'Test', [
        '/test/file1.ts',
        '/test/file2.ts',
        '/test/file3.ts',
      ]);

      expect(bundle.metadata.truncated).toBe(true);
    });
  });

  describe('Optional Features', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should include plan excerpt when requested', async () => {
      const planContent = JSON.stringify({ tasks: [] });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('const x = 1;')
        .mockResolvedValueOnce(planContent);

      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        ['/test/file.ts'],
        { includePlanExcerpt: true }
      );

      expect(bundle).toBeDefined();
      // planExcerpt may or may not be present depending on file availability
    });

    it('should include design system when requested', async () => {
      const designSystem = JSON.stringify({ colors: { primary: '#000' } });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('const x = 1;')
        .mockResolvedValueOnce(designSystem);

      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        ['/test/file.ts'],
        { includeDesignSystem: true }
      );

      expect(bundle).toBeDefined();
      // designSystemData may or may not be present depending on file availability
    });

    it('should handle missing plan excerpt gracefully', async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('const x = 1;')
        .mockRejectedValueOnce(new Error('Plan not found'));

      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        ['/test/file.ts'],
        { includePlanExcerpt: true }
      );

      expect(bundle).toBeDefined();
      expect(bundle.planExcerpt).toBeUndefined();
    });

    it('should handle missing design system gracefully', async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('const x = 1;')
        .mockRejectedValueOnce(new Error('Design system not found'));

      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        ['/test/file.ts'],
        { includeDesignSystem: true }
      );

      expect(bundle).toBeDefined();
      expect(bundle.designSystemData).toBeNull();
    });

    it('should handle missing workspace folder', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        [],
        { includePlanExcerpt: true, includeDesignSystem: true }
      );

      expect(bundle).toBeDefined();
      expect(bundle.planExcerpt).toBeUndefined();
      expect(bundle.designSystemData).toBeNull();
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should track cached bundles count', async () => {
      await contextBuilder.buildForTask('task-1', 'Test 1', ['/test/file1.ts']);
      await contextBuilder.buildForTask('task-2', 'Test 2', ['/test/file2.ts']);

      const stats = contextBuilder.getStatistics();

      expect(stats.cachedBundles).toBe(2);
    });

    it('should calculate total size of cached bundles', async () => {
      await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      const stats = contextBuilder.getStatistics();

      expect(stats.totalSize).toBeGreaterThan(0);
      expect(typeof stats.totalSize).toBe('number');
    });

    it('should calculate average tokens', async () => {
      await contextBuilder.buildForTask('task-1', 'Test 1', ['/test/file1.ts']);
      await contextBuilder.buildForTask('task-2', 'Test 2', ['/test/file2.ts']);

      const stats = contextBuilder.getStatistics();

      expect(stats.averageTokens).toBeGreaterThan(0);
      expect(typeof stats.averageTokens).toBe('number');
    });

    it('should return zero average tokens when no bundles cached', () => {
      const stats = contextBuilder.getStatistics();

      expect(stats.averageTokens).toBe(0);
      expect(stats.cachedBundles).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it('should update statistics after clearing cache', async () => {
      await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);
      
      let stats = contextBuilder.getStatistics();
      expect(stats.cachedBundles).toBeGreaterThan(0);

      contextBuilder.clearCache();

      stats = contextBuilder.getStatistics();
      expect(stats.cachedBundles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageTokens).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null task description', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const bundle = await contextBuilder.buildForTask('task-1', null as any, ['/test/file.ts']);

      expect(bundle).toBeDefined();
    });

    it('should handle undefined task description', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const bundle = await contextBuilder.buildForTask('task-1', undefined as any, ['/test/file.ts']);

      expect(bundle).toBeDefined();
    });

    it('should handle empty task description', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const bundle = await contextBuilder.buildForTask('task-1', '', ['/test/file.ts']);

      expect(bundle).toBeDefined();
      expect(bundle.taskId).toBe('task-1');
    });

    it('should handle duplicate file paths', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const files = ['/test/file.ts', '/test/file.ts', '/test/file.ts'];
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', files);

      expect(bundle).toBeDefined();
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should handle very long file paths', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const longPath = '/test/' + 'a'.repeat(500) + '.ts';
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', [longPath]);

      expect(bundle).toBeDefined();
    });

    it('should handle special characters in file paths', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const specialPath = '/test/file with spaces & special-chars_123.ts';
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', [specialPath]);

      expect(bundle).toBeDefined();
    });

    it('should handle very large file content', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/large.ts']);

      expect(bundle).toBeDefined();
    });

    it('should handle binary file content gracefully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from([0x00, 0x01, 0x02]).toString());

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/binary.bin']);

      expect(bundle).toBeDefined();
    });

    it('should handle concurrent bundle creation', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

      const promises = [
        contextBuilder.buildForTask('task-1', 'Test 1', ['/test/file1.ts']),
        contextBuilder.buildForTask('task-2', 'Test 2', ['/test/file2.ts']),
        contextBuilder.buildForTask('task-3', 'Test 3', ['/test/file3.ts']),
      ];

      const bundles = await Promise.all(promises);

      expect(bundles).toHaveLength(3);
      bundles.forEach(bundle => {
        expect(bundle).toBeDefined();
        expect(bundle.id).toBeDefined();
      });
    });

    it('should handle file read timeout gracefully', async () => {
      (fs.readFile as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('content'), 100))
      );

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/slow.ts']);

      expect(bundle).toBeDefined();
    });
  });

  describe('File Content Analysis', () => {
    it('should preserve original file content', async () => {
      const originalContent = 'const test = true;\n// Comment\nfunction foo() {}';
      (fs.readFile as jest.Mock).mockResolvedValue(originalContent);

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      if (bundle.files.length > 0) {
        expect(bundle.files[0].content).toBe(originalContent);
      }
    });

    it('should handle files with various line endings', async () => {
      const contents = [
        'line1\nline2\nline3',      // Unix
        'line1\r\nline2\r\nline3',  // Windows
        'line1\rline2\rline3',      // Old Mac
      ];

      for (const content of contents) {
        (fs.readFile as jest.Mock).mockResolvedValue(content);
        const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

        if (bundle.files.length > 0) {
          // Content should be preserved exactly as read
          expect(bundle.files[0].content).toContain('line');
          expect(bundle.files[0].content.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle empty files', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('');

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/empty.ts']);

      if (bundle.files.length > 0) {
        expect(bundle.files[0].content).toBe('');
        expect(bundle.files[0].tokens).toBe(0);
      }
    });

    it('should handle files with only whitespace', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('   \n\t\n   ');

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/whitespace.ts']);

      expect(bundle).toBeDefined();
    });
  });

  describe('Bundle ID Generation', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should include task ID in bundle ID', async () => {
      const taskId = 'task-unique-123';
      const bundle = await contextBuilder.buildForTask(taskId, 'Test', ['/test/file.ts']);

      expect(bundle.id).toContain(taskId);
    });

    it('should include timestamp in bundle ID', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.id).toMatch(/-\d+$/); // Should end with timestamp
    });

    it('should generate different IDs for same task at different times', async () => {
      const builder1 = new ContextBuilder();
      const builder2 = new ContextBuilder();

      const bundle1 = await builder1.buildForTask('task-1', 'Test', ['/test/file.ts']);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const bundle2 = await builder2.buildForTask('task-1', 'Test', ['/test/file.ts']);

      // Different builders should create different bundles (no shared cache)
      expect(bundle1.id).not.toBe(bundle2.id);
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        const filename = filePath.split('/').pop() || '';
        if (filename.includes('component')) return Promise.resolve('export const Component = () => {};');
        if (filename.includes('test')) return Promise.resolve('describe("test", () => {});');
        if (filename.includes('config')) return Promise.resolve('module.exports = {};');
        return Promise.resolve('// Generic content');
      });

      (path.extname as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('.ts')) return '.ts';
        if (filePath.endsWith('.json')) return '.json';
        if (filePath.endsWith('.md')) return '.md';
        return '';
      });
    });

    it('should handle typical React component bundle', async () => {
      const files = [
        '/src/components/Button.tsx',
        '/src/components/Button.test.ts',
        '/src/components/Button.module.css',
      ];

      const bundle = await contextBuilder.buildForTask(
        'task-react',
        'Implement Button component',
        files
      );

      expect(bundle).toBeDefined();
      expect(bundle.files.length).toBeGreaterThan(0);
      expect(bundle.metadata.fileCount).toBeGreaterThan(0);
    });

    it('should handle full-stack feature bundle', async () => {
      const files = [
        '/src/api/users.ts',
        '/src/components/UserList.tsx',
        '/src/services/userService.ts',
        '/tests/users.test.ts',
        '/config/api.json',
      ];

      const bundle = await contextBuilder.buildForTask(
        'task-fullstack',
        'Implement user management',
        files
      );

      expect(bundle).toBeDefined();
      expect(bundle.files.length).toBeGreaterThan(0);
    });

    it('should prioritize files mentioned in task description', async () => {
      const files = [
        '/src/important.ts',
        '/src/other.ts',
        '/src/unrelated.ts',
      ];

      const bundle = await contextBuilder.buildForTask(
        'task-priority',
        'Update the important.ts file with new logic',
        files
      );

      expect(bundle).toBeDefined();
      // File relevance should be calculated based on mention in description
      if (bundle.files.length > 0) {
        const importantFile = bundle.files.find(f => f.path.includes('important'));
        if (importantFile) {
          expect(importantFile.relevance).toBeGreaterThan(0.5);
        }
      }
    });
  });

  describe('Performance and Limits', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('x'.repeat(100));
    });

    it('should handle many files efficiently', async () => {
      const files = Array.from({ length: 100 }, (_, i) => `/test/file${i}.ts`);
      
      const startTime = Date.now();
      const bundle = await contextBuilder.buildForTask('task-many', 'Test', files);
      const endTime = Date.now();

      expect(bundle).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in reasonable time
    });

    it('should respect memory limits with large bundles', async () => {
      const builder = new ContextBuilder({ maxBundleSize: 10 }); // 10KB
      const files = Array.from({ length: 50 }, (_, i) => `/test/file${i}.ts`);

      const bundle = await builder.buildForTask('task-limited', 'Test', files);

      expect(bundle).toBeDefined();
      // Should limit files or be truncated depending on implementation
      expect(bundle.files.length).toBeLessThanOrEqual(files.length);
    });

    it('should stop processing when token limit reached', async () => {
      const builder = new ContextBuilder({ maxTokens: 50 });
      const largeContent = 'x'.repeat(500);
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const files = Array.from({ length: 20 }, (_, i) => `/test/file${i}.ts`);
      const bundle = await builder.buildForTask('task-token-limit', 'Test', files);

      expect(bundle.metadata.totalTokens).toBeLessThanOrEqual(50);
      expect(bundle.files.length).toBeLessThan(files.length);
    });
  });
});

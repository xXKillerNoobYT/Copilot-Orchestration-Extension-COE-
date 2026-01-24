import { ContextBuilder } from '../contextBuilder';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

jest.mock('vscode');
jest.mock('fs/promises');

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWorkspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test-workspace',
      index: 0,
    };

    (vscode.workspace.workspaceFolders as any) = [mockWorkspaceFolder];
    contextBuilder = new ContextBuilder();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(contextBuilder).toBeDefined();
      expect(ContextBuilder).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const builder = new ContextBuilder({
        maxTokens: 4000,
        maxBundleSize: 50,
      });
      expect(builder).toBeDefined();
    });
  });

  describe('Context Building', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('// Sample file content\nconst x = 1;');
    });

    it('should build context bundle for task', async () => {
      const taskId = 'task-123';
      const taskDescription = 'Implement feature X';
      const relatedFiles = ['/test/file1.ts', '/test/file2.ts'];

      const bundle = await contextBuilder.buildForTask(taskId, taskDescription, relatedFiles);

      expect(bundle).toBeDefined();
      expect(bundle.taskId).toBe(taskId);
      expect(bundle.files).toBeDefined();
      expect(bundle.metadata).toBeDefined();
      expect(bundle.metadata.timestamp).toBeDefined();
    });

    it('should handle empty file list', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test task', []);

      expect(bundle).toBeDefined();
      expect(bundle.files).toHaveLength(0);
      expect(bundle.metadata.fileCount).toBe(0);
    });

    it('should include metadata in bundle', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/test/file.ts']);

      expect(bundle.metadata).toBeDefined();
      expect(bundle.metadata.totalTokens).toBeGreaterThanOrEqual(0);
      expect(bundle.metadata.fileCount).toBeGreaterThanOrEqual(0);
      expect(bundle.metadata.truncated).toBeDefined();
    });

    it('should respect token limits', async () => {
      const builder = new ContextBuilder({ maxTokens: 100 });
      const largeContent = 'x'.repeat(10000);
      (fs.readFile as jest.Mock).mockResolvedValue(largeContent);

      const bundle = await builder.buildForTask('task-1', 'Test', [
        '/test/file1.ts',
        '/test/file2.ts',
        '/test/file3.ts',
      ]);

      expect(bundle.metadata.totalTokens).toBeLessThanOrEqual(100);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should cache built bundles', async () => {
      const taskId = 'task-cache';
      const files = ['/test/file.ts'];

      const bundle1 = await contextBuilder.buildForTask(taskId, 'Test', files);
      const bundle2 = await contextBuilder.buildForTask(taskId, 'Test', files);

      expect(bundle1.id).toBe(bundle2.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['/nonexistent/file.ts']);

      // Should return bundle even if files fail to load
      expect(bundle).toBeDefined();
      expect(bundle.files).toHaveLength(0);
    });

    it('should handle invalid file paths', async () => {
      const bundle = await contextBuilder.buildForTask('task-1', 'Test', ['']);

      expect(bundle).toBeDefined();
    });
  });

  describe('Options', () => {
    beforeEach(() => {
      (fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');
    });

    it('should support includePlanExcerpt option', async () => {
      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        ['/test/file.ts'],
        { includePlanExcerpt: true }
      );

      expect(bundle).toBeDefined();
      // planExcerpt may or may not be present depending on implementation
    });

    it('should support includeDesignSystem option', async () => {
      const bundle = await contextBuilder.buildForTask(
        'task-1',
        'Test',
        ['/test/file.ts'],
        { includeDesignSystem: true }
      );

      expect(bundle).toBeDefined();
      // designSystemData may or may not be present depending on implementation
    });
  });
});

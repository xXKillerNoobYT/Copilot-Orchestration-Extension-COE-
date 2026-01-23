import { ContextBuilder } from '../contextBuilder';
import * as vscode from 'vscode';

jest.mock('vscode');

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

    it('should handle missing workspace', () => {
      (vscode.workspace.workspaceFolders as any) = undefined;
      const builder = new ContextBuilder();
      expect(builder).toBeDefined();
    });
  });

  describe('Context Building', () => {
    it('should build context from files', async () => {
      const files = [
        vscode.Uri.file('/test/file1.ts'),
        vscode.Uri.file('/test/file2.ts'),
      ];

      const context = await contextBuilder.buildContext(files);
      expect(context).toBeDefined();
      expect(context.files).toHaveLength(2);
    });

    it('should handle empty file list', async () => {
      const context = await contextBuilder.buildContext([]);
      expect(context).toBeDefined();
      expect(context.files).toHaveLength(0);
    });

    it('should extract metadata from files', async () => {
      const files = [vscode.Uri.file('/test/file.ts')];
      const context = await contextBuilder.buildContext(files);

      expect(context.metadata).toBeDefined();
      expect(context.metadata.timestamp).toBeDefined();
    });
  });

  describe('Context Serialization', () => {
    it('should serialize context to JSON', async () => {
      const files = [vscode.Uri.file('/test/file.ts')];
      const context = await contextBuilder.buildContext(files);
      const json = contextBuilder.serialize(context);

      expect(json).toBeDefined();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should deserialize context from JSON', async () => {
      const files = [vscode.Uri.file('/test/file.ts')];
      const context = await contextBuilder.buildContext(files);
      const json = contextBuilder.serialize(context);
      const restored = contextBuilder.deserialize(json);

      expect(restored).toEqual(context);
    });
  });

  describe('Context Validation', () => {
    it('should validate valid context', async () => {
      const files = [vscode.Uri.file('/test/file.ts')];
      const context = await contextBuilder.buildContext(files);

      expect(contextBuilder.validate(context)).toBe(true);
    });

    it('should reject invalid context', () => {
      const invalidContext = { invalid: 'data' };
      expect(contextBuilder.validate(invalidContext as any)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors', async () => {
      const files = [vscode.Uri.file('/nonexistent/file.ts')];

      await expect(contextBuilder.buildContext(files)).rejects.toThrow();
    });

    it('should handle serialization errors', () => {
      const circular: any = {};
      circular.self = circular;

      expect(() => contextBuilder.serialize(circular)).toThrow();
    });
  });
});

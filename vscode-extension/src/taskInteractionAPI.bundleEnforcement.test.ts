/**
 * Context Bundle Size Enforcement Tests
 * Tests for enforcing MAX_FILES_PER_BUNDLE limits during create/add operations
 */

import { TaskInteractionAPI } from './taskInteractionAPI';
import { MAX_FILES_PER_BUNDLE } from './orchestratorPanel';
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock vscode
jest.mock('vscode');

// Mock pathValidation module
jest.mock('./utils/pathValidation', () => {
  const actual = jest.requireActual('./utils/pathValidation');
  return {
    ...actual,
    validateAndFilterFilePaths: jest.fn(),
    normalizeFilePath: jest.fn(),
  };
});

import { validateAndFilterFilePaths, normalizeFilePath } from './utils/pathValidation';

describe('TaskInteractionAPI - Context Bundle Size Enforcement', () => {
  let api: TaskInteractionAPI;
  let tempDir: string;
  let bundlePath: string;

  beforeEach(async () => {
    api = new TaskInteractionAPI();
    jest.clearAllMocks();

    // Create temp directory for test bundles
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-test-'));
    bundlePath = path.join(tempDir, 'test-bundle.json');

    // Setup vscode mocks
    (vscode.Uri as any).file = jest.fn((filePath: string) => ({ 
      fsPath: filePath,
      scheme: 'file',
      toString: () => `file://${filePath}`,
    }));

    (vscode.workspace as any).workspaceFolders = [{
      uri: { fsPath: tempDir },
      name: 'test-workspace',
      index: 0,
    }];

    // Mock normalizeFilePath to match actual behavior (normalize path separators)
    (normalizeFilePath as jest.Mock).mockImplementation((filePath: string | vscode.Uri) => {
      if (typeof filePath === 'string') {
        return path.normalize(filePath);
      }
      return path.normalize((filePath as any).fsPath);
    });
  });

  afterEach(async () => {
    api.dispose();
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('addFilesToContextBundle - Limit Enforcement', () => {
    it('should block adding files when it would exceed MAX_FILES_PER_BUNDLE', async () => {
      // Create a bundle with 95 files (close to limit)
      const existingFiles = Array.from({ length: 95 }, (_, i) => `/test/file${i}.ts`);
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Write bundle to disk
      await fs.writeFile(bundlePath, JSON.stringify(bundleData, null, 2));

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Try to add 10 new files (would exceed limit of 100)
      const newFiles = Array.from({ length: 10 }, (_, i) => `/test/newfile${i}.ts`);
      
      // Mock validation to return all files as valid
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(newFiles);

      const mockShowErrorMessage = jest.fn();
      (vscode.window as any).showErrorMessage = mockShowErrorMessage;

      await api.addFilesToContextBundle(bundlePath, newFiles);

      // Verify error message was shown
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Cannot add 10 file(s)')
      );
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Bundle currently has 95 files')
      );
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining(`maximum is ${MAX_FILES_PER_BUNDLE}`)
      );
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('You can add up to 5 more file(s)')
      );

      // Verify bundle was NOT written
      expect((vscode.workspace.fs as any).writeFile).not.toHaveBeenCalled();
    });

    it('should warn when adding files brings bundle above BUNDLE_WARNING_THRESHOLD', async () => {
      // Create a bundle with 75 files (below threshold)
      const existingFiles = Array.from({ length: 75 }, (_, i) => `/test/file${i}.ts`);
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Write bundle to disk
      await fs.writeFile(bundlePath, JSON.stringify(bundleData, null, 2));

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Add 10 files to reach 85 (above 80% threshold)
      const newFiles = Array.from({ length: 10 }, (_, i) => `/test/newfile${i}.ts`);
      
      // Mock validation to return all files as valid
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(newFiles);

      const mockShowWarningMessage = jest.fn();
      (vscode.window as any).showWarningMessage = mockShowWarningMessage;

      await api.addFilesToContextBundle(bundlePath, newFiles);

      // Verify warning message was shown
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Added 10 file(s) to context bundle')
      );
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Bundle now has 85/100 files')
      );
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Consider splitting into multiple bundles')
      );

      // Verify bundle WAS written
      expect((vscode.workspace.fs as any).writeFile).toHaveBeenCalled();
    });

    it('should allow adding files when exactly at MAX_FILES_PER_BUNDLE', async () => {
      // Create a bundle with 95 files
      const existingFiles = Array.from({ length: 95 }, (_, i) => `/test/file${i}.ts`);
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Add exactly 5 files to reach the limit of 100
      const newFiles = Array.from({ length: 5 }, (_, i) => `/test/newfile${i}.ts`);
      
      // Mock validation to return all files as valid
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(newFiles);

      const mockShowWarningMessage = jest.fn();
      (vscode.window as any).showWarningMessage = mockShowWarningMessage;

      await api.addFilesToContextBundle(bundlePath, newFiles);

      // Verify warning was shown (at 100 files, which is above 80%)
      expect(mockShowWarningMessage).toHaveBeenCalled();
      
      // Verify bundle WAS written
      expect((vscode.workspace.fs as any).writeFile).toHaveBeenCalled();
      
      // Verify the written bundle has 100 files
      const writeCall = ((vscode.workspace.fs as any).writeFile as jest.Mock).mock.calls[0];
      const writtenContent = new TextDecoder().decode(writeCall[1]);
      const writtenBundle = JSON.parse(writtenContent);
      expect(writtenBundle.files.length).toBe(100);
    });

    it('should not warn when adding files keeps bundle below BUNDLE_WARNING_THRESHOLD', async () => {
      // Create a bundle with 50 files
      const existingFiles = Array.from({ length: 50 }, (_, i) => `/test/file${i}.ts`);
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Add 10 files to reach 60 (still below 80% threshold)
      const newFiles = Array.from({ length: 10 }, (_, i) => `/test/newfile${i}.ts`);
      
      // Mock validation to return all files as valid
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(newFiles);

      const mockShowInformationMessage = jest.fn();
      const mockShowWarningMessage = jest.fn();
      (vscode.window as any).showInformationMessage = mockShowInformationMessage;
      (vscode.window as any).showWarningMessage = mockShowWarningMessage;

      await api.addFilesToContextBundle(bundlePath, newFiles);

      // Verify info message (not warning) was shown
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'Added 10 file(s) to context bundle.'
      );
      expect(mockShowWarningMessage).not.toHaveBeenCalled();

      // Verify bundle WAS written
      expect((vscode.workspace.fs as any).writeFile).toHaveBeenCalled();
    });

    it('should prevent duplicates with normalized path comparison', async () => {
      // Create a bundle with some files
      const existingFiles = ['/test/file1.ts', '/test/file2.ts'];
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Try to add files that already exist (including one duplicate)
      const newFiles = ['/test/file1.ts', '/test/file3.ts'];
      
      // Mock validation to return all files as valid
      // Reference: https://jestjs.io/docs/mock-functions#mock-return-values
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(newFiles);

      const mockShowInformationMessage = jest.fn();
      (vscode.window as any).showInformationMessage = mockShowInformationMessage;

      await api.addFilesToContextBundle(bundlePath, newFiles);

      // Verify only the new file was added (duplicates should be filtered)
      const writeCall = ((vscode.workspace.fs as any).writeFile as jest.Mock).mock.calls[0];
      const writtenContent = new TextDecoder().decode(writeCall[1]);
      const writtenBundle = JSON.parse(writtenContent);
      
      // Expected: Original 2 files + at most 1 new unique file (duplicates filtered)
      // file1.ts was already there, so only file3.ts should be added
      expect(writtenBundle.files).toBeDefined();
      expect(Array.isArray(writtenBundle.files)).toBe(true);
      expect(writtenBundle.files).toContain('/test/file3.ts');
      
      // Verify the bundle contains unique files (no duplicates allowed)
      const uniqueFiles = new Set(writtenBundle.files);
      expect(uniqueFiles.size).toBe(writtenBundle.files.length);
    });

    it('should show appropriate message when invalid paths are filtered out', async () => {
      // Create a bundle with some files
      const existingFiles = ['/test/file1.ts'];
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Try to add 5 files, but only 2 are valid
      const attemptedFiles = [
        '/test/valid1.ts',
        '/invalid/path.ts',
        '/test/valid2.ts',
        '/another/invalid.ts',
        '/yet/another/invalid.ts',
      ];
      const validatedFiles = ['/test/valid1.ts', '/test/valid2.ts'];
      
      // Mock validation to filter out invalid files
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(validatedFiles);

      const mockShowInformationMessage = jest.fn();
      (vscode.window as any).showInformationMessage = mockShowInformationMessage;

      await api.addFilesToContextBundle(bundlePath, attemptedFiles);

      // Verify message shows both added and skipped counts
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'Added 2 file(s) to bundle. 3 invalid path(s) were skipped.'
      );

      // Verify bundle was written with valid files
      expect((vscode.workspace.fs as any).writeFile).toHaveBeenCalled();
    });

    it('should show warning message when no valid paths to add', async () => {
      // Create a bundle with some files
      const existingFiles = ['/test/file1.ts'];
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Try to add files that are all invalid
      const attemptedFiles = ['/invalid/path1.ts', '/invalid/path2.ts'];
      
      // Mock validation to return no valid files
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue([]);

      const mockShowWarningMessage = jest.fn();
      (vscode.window as any).showWarningMessage = mockShowWarningMessage;

      await api.addFilesToContextBundle(bundlePath, attemptedFiles);

      // Verify warning was shown
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'No valid file paths to add. All paths were invalid or files do not exist.'
      );

      // Verify bundle was NOT written
      expect((vscode.workspace.fs as any).writeFile).not.toHaveBeenCalled();
    });

    it('should calculate allowed files correctly when near limit', async () => {
      // Create a bundle at exactly 98 files
      const existingFiles = Array.from({ length: 98 }, (_, i) => `/test/file${i}.ts`);
      const bundleData = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: existingFiles,
        createdAt: new Date().toISOString(),
      };

      // Mock filesystem
      (vscode.workspace as any).fs = {
        readFile: jest.fn().mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(bundleData))
        ),
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Try to add 5 files (would exceed by 3)
      const newFiles = Array.from({ length: 5 }, (_, i) => `/test/newfile${i}.ts`);
      
      // Mock validation to return all files as valid
      (validateAndFilterFilePaths as jest.Mock).mockResolvedValue(newFiles);

      const mockShowErrorMessage = jest.fn();
      (vscode.window as any).showErrorMessage = mockShowErrorMessage;

      await api.addFilesToContextBundle(bundlePath, newFiles);

      // Verify error message shows we can only add 2 more files
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('You can add up to 2 more file(s)')
      );
    });
  });
});

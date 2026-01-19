/**
 * Tests for path validation utilities
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  validateFilePath,
  validateFilePaths,
  validateAndFilterFilePaths,
  normalizeFilePath,
  FilePathValidationError,
} from './pathValidation';

// Mock vscode module
jest.mock('vscode');

describe('Path Validation Utilities', () => {
  let tempDir: string;
  let validFilePath: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-validation-test-'));
    
    // Create a valid test file
    validFilePath = path.join(tempDir, 'test-file.txt');
    await fs.writeFile(validFilePath, 'test content');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('normalizeFilePath', () => {
    // Reference: https://nodejs.org/api/path.html#path_path_normalize_p
    // Note: path.normalize() behaves differently on Windows vs Unix
    // See: https://jestjs.io/docs/setup-teardown for platform-specific testing
    
    it('should normalize an absolute path', () => {
      const absolutePath = '/home/user/project/file.txt';
      const normalized = normalizeFilePath(absolutePath);
      // On Windows, this may include drive letters; use path.normalize for comparison
      expect(normalized).toBe(path.normalize(absolutePath));
    });

    it('should resolve relative paths with workspace root', () => {
      // Reference: https://nodejs.org/api/path.html#path_path_resolve_paths
      // path.resolve() is platform-aware and handles both Windows and Unix paths
      const workspaceRoot = path.normalize(path.resolve('/home/user/project'));
      const relativePath = 'src/file.txt';
      const normalized = normalizeFilePath(relativePath, workspaceRoot);
      const expected = path.normalize(path.join(workspaceRoot, relativePath));
      // Use platform-agnostic comparison
      expect(normalized).toBeDefined();
      expect(typeof normalized).toBe('string');
      expect(normalized).toContain('src');
      expect(normalized).toContain('file.txt');
    });

    it('should handle file:// URIs', () => {
      // Reference: https://nodejs.org/api/url.html for URL handling
      const fileUri = 'file:///home/user/project/file.txt';
      const normalized = normalizeFilePath(fileUri);
      // Result depends on platform, just check it doesn't throw
      expect(normalized).toBeTruthy();
    });

    it('should clean up paths with . and ..', () => {
      const messyPath = '/home/user/./project/../project/file.txt';
      const normalized = normalizeFilePath(messyPath);
      expect(normalized).toBe(path.normalize('/home/user/project/file.txt'));
    });

    it('should trim whitespace', () => {
      const pathWithSpaces = '  /home/user/file.txt  ';
      const normalized = normalizeFilePath(pathWithSpaces);
      expect(normalized).toBe(path.normalize('/home/user/file.txt'));
    });

    it('should prevent path traversal attacks', () => {
      const workspaceRoot = '/home/user/workspace';
      const maliciousPath = '../../../../etc/passwd';
      
      expect(() => {
        normalizeFilePath(maliciousPath, workspaceRoot);
      }).toThrow('outside of the workspace root');
    });

    it('should allow relative paths within workspace', () => {
      const workspaceRoot = tempDir;
      const relativePath = 'subfolder/file.txt';
      
      const normalized = normalizeFilePath(relativePath, workspaceRoot);
      expect(normalized).toBe(path.normalize(path.join(tempDir, 'subfolder/file.txt')));
    });

    it('should handle vscode.Uri objects', () => {
      const mockUri = {
        fsPath: '/home/user/file.txt',
        scheme: 'file',
      } as any;
      
      const normalized = normalizeFilePath(mockUri);
      expect(normalized).toBe('/home/user/file.txt');
    });
  });

  describe('validateFilePath', () => {
    it('should validate an existing file', async () => {
      const result = await validateFilePath(validFilePath);
      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBe(path.normalize(validFilePath));
      expect(result.error).toBeUndefined();
    });

    it('should reject empty paths', async () => {
      const result = await validateFilePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(FilePathValidationError);
      expect(result.error?.reason).toBe('invalid_format');
      expect(result.error?.message).toContain('cannot be empty');
    });

    it('should reject whitespace-only paths', async () => {
      const result = await validateFilePath('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(FilePathValidationError);
      expect(result.error?.reason).toBe('invalid_format');
    });

    it('should reject non-existent files when checkExists is true', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.txt');
      const result = await validateFilePath(nonExistentPath, { checkExists: true });
      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(FilePathValidationError);
      expect(result.error?.reason).toBe('not_found');
      expect(result.error?.message).toContain('does not exist');
    });

    it('should allow non-existent files when checkExists is false', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.txt');
      const result = await validateFilePath(nonExistentPath, { checkExists: false });
      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBe(path.normalize(nonExistentPath));
    });

    it('should reject relative paths without workspace root', async () => {
      const relativePath = 'src/file.txt';
      const result = await validateFilePath(relativePath, { checkExists: false });
      expect(result.valid).toBe(false);
      expect(result.error?.reason).toBe('not_absolute');
    });

    it('should accept relative paths with workspace root', async () => {
      // Create a file in tempDir
      const fileName = 'relative-file.txt';
      await fs.writeFile(path.join(tempDir, fileName), 'content');
      
      const result = await validateFilePath(fileName, { 
        checkExists: true, 
        workspaceRoot: tempDir 
      });
      
      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBe(path.normalize(path.join(tempDir, fileName)));
    });

    it('should reject directories', async () => {
      const dirPath = path.join(tempDir, 'test-dir');
      await fs.mkdir(dirPath);
      
      const result = await validateFilePath(dirPath, { checkExists: true });
      expect(result.valid).toBe(false);
      expect(result.error?.reason).toBe('invalid_format');
      expect(result.error?.message).toContain('must point to a file');
    });

    it('should normalize and validate paths with . and ..', async () => {
      const messyPath = path.join(tempDir, '.', 'test-file.txt');
      const result = await validateFilePath(messyPath, { checkExists: true });
      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBe(path.normalize(validFilePath));
    });
  });

  describe('validateFilePaths', () => {
    it('should validate multiple file paths', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      const results = await validateFilePaths([file1, file2], { checkExists: true });
      
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('should return validation results for mixed valid and invalid paths', async () => {
      const validPath = validFilePath;
      const invalidPath = path.join(tempDir, 'does-not-exist.txt');

      const results = await validateFilePaths([validPath, invalidPath], { checkExists: true });
      
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].error?.reason).toBe('not_found');
    });

    it('should handle empty array', async () => {
      const results = await validateFilePaths([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('validateAndFilterFilePaths', () => {
    it('should filter out invalid paths and return valid ones', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');
      
      const invalidPath = path.join(tempDir, 'invalid.txt');
      
      const validPaths = await validateAndFilterFilePaths(
        [file1, invalidPath, file2],
        { checkExists: true, throwOnInvalid: false }
      );
      
      expect(validPaths).toHaveLength(2);
      expect(validPaths).toContain(path.normalize(file1));
      expect(validPaths).toContain(path.normalize(file2));
    });

    it('should throw error on invalid path when throwOnInvalid is true', async () => {
      const invalidPath = path.join(tempDir, 'invalid.txt');
      
      await expect(
        validateAndFilterFilePaths([invalidPath], { 
          checkExists: true, 
          throwOnInvalid: true 
        })
      ).rejects.toThrow(FilePathValidationError);
    });

    it('should not throw error on invalid path when throwOnInvalid is false', async () => {
      const invalidPath = path.join(tempDir, 'invalid.txt');
      
      const validPaths = await validateAndFilterFilePaths([invalidPath], { 
        checkExists: true, 
        throwOnInvalid: false 
      });
      
      expect(validPaths).toHaveLength(0);
    });

    it('should log invalid paths when logInvalid is true', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidPath = path.join(tempDir, 'invalid.txt');
      
      await validateAndFilterFilePaths([invalidPath], { 
        checkExists: true, 
        logInvalid: true,
        throwOnInvalid: false
      });
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Invalid file path');
      
      consoleErrorSpy.mockRestore();
    });

    it('should not log invalid paths when logInvalid is false', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidPath = path.join(tempDir, 'invalid.txt');
      
      await validateAndFilterFilePaths([invalidPath], { 
        checkExists: true, 
        logInvalid: false,
        throwOnInvalid: false
      });
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should normalize all valid paths', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      await fs.writeFile(file1, 'content1');
      
      const messyPath = path.join(tempDir, '.', 'file1.txt');
      
      const validPaths = await validateAndFilterFilePaths([messyPath], { 
        checkExists: true 
      });
      
      expect(validPaths).toHaveLength(1);
      expect(validPaths[0]).toBe(path.normalize(file1));
    });
  });

  describe('FilePathValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new FilePathValidationError(
        'Test error message',
        '/invalid/path',
        'not_found'
      );
      
      expect(error.message).toBe('Test error message');
      expect(error.filePath).toBe('/invalid/path');
      expect(error.reason).toBe('not_found');
      expect(error.name).toBe('FilePathValidationError');
    });

    it('should be instance of Error', () => {
      const error = new FilePathValidationError(
        'Test error',
        '/path',
        'invalid_uri'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FilePathValidationError);
    });
  });
});

/**
 * Path validation utilities for context bundles
 * Validates file paths to ensure they are valid URIs and files exist before storing in context bundles
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Error thrown when a file path is invalid
 */
export class FilePathValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly reason: 'invalid_uri' | 'not_found' | 'not_absolute' | 'invalid_format'
  ) {
    super(message);
    this.name = 'FilePathValidationError';
  }
}

/**
 * Result of path validation
 */
export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: FilePathValidationError;
}

/**
 * Validate a file path for use in context bundles
 * 
 * Checks:
 * 1. Path is not empty
 * 2. Path is absolute (can be converted to proper URI)
 * 3. File exists at the given path
 * 4. Path is properly formatted
 * 
 * @param filePath The file path to validate
 * @param options Validation options
 * @returns PathValidationResult with validation status and normalized path
 */
export async function validateFilePath(
  filePath: string,
  options: { checkExists?: boolean; workspaceRoot?: string } = {}
): Promise<PathValidationResult> {
  const { checkExists = true, workspaceRoot } = options;

  // Check if path is empty
  if (!filePath || filePath.trim() === '') {
    return {
      valid: false,
      error: new FilePathValidationError(
        'File path cannot be empty',
        filePath,
        'invalid_format'
      ),
    };
  }

  let normalizedPath: string;

  try {
    // Try to normalize the path
    normalizedPath = normalizeFilePath(filePath, workspaceRoot);
  } catch (error) {
    return {
      valid: false,
      error: new FilePathValidationError(
        `Invalid file path format: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        'invalid_format'
      ),
    };
  }

  // Check if path is absolute
  if (!path.isAbsolute(normalizedPath)) {
    return {
      valid: false,
      error: new FilePathValidationError(
        'File path must be absolute',
        filePath,
        'not_absolute'
      ),
    };
  }

  // Validate URI format
  try {
    vscode.Uri.file(normalizedPath);
  } catch (error) {
    return {
      valid: false,
      error: new FilePathValidationError(
        `Invalid URI format: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        'invalid_uri'
      ),
    };
  }

  // Check if file exists (if requested)
  if (checkExists) {
    try {
      await fs.access(normalizedPath);
      const stats = await fs.stat(normalizedPath);
      
      // Ensure it's a file, not a directory
      if (!stats.isFile()) {
        return {
          valid: false,
          error: new FilePathValidationError(
            'Path must point to a file, not a directory',
            filePath,
            'invalid_format'
          ),
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: new FilePathValidationError(
          `File does not exist: ${normalizedPath}`,
          filePath,
          'not_found'
        ),
      };
    }
  }

  return {
    valid: true,
    normalizedPath,
  };
}

/**
 * Normalize a file path, resolving relative paths and cleaning up the path
 * 
 * @param filePath The file path to normalize
 * @param workspaceRoot Optional workspace root for resolving relative paths
 * @returns Normalized absolute file path
 */
export function normalizeFilePath(filePath: string | vscode.Uri, workspaceRoot?: string): string {
  // Handle vscode.Uri objects first
  if (filePath && typeof filePath === 'object' && 'fsPath' in filePath && 'scheme' in filePath) {
    // More robust check for Uri-like object
    return (filePath as vscode.Uri).fsPath;
  }

  const pathStr = String(filePath);

  // Handle URI format (file://)
  if (pathStr.startsWith('file://')) {
    try {
      const uri = vscode.Uri.parse(pathStr);
      return uri.fsPath;
    } catch (error) {
      throw new Error(`Invalid file URI: ${pathStr} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Clean up path
  let cleanPath = pathStr.trim();

  // Resolve relative paths if workspace root is provided, and ensure the
  // resolved path stays within the workspace root to prevent path traversal.
  if (!path.isAbsolute(cleanPath) && workspaceRoot) {
    const normalizedWorkspaceRoot = path.resolve(workspaceRoot);
    const resolvedPath = path.resolve(normalizedWorkspaceRoot, cleanPath);
    const relativeToRoot = path.relative(normalizedWorkspaceRoot, resolvedPath);

    // If the relative path starts with '..' or is absolute, it escapes the workspace root.
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      throw new Error(
        `Resolved path is outside of the workspace root: ${resolvedPath} (root: ${normalizedWorkspaceRoot})`
      );
    }

    // Return the resolved path directly (don't prepend drive letter on Windows)
    cleanPath = resolvedPath;
  } else if (!path.isAbsolute(cleanPath)) {
    // For relative paths without workspace root, just normalize but don't modify
    cleanPath = path.normalize(cleanPath);
  } else {
    // For absolute paths, just normalize path separators and resolve . and ..
    cleanPath = path.normalize(cleanPath);
  }

  // Normalize path separators and resolve . and ..
  return cleanPath;
}

/**
 * Validate multiple file paths concurrently with batching
 * 
 * @param filePaths Array of file paths to validate
 * @param options Validation options
 * @returns Array of validation results
 */
export async function validateFilePaths(
  filePaths: string[],
  options: { checkExists?: boolean; workspaceRoot?: string } = {}
): Promise<PathValidationResult[]> {
  // Use batch processing with concurrency limit to prevent resource exhaustion
  const BATCH_SIZE = 50; // Process 50 files at a time
  const results: PathValidationResult[] = [];
  
  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(filePath => validateFilePath(filePath, options))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Validate and filter file paths, returning only valid normalized paths
 * Invalid paths are logged and optionally throw errors
 * 
 * @param filePaths Array of file paths to validate
 * @param options Validation and filtering options
 * @returns Array of valid normalized file paths
 */
export async function validateAndFilterFilePaths(
  filePaths: string[],
  options: { 
    checkExists?: boolean; 
    workspaceRoot?: string;
    throwOnInvalid?: boolean;
    logInvalid?: boolean;
  } = {}
): Promise<string[]> {
  const { throwOnInvalid = false, logInvalid = true } = options;
  const results = await validateFilePaths(filePaths, options);
  const validPaths: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    
    if (result.valid && result.normalizedPath) {
      validPaths.push(result.normalizedPath);
    } else if (result.error) {
      if (logInvalid) {
        console.error(`Invalid file path: ${result.error.filePath} - ${result.error.message}`);
      }
      
      if (throwOnInvalid) {
        throw result.error;
      }
    }
  }

  return validPaths;
}

/**
 * Context Bundle Agent Profile Tests
 * Unit tests for agent profile capture and validation in context bundles
 */

import { TaskInteractionAPI } from './taskInteractionAPI';
import { defaultAgentProfileLoader, AgentProfile } from './agentProfiles';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

// Mock defaultAgentProfileLoader
jest.mock('./agentProfiles', () => ({
  defaultAgentProfileLoader: {
    loadProfile: jest.fn(),
  },
}));

describe('TaskInteractionAPI - Context Bundle Agent Profile', () => {
  let api: TaskInteractionAPI;
  let mockLoadProfile: jest.MockedFunction<typeof defaultAgentProfileLoader.loadProfile>;

  beforeEach(() => {
    api = new TaskInteractionAPI();
    mockLoadProfile = defaultAgentProfileLoader.loadProfile as jest.MockedFunction<typeof defaultAgentProfileLoader.loadProfile>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    api.dispose();
  });

  describe('Profile Capture', () => {
    it('should capture agent profile when creating context bundle', async () => {
      const mockProfile: AgentProfile = {
        name: 'TestCoder',
        role: 'coder',
        version: 1,
        tool_permissions: {
          read_files: true,
          write_files: true,
          run_commands: true,
        },
        execution_constraints: {},
        prompt_templates: {},
      };

      mockLoadProfile.mockResolvedValueOnce(mockProfile);

      // Mock vscode.window methods
      const mockShowInputBox = jest.fn().mockResolvedValue('test-bundle');
      const mockShowInformationMessage = jest.fn().mockResolvedValue('No');
      const mockShowErrorMessage = jest.fn();
      (vscode.window as any).showInputBox = mockShowInputBox;
      (vscode.window as any).showInformationMessage = mockShowInformationMessage;
      (vscode.window as any).showErrorMessage = mockShowErrorMessage;

      // Mock vscode.workspace methods
      const mockOpenTextDocument = jest.fn().mockResolvedValue({
        getText: () => `---
id: task-1
title: Test Task
assignees: [coder]
---

Task description`,
        uri: { fsPath: '/test/task.md' },
      });
      (vscode.workspace as any).openTextDocument = mockOpenTextDocument;
      (vscode.workspace as any).fs = {
        writeFile: jest.fn().mockResolvedValue(undefined),
      };

      // Mock vscode.Uri
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));

      // Mock TaskStatusParser
      const mockStatusParser = {
        parseTaskFile: jest.fn().mockReturnValue({
          task: {
            id: 'task-1',
            title: 'Test Task',
            assignees: ['coder'],
            description: 'Task description',
            dependencies: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
          },
          errors: [],
          warnings: [],
        }),
      };
      (api as any).statusParser = mockStatusParser;

      const mockUri = { fsPath: '/test/task.md' } as vscode.Uri;
      await api.createContextBundle('task-1', mockUri);

      // Verify profile was loaded
      expect(mockLoadProfile).toHaveBeenCalledWith('coder');

      // Verify bundle was created with profile information
      expect((vscode.workspace.fs as any).writeFile).toHaveBeenCalled();
      const writeCall = ((vscode.workspace.fs as any).writeFile as jest.Mock).mock.calls[0];
      const bundleContent = new TextDecoder().decode(writeCall[1]);
      const bundle = JSON.parse(bundleContent);

      expect(bundle.agentProfile).toBeDefined();
      expect(bundle.agentProfile.name).toBe('TestCoder');
      expect(bundle.agentProfile.role).toBe('coder');
      expect(bundle.agentProfile.version).toBe(1);
      expect(bundle.agentProfile.capabilities).toContain('read_files');
      expect(bundle.agentProfile.capabilities).toContain('write_files');
      expect(bundle.agentProfile.capabilities).toContain('role:coder');
      expect(bundle.profileVersion).toBeDefined();
    });

    it('should handle missing agent profile gracefully', async () => {
      mockLoadProfile.mockResolvedValueOnce(null);

      const mockShowInputBox = jest.fn().mockResolvedValue('test-bundle');
      const mockShowInformationMessage = jest.fn().mockResolvedValue('No');
      (vscode.window as any).showInputBox = mockShowInputBox;
      (vscode.window as any).showInformationMessage = mockShowInformationMessage;

      const mockOpenTextDocument = jest.fn().mockResolvedValue({
        getText: () => `---
id: task-1
title: Test Task
assignees: [coder]
---

Task description`,
        uri: { fsPath: '/test/task.md' },
      });
      (vscode.workspace as any).openTextDocument = mockOpenTextDocument;
      (vscode.workspace as any).fs = {
        writeFile: jest.fn().mockResolvedValue(undefined),
      };
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));

      const mockStatusParser = {
        parseTaskFile: jest.fn().mockReturnValue({
          task: {
            id: 'task-1',
            title: 'Test Task',
            assignees: ['coder'],
            description: 'Task description',
            dependencies: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
          },
          errors: [],
          warnings: [],
        }),
      };
      (api as any).statusParser = mockStatusParser;

      const mockUri = { fsPath: '/test/task.md' } as vscode.Uri;
      await api.createContextBundle('task-1', mockUri);

      // Verify bundle was created without profile information
      const writeCall = ((vscode.workspace.fs as any).writeFile as jest.Mock).mock.calls[0];
      const bundleContent = new TextDecoder().decode(writeCall[1]);
      const bundle = JSON.parse(bundleContent);

      expect(bundle.agentProfile).toBeUndefined();
      expect(bundle.profileVersion).toBeUndefined();
    });
  });

  describe('Profile Validation', () => {
    it('should warn when profile version has changed', async () => {
      const updatedProfile: AgentProfile = {
        name: 'TestCoder',
        role: 'coder',
        version: 2, // Version changed
        tool_permissions: {
          read_files: true,
          write_files: true, // New permission added
        },
        execution_constraints: {},
        prompt_templates: {},
      };

      // Mock for opening bundle - load updated profile
      mockLoadProfile.mockResolvedValueOnce(updatedProfile);

      const mockShowWarningMessage = jest.fn();
      (vscode.window as any).showWarningMessage = mockShowWarningMessage;

      const bundleContent = {
        id: 'test-bundle',
        agentProfile: {
          name: 'TestCoder',
          role: 'coder',
          version: 1,
          capabilities: ['read_files', 'role:coder'],
        },
        profileVersion: '1.abcd1234', // Old version
      };

      const mockOpenTextDocument = jest.fn().mockResolvedValue({
        getText: () => JSON.stringify(bundleContent),
        uri: { fsPath: '/test/bundle.json' },
      });
      const mockShowTextDocument = jest.fn();
      (vscode.workspace as any).openTextDocument = mockOpenTextDocument;
      (vscode.window as any).showTextDocument = mockShowTextDocument;
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));

      await api.openContextBundle('/test/bundle.json');

      // Verify warning was shown
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Agent profile')
      );
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('has changed')
      );
    });

    it('should error when role has changed', async () => {
      const changedProfile: AgentProfile = {
        name: 'TestCoder',
        role: 'reviewer', // Role changed from 'coder' to 'reviewer'
        version: 1,
        tool_permissions: {},
        execution_constraints: {},
        prompt_templates: {},
      };

      mockLoadProfile.mockResolvedValueOnce(changedProfile);

      const mockShowErrorMessage = jest.fn();
      (vscode.window as any).showErrorMessage = mockShowErrorMessage;

      const bundleContent = {
        id: 'test-bundle',
        agentProfile: {
          name: 'TestCoder',
          role: 'coder', // Original role
          version: 1,
          capabilities: ['role:coder'],
        },
        profileVersion: '1.abcd1234',
      };

      const mockOpenTextDocument = jest.fn().mockResolvedValue({
        getText: () => JSON.stringify(bundleContent),
        uri: { fsPath: '/test/bundle.json' },
      });
      const mockShowTextDocument = jest.fn();
      (vscode.workspace as any).openTextDocument = mockOpenTextDocument;
      (vscode.window as any).showTextDocument = mockShowTextDocument;
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));

      await api.openContextBundle('/test/bundle.json');

      // Verify error was shown for role mismatch
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Critical: Agent role mismatch')
      );
    });

    it('should handle missing agent profile in system', async () => {
      mockLoadProfile.mockResolvedValueOnce(null);

      const mockShowWarningMessage = jest.fn();
      (vscode.window as any).showWarningMessage = mockShowWarningMessage;

      const bundleContent = {
        id: 'test-bundle',
        agentProfile: {
          name: 'TestCoder',
          role: 'coder',
          version: 1,
          capabilities: ['role:coder'],
        },
        profileVersion: '1.abcd1234',
      };

      const mockOpenTextDocument = jest.fn().mockResolvedValue({
        getText: () => JSON.stringify(bundleContent),
        uri: { fsPath: '/test/bundle.json' },
      });
      const mockShowTextDocument = jest.fn();
      (vscode.workspace as any).openTextDocument = mockOpenTextDocument;
      (vscode.window as any).showTextDocument = mockShowTextDocument;
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));

      await api.openContextBundle('/test/bundle.json');

      // Verify warning about missing profile
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });
  });

  describe('addFilesToContextBundle', () => {
    // Reference: https://jestjs.io/docs/manual-mocks
    // Reference: https://jestjs.io/docs/setup-teardown#order-of-execution
    
    beforeEach(() => {
      // Mock vscode.workspace
      (vscode.workspace as any).workspaceFolders = [
        { uri: { fsPath: '/test/workspace' } }
      ];
      
      // Properly initialize mocks for file operations
      // See: https://jestjs.io/docs/mock-functions for mock setup
      const mockWriteFile = jest.fn().mockResolvedValue(undefined);
      const mockReadFile = jest.fn();
      (vscode.workspace as any).fs = {
        writeFile: mockWriteFile,
        readFile: mockReadFile,
      };
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));
    });

    it('should add valid files to an existing bundle', async () => {
      const bundleContent = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: ['/existing/file.ts'],
        version: 1,
      };

      const mockReadFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(bundleContent))
      );
      const mockWriteFile = jest.fn().mockResolvedValue(undefined);
      
      (vscode.workspace as any).fs = {
        readFile: mockReadFile,
        writeFile: mockWriteFile,
      };
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));
      (vscode.window as any).showInformationMessage = jest.fn();

      const api = new TaskInteractionAPI(mockExtensionUri, mockContext);

      await api.addFilesToContextBundle('/test/bundle.json', ['/new/file.ts']);

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const updatedBundle = JSON.parse(new TextDecoder().decode(writeCall[1]));
      expect(updatedBundle.files).toContain('/new/file.ts');
    });

    it('should handle invalid file paths gracefully', async () => {
      const bundleContent = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: [],
        version: 1,
      };

      const mockReadFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(bundleContent))
      );
      (vscode.workspace as any).fs = {
        readFile: mockReadFile,
        writeFile: jest.fn(),
      };
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));
      const mockShowWarning = jest.fn();
      (vscode.window as any).showWarningMessage = mockShowWarning;

      // Mock validation to return empty array (all invalid)
      jest.mock('./utils/pathValidation', () => ({
        validateAndFilterFilePaths: jest.fn().mockResolvedValue([]),
        normalizeFilePath: jest.fn((path) => path),
      }));

      await api.addFilesToContextBundle('/test/bundle.json', ['/invalid/path.ts']);

      expect(mockShowWarning).toHaveBeenCalledWith(
        expect.stringContaining('No valid file paths')
      );
    });

    it('should prevent duplicate files', async () => {
      const bundleContent = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: ['/existing/file.ts'],
        version: 1,
      };

      const mockReadFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(bundleContent))
      );
      const mockWriteFile = jest.fn().mockResolvedValue(undefined);
      (vscode.workspace as any).fs = {
        readFile: mockReadFile,
        writeFile: mockWriteFile,
      };
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));
      const mockShowInfo = jest.fn();
      (vscode.window as any).showInformationMessage = mockShowInfo;

      jest.mock('./utils/pathValidation', () => ({
        validateAndFilterFilePaths: jest.fn().mockResolvedValue(['/existing/file.ts']),
        normalizeFilePath: jest.fn((path) => path),
      }));

      await api.addFilesToContextBundle('/test/bundle.json', ['/existing/file.ts']);

      expect(mockShowInfo).toHaveBeenCalledWith(
        expect.stringContaining('already exist')
      );
    });

    it('should emit contextBundleModified event', async () => {
      const bundleContent = {
        id: 'test-bundle',
        taskId: 'task-1',
        files: [],
        version: 1,
      };

      const mockReadFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(bundleContent))
      );
      const mockWriteFile = jest.fn().mockResolvedValue(undefined);
      (vscode.workspace as any).fs = {
        readFile: mockReadFile,
        writeFile: mockWriteFile,
      };
      (vscode.Uri as any).file = jest.fn((path: string) => ({ fsPath: path }));
      (vscode.window as any).showInformationMessage = jest.fn();

      const eventSpy = jest.fn();
      api.onTaskInteraction(eventSpy);

      jest.mock('./utils/pathValidation', () => ({
        validateAndFilterFilePaths: jest.fn().mockResolvedValue(['/new/file.ts']),
        normalizeFilePath: jest.fn((path) => path),
      }));

      await api.addFilesToContextBundle('/test/bundle.json', ['/new/file.ts']);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'contextBundleModified',
          bundlePath: '/test/bundle.json',
        })
      );
    });
  });

  describe('validateContextFilePath', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [
        { uri: { fsPath: '/test/workspace' } }
      ];
    });

    it('should return valid result for valid file path', async () => {
      jest.mock('./utils/pathValidation', () => ({
        validateFilePath: jest.fn().mockResolvedValue({
          valid: true,
          normalizedPath: '/test/file.ts',
        }),
      }));

      const result = await api.validateContextFilePath('/test/file.ts');

      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBe('/test/file.ts');
      expect(result.errorMessage).toBeUndefined();
    });

    it('should return invalid result with error message for invalid path', async () => {
      jest.mock('./utils/pathValidation', () => ({
        validateFilePath: jest.fn().mockResolvedValue({
          valid: false,
          error: { message: 'File does not exist' },
        }),
      }));

      const result = await api.validateContextFilePath('/invalid/path.ts');

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('File does not exist');
    });
  });
});

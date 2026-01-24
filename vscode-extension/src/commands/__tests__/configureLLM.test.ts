/**
 * Tests for configureLLM command
 * Verifies the command opens the LLM Settings panel
 */

import * as vscode from 'vscode';
import { configureLlmCommand } from '../configureLLM';
import { SettingsPanel } from '../../webviews/settingsPanel';

jest.mock('vscode');
jest.mock('../../webviews/settingsPanel');

describe('configureLlmCommand', () => {
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();

        mockContext = {
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path',
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(() => []),
                setKeysForSync: jest.fn(),
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(() => []),
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
                onDidChange: jest.fn(),
            },
            extensionMode: vscode.ExtensionMode.Development,
            storageUri: vscode.Uri.file('/mock/storage'),
            globalStorageUri: vscode.Uri.file('/mock/global-storage'),
            logUri: vscode.Uri.file('/mock/log'),
            storagePath: '/mock/storage',
            globalStoragePath: '/mock/global-storage',
            logPath: '/mock/log',
            asAbsolutePath: jest.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
            environmentVariableCollection: {} as any,
            extension: {} as any,
        } as vscode.ExtensionContext;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(configureLlmCommand).toBeDefined();
    });

    it('should call SettingsPanel.createOrShow with extension URI', async () => {
        const createOrShowMock = jest.fn();
        (SettingsPanel.createOrShow as jest.Mock) = createOrShowMock;

        await configureLlmCommand(mockContext);

        expect(createOrShowMock).toHaveBeenCalledTimes(1);
        expect(createOrShowMock).toHaveBeenCalledWith(mockContext.extensionUri);
    });

    it('should handle SettingsPanel creation errors gracefully', async () => {
        const error = new Error('Failed to create panel');
        const createOrShowMock = jest.fn(() => {
            throw error;
        });
        (SettingsPanel.createOrShow as jest.Mock) = createOrShowMock;

        await expect(configureLlmCommand(mockContext)).rejects.toThrow('Failed to create panel');
    });

    it('should work with different extension URIs', async () => {
        const customUri = vscode.Uri.file('/custom/path');
        const customContext = {
            ...mockContext,
            extensionUri: customUri,
        } as vscode.ExtensionContext;

        const createOrShowMock = jest.fn();
        (SettingsPanel.createOrShow as jest.Mock) = createOrShowMock;

        await configureLlmCommand(customContext);

        expect(createOrShowMock).toHaveBeenCalledWith(customUri);
    });
});

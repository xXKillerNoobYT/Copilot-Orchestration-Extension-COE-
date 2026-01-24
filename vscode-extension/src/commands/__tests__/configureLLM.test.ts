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

    it('should be defined', () => {
        expect(configureLlmCommand).toBeDefined();
    });

    it('should call SettingsPanel.createOrShow with extension URI', async () => {
        const createOrShowSpy = jest.spyOn(SettingsPanel, 'createOrShow');

        await configureLlmCommand(mockContext);

        expect(createOrShowSpy).toHaveBeenCalledTimes(1);
        expect(createOrShowSpy).toHaveBeenCalledWith(mockContext.extensionUri);
    });

    it('should handle SettingsPanel creation errors gracefully', async () => {
        const error = new Error('Failed to create panel');
        jest.spyOn(SettingsPanel, 'createOrShow').mockImplementation(() => {
            throw error;
        });

        await expect(configureLlmCommand(mockContext)).rejects.toThrow('Failed to create panel');
    });

    it('should work with different extension URIs', async () => {
        const customUri = vscode.Uri.file('/custom/path');
        mockContext.extensionUri = customUri;

        const createOrShowSpy = jest.spyOn(SettingsPanel, 'createOrShow');

        await configureLlmCommand(mockContext);

        expect(createOrShowSpy).toHaveBeenCalledWith(customUri);
    });
});

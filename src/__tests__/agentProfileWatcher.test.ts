import { getAgentProfileWatcher, disposeAgentProfileWatcher } from '../agentProfileWatcher';
import * as vscode from 'vscode';

jest.mock('vscode');
jest.mock('fs');
jest.mock('../agentProfiles', () => ({
    defaultAgentProfileLoader: {
        loadAllProfiles: jest.fn().mockResolvedValue([]),
        loadProfile: jest.fn().mockResolvedValue(null),
    },
}));

describe('agentProfileWatcher', () => {
    let watcher: ReturnType<typeof getAgentProfileWatcher>;
    let mockUri: vscode.Uri;
    let mockWatcher: any;

    beforeEach(() => {
        mockWatcher = {
            onDidCreate: jest.fn(),
            onDidChange: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn(),
        };

        (vscode.workspace as any).createFileSystemWatcher = jest.fn().mockReturnValue(mockWatcher);
        (vscode.window as any).showInformationMessage = jest.fn();
        (vscode.window as any).showErrorMessage = jest.fn();
        (vscode.window as any).showWarningMessage = jest.fn();

        mockUri = { fsPath: '/test/path' } as vscode.Uri;
        disposeAgentProfileWatcher(); // Reset singleton
        watcher = getAgentProfileWatcher(mockUri);
    });

    afterEach(() => {
        disposeAgentProfileWatcher();
    });

    test('should create a watcher instance', () => {
        expect(watcher).toBeDefined();
        expect(typeof watcher.start).toBe('function');
        expect(typeof watcher.onChange).toBe('function');
        expect(typeof watcher.stop).toBe('function');
    });

    test('should start watching for changes', async () => {
        await expect(watcher.start()).resolves.not.toThrow();
        expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
    });

    test('should register change handlers', () => {
        const mockHandler = jest.fn();
        expect(() => watcher.onChange(mockHandler)).not.toThrow();
    });

    test('should dispose cleanly', () => {
        expect(() => watcher.stop()).not.toThrow();
        expect(() => disposeAgentProfileWatcher()).not.toThrow();
    });

    test('should handle errors gracefully', async () => {
        (vscode.workspace as any).createFileSystemWatcher = jest.fn().mockImplementation(() => {
            throw new Error('Mock error');
        });

        await expect(watcher.start()).rejects.toThrow('Mock error');
    });
});

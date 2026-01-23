import { getAgentProfileWatcher, disposeAgentProfileWatcher } from '../agentProfileWatcher';
import * as vscode from 'vscode';

jest.mock('vscode');
jest.mock('fs');

describe('agentProfileWatcher', () => {
    let watcher: ReturnType<typeof getAgentProfileWatcher>;
    let mockUri: vscode.Uri;

    beforeEach(() => {
        mockUri = { fsPath: '/test/path' } as vscode.Uri;
        watcher = getAgentProfileWatcher(mockUri);
    });

    test('should create a watcher instance', () => {
        expect(watcher).toBeDefined();
        expect(typeof watcher.start).toBe('function');
        expect(typeof watcher.onChange).toBe('function');
        expect(typeof watcher.dispose).toBe('function');
    });

    test('should start watching for changes', () => {
        expect(() => watcher.start()).not.toThrow();
    });

    test('should register change handlers', () => {
        const mockHandler = jest.fn();
        expect(() => watcher.onChange(mockHandler)).not.toThrow();
    });

    test('should dispose cleanly', () => {
        expect(() => watcher.dispose()).not.toThrow();
        expect(() => disposeAgentProfileWatcher()).not.toThrow();
    });
});

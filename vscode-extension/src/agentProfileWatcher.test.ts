/**
 * Agent Profile Watcher Tests
 * 
 * Tests for hot-reload functionality and change detection
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import { AgentProfileWatcher, ProfileChangeEvent, getAgentProfileWatcher, disposeAgentProfileWatcher } from './agentProfileWatcher';
import * as vscode from 'vscode';
import { defaultAgentProfileLoader, AgentProfile } from './agentProfiles';

// Mock vscode and agentProfiles
jest.mock('vscode');
jest.mock('./agentProfiles');

describe('AgentProfileWatcher', () => {
    let watcher: AgentProfileWatcher;
    let mockExtensionUri: vscode.Uri;
    let mockFileWatcher: any;
    let onDidCreateCallback: (uri: vscode.Uri) => void;
    let onDidChangeCallback: (uri: vscode.Uri) => void;
    let onDidDeleteCallback: (uri: vscode.Uri) => void;

    beforeEach(() => {
        jest.clearAllMocks();

        mockExtensionUri = {
            fsPath: '/mock/extension/path',
        } as vscode.Uri;

        // Mock FileSystemWatcher
        mockFileWatcher = {
            onDidCreate: jest.fn((callback) => { onDidCreateCallback = callback; return { dispose: jest.fn() }; }),
            onDidChange: jest.fn((callback) => { onDidChangeCallback = callback; return { dispose: jest.fn() }; }),
            onDidDelete: jest.fn((callback) => { onDidDeleteCallback = callback; return { dispose: jest.fn() }; }),
            dispose: jest.fn(),
        };

        (vscode.workspace.createFileSystemWatcher as jest.Mock) = jest.fn(() => mockFileWatcher);
        (vscode.RelativePattern as any) = jest.fn();
        (vscode.Disposable as any) = jest.fn((callback) => ({ dispose: callback }));
        (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
        (vscode.window.showErrorMessage as jest.Mock) = jest.fn();
        (vscode.window.showWarningMessage as jest.Mock) = jest.fn();

        // Mock agent profile loader
        const mockProfile: AgentProfile = {
            name: 'Planner',
            role: 'planner',
            description: 'Test planner',
            capabilities: [],
            systemPrompt: 'Test prompt',
            examples: [],
            version: 1
        };

        (defaultAgentProfileLoader.loadAllProfiles as jest.Mock) = jest.fn().mockResolvedValue([mockProfile]);
        (defaultAgentProfileLoader.loadProfile as jest.Mock) = jest.fn().mockResolvedValue(mockProfile);

        watcher = new AgentProfileWatcher(mockExtensionUri);
    });

    afterEach(() => {
        watcher.stop();
    });

    describe('Profile Loading', () => {
        it('should load all profiles on start', async () => {
            await watcher.start();

            const profiles = watcher.getAllProfiles();
            expect(profiles).toBeDefined();
            expect(Array.isArray(profiles)).toBe(true);
            expect(profiles.length).toBe(1);
            expect(defaultAgentProfileLoader.loadAllProfiles).toHaveBeenCalled();
        });

        it('should get profile by name', async () => {
            await watcher.start();

            const profile = watcher.getProfile('planner');
            expect(profile).toBeDefined();
            expect(profile?.name).toBe('Planner');
            expect(profile?.role).toBe('planner');
        });

        it('should handle case-insensitive profile lookup', async () => {
            await watcher.start();

            const profile1 = watcher.getProfile('PLANNER');
            const profile2 = watcher.getProfile('planner');
            const profile3 = watcher.getProfile('Planner');

            expect(profile1).toEqual(profile2);
            expect(profile2).toEqual(profile3);
        });

        it('should handle empty profile list', async () => {
            (defaultAgentProfileLoader.loadAllProfiles as jest.Mock).mockResolvedValue([]);

            await watcher.start();

            const profiles = watcher.getAllProfiles();
            expect(profiles).toEqual([]);
        });

        it('should handle load error gracefully', async () => {
            (defaultAgentProfileLoader.loadAllProfiles as jest.Mock).mockRejectedValue(new Error('Load failed'));

            await watcher.start();

            expect(vscode.window.showErrorMessage).toHaveBeenCalled();
            const profiles = watcher.getAllProfiles();
            expect(profiles).toEqual([]);
        });
    });

    describe('File Watcher Setup', () => {
        it('should create file watcher on start', async () => {
            await watcher.start();

            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
            expect(mockFileWatcher.onDidCreate).toHaveBeenCalled();
            expect(mockFileWatcher.onDidChange).toHaveBeenCalled();
            expect(mockFileWatcher.onDidDelete).toHaveBeenCalled();
        });

        it('should dispose file watcher on stop', async () => {
            await watcher.start();
            watcher.stop();

            expect(mockFileWatcher.dispose).toHaveBeenCalled();
        });

        it('should handle multiple stop calls', async () => {
            await watcher.start();
            watcher.stop();
            watcher.stop();

            expect(mockFileWatcher.dispose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Change Detection', () => {
        it('should notify on profile creation', async () => {
            await watcher.start();

            const callback = jest.fn();
            watcher.onChange(callback);

            const mockUri = { fsPath: '/mock/path/new-profile.yaml' } as vscode.Uri;
            await onDidCreateCallback(mockUri);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    changeType: 'created',
                    profileName: 'Planner',
                })
            );
        });

        it('should notify on profile modification', async () => {
            await watcher.start();

            const callback = jest.fn();
            watcher.onChange(callback);

            const mockUri = { fsPath: '/mock/path/planner.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    changeType: 'modified',
                    profileName: 'Planner',
                })
            );
        });

        it('should notify on profile deletion', async () => {
            await watcher.start();

            const callback = jest.fn();
            watcher.onChange(callback);

            const mockUri = { fsPath: '/mock/path/planner.yaml' } as vscode.Uri;
            await onDidDeleteCallback(mockUri);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    changeType: 'deleted',
                    profileName: 'Planner',
                })
            );
        });

        it('should support multiple callbacks', async () => {
            await watcher.start();

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            watcher.onChange(callback1);
            watcher.onChange(callback2);

            const mockUri = { fsPath: '/mock/path/planner.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should include timestamp in change events', async () => {
            await watcher.start();

            const callback = jest.fn();
            watcher.onChange(callback);

            const mockUri = { fsPath: '/mock/path/planner.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(Date),
                })
            );
        });

        it('should handle callback errors gracefully', async () => {
            await watcher.start();

            const errorCallback = jest.fn(() => { throw new Error('Callback error'); });
            const goodCallback = jest.fn();

            watcher.onChange(errorCallback);
            watcher.onChange(goodCallback);

            const mockUri = { fsPath: '/mock/path/planner.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(errorCallback).toHaveBeenCalled();
            expect(goodCallback).toHaveBeenCalled();
        });
    });

    describe('Profile Cache', () => {
        it('should cache loaded profiles', async () => {
            await watcher.start();

            const profiles1 = watcher.getAllProfiles();
            const profiles2 = watcher.getAllProfiles();

            expect(profiles1).toStrictEqual(profiles2);
            expect(profiles1.length).toBeGreaterThan(0);
        });

        it('should update cache on reload', async () => {
            await watcher.start();

            const newProfile: AgentProfile = {
                name: 'Builder',
                role: 'builder',
                description: 'Test builder',
                capabilities: [],
                systemPrompt: 'Build prompt',
                examples: [],
                version: 1
            };

            (defaultAgentProfileLoader.loadAllProfiles as jest.Mock).mockResolvedValue([newProfile]);

            await watcher.reloadAll();
            const profiles = watcher.getAllProfiles();

            expect(profiles.length).toBe(1);
            expect(profiles[0].name).toBe('Builder');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Reloaded 1 agent profiles')
            );
        });

        it('should clear cache before reload', async () => {
            await watcher.start();
            expect(watcher.getAllProfiles().length).toBe(1);

            (defaultAgentProfileLoader.loadAllProfiles as jest.Mock).mockResolvedValue([]);

            await watcher.reloadAll();
            expect(watcher.getAllProfiles().length).toBe(0);
        });
    });

    describe('Disposable Pattern', () => {
        it('should return disposable from onChange', () => {
            const disposable = watcher.onChange(() => { });

            expect(disposable).toBeDefined();
            expect(typeof disposable.dispose).toBe('function');
        });

        it('should unregister callback on dispose', async () => {
            await watcher.start();

            const callback = jest.fn();
            const disposable = watcher.onChange(callback);

            disposable.dispose();

            const mockUri = { fsPath: '/mock/path/planner.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing profile gracefully', async () => {
            await watcher.start();

            const profile = watcher.getProfile('nonexistent-profile');
            expect(profile).toBeUndefined();
        });

        it('should handle load profile error on file change', async () => {
            await watcher.start();

            (defaultAgentProfileLoader.loadProfile as jest.Mock).mockRejectedValue(new Error('Load failed'));

            const mockUri = { fsPath: '/mock/path/broken.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        });

        it('should handle null profile from loader', async () => {
            await watcher.start();

            (defaultAgentProfileLoader.loadProfile as jest.Mock).mockResolvedValue(null);

            const mockUri = { fsPath: '/mock/path/invalid.yaml' } as vscode.Uri;
            await onDidChangeCallback(mockUri);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load profile')
            );
        });
    });
});

describe('AgentProfileWatcher Singleton', () => {
    beforeEach(() => {
        disposeAgentProfileWatcher();
    });

    it('should return same instance', () => {
        const mockUri = { fsPath: '/mock' } as vscode.Uri;

        const watcher1 = getAgentProfileWatcher(mockUri);
        const watcher2 = getAgentProfileWatcher(mockUri);

        expect(watcher1).toBe(watcher2);
    });

    it('should dispose singleton instance', () => {
        const mockUri = { fsPath: '/mock' } as vscode.Uri;

        const watcher1 = getAgentProfileWatcher(mockUri);
        disposeAgentProfileWatcher();
        const watcher2 = getAgentProfileWatcher(mockUri);

        expect(watcher1).not.toBe(watcher2);
    });
});

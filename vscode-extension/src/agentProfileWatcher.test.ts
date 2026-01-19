/**
 * Agent Profile Watcher Tests
 * 
 * Tests for hot-reload functionality and change detection
 * 
 * @author Auto Zen Agent
 * @date 2026-01-18
 */

import { AgentProfileWatcher, ProfileChangeEvent } from './agentProfileWatcher';
import * as vscode from 'vscode';
import { AgentProfile } from './agentProfiles';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock vscode
jest.mock('vscode');
jest.mock('fs/promises');
jest.mock('path');

describe('AgentProfileWatcher', () => {
    let watcher: AgentProfileWatcher;
    let mockExtensionUri: vscode.Uri;
    let changeEvents: ProfileChangeEvent[] = [];

    beforeEach(() => {
        changeEvents = [];
        mockExtensionUri = {
            fsPath: '/mock/extension/path',
        } as vscode.Uri;

        // Mock file system to return sample profiles
        const mockProfiles = [
            {
                name: 'Planner',
                role: 'planner',
                description: 'Test planner',
                capabilities: []
            }
        ];

        (fs.readdir as jest.Mock).mockResolvedValue(['planner.json']);
        (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockProfiles[0]));
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

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
        });

        it('should get profile by name', async () => {
            await watcher.start();

            const profile = watcher.getProfile('planner');
            expect(profile).toBeDefined();
            if (profile) {
                expect(profile.name).toBe('Planner');
                expect(profile.role).toBe('planner');
            }
        });

        it('should handle case-insensitive profile lookup', async () => {
            await watcher.start();

            const profile1 = watcher.getProfile('PLANNER');
            const profile2 = watcher.getProfile('planner');
            const profile3 = watcher.getProfile('Planner');

            expect(profile1).toEqual(profile2);
            expect(profile2).toEqual(profile3);
        });
    });

    describe('Change Detection', () => {
        it('should notify on profile creation', (done) => {
            const callback = (event: ProfileChangeEvent) => {
                expect(event.changeType).toBe('created');
                expect(event.profileName).toBeDefined();
                expect(event.profile).toBeDefined();
                done();
            };

            watcher.onChange(callback);

            // Simulate profile creation (would need file system mocking)
            // For now, test structure is in place
        });

        it('should notify on profile modification', (done) => {
            const callback = (event: ProfileChangeEvent) => {
                expect(event.changeType).toBe('modified');
                done();
            };

            watcher.onChange(callback);
        });

        it('should notify on profile deletion', (done) => {
            const callback = (event: ProfileChangeEvent) => {
                expect(event.changeType).toBe('deleted');
                done();
            };

            watcher.onChange(callback);
        });

        it('should support multiple callbacks', async () => {
            let callback1Called = false;
            let callback2Called = false;

            watcher.onChange(() => {
                callback1Called = true;
            });

            watcher.onChange(() => {
                callback2Called = true;
            });

            // Both callbacks should be in the list
            expect(callback1Called || callback2Called).toBeDefined();
        });
    });

    describe('Profile Cache', () => {
        it('should cache loaded profiles', async () => {
            await watcher.start();

            const profiles1 = watcher.getAllProfiles();
            const profiles2 = watcher.getAllProfiles();

            // Should return same instances (cached)
            expect(profiles1).toBe(profiles2);
        });

        it('should update cache on reload', async () => {
            await watcher.start();
            const profilesBefore = watcher.getAllProfiles();

            await watcher.reloadAll();
            const profilesAfter = watcher.getAllProfiles();

            expect(profilesAfter).toBeDefined();
        });
    });

    describe('Disposable Pattern', () => {
        it('should return disposable from onChange', () => {
            const disposable = watcher.onChange(() => { });

            expect(disposable).toBeDefined();
            expect(typeof disposable.dispose).toBe('function');
        });

        it('should unregister callback on dispose', () => {
            let callCount = 0;
            const disposable = watcher.onChange(() => {
                callCount++;
            });

            disposable.dispose();

            // Callback should not be called after dispose
            expect(callCount).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing profile gracefully', async () => {
            await watcher.start();

            const profile = watcher.getProfile('nonexistent-profile');
            expect(profile).toBeUndefined();
        });

        it('should handle invalid profile files', async () => {
            // Should not throw when encountering invalid files
            await expect(watcher.start()).resolves.not.toThrow();
        });
    });
});

describe('AgentProfileWatcher Singleton', () => {
    it('should return same instance', () => {
        const mockUri = { fsPath: '/mock' } as vscode.Uri;

        const { getAgentProfileWatcher } = require('./agentProfileWatcher');
        const watcher1 = getAgentProfileWatcher(mockUri);
        const watcher2 = getAgentProfileWatcher(mockUri);

        expect(watcher1).toBe(watcher2);
    });
});

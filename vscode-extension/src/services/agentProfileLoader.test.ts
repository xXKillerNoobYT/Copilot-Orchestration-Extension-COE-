/**
 * Tests for Agent Profile Loader Service
 * Reference: PRD.json Feature F020 "Agent Profile YAML System"
 */

import { AgentProfileLoader, AgentProfile, ValidationError, DEFAULT_CONFIG_VALUES } from './agentProfileLoader';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Mock modules
jest.mock('vscode');
jest.mock('fs');
jest.mock('path');
jest.mock('yaml');

describe('AgentProfileLoader', () => {
  let loader: AgentProfileLoader;
  let mockWorkspaceFolders: vscode.WorkspaceFolder[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (AgentProfileLoader as any).instance = undefined;

    // Mock workspace folders
    mockWorkspaceFolders = [
      {
        uri: {
          fsPath: '/mock/workspace',
          scheme: 'file',
          authority: '',
          path: '/mock/workspace',
          query: '',
          fragment: '',
          with: jest.fn(),
          toJSON: jest.fn()
        },
        index: 0,
        name: 'test-workspace'
      }
    ];

    (vscode.workspace as any).workspaceFolders = mockWorkspaceFolders;
    
    // Mock fs.existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.extname as jest.Mock).mockImplementation((p: string) => {
      const parts = p.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });

    loader = AgentProfileLoader.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AgentProfileLoader.getInstance();
      const instance2 = AgentProfileLoader.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize workspace path on construction', () => {
      expect((loader as any).workspaceProfilesPath).toContain('.vscode/agent-profiles');
    });
  });

  describe('Profile Validation', () => {
    it('should validate a correct profile', () => {
      const validProfile: AgentProfile = {
        name: 'test-agent',
        type: 'planning',
        version: '1.0.0',
        description: 'Test agent profile',
        config: {
          timeout: 300,
          retryAttempts: 3,
          priority: 'medium'
        }
      };

      const result = loader.validateProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when name is missing', () => {
      const invalidProfile = {
        type: 'planning',
        version: '1.0.0'
      } as any;

      const result = loader.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should fail validation with invalid type', () => {
      const invalidProfile: AgentProfile = {
        name: 'test',
        type: 'invalid-type' as any,
        version: '1.0.0'
      };

      const result = loader.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should fail validation with invalid version format', () => {
      const invalidProfile: AgentProfile = {
        name: 'test',
        type: 'planning',
        version: 'not-semver'
      };

      const result = loader.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should validate config values when provided', () => {
      const profile: AgentProfile = {
        name: 'test',
        type: 'planning',
        version: '1.0.0',
        config: {
          timeout: -1, // Invalid
          retryAttempts: 3
        }
      };

      const result = loader.validateProfile(profile);
      expect(result.valid).toBe(false);
    });
  });

  describe('Profile Loading from YAML', () => {
    it('should load profile from valid YAML string', async () => {
      const yamlContent = `
name: planning-agent
type: planning
version: 1.0.0
description: Planning agent
config:
  timeout: 300
  retryAttempts: 3
`;
      
      (yaml.parse as jest.Mock).mockReturnValue({
        name: 'planning-agent',
        type: 'planning',
        version: '1.0.0',
        description: 'Planning agent',
        config: {
          timeout: 300,
          retryAttempts: 3
        }
      });

      const result = await loader.loadFromYaml(yamlContent);
      
      expect(result.profile).toBeDefined();
      expect(result.profile?.name).toBe('planning-agent');
      expect(result.profile?.type).toBe('planning');
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid YAML', async () => {
      (yaml.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const result = await loader.loadFromYaml('invalid: yaml: content:');
      expect(result.profile).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('yaml');
    });

    it('should load profile from file', async () => {
      const yamlContent = 'name: test\ntype: planning\nversion: 1.0.0';
      
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(yamlContent);
      (yaml.parse as jest.Mock).mockReturnValue({
        name: 'test',
        type: 'planning',
        version: '1.0.0'
      });

      const result = await loader.loadFromFile('/path/to/profile.yaml');
      
      expect(result.profile).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should handle file read errors', async () => {
      jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File not found'));

      const result = await loader.loadFromFile('/nonexistent.yaml');
      expect(result.profile).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('file');
    });
  });

  describe('Version Validation', () => {
    it('should accept valid semantic versions', () => {
      const versions = ['1.0.0', '2.1.3', '10.20.30'];
      
      versions.forEach(version => {
        const profile: AgentProfile = {
          name: 'test',
          type: 'planning',
          version
        };
        
        const result = loader.validateProfile(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid semantic versions', () => {
      const versions = ['1', '1.0', 'invalid', ''];
      
      versions.forEach(version => {
        const profile: AgentProfile = {
          name: 'test',
          type: 'planning',
          version
        };
        
        const result = loader.validateProfile(profile);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Version Validation', () => {
    it('should accept valid semantic versions', () => {
      const versions = ['1.0.0', '2.1.3', '10.20.30', '1.0.0-alpha', '1.0.0-beta.1'];
      
      versions.forEach(version => {
        const profile: AgentProfile = {
          name: 'test',
          type: 'planning',
          version
        };
        
        const result = loader.validateProfile(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid semantic versions', () => {
      const versions = ['1', '1.0', 'v1.0.0', 'invalid', ''];
      
      versions.forEach(version => {
        const profile: AgentProfile = {
          name: 'test',
          type: 'planning',
          version
        };
        
        const result = loader.validateProfile(profile);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Permissions Validation', () => {
    it('should validate permissions structure', () => {
      const profile: AgentProfile = {
        name: 'test',
        type: 'planning',
        version: '1.0.0',
        permissions: {
          read: true,
          write: false,
          execute: true,
          apiAccess: ['github', 'openai'],
          filePatterns: ['**/*.ts', '**/*.js']
        }
      };

      const result = loader.validateProfile(profile);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid permission values', () => {
      const profile: AgentProfile = {
        name: 'test',
        type: 'planning',
        version: '1.0.0',
        permissions: {
          read: 'yes' as any, // Invalid - should be boolean
        }
      };

      const result = loader.validateProfile(profile);
      expect(result.valid).toBe(false);
    });
  });
});

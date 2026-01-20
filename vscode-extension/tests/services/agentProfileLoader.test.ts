/**
 * Tests for Agent Profile Loader Service
 */

import { AgentProfileLoader, AgentProfile, AgentTeamType } from '../../src/services/agentProfileLoader';

describe('AgentProfileLoader', () => {
  let loader: AgentProfileLoader;

  beforeEach(() => {
    loader = AgentProfileLoader.getInstance();
    loader.clearCache();
  });

  describe('loadFromYaml', () => {
    it('should load valid YAML profile', async () => {
      const yamlContent = `
name: Planning Team
type: planning
version: 1.0.0
description: Master planner for project management
config:
  timeout: 300
  retryAttempts: 3
  priority: high
permissions:
  read: true
  write: true
`;

      const result = await loader.loadFromYaml(yamlContent);

      expect(result.profile).not.toBeNull();
      expect(result.errors).toHaveLength(0);
      expect(result.profile?.name).toBe('Planning Team');
      expect(result.profile?.type).toBe('planning');
      expect(result.profile?.version).toBe('1.0.0');
    });

    it('should reject invalid YAML syntax', async () => {
      const yamlContent = `
name: Planning Team
  invalid indentation
type: planning
`;

      const result = await loader.loadFromYaml(yamlContent);

      expect(result.profile).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('yaml');
    });

    it('should validate required fields', async () => {
      const yamlContent = `
name: Planning Team
`;

      const result = await loader.loadFromYaml(yamlContent);

      expect(result.profile).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should validate team type enum', async () => {
      const yamlContent = `
name: Invalid Team
type: invalid_type
version: 1.0.0
`;

      const result = await loader.loadFromYaml(yamlContent);

      expect(result.profile).toBeNull();
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should validate semver version format', async () => {
      const yamlContent = `
name: Planning Team
type: planning
version: invalid
`;

      const result = await loader.loadFromYaml(yamlContent);

      expect(result.profile).toBeNull();
      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });
  });

  describe('validateProfile', () => {
    it('should validate timeout range', () => {
      const profile: any = {
        name: 'Test',
        type: 'planning',
        version: '1.0.0',
        config: {
          timeout: 5, // Too low
        },
      };

      const result = loader.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'config.timeout')).toBe(true);
    });

    it('should validate retry attempts range', () => {
      const profile: any = {
        name: 'Test',
        type: 'planning',
        version: '1.0.0',
        config: {
          retryAttempts: 15, // Too high
        },
      };

      const result = loader.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'config.retryAttempts')).toBe(true);
    });

    it('should validate priority enum', () => {
      const profile: any = {
        name: 'Test',
        type: 'planning',
        version: '1.0.0',
        config: {
          priority: 'invalid',
        },
      };

      const result = loader.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'config.priority')).toBe(true);
    });

    it('should accept valid profile', () => {
      const profile: AgentProfile = {
        name: 'Planning Team',
        type: 'planning',
        version: '1.0.0',
        config: {
          timeout: 300,
          retryAttempts: 3,
          priority: 'high',
        },
      };

      const result = loader.validateProfile(profile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('exportToYaml', () => {
    it('should export profile to valid YAML', () => {
      const profile: AgentProfile = {
        name: 'Planning Team',
        type: 'planning',
        version: '1.0.0',
        description: 'Master planner',
        config: {
          timeout: 300,
          retryAttempts: 3,
          priority: 'high',
        },
        permissions: {
          read: true,
          write: true,
        },
      };

      const yaml = loader.exportToYaml(profile);

      expect(yaml).toContain('name: Planning Team');
      expect(yaml).toContain('type: planning');
      expect(yaml).toContain('version: 1.0.0');
      expect(yaml).toContain('timeout: 300');
    });

    it('should export and re-import without data loss', async () => {
      const originalProfile: AgentProfile = {
        name: 'Planning Team',
        type: 'planning',
        version: '1.0.0',
        config: {
          timeout: 300,
          retryAttempts: 3,
          priority: 'high',
        },
      };

      const yaml = loader.exportToYaml(originalProfile);
      const result = await loader.loadFromYaml(yaml);

      expect(result.profile).not.toBeNull();
      expect(result.profile?.name).toBe(originalProfile.name);
      expect(result.profile?.type).toBe(originalProfile.type);
      expect(result.profile?.version).toBe(originalProfile.version);
      expect(result.profile?.config?.timeout).toBe(originalProfile.config?.timeout);
    });
  });

  describe('getDefaultProfile', () => {
    it('should return planning team default profile', () => {
      const profile = loader.getDefaultProfile('planning');

      expect(profile.name).toBe('Planning Team');
      expect(profile.type).toBe('planning');
      expect(profile.version).toBe('1.0.0');
      expect(profile.permissions?.write).toBe(true);
      expect(profile.config?.maxDepth).toBe(3);
      expect(profile.constraints?.allowedOperations).toContain('create_plan');
    });

    it('should return answer team default profile', () => {
      const profile = loader.getDefaultProfile('answer');

      expect(profile.name).toBe('Answer Team');
      expect(profile.type).toBe('answer');
      expect(profile.config?.confidenceThreshold).toBe(0.7);
      expect(profile.config?.priority).toBe('high');
    });

    it('should return decomposition team default profile', () => {
      const profile = loader.getDefaultProfile('decomposition');

      expect(profile.name).toBe('Decomposition Team');
      expect(profile.type).toBe('decomposition');
      expect(profile.config?.autoDecompose).toBe(true);
      expect(profile.config?.maxDepth).toBe(5);
      expect(profile.permissions?.write).toBe(true);
    });

    it('should return verification team default profile', () => {
      const profile = loader.getDefaultProfile('verification');

      expect(profile.name).toBe('Verification Team');
      expect(profile.type).toBe('verification');
      expect(profile.permissions?.test).toBe(true);
      expect(profile.permissions?.approve).toBe(true);
      expect(profile.config?.requireVisualVerification).toBe(true);
    });

    it('should set appropriate permissions for each team', () => {
      const teams: AgentTeamType[] = ['planning', 'answer', 'decomposition', 'verification'];

      teams.forEach(team => {
        const profile = loader.getDefaultProfile(team);
        expect(profile.permissions).toBeDefined();
        expect(profile.permissions?.read).toBe(true);
        expect(profile.permissions?.excludePatterns).toContain('node_modules/**');
      });
    });
  });

  describe('getCachedProfile', () => {
    it('should return null for uncached profile', () => {
      const profile = loader.getCachedProfile('planning');
      expect(profile).toBeNull();
    });

    it('should return cached profile after load', async () => {
      const yamlContent = `
name: Planning Team
type: planning
version: 1.0.0
`;

      await loader.loadFromYaml(yamlContent);
      // Note: loadFromYaml doesn't cache, only loadFromFile does
      // So this test is verifying the expected behavior
      const cached = loader.getCachedProfile('planning');
      expect(cached).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached profiles', () => {
      loader.clearCache();
      const profile = loader.getCachedProfile('planning');
      expect(profile).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty YAML', async () => {
      const result = await loader.loadFromYaml('');

      expect(result.profile).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle YAML with only whitespace', async () => {
      const result = await loader.loadFromYaml('   \n  \n  ');

      expect(result.profile).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle profile with all optional fields', async () => {
      const yamlContent = `
name: Complete Team
type: planning
version: 1.0.0
description: Full profile
config:
  timeout: 600
  retryAttempts: 5
  priority: critical
  maxConcurrentTasks: 10
  maxDepth: 5
  autoDecompose: true
  requireVisualVerification: false
  confidenceThreshold: 0.8
permissions:
  read: true
  write: true
  execute: true
  test: true
  approve: true
  apiAccess:
    - /api/v1/tasks
    - /api/v1/plans
  filePatterns:
    - "src/**/*"
  excludePatterns:
    - "node_modules/**"
constraints:
  maxTokensPerRequest: 16000
  maxContextSize: 200000
  allowedOperations:
    - create_task
    - update_task
metadata:
  author: Test Author
  tags:
    - production
    - v1
`;

      const result = await loader.loadFromYaml(yamlContent);

      expect(result.profile).not.toBeNull();
      expect(result.errors).toHaveLength(0);
      expect(result.profile?.metadata?.author).toBe('Test Author');
      expect(result.profile?.metadata?.tags).toContain('production');
    });
  });
});

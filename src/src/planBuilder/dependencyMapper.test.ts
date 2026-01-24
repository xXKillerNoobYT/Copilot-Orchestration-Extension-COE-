/**
 * Dependency Mapper Tests
 * 
 * Test suite for dependency parsing, mapping, and validation
 */

import {
  parseDependenciesFromText,
  mapTemplateDependencies,
  autoPopulateDependencies,
  validateDependencyGraph,
  type Feature,
  type Milestone,
} from './dependencyMapper';

describe('DependencyMapper', () => {
  describe('parseDependenciesFromText', () => {
    it('should parse "depends on" pattern', () => {
      const text = 'This feature depends on Authentication';
      const available = ['Authentication', 'Dashboard', 'Settings'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result).toContain('Authentication');
      expect(result).toHaveLength(1);
    });

    it('should parse "requires" pattern', () => {
      const text = 'This feature requires User Management and Database';
      const available = ['User Management', 'Database', 'API'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result).toContain('User Management');
      expect(result).toContain('Database');
    });

    it('should parse "after" pattern', () => {
      const text = 'Build this after Core API is complete';
      const available = ['Core API', 'Frontend', 'Testing'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result).toContain('Core API');
    });

    it('should handle multiple patterns in same text', () => {
      const text = 'Depends on Auth and requires Database. Build after API is complete.';
      const available = ['Auth', 'Database', 'API', 'Frontend'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Auth');
    });

    it('should return empty array when no patterns match', () => {
      const text = 'This is a standalone feature';
      const available = ['Feature1', 'Feature2'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result).toEqual([]);
    });

    it('should handle empty inputs', () => {
      expect(parseDependenciesFromText('', [])).toEqual([]);
      expect(parseDependenciesFromText('text', [])).toEqual([]);
      expect(parseDependenciesFromText('', ['item'])).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const text = 'depends on AUTHENTICATION';
      const available = ['authentication', 'Dashboard'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result).toContain('authentication');
    });

    it('should handle partial name matches', () => {
      const text = 'requires User Authentication module';
      const available = ['User Authentication', 'Database'];
      
      const result = parseDependenciesFromText(text, available);
      
      expect(result).toContain('User Authentication');
    });
  });

  describe('mapTemplateDependencies', () => {
    it('should preserve explicit dependencies from template', () => {
      const template = [
        { name: 'Feature A', depends_on: ['Feature B'], description: 'Test' },
        { name: 'Feature B', description: 'Test' },
      ];
      const features: Feature[] = [
        { name: 'Feature A' },
        { name: 'Feature B' },
      ];
      
      const result = mapTemplateDependencies(template, features);
      
      expect(result[0].dependsOn).toEqual(['Feature B']);
      expect(result[1].dependsOn).toBeNull();
    });

    it('should handle different dependency field names', () => {
      const template = [
        { name: 'A', dependsOn: ['B'] },
        { name: 'B', dependencies: ['C'] },
        { name: 'C' },
      ];
      const features: Feature[] = [
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
      ];
      
      const result = mapTemplateDependencies(template, features);
      
      expect(result[0].dependsOn).toEqual(['B']);
      expect(result[1].dependsOn).toEqual(['C']);
      expect(result[2].dependsOn).toBeNull();
    });

    it('should parse dependencies from description when no explicit dependencies', () => {
      const template = [
        { name: 'Feature A', description: 'Depends on Feature B' },
        { name: 'Feature B', description: 'Standalone' },
      ];
      const features: Feature[] = [
        { name: 'Feature A' },
        { name: 'Feature B' },
      ];
      
      const result = mapTemplateDependencies(template, features);
      
      expect(result[0].dependsOn).toContain('Feature B');
    });

    it('should handle empty template data', () => {
      expect(mapTemplateDependencies([], [])).toEqual([]);
      expect(mapTemplateDependencies(null as any, [])).toEqual([]);
      expect(mapTemplateDependencies(undefined as any, [])).toEqual([]);
    });
  });

  describe('autoPopulateDependencies', () => {
    it('should detect dependencies from descriptions', () => {
      const features: Feature[] = [
        { name: 'Login', description: 'User login feature' },
        { name: 'Profile', description: 'User profile, requires Login' },
      ];
      
      const result = autoPopulateDependencies(features);
      
      expect(result[1].dependsOn).toContain('Login');
    });

    it('should not overwrite existing dependencies', () => {
      const features: Feature[] = [
        { name: 'A', description: 'Depends on C' },
        { name: 'B', description: 'Depends on A', dependsOn: ['C'] },
      ];
      
      const result = autoPopulateDependencies(features);
      
      // Feature B should keep its existing dependency
      expect(result[1].dependsOn).toEqual(['C']);
    });

    it('should filter out self-dependencies', () => {
      const features: Feature[] = [
        { name: 'Feature A', description: 'Feature A depends on something' },
      ];
      
      const result = autoPopulateDependencies(features);
      
      expect(result[0].dependsOn).toBeNull();
    });

    it('should handle features with no dependencies', () => {
      const features: Feature[] = [
        { name: 'A', description: 'Standalone feature' },
        { name: 'B', description: 'Another standalone' },
      ];
      
      const result = autoPopulateDependencies(features);
      
      expect(result[0].dependsOn).toBeNull();
      expect(result[1].dependsOn).toBeNull();
    });

    it('should handle empty input', () => {
      expect(autoPopulateDependencies([])).toEqual([]);
    });
  });

  describe('validateDependencyGraph', () => {
    it('should validate a valid dependency graph', () => {
      const items: Feature[] = [
        { name: 'A', dependsOn: null },
        { name: 'B', dependsOn: ['A'] },
        { name: 'C', dependsOn: ['A', 'B'] },
      ];
      
      const result = validateDependencyGraph(items);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.cycles).toEqual([]);
    });

    it('should detect circular dependencies', () => {
      const items: Feature[] = [
        { name: 'A', dependsOn: ['B'] },
        { name: 'B', dependsOn: ['A'] },
      ];
      
      const result = validateDependencyGraph(items);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should detect self-circular dependencies', () => {
      const items: Feature[] = [
        { name: 'A', dependsOn: ['B'] },
        { name: 'B', dependsOn: ['C'] },
        { name: 'C', dependsOn: ['A'] },
      ];
      
      const result = validateDependencyGraph(items);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should detect non-existent dependencies', () => {
      const items: Feature[] = [
        { name: 'A', dependsOn: ['NonExistent'] },
        { name: 'B', dependsOn: null },
      ];
      
      const result = validateDependencyGraph(items);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('"A" depends on "NonExistent" which does not exist');
    });

    it('should handle empty items', () => {
      const result = validateDependencyGraph([]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle items with no dependencies', () => {
      const items: Feature[] = [
        { name: 'A', dependsOn: null },
        { name: 'B', dependsOn: [] },
      ];
      
      const result = validateDependencyGraph(items);
      
      expect(result.valid).toBe(true);
    });

    it('should detect multiple errors', () => {
      const items: Feature[] = [
        { name: 'A', dependsOn: ['NonExistent1'] },
        { name: 'B', dependsOn: ['NonExistent2'] },
      ];
      
      const result = validateDependencyGraph(items);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});

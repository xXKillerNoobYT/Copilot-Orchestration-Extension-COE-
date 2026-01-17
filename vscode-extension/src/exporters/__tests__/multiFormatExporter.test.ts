/**
 * Multi-Format Exporter Tests
 * 
 * Tests for PDF, Figma, and OpenAPI export formats
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiFormatExporter } from '../multiFormatExporter';
import type { PlanJSON } from '../../planBuilder/planGenerator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MultiFormatExporter', () => {
  let testPlan: PlanJSON;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test outputs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-test-'));

    // Create comprehensive test plan
    testPlan = {
      metadata: {
        version: '1.0.0',
        created_at: new Date('2026-01-15').toISOString(),
        updated_at: new Date('2026-01-17').toISOString(),
        author: 'Test Suite',
        status: 'in-progress',
        name: 'Test Project',
      },
      project: {
        name: 'Multi-Format Export Test',
        description: 'A comprehensive test project for export functionality',
        type: 'web',
        status: 'in-progress',
      },
      architecture: {
        pattern: 'MVC',
        description: 'Model-View-Controller architecture',
        components: ['Frontend', 'Backend', 'Database'],
        rationale: 'Well-established pattern for web applications',
      },
      features: [
        {
          id: 'FEAT-001',
          name: 'User Authentication',
          description: 'Implement secure user authentication system',
          priority: 'critical',
          status: 'in-progress',
          acceptance_criteria: ['Login works', 'Logout works', 'Password reset works'],
          dependencies: [],
          effort_estimate: 16,
        },
        {
          id: 'FEAT-002',
          name: 'Dashboard',
          description: 'Create user dashboard',
          priority: 'high',
          status: 'pending',
          acceptance_criteria: ['Shows user data', 'Responsive design'],
          dependencies: ['FEAT-001'],
          effort_estimate: 12,
        },
      ],
      timeline: {
        start_date: '2026-01-15',
        end_date: '2026-03-15',
        milestones: [
          {
            id: 'MS-001',
            name: 'MVP Launch',
            target_date: '2026-02-15',
            phase: 'development',
            completion_status: 'pending',
            dependencies: [],
          },
        ],
        phases: [
          {
            name: 'Planning',
            start_date: '2026-01-15',
            end_date: '2026-01-22',
          },
          {
            name: 'Development',
            start_date: '2026-01-23',
            end_date: '2026-02-28',
          },
        ],
      },
      team: {
        members: [
          {
            id: 'TEAM-001',
            role_name: 'Frontend Developer',
            responsibilities: ['UI development', 'Testing'],
            skills: ['React', 'TypeScript', 'CSS'],
            agent_mapping: 'frontend-agent',
            availability: 'full-time',
          },
        ],
        structure: 'Agile team',
        communication_plan: 'Daily standups, weekly reviews',
      },
      success_criteria: [
        'All features implemented',
        'Tests passing',
        'Performance metrics met',
      ],
      risks: [
        {
          id: 'RISK-001',
          description: 'Timeline may slip',
          probability: 'medium',
          impact: 'high',
          mitigation: 'Regular progress reviews',
        },
      ],
      assumptions: ['Team has necessary skills', 'Requirements are stable'],
      constraints: ['Budget limited to $50k', 'Must launch by Q1'],
    };
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('PDF Export', () => {
    it('should export plan to PDF file', async () => {
      const filepath = await MultiFormatExporter.exportToPDF(testPlan, tempDir);
      
      expect(filepath).toBeDefined();
      expect(fs.existsSync(filepath)).toBe(true);
      expect(filepath).toMatch(/\.pdf$/);
    });

    it('should include plan name in PDF filename', async () => {
      const filepath = await MultiFormatExporter.exportToPDF(testPlan, tempDir);
      
      expect(filepath).toContain('Test_Project');
    });

    it('should create non-empty PDF file', async () => {
      const filepath = await MultiFormatExporter.exportToPDF(testPlan, tempDir);
      const stats = fs.statSync(filepath);
      
      expect(stats.size).toBeGreaterThan(1000); // PDF should be > 1KB
    });

    it('should handle special characters in plan name', async () => {
      testPlan.metadata.name = 'Test/Project: Special*Chars?';
      const filepath = await MultiFormatExporter.exportToPDF(testPlan, tempDir);
      
      expect(fs.existsSync(filepath)).toBe(true);
      expect(filepath).not.toMatch(/[<>:"|?*\/\\]/);
    });
  });

  describe('Figma Export', () => {
    it('should export design system to JSON', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      
      expect(filepath).toBeDefined();
      expect(fs.existsSync(filepath)).toBe(true);
      expect(filepath).toMatch(/\.json$/);
    });

    it('should include design tokens', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.designTokens).toBeDefined();
      expect(content.designTokens.colors).toBeDefined();
      expect(content.designTokens.typography).toBeDefined();
      expect(content.designTokens.spacing).toBeDefined();
    });

    it('should include color system', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.designTokens.colors.primary).toBeDefined();
      expect(content.designTokens.colors.secondary).toBeDefined();
      expect(content.designTokens.colors.semantic).toBeDefined();
      expect(content.designTokens.colors.primary['500']).toBeDefined();
    });

    it('should include typography system', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.designTokens.typography.fontFamilies).toBeDefined();
      expect(content.designTokens.typography.fontSizes).toBeDefined();
      expect(content.designTokens.typography.fontWeights).toBeDefined();
      expect(Array.isArray(content.designTokens.typography.fontFamilies)).toBe(true);
    });

    it('should generate components from features', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.components).toBeDefined();
      expect(Array.isArray(content.components)).toBe(true);
      expect(content.components.length).toBe(testPlan.features.length);
    });

    it('should categorize components', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      content.components.forEach((component: any) => {
        expect(component.category).toBeDefined();
        expect(typeof component.category).toBe('string');
      });
    });

    it('should include component variants', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      content.components.forEach((component: any) => {
        expect(component.variants).toBeDefined();
        expect(Array.isArray(component.variants)).toBe(true);
        expect(component.variants.length).toBeGreaterThan(0);
      });
    });

    it('should include layouts', () => {
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.layouts).toBeDefined();
      expect(Array.isArray(content.layouts)).toBe(true);
      expect(content.layouts.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAPI Export', () => {
    it('should export to OpenAPI 3.0 JSON', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      
      expect(filepath).toBeDefined();
      expect(fs.existsSync(filepath)).toBe(true);
      expect(filepath).toMatch(/\.json$/);
    });

    it('should have valid OpenAPI 3.0 structure', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.openapi).toBe('3.0.0');
      expect(content.info).toBeDefined();
      expect(content.servers).toBeDefined();
      expect(content.paths).toBeDefined();
      expect(content.components).toBeDefined();
    });

    it('should include project info', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.info.title).toBe(testPlan.project.name);
      expect(content.info.version).toBe(testPlan.metadata.version);
      expect(content.info.description).toBe(testPlan.project.description);
      expect(content.info.contact.name).toBe(testPlan.metadata.author);
    });

    it('should include server definitions', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(Array.isArray(content.servers)).toBe(true);
      expect(content.servers.length).toBeGreaterThan(0);
      content.servers.forEach((server: any) => {
        expect(server.url).toBeDefined();
        expect(server.description).toBeDefined();
      });
    });

    it('should generate paths from features', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(Object.keys(content.paths).length).toBeGreaterThan(0);
      expect(content.paths['/plan']).toBeDefined();
    });

    it('should include schema definitions', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.components.schemas).toBeDefined();
      expect(content.components.schemas.Plan).toBeDefined();
      expect(content.components.schemas.Feature).toBeDefined();
      expect(content.components.schemas.Milestone).toBeDefined();
    });

    it('should have valid schema structure', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      const featureSchema = content.components.schemas.Feature;
      expect(featureSchema.type).toBe('object');
      expect(featureSchema.required).toBeDefined();
      expect(Array.isArray(featureSchema.required)).toBe(true);
      expect(featureSchema.properties).toBeDefined();
    });

    it('should include tags from features', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.tags).toBeDefined();
      expect(Array.isArray(content.tags)).toBe(true);
      expect(content.tags.length).toBe(testPlan.features.length);
    });

    it('should use feature names as tags', () => {
      const filepath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      testPlan.features.forEach((feature: any, index: number) => {
        expect(content.tags[index].name).toBe(feature.name);
        expect(content.tags[index].description).toBe(feature.description);
      });
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize special characters in filenames', async () => {
      testPlan.metadata.name = 'Test<Project>:Name|Special*Chars?';
      
      const pdfPath = await MultiFormatExporter.exportToPDF(testPlan, tempDir);
      const figmaPath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const openapiPath = MultiFormatExporter.exportToOpenAPI(testPlan, tempDir);
      
      expect(path.basename(pdfPath)).not.toMatch(/[<>:"|?*\/\\]/);
      expect(path.basename(figmaPath)).not.toMatch(/[<>:"|?*\/\\]/);
      expect(path.basename(openapiPath)).not.toMatch(/[<>:"|?*\/\\]/);
    });

    it('should limit filename length', () => {
      const longName = 'A'.repeat(300);
      testPlan.metadata.name = longName;
      
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const filename = path.basename(filepath);
      
      expect(filename.length).toBeLessThanOrEqual(255);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output path', async () => {
      const invalidPath = '/nonexistent/invalid/path';
      
      await expect(
        MultiFormatExporter.exportToPDF(testPlan, invalidPath)
      ).rejects.toThrow();
    });

    it('should handle empty feature list', () => {
      testPlan.features = [];
      
      const filepath = MultiFormatExporter.exportToFigma(testPlan, tempDir);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      expect(content.components).toBeDefined();
      expect(content.components.length).toBe(0);
    });

    it('should handle missing optional fields', async () => {
      testPlan.timeline.milestones = [];
      testPlan.risks = [];
      
      const filepath = await MultiFormatExporter.exportToPDF(testPlan, tempDir);
      expect(fs.existsSync(filepath)).toBe(true);
    });
  });
});

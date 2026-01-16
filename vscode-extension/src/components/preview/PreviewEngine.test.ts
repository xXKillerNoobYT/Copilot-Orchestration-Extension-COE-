/**
 * PreviewEngine.test.ts
 * 
 * Comprehensive tests for PreviewEngine including:
 * - Rendering accuracy
 * - Performance compliance (<500ms)
 * - Edge cases (empty, invalid data)
 * - Section generation
 * 
 * @author Auto Zen Agent
 * @date 2026-01-12
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PreviewEngine, type WizardState, type RenderOptions } from './PreviewEngine';

describe('PreviewEngine', () => {
  let engine: PreviewEngine;

  beforeEach(() => {
    engine = new PreviewEngine();
  });

  describe('Basic Rendering', () => {
    it('should render minimal wizard state', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'Test Project',
          projectType: 'web'
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.html).toContain('Test Project');
      expect(result.html).toContain('web');
      expect(result.warnings).toHaveLength(0);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should render complete wizard state', () => {
      const state: WizardState = {
        currentStep: 5,
        answers: {
          projectName: 'Full Stack App',
          projectType: 'web',
          description: 'A complete web application',
          technologies: ['React', 'Node.js', 'PostgreSQL'],
          architecture: {
            pattern: 'MVC',
            layers: ['Model', 'View', 'Controller']
          },
          features: [
            { name: 'User Authentication', priority: 'high' },
            { name: 'Data Dashboard', priority: 'medium' }
          ]
        },
        validationErrors: {},
        isComplete: true
      };

      const result = engine.render(state);

      expect(result.html).toContain('Full Stack App');
      expect(result.html).toContain('React');
      expect(result.html).toContain('MVC');
      expect(result.html).toContain('User Authentication');
      expect(result.sections.length).toBeGreaterThanOrEqual(4);
    });

    it('should escape HTML in user input', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: '<script>alert("XSS")</script>',
          description: '<img src=x onerror=alert("XSS")>'
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('alert("XSS")'); // Should be escaped
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('&lt;img'); // Should contain escaped img tag
    });
  });

  describe('Performance Requirements', () => {
    it('should render within 500ms for normal state', () => {
      const state: WizardState = {
        currentStep: 3,
        answers: {
          projectName: 'Performance Test',
          technologies: ['React', 'Node.js', 'MongoDB'],
          features: Array.from({ length: 10 }, (_, i) => ({
            name: `Feature ${i + 1}`,
            priority: 'medium'
          }))
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.renderTimeMs).toBeLessThan(500);
      expect(result.warnings).not.toContain(
        expect.stringContaining('CRITICAL')
      );
    });

    it('should render within 500ms for large state (50 features)', () => {
      const state: WizardState = {
        currentStep: 3,
        answers: {
          projectName: 'Large Project',
          features: Array.from({ length: 50 }, (_, i) => ({
            name: `Feature ${i + 1}`,
            priority: i % 3 === 0 ? 'high' : 'medium'
          })),
          technologies: Array.from({ length: 20 }, (_, i) => `Tech ${i + 1}`)
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.renderTimeMs).toBeLessThan(500);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should warn when approaching render time limit', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'Test',
          features: Array.from({ length: 100 }, (_, i) => ({
            name: `Feature ${i + 1}`,
            description: 'A'.repeat(1000)
          }))
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      if (result.renderTimeMs > 300) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Section Generation', () => {
    it('should generate project header section', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'My Project',
          projectType: 'api',
          description: 'Test description'
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);
      const headerSection = result.sections.find((s: any) => s.id === 'project-header');

      expect(headerSection).toBeDefined();
      expect(headerSection?.type).toBe('visual');
      expect(headerSection?.isComplete).toBe(true);
      expect(headerSection?.content).toContain('My Project');
    });

    it('should generate technologies section when technologies exist', () => {
      const state: WizardState = {
        currentStep: 2,
        answers: {
          projectName: 'Test',
          technologies: ['TypeScript', 'Vue', 'Vite']
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);
      const techSection = result.sections.find((s: any) => s.id === 'technologies');

      expect(techSection).toBeDefined();
      expect(techSection?.type).toBe('list');
      expect(techSection?.isComplete).toBe(true);
      expect(techSection?.content).toContain('TypeScript');
      expect(techSection?.content).toContain('Vue');
    });

    it('should generate architecture section', () => {
      const state: WizardState = {
        currentStep: 3,
        answers: {
          projectName: 'Test',
          architecture: {
            pattern: 'Microservices',
            layers: ['API Gateway', 'Services', 'Database']
          }
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);
      const archSection = result.sections.find((s: any) => s.id === 'architecture');

      expect(archSection).toBeDefined();
      expect(archSection?.isComplete).toBe(true);
      expect(archSection?.content).toContain('Microservices');
      expect(archSection?.content).toContain('API Gateway');
    });

    it('should generate features section', () => {
      const state: WizardState = {
        currentStep: 4,
        answers: {
          projectName: 'Test',
          features: [
            { name: 'Login', priority: 'critical' },
            { name: 'Dashboard', priority: 'high' }
          ]
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);
      const featuresSection = result.sections.find((s: any) => s.id === 'features');

      expect(featuresSection).toBeDefined();
      expect(featuresSection?.isComplete).toBe(true);
      expect(featuresSection?.content).toContain('Login');
      expect(featuresSection?.content).toContain('priority-critical');
    });

    it('should include incomplete sections when requested', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'Test'
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state, { includeIncomplete: true });

      const incompleteSections = result.sections.filter((s: any) => !s.isComplete);
      expect(incompleteSections.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty state gracefully', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.html).toBeDefined();
      expect(result.html.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle null/undefined in state', () => {
      const state = null as any;

      const result = engine.render(state);

      expect(result.html).toBeDefined();
      expect(result.warnings[0]).toMatch(/Invalid wizard state/);
    });

    it('should handle invalid answer types', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 123 as any,
          technologies: 'not-an-array' as any,
          features: null as any
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.html).toBeDefined();
      // Should still render project header even with invalid types
      expect(result.sections.length).toBeGreaterThanOrEqual(1);
      expect(result.html).toContain('123'); // projectName is coerced to string
    });

    it('should handle very long strings', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'A'.repeat(10000),
          description: 'B'.repeat(50000)
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.html).toBeDefined();
      expect(result.renderTimeMs).toBeLessThan(1000); // Still reasonable
    });

    it('should handle special characters in content', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'Test™ & Co. © 2024',
          technologies: ['C++', 'C#', 'F#']
        },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state);

      expect(result.html).toContain('Test™');
      expect(result.html).toContain('C++');
      expect(result.html).toContain('C#');
    });
  });

  describe('Render Options', () => {
    it('should show metadata when requested', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: { projectName: 'Test' },
        validationErrors: {},
        isComplete: false
      };

      const result = engine.render(state, { showMetadata: true });

      expect(result.html).toContain('preview-metadata');
      expect(result.html).toContain('ms');
    });

    it('should respect custom max render time', () => {
      const customEngine = new PreviewEngine({ maxRenderTimeMs: 100 });

      const state: WizardState = {
        currentStep: 1,
        answers: {
          projectName: 'Test',
          features: Array.from({ length: 100 }, (_, i) => ({ name: `F${i}` }))
        },
        validationErrors: {},
        isComplete: false
      };

      const result = customEngine.render(state);

      if (result.renderTimeMs > 100) {
        expect(result.warnings).toContain(
          expect.stringContaining('exceeded limit')
        );
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track last render time', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: { projectName: 'Test' },
        validationErrors: {},
        isComplete: false
      };

      engine.render(state);

      const lastRenderTime = engine.getLastRenderTime();
      expect(lastRenderTime).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      const state: WizardState = {
        currentStep: 1,
        answers: { projectName: 'Test' },
        validationErrors: {},
        isComplete: false
      };

      engine.render(state);
      engine.resetMetrics();

      expect(engine.getLastRenderTime()).toBe(0);
    });
  });
});

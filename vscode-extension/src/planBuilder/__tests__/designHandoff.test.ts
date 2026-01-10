/**
 * Design Handoff Integration Tests
 */

import { 
  extractDesignDataFromWizard, 
  validateDesignPayload, 
  convertToDesignTokens,
  type DesignHandoffPayload 
} from '../designHandoff';

describe('Design Handoff', () => {
  describe('extractDesignDataFromWizard', () => {
    it('should extract complete design data from wizard state', () => {
      const wizardState = {
        project_name: 'Test Project',
        project_category: 'web_app',
        project_scale: 'medium',
        project_theme_primary_color: '#0066cc',
        project_theme_secondary_color: '#6c757d',
        project_theme_accent_color: '#17a2b8',
        project_typography_font: 'Inter',
        project_typography_scale: '1.25',
        project_spacing_scale: '1.5',
        project_integrations: ['auth', 'database'],
      };

      const result = extractDesignDataFromWizard(wizardState);

      expect(result.metadata.projectName).toBe('Test Project');
      expect(result.metadata.projectType).toBe('web_app');
      expect(result.scale).toBe('medium');
      expect(result.theme.colors?.primary).toBe('#0066cc');
      expect(result.theme.typography?.fontFamily).toBe('Inter');
      expect(result.integrations).toEqual(['auth', 'database']);
    });

    it('should handle missing optional fields', () => {
      const wizardState = {
        project_name: 'Minimal Project',
      };

      const result = extractDesignDataFromWizard(wizardState);

      expect(result.metadata.projectName).toBe('Minimal Project');
      expect(result.scale).toBe('medium'); // default
      expect(result.integrations).toEqual([]);
    });

    it('should normalize invalid scale to medium', () => {
      const wizardState = {
        project_scale: 'invalid-scale',
      };

      const result = extractDesignDataFromWizard(wizardState);

      expect(result.scale).toBe('medium');
    });
  });

  describe('validateDesignPayload', () => {
    it('should validate a complete payload', () => {
      const payload: DesignHandoffPayload = {
        theme: {
          colors: {
            primary: '#0066cc',
            secondary: '#6c757d',
          },
          typography: {
            fontFamily: 'Inter',
          },
        },
        scale: 'medium',
        integrations: [],
        metadata: {
          projectName: 'Test',
          projectType: 'web_app',
          extractedAt: new Date().toISOString(),
        },
      };

      const result = validateDesignPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid color format', () => {
      const payload: DesignHandoffPayload = {
        theme: {
          colors: {
            primary: 'not-a-color',
          },
        },
        scale: 'medium',
        integrations: [],
        metadata: {
          projectName: 'Test',
          projectType: 'web_app',
          extractedAt: new Date().toISOString(),
        },
      };

      const result = validateDesignPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require project name', () => {
      const payload: DesignHandoffPayload = {
        theme: {},
        scale: 'medium',
        integrations: [],
        metadata: {
          projectName: '',
          projectType: 'web_app',
          extractedAt: new Date().toISOString(),
        },
      };

      const result = validateDesignPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });
  });

  describe('convertToDesignTokens', () => {
    it('should convert payload to design tokens structure', () => {
      const payload: DesignHandoffPayload = {
        theme: {
          colors: {
            primary: '#0066cc',
            secondary: '#6c757d',
          },
          typography: {
            fontFamily: 'Inter',
            scale: '1.25',
          },
          spacing: {
            scale: '1.5',
          },
        },
        scale: 'medium',
        integrations: [],
        metadata: {
          projectName: 'Test',
          projectType: 'web_app',
          extractedAt: '2026-01-10T00:00:00.000Z',
        },
      };

      const tokens = convertToDesignTokens(payload);

      expect(tokens.colors).toHaveProperty('primary', '#0066cc');
      expect(tokens.typography).toHaveProperty('fontFamily', 'Inter');
      expect(tokens.metadata).toHaveProperty('generatedFrom', 'plan-builder');
    });

    it('should apply defaults for missing values', () => {
      const payload: DesignHandoffPayload = {
        theme: {},
        scale: 'medium',
        integrations: [],
        metadata: {
          projectName: 'Test',
          projectType: 'web_app',
          extractedAt: '2026-01-10T00:00:00.000Z',
        },
      };

      const tokens = convertToDesignTokens(payload);

      expect(tokens.colors).toHaveProperty('primary'); // default color
      expect(tokens.typography).toHaveProperty('baseFontSize', '16px'); // default
    });
  });
});

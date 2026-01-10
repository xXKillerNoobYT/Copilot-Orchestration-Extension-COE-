/**
 * Design Token Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { DesignTokenGenerator, exportTokensAsObject, createFlatTokenReference } from '../tokenGenerator';

describe('Design Token Generator', () => {
  const mockTokens = {
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
    },
    palette: [
      {
        name: 'Blue',
        hex: '#3B82F6',
        shades: {
          50: '#EFF6FF',
          500: '#3B82F6',
          900: '#1E3A8A',
        },
      },
    ],
    typography: [
      { name: 'Heading 1', fontFamily: 'Inter', fontSize: '2rem', fontWeight: '700', lineHeight: '1.2' },
      { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
    ],
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
    },
    components: {
      Button: {
        primary: {
          background: '#3B82F6',
          padding: '0.5rem 1rem',
        },
      },
    },
  };

  describe('generateJson', () => {
    it('should generate valid JSON output', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'json');
      
      expect(output).toContain('"version"');
      expect(output).toContain('"timestamp"');
      expect(output).toContain('"tokens"');
      expect(output).toContain('"primary"');
    });

    it('should include all token categories', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'json');
      
      const parsed = JSON.parse(output);
      expect(parsed.tokens.colors).toBeDefined();
      expect(parsed.tokens.palette).toBeDefined();
      expect(parsed.tokens.typography).toBeDefined();
      expect(parsed.tokens.spacing).toBeDefined();
      expect(parsed.tokens.components).toBeDefined();
    });

    it('should be valid JSON', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'json');
      
      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe('generateTailwind', () => {
    it('should generate Tailwind config with module.exports', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'tailwind');
      
      expect(output).toContain('module.exports');
      expect(output).toContain('theme');
      expect(output).toContain('extend');
    });

    it('should include colors in Tailwind config', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'tailwind');
      
      expect(output).toContain('primary');
      expect(output).toContain('#3B82F6');
    });

    it('should include spacing in Tailwind config', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'tailwind');
      
      expect(output).toContain('spacing');
      expect(output).toContain('0.5rem');
    });

    it('should include typography in Tailwind config', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'tailwind');
      
      expect(output).toContain('fontSize');
      expect(output).toContain('lineHeight');
    });

    it('should be valid JavaScript', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'tailwind');
      
      // Basic validation that it's a valid config structure
      expect(output).toMatch(/module\.exports\s*=\s*\{/);
    });
  });

  describe('generateCss', () => {
    it('should generate CSS with :root selector', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'css');
      
      expect(output).toContain(':root');
      expect(output).toContain('{');
      expect(output).toContain('}');
    });

    it('should include color variables', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'css');
      
      expect(output).toContain('--color-primary');
      expect(output).toContain('--color-secondary');
      expect(output).toContain('#3B82F6');
    });

    it('should include spacing variables', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'css');
      
      expect(output).toContain('--spacing-xs');
      expect(output).toContain('--spacing-sm');
      expect(output).toContain('0.5rem');
    });

    it('should include typography variables', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'css');
      
      expect(output).toContain('--font-family');
      expect(output).toContain('--font-size');
      expect(output).toContain('--font-weight');
      expect(output).toContain('--line-height');
    });

    it('should convert camelCase to kebab-case', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'css');
      
      // Verify kebab-case conversion
      expect(output).toContain('--color-primary');
      expect(output).not.toContain('--colorPrimary');
    });

    it('should be valid CSS', () => {
      const generator = new DesignTokenGenerator();
      const output = generator.generate(mockTokens, 'css');
      
      expect(output).toMatch(/:root\s*\{[\s\S]*\}/);
    });
  });

  describe('exportTokensAsObject', () => {
    it('should return all token categories', () => {
      const result = exportTokensAsObject(mockTokens);
      
      expect(result.colors).toBeDefined();
      expect(result.palette).toBeDefined();
      expect(result.typography).toBeDefined();
      expect(result.spacing).toBeDefined();
      expect(result.components).toBeDefined();
    });

    it('should return a deep copy', () => {
      const result = exportTokensAsObject(mockTokens);
      result.colors.primary = '#000000';
      
      expect(mockTokens.colors.primary).toBe('#3B82F6');
    });
  });

  describe('createFlatTokenReference', () => {
    it('should flatten colors', () => {
      const flat = createFlatTokenReference(mockTokens);
      
      expect(flat['color:primary']).toBe('#3B82F6');
      expect(flat['color:secondary']).toBe('#8B5CF6');
    });

    it('should flatten spacing', () => {
      const flat = createFlatTokenReference(mockTokens);
      
      expect(flat['spacing:xs']).toBe('0.25rem');
      expect(flat['spacing:md']).toBe('1rem');
    });

    it('should have color and spacing prefixes', () => {
      const flat = createFlatTokenReference(mockTokens);
      
      const keys = Object.keys(flat);
      const hasColorPrefix = keys.some(k => k.startsWith('color:'));
      const hasSpacingPrefix = keys.some(k => k.startsWith('spacing:'));
      
      expect(hasColorPrefix).toBe(true);
      expect(hasSpacingPrefix).toBe(true);
    });
  });
});

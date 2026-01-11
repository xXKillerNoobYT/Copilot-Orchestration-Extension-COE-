/**
 * Tests for Design Token Generator
 */

import * as assert from 'assert';
import {
  DesignTokenGenerator,
  exportTokensAsObject,
  createFlatTokenReference,
  type DesignTokens,
} from './tokenGenerator';

describe('DesignTokenGenerator', () => {
  let generator: DesignTokenGenerator;
  let mockTokens: DesignTokens;

  beforeEach(() => {
    generator = new DesignTokenGenerator();
    mockTokens = {
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#EC4899',
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
        {
          name: 'Purple',
          hex: '#8B5CF6',
        },
      ],
      typography: [
        {
          name: 'Heading 1',
          fontFamily: 'Inter',
          fontSize: '2rem',
          fontWeight: '700',
          lineHeight: '1.2',
        },
        {
          name: 'Body Text',
          fontFamily: 'Inter',
          fontSize: '1rem',
          fontWeight: '400',
          lineHeight: '1.5',
        },
      ],
      spacing: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
      },
      components: {
        Button: {
          primary: {
            background: '#3B82F6',
            color: '#FFFFFF',
          },
        },
      },
    };
  });

  describe('generate()', () => {
    it('should generate JSON format', () => {
      const result = generator.generate(mockTokens, 'json');
      const parsed = JSON.parse(result);

      assert.strictEqual(parsed.version, '1.0.0');
      assert.ok(parsed.timestamp);
      assert.deepStrictEqual(parsed.tokens, mockTokens);
    });

    it('should generate valid JSON with proper structure', () => {
      const result = generator.generate(mockTokens, 'json');
      assert.doesNotThrow(() => JSON.parse(result));

      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.tokens.colors.primary, '#3B82F6');
      assert.strictEqual(parsed.tokens.spacing.md, '1rem');
    });

    it('should generate Tailwind config format', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('module.exports'));
      assert.ok(result.includes('theme:'));
      assert.ok(result.includes('extend:'));
      assert.ok(result.includes('colors:'));
      assert.ok(result.includes('fontSize:'));
      assert.ok(result.includes('lineHeight:'));
      assert.ok(result.includes('spacing:'));
    });

    it('should include all colors in Tailwind config', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('\"primary\": \"#3B82F6\"'));
      assert.ok(result.includes('\"secondary\": \"#8B5CF6\"'));
      assert.ok(result.includes('\"accent\": \"#EC4899\"'));
    });

    it('should include palette shades in Tailwind config', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('\"blue\":'));
      assert.ok(result.includes('\"50\": \"#EFF6FF\"'));
      assert.ok(result.includes('\"500\": \"#3B82F6\"'));
      assert.ok(result.includes('\"900\": \"#1E3A8A\"'));
    });

    it('should include palette without shades in Tailwind config', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('\"purple\": \"#8B5CF6\"'));
    });

    it('should convert typography names to kebab-case in Tailwind', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('\"heading-1\":'));
      assert.ok(result.includes('\"body-text\":'));
    });

    it('should include spacing tokens in Tailwind config', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('\"sm\": \"0.5rem\"'));
      assert.ok(result.includes('\"md\": \"1rem\"'));
      assert.ok(result.includes('\"lg\": \"1.5rem\"'));
    });

    it('should generate CSS variables format', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes(':root {'));
      assert.ok(result.includes('/* Colors */'));
      assert.ok(result.includes('/* Color Palette */'));
      assert.ok(result.includes('/* Typography */'));
      assert.ok(result.includes('/* Spacing */'));
    });

    it('should include color variables in CSS', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('--color-primary: #3B82F6;'));
      assert.ok(result.includes('--color-secondary: #8B5CF6;'));
      assert.ok(result.includes('--color-accent: #EC4899;'));
    });

    it('should include palette shade variables in CSS', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('--color-blue-50: #EFF6FF;'));
      assert.ok(result.includes('--color-blue-500: #3B82F6;'));
      assert.ok(result.includes('--color-blue-900: #1E3A8A;'));
    });

    it('should include palette without shades in CSS', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('--color-purple: #8B5CF6;'));
    });

    it('should include typography variables in CSS', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('--font-family-heading-1: Inter;'));
      assert.ok(result.includes('--font-size-heading-1: 2rem;'));
      assert.ok(result.includes('--font-weight-heading-1: 700;'));
      assert.ok(result.includes('--line-height-heading-1: 1.2;'));
    });

    it('should include spacing variables in CSS', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('--spacing-sm: 0.5rem;'));
      assert.ok(result.includes('--spacing-md: 1rem;'));
      assert.ok(result.includes('--spacing-lg: 1.5rem;'));
    });

    it('should throw error for unknown format', () => {
      assert.throws(() => {
        generator.generate(mockTokens, 'unknown' as any);
      }, /Unknown format: unknown/);
    });

    it('should handle empty palette array in CSS', () => {
      const tokensWithEmptyPalette = { ...mockTokens, palette: [] };
      const result = generator.generate(tokensWithEmptyPalette, 'css');

      assert.ok(result.includes(':root {'));
      assert.ok(result.includes('/* Colors */'));
      assert.ok(!result.includes('/* Color Palette */'));
    });

    it('should handle empty palette array in Tailwind', () => {
      const tokensWithEmptyPalette = { ...mockTokens, palette: [] };
      const result = generator.generate(tokensWithEmptyPalette, 'tailwind');

      assert.ok(result.includes('colors:'));
      assert.ok(result.includes('"primary": "#3B82F6"'));
    });
  });

  describe('exportTokensAsObject()', () => {
    it('should export tokens as plain object', () => {
      const result = exportTokensAsObject(mockTokens);

      assert.ok(result.colors);
      assert.ok(result.palette);
      assert.ok(result.typography);
      assert.ok(result.spacing);
      assert.ok(result.components);
    });

    it('should preserve all token data', () => {
      const result = exportTokensAsObject(mockTokens);

      assert.deepStrictEqual(result.colors, mockTokens.colors);
      assert.deepStrictEqual(result.palette, mockTokens.palette);
      assert.deepStrictEqual(result.typography, mockTokens.typography);
      assert.deepStrictEqual(result.spacing, mockTokens.spacing);
      assert.deepStrictEqual(result.components, mockTokens.components);
    });
  });

  describe('createFlatTokenReference()', () => {
    it('should flatten colors with color: prefix', () => {
      const result = createFlatTokenReference(mockTokens);

      assert.strictEqual(result['color:primary'], '#3B82F6');
      assert.strictEqual(result['color:secondary'], '#8B5CF6');
      assert.strictEqual(result['color:accent'], '#EC4899');
    });

    it('should flatten spacing with spacing: prefix', () => {
      const result = createFlatTokenReference(mockTokens);

      assert.strictEqual(result['spacing:sm'], '0.5rem');
      assert.strictEqual(result['spacing:md'], '1rem');
      assert.strictEqual(result['spacing:lg'], '1.5rem');
    });

    it('should return flat object with all values', () => {
      const result = createFlatTokenReference(mockTokens);

      assert.strictEqual(Object.keys(result).length, 6); // 3 colors + 3 spacing
      assert.ok(Object.values(result).every((v) => typeof v === 'string'));
    });
  });

  describe('Format output validation', () => {
    it('should generate valid JavaScript for Tailwind config', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      // Should not throw when evaluated
      assert.doesNotThrow(() => {
        // Simulate module.exports environment
        const module = { exports: {} };
        eval(result);
      });
    });

    it('should include timestamp in JSON output', () => {
      const result = generator.generate(mockTokens, 'json');
      const parsed = JSON.parse(result);

      assert.ok(parsed.timestamp.match(/^\d{4}-\d{2}-\d{2}T/));
      assert.notStrictEqual(new Date(parsed.timestamp).toString(), 'Invalid Date');
    });

    it('should include timestamp in CSS output', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.match(/\/\* Generated \d{4}-\d{2}-\d{2}T/));
    });

    it('should format JSON with proper indentation', () => {
      const result = generator.generate(mockTokens, 'json');

      assert.ok(result.includes('  "version"'));
      assert.ok(result.includes('  "tokens"'));
      // Should be pretty-printed with 2-space indentation
      const lines = result.split('\n');
      assert.ok(lines.length > 10);
    });

    it('should format Tailwind config with proper indentation', () => {
      const result = generator.generate(mockTokens, 'tailwind');

      assert.ok(result.includes('  theme:'));
      assert.ok(result.includes('    extend:'));
      assert.ok(result.includes('      colors:'));
    });

    it('should format CSS with proper indentation', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('  --color-'));
      assert.ok(result.includes('  --font-'));
      assert.ok(result.includes('  --spacing-'));
    });
  });

  describe('Edge cases', () => {
    it('should handle tokens with special characters in names', () => {
      const tokens = {
        ...mockTokens,
        spacing: {
          '2xl': '2rem',
          '3xl': '3rem',
        },
      };
      const result = generator.generate(tokens, 'css');

      assert.ok(result.includes('--spacing-2xl:'));
      assert.ok(result.includes('--spacing-3xl:'));
    });

    it('should handle typography with numeric font weights', () => {
      const result = generator.generate(mockTokens, 'css');

      assert.ok(result.includes('--font-weight-heading-1: 700;'));
      assert.ok(result.includes('--font-weight-body-text: 400;'));
    });

    it('should handle minimum viable tokens', () => {
      const minimalTokens: DesignTokens = {
        colors: { primary: '#000000' },
        palette: [],
        typography: [],
        spacing: {},
        components: {},
      };

      const json = generator.generate(minimalTokens, 'json');
      const tailwind = generator.generate(minimalTokens, 'tailwind');
      const css = generator.generate(minimalTokens, 'css');

      assert.doesNotThrow(() => JSON.parse(json));
      assert.ok(tailwind.includes('colors:'));
      assert.ok(css.includes(':root {'));
    });
  });
});

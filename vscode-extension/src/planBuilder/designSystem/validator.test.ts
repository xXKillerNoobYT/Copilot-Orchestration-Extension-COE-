/**
 * Tests for Design Token Validator
 */

import * as assert from 'assert';
import {
  validateDesignTokens,
  isValidHexColor,
  isValidCssValue,
  type ValidationError,
} from './validator';
import type { DesignTokens } from './tokenGenerator';

describe('Design Token Validator', () => {
  describe('isValidHexColor()', () => {
    it('should validate 6-digit hex colors', () => {
      assert.strictEqual(isValidHexColor('#3B82F6'), true);
      assert.strictEqual(isValidHexColor('#000000'), true);
      assert.strictEqual(isValidHexColor('#FFFFFF'), true);
      assert.strictEqual(isValidHexColor('#ff00ff'), true);
    });

    it('should validate 3-digit hex colors', () => {
      assert.strictEqual(isValidHexColor('#FFF'), true);
      assert.strictEqual(isValidHexColor('#000'), true);
      assert.strictEqual(isValidHexColor('#abc'), true);
    });

    it('should reject invalid hex colors', () => {
      assert.strictEqual(isValidHexColor('3B82F6'), false); // Missing #
      assert.strictEqual(isValidHexColor('#3B82F'), false); // 5 digits
      assert.strictEqual(isValidHexColor('#3B82F66'), false); // 7 digits
      assert.strictEqual(isValidHexColor('#GGGGGG'), false); // Invalid characters
      assert.strictEqual(isValidHexColor('rgb(59, 130, 246)'), false); // RGB format
      assert.strictEqual(isValidHexColor(''), false); // Empty string
    });

    it('should handle edge cases', () => {
      assert.strictEqual(isValidHexColor('#'), false);
      assert.strictEqual(isValidHexColor('##3B82F6'), false);
      assert.strictEqual(isValidHexColor('#3B82F6 '), false); // Trailing space
      assert.strictEqual(isValidHexColor(' #3B82F6'), false); // Leading space
    });
  });

  describe('isValidCssValue()', () => {
    it('should validate rem values', () => {
      assert.strictEqual(isValidCssValue('1rem'), true);
      assert.strictEqual(isValidCssValue('2.5rem'), true);
      assert.strictEqual(isValidCssValue('0.75rem'), true);
    });

    it('should validate em values', () => {
      assert.strictEqual(isValidCssValue('1em'), true);
      assert.strictEqual(isValidCssValue('1.5em'), true);
    });

    it('should validate px values', () => {
      assert.strictEqual(isValidCssValue('16px'), true);
      assert.strictEqual(isValidCssValue('24.5px'), true);
    });

    it('should validate percentage values', () => {
      assert.strictEqual(isValidCssValue('100%'), true);
      assert.strictEqual(isValidCssValue('50.5%'), true);
    });

    it('should validate viewport units', () => {
      assert.strictEqual(isValidCssValue('100vh'), true);
      assert.strictEqual(isValidCssValue('50vw'), true);
    });

    it('should validate absolute units', () => {
      assert.strictEqual(isValidCssValue('1cm'), true);
      assert.strictEqual(isValidCssValue('1mm'), true);
      assert.strictEqual(isValidCssValue('1in'), true);
      assert.strictEqual(isValidCssValue('1pt'), true);
      assert.strictEqual(isValidCssValue('1pc'), true);
    });

    it('should reject invalid CSS values', () => {
      assert.strictEqual(isValidCssValue('16'), false); // Missing unit
      assert.strictEqual(isValidCssValue('rem'), false); // Missing number
      assert.strictEqual(isValidCssValue('1 rem'), false); // Space between number and unit
      assert.strictEqual(isValidCssValue('auto'), false); // Keyword
      assert.strictEqual(isValidCssValue(''), false); // Empty string
    });
  });

  describe('validateDesignTokens()', () => {
    let validTokens: DesignTokens;

    beforeEach(() => {
      validTokens = {
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
            },
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
        ],
        spacing: {
          sm: '0.5rem',
          md: '1rem',
        },
        components: {
          Button: {
            primary: { background: '#3B82F6' },
          },
        },
      };
    });

    describe('Colors validation', () => {
      it('should pass for valid colors', () => {
        const errors = validateDesignTokens(validTokens);
        const colorErrors = errors.filter((e) => e.field.startsWith('colors'));
        assert.strictEqual(colorErrors.length, 0);
      });

      it('should fail if colors is not an object', () => {
        const tokens = { ...validTokens, colors: null };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'colors' && e.message === 'Colors must be an object'));
      });

      it('should fail if colors is empty', () => {
        const tokens = { ...validTokens, colors: {} };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'colors' && e.message === 'At least one color is required'));
      });

      it('should fail for invalid hex color values', () => {
        const tokens = {
          ...validTokens,
          colors: { primary: 'not-a-hex-color' },
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'colors.primary'));
      });

      it('should validate all color entries', () => {
        const tokens = {
          ...validTokens,
          colors: {
            primary: '#3B82F6',
            secondary: 'invalid',
            tertiary: '#EC4899',
            accent: 'also-invalid',
          },
        };
        const errors = validateDesignTokens(tokens);
        const colorErrors = errors.filter((e) => e.field.startsWith('colors.'));

        assert.strictEqual(colorErrors.length, 2);
        assert.strictEqual(colorErrors[0].field, 'colors.secondary');
        assert.strictEqual(colorErrors[1].field, 'colors.accent');
      });
    });

    describe('Palette validation', () => {
      it('should pass for valid palette', () => {
        const errors = validateDesignTokens(validTokens);
        const paletteErrors = errors.filter((e) => e.field.startsWith('palette'));
        assert.strictEqual(paletteErrors.length, 0);
      });

      it('should fail if palette is not an array', () => {
        const tokens = { ...validTokens, palette: null };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'palette' && e.message === 'Palette must be an array'));
      });

      it('should fail if palette is empty', () => {
        const tokens = { ...validTokens, palette: [] };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'palette' && e.message === 'At least one palette color is required'));
      });

      it('should fail if palette item missing name', () => {
        const tokens = {
          ...validTokens,
          palette: [{ name: '', hex: '#3B82F6' }],
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'palette[0].name'));
      });

      it('should fail if palette item missing hex', () => {
        const tokens = {
          ...validTokens,
          palette: [{ name: 'Blue', hex: '' }],
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'palette[0].hex'));
      });

      it('should fail if palette item has invalid hex', () => {
        const tokens = {
          ...validTokens,
          palette: [{ name: 'Blue', hex: 'not-a-color' }],
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'palette[0].hex'));
      });

      it('should validate palette shades', () => {
        const tokens = {
          ...validTokens,
          palette: [
            {
              name: 'Blue',
              hex: '#3B82F6',
              shades: {
                50: 'invalid-color',
                500: '#3B82F6',
              },
            },
          ],
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'palette[0].shades.50'));
      });

      it('should allow palette without shades', () => {
        const tokens = {
          ...validTokens,
          palette: [{ name: 'Blue', hex: '#3B82F6' }],
        };
        const errors = validateDesignTokens(tokens);
        const paletteErrors = errors.filter((e) => e.field.startsWith('palette'));

        assert.strictEqual(paletteErrors.length, 0);
      });
    });

    describe('Typography validation', () => {
      it('should pass for valid typography', () => {
        const errors = validateDesignTokens(validTokens);
        const typoErrors = errors.filter((e) => e.field.startsWith('typography'));
        assert.strictEqual(typoErrors.length, 0);
      });

      it('should fail if typography is not an array', () => {
        const tokens = { ...validTokens, typography: null };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'typography' && e.message === 'Typography must be an array'));
      });

      it('should fail if typography is empty', () => {
        const tokens = { ...validTokens, typography: [] };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'typography' && e.message === 'At least one typography style is required'));
      });

      it('should fail if typography item missing required fields', () => {
        const tokens = {
          ...validTokens,
          typography: [
            {
              name: '',
              fontFamily: 'Inter',
              fontSize: '1rem',
              fontWeight: '400',
              lineHeight: '1.5',
            },
          ],
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'typography[0].name'));
      });
    });

    describe('Spacing validation', () => {
      it('should pass for valid spacing', () => {
        const errors = validateDesignTokens(validTokens);
        const spacingErrors = errors.filter((e) => e.field.startsWith('spacing'));
        assert.strictEqual(spacingErrors.length, 0);
      });

      it('should fail if spacing is not an object', () => {
        const tokens = { ...validTokens, spacing: null };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'spacing' && e.message === 'Spacing must be an object'));
      });

      it('should fail if spacing is empty', () => {
        const tokens = { ...validTokens, spacing: {} };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'spacing' && e.message === 'At least one spacing value is required'));
      });
    });

    describe('Components validation', () => {
      it('should pass for valid components', () => {
        const errors = validateDesignTokens(validTokens);
        const componentErrors = errors.filter((e) => e.field.startsWith('components'));
        assert.strictEqual(componentErrors.length, 0);
      });

      it('should fail if components is not an object', () => {
        const tokens = { ...validTokens, components: null };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.some((e) => e.field === 'components' && e.message === 'Components must be an object'));
      });

      it('should allow empty components object', () => {
        const tokens = { ...validTokens, components: {} };
        const errors = validateDesignTokens(tokens);
        const componentErrors = errors.filter((e) => e.field.startsWith('components'));

        assert.strictEqual(componentErrors.length, 0);
      });
    });

    describe('Multiple errors', () => {
      it('should return multiple errors for multiple issues', () => {
        const tokens = {
          colors: {},
          palette: [],
          typography: [],
          spacing: {},
          components: null,
        };
        const errors = validateDesignTokens(tokens);

        assert.ok(errors.length > 3);
        assert.ok(errors.some((e) => e.field === 'colors'));
        assert.ok(errors.some((e) => e.field === 'palette'));
        assert.ok(errors.some((e) => e.field === 'typography'));
        assert.ok(errors.some((e) => e.field === 'spacing'));
        assert.ok(errors.some((e) => e.field === 'components'));
      });

      it('should return all color validation errors', () => {
        const tokens = {
          ...validTokens,
          colors: {
            primary: 'invalid1',
            secondary: 'invalid2',
            tertiary: 'invalid3',
          },
        };
        const errors = validateDesignTokens(tokens);
        const colorErrors = errors.filter((e) => e.field.startsWith('colors.'));

        assert.strictEqual(colorErrors.length, 3);
      });
    });

    describe('Edge cases', () => {
      it('should handle undefined tokens', () => {
        const errors = validateDesignTokens(undefined as any);

        assert.ok(errors.length > 0);
      });

      it('should handle null tokens', () => {
        const errors = validateDesignTokens(null as any);

        assert.ok(errors.length > 0);
      });

      it('should handle empty object', () => {
        const errors = validateDesignTokens({} as any);

        assert.ok(errors.length > 0);
      });

      it('should validate complex nested palette shades', () => {
        const tokens = {
          ...validTokens,
          palette: [
            {
              name: 'Blue',
              hex: '#3B82F6',
              shades: {
                50: '#EFF6FF',
                100: '#DBEAFE',
                200: '#BFDBFE',
                300: '#93C5FD',
                400: '#60A5FA',
                500: '#3B82F6',
                600: '#2563EB',
                700: '#1D4ED8',
                800: '#1E40AF',
                900: '#1E3A8A',
              },
            },
          ],
        };
        const errors = validateDesignTokens(tokens);
        const paletteErrors = errors.filter((e) => e.field.startsWith('palette'));

        assert.strictEqual(paletteErrors.length, 0);
      });
    });
  });
});

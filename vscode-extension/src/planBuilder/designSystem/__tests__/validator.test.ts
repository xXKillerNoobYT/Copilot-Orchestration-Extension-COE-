/**
 * Design Token Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { validateDesignTokens, isValidHexColor, isValidCssValue } from '../validator';

describe('Design Token Validator', () => {
  describe('validateDesignTokens', () => {
    it('should validate a complete design token object', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
        palette: [{ name: 'Blue', hex: '#3B82F6' }],
        typography: [
          { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
        ],
        spacing: { md: '1rem' },
        components: {},
      };

      const errors = validateDesignTokens(tokens);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing colors', () => {
      const tokens = {
        colors: {},
        palette: [{ name: 'Blue', hex: '#3B82F6' }],
        typography: [
          { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
        ],
        spacing: { md: '1rem' },
        components: {},
      };

      const errors = validateDesignTokens(tokens);
      expect(errors.some(e => e.field === 'colors')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      const tokens = {
        colors: { primary: 'notahexcolor' },
        palette: [{ name: 'Blue', hex: '#3B82F6' }],
        typography: [
          { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
        ],
        spacing: { md: '1rem' },
        components: {},
      };

      const errors = validateDesignTokens(tokens);
      expect(errors.some(e => e.field === 'colors.primary')).toBe(true);
    });

    it('should reject invalid palette items', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
        palette: [{ name: '', hex: 'invalid' }],
        typography: [
          { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
        ],
        spacing: { md: '1rem' },
        components: {},
      };

      const errors = validateDesignTokens(tokens);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing typography name', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
        palette: [{ name: 'Blue', hex: '#3B82F6' }],
        typography: [
          {
            name: '',
            fontFamily: 'Inter',
            fontSize: '1rem',
            fontWeight: '400',
            lineHeight: '1.5',
          },
        ],
        spacing: { md: '1rem' },
        components: {},
      };

      const errors = validateDesignTokens(tokens);
      expect(errors.some(e => e.field.includes('typography'))).toBe(true);
    });

    it('should accept palette with shades', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
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
          { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
        ],
        spacing: { md: '1rem' },
        components: {},
      };

      const errors = validateDesignTokens(tokens);
      expect(errors).toHaveLength(0);
    });
  });

  describe('isValidHexColor', () => {
    it('should validate 6-digit hex colors', () => {
      expect(isValidHexColor('#3B82F6')).toBe(true);
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
    });

    it('should validate 3-digit hex colors', () => {
      expect(isValidHexColor('#F00')).toBe(true);
      expect(isValidHexColor('#0F0')).toBe(true);
      expect(isValidHexColor('#00F')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('3B82F6')).toBe(false); // No hash
      expect(isValidHexColor('#3B82F')).toBe(false); // Only 5 digits
      expect(isValidHexColor('#3B82F6G')).toBe(false); // Invalid character
      expect(isValidHexColor('rgb(255,0,0)')).toBe(false); // RGB format
    });

    it('should be case-insensitive', () => {
      expect(isValidHexColor('#3b82f6')).toBe(true);
      expect(isValidHexColor('#3B82F6')).toBe(true);
      expect(isValidHexColor('#3b82F6')).toBe(true);
    });
  });

  describe('isValidCssValue', () => {
    it('should validate pixel values', () => {
      expect(isValidCssValue('16px')).toBe(true);
      expect(isValidCssValue('1.5px')).toBe(true);
    });

    it('should validate rem values', () => {
      expect(isValidCssValue('1rem')).toBe(true);
      expect(isValidCssValue('0.5rem')).toBe(true);
    });

    it('should validate em values', () => {
      expect(isValidCssValue('1em')).toBe(true);
      expect(isValidCssValue('2.5em')).toBe(true);
    });

    it('should validate percentage values', () => {
      expect(isValidCssValue('100%')).toBe(true);
      expect(isValidCssValue('50.5%')).toBe(true);
    });

    it('should reject invalid CSS values', () => {
      expect(isValidCssValue('abc')).toBe(false);
      expect(isValidCssValue('16')).toBe(false); // No unit
      expect(isValidCssValue('px16')).toBe(false); // Wrong order
    });
  });
});

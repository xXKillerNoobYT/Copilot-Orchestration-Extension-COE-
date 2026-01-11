/**
 * Design Token Validator
 */

import type { DesignTokens, ColorPaletteItem } from './tokenGenerator';

export interface ValidationError {
  field: string;
  message: string;
}

export function isValidHexColor(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.trim() !== value) return false; // reject leading/trailing spaces
  // 3 or 6 hex digits with leading #
  return /^#[0-9A-Fa-f]{3}$/.test(value) || /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function isValidCssValue(value: string): boolean {
  if (typeof value !== 'string') return false;
  // number or decimal followed immediately by unit
  return /^\d+(\.\d+)?(rem|em|px|%|vh|vw|cm|mm|in|pt|pc)$/.test(value);
}

export function validateDesignTokens(tokens: DesignTokens | any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Handle undefined/null/empty object: add basic errors across categories
  const t: DesignTokens = tokens || ({} as any);

  // Colors
  if (typeof t.colors !== 'object' || t.colors === null) {
    errors.push({ field: 'colors', message: 'Colors must be an object' });
  } else if (Object.keys(t.colors).length === 0) {
    errors.push({ field: 'colors', message: 'At least one color is required' });
  } else {
    Object.entries(t.colors).forEach(([name, val]) => {
      if (!isValidHexColor(String(val))) {
        errors.push({ field: `colors.${name}`, message: 'Invalid hex color' });
      }
    });
  }

  // Palette
  if (!Array.isArray(t.palette)) {
    errors.push({ field: 'palette', message: 'Palette must be an array' });
  } else if (t.palette.length === 0) {
    errors.push({ field: 'palette', message: 'At least one palette color is required' });
  } else {
    t.palette.forEach((item: ColorPaletteItem, idx: number) => {
      if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
        errors.push({ field: `palette[${idx}].name`, message: 'Name is required' });
      }
      if (!item || typeof item.hex !== 'string' || item.hex.trim().length === 0) {
        errors.push({ field: `palette[${idx}].hex`, message: 'Hex is required' });
      } else if (!isValidHexColor(item.hex)) {
        errors.push({ field: `palette[${idx}].hex`, message: 'Invalid hex color' });
      }
      if (item && item.shades) {
        Object.entries(item.shades).forEach(([shadeKey, shadeVal]) => {
          if (!isValidHexColor(String(shadeVal))) {
            errors.push({ field: `palette[${idx}].shades.${shadeKey}`, message: 'Invalid hex color' });
          }
        });
      }
    });
  }

  // Typography
  if (!Array.isArray(t.typography)) {
    errors.push({ field: 'typography', message: 'Typography must be an array' });
  } else if (t.typography.length === 0) {
    errors.push({ field: 'typography', message: 'At least one typography style is required' });
  } else {
    t.typography.forEach((typo, idx) => {
      if (!typo || typeof typo.name !== 'string' || typo.name.trim().length === 0) {
        errors.push({ field: `typography[${idx}].name`, message: 'Name is required' });
      }
      // Additional typography validations could be added here if needed
    });
  }

  // Spacing
  if (typeof t.spacing !== 'object' || t.spacing === null) {
    errors.push({ field: 'spacing', message: 'Spacing must be an object' });
  } else if (Object.keys(t.spacing).length === 0) {
    errors.push({ field: 'spacing', message: 'At least one spacing value is required' });
  }

  // Components
  if (typeof t.components !== 'object' || t.components === null) {
    errors.push({ field: 'components', message: 'Components must be an object' });
  } else {
    // Empty object is allowed; no further validation required per tests
  }

  return errors;
}

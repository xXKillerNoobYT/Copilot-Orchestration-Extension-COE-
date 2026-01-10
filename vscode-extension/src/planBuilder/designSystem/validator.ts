/**
 * Design Token Validator
 * Validates design token structure and required fields
 */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateDesignTokens(tokens: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate colors
  if (!tokens.colors || typeof tokens.colors !== 'object') {
    errors.push({ field: 'colors', message: 'Colors must be an object' });
  } else if (Object.keys(tokens.colors).length === 0) {
    errors.push({ field: 'colors', message: 'At least one color is required' });
  } else {
    for (const [key, value] of Object.entries(tokens.colors)) {
      if (!isValidHexColor(value as string)) {
        errors.push({
          field: `colors.${key}`,
          message: `Invalid hex color: ${value}`,
        });
      }
    }
  }

  // Validate palette
  if (!Array.isArray(tokens.palette)) {
    errors.push({ field: 'palette', message: 'Palette must be an array' });
  } else if (tokens.palette.length === 0) {
    errors.push({
      field: 'palette',
      message: 'At least one palette color is required',
    });
  } else {
    tokens.palette.forEach((item: any, idx: number) => {
      if (!item.name) {
        errors.push({
          field: `palette[${idx}].name`,
          message: 'Palette item must have a name',
        });
      }
      if (!item.hex || !isValidHexColor(item.hex)) {
        errors.push({
          field: `palette[${idx}].hex`,
          message: 'Palette item must have a valid hex color',
        });
      }
      if (item.shades && typeof item.shades === 'object') {
        for (const [shadeName, shadeValue] of Object.entries(item.shades)) {
          if (!isValidHexColor(shadeValue as string)) {
            errors.push({
              field: `palette[${idx}].shades.${shadeName}`,
              message: `Invalid hex color for shade: ${shadeValue}`,
            });
          }
        }
      }
    });
  }

  // Validate typography
  if (!Array.isArray(tokens.typography)) {
    errors.push({
      field: 'typography',
      message: 'Typography must be an array',
    });
  } else if (tokens.typography.length === 0) {
    errors.push({
      field: 'typography',
      message: 'At least one typography style is required',
    });
  } else {
    tokens.typography.forEach((typo: any, idx: number) => {
      if (!typo.name) {
        errors.push({
          field: `typography[${idx}].name`,
          message: 'Typography must have a name',
        });
      }
      if (!typo.fontFamily) {
        errors.push({
          field: `typography[${idx}].fontFamily`,
          message: 'Typography must have a font family',
        });
      }
      if (!typo.fontSize) {
        errors.push({
          field: `typography[${idx}].fontSize`,
          message: 'Typography must have a font size',
        });
      }
      if (!typo.fontWeight) {
        errors.push({
          field: `typography[${idx}].fontWeight`,
          message: 'Typography must have a font weight',
        });
      }
    });
  }

  // Validate spacing
  if (!tokens.spacing || typeof tokens.spacing !== 'object') {
    errors.push({ field: 'spacing', message: 'Spacing must be an object' });
  } else if (Object.keys(tokens.spacing).length === 0) {
    errors.push({
      field: 'spacing',
      message: 'At least one spacing value is required',
    });
  }

  // Validate components
  if (!tokens.components || typeof tokens.components !== 'object') {
    errors.push({
      field: 'components',
      message: 'Components must be an object',
    });
  }

  return errors;
}

export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

export function isValidCssValue(value: string): boolean {
  // Basic validation for CSS values like "1rem", "16px", "50%", etc.
  return /^[\d.]+\s*(rem|em|px|%|vh|vw|cm|mm|in|pt|pc)$/.test(value);
}

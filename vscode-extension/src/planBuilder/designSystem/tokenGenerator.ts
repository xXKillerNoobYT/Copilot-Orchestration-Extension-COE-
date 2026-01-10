/**
 * Design Token Generator
 * Generates design tokens in multiple formats
 */

export interface DesignTokens {
  colors: Record<string, string>;
  palette: Array<{ name: string; hex: string; shades?: Record<string, string> }>;
  typography: Array<{
    name: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
  }>;
  spacing: Record<string, string>;
  components: Record<string, any>;
}

export class DesignTokenGenerator {
  /**
   * Generate design tokens in the specified format
   */
  generate(tokens: DesignTokens, format: 'json' | 'tailwind' | 'css'): string {
    switch (format) {
      case 'json':
        return this.generateJson(tokens);
      case 'tailwind':
        return this.generateTailwind(tokens);
      case 'css':
        return this.generateCss(tokens);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Generate JSON format
   */
  private generateJson(tokens: DesignTokens): string {
    const output = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tokens,
    };
    return JSON.stringify(output, null, 2);
  }

  /**
   * Generate Tailwind config format
   */
  private generateTailwind(tokens: DesignTokens): string {
    const colors: Record<string, any> = {};

    // Add primary colors
    for (const [key, value] of Object.entries(tokens.colors)) {
      colors[key] = value;
    }

    // Add palette shades
    for (const palette of tokens.palette) {
      if (palette.shades) {
        const paletteColors: Record<string, string> = {};
        for (const [shade, hex] of Object.entries(palette.shades)) {
          paletteColors[shade] = hex;
        }
        colors[palette.name.toLowerCase()] = paletteColors;
      } else {
        colors[palette.name.toLowerCase()] = palette.hex;
      }
    }

    // Build typography scale
    const fontSize: Record<string, string> = {};
    const lineHeight: Record<string, string> = {};

    for (const typo of tokens.typography) {
      const name = typo.name.toLowerCase().replace(/\s+/g, '-');
      fontSize[name] = typo.fontSize;
      lineHeight[name] = typo.lineHeight;
    }

    // Build spacing scale
    const spacing: Record<string, string> = { ...tokens.spacing };

    const config = `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 8).split('\n').join('\n      ')},
      fontSize: ${JSON.stringify(fontSize, null, 8).split('\n').join('\n      ')},
      lineHeight: ${JSON.stringify(lineHeight, null, 8).split('\n').join('\n      ')},
      spacing: ${JSON.stringify(spacing, null, 8).split('\n').join('\n      ')},
    },
  },
  plugins: [],
}
`;
    return config;
  }

  /**
   * Generate CSS variables format
   */
  private generateCss(tokens: DesignTokens): string {
    let css = `/* Design System Tokens */
/* Generated ${new Date().toISOString()} */

:root {
`;

    // Colors
    css += '  /* Colors */\n';
    for (const [key, value] of Object.entries(tokens.colors)) {
      css += `  --color-${this.kebabCase(key)}: ${value};\n`;
    }

    // Palette
    if (tokens.palette.length > 0) {
      css += '\n  /* Color Palette */\n';
      for (const palette of tokens.palette) {
        if (palette.shades) {
          for (const [shade, hex] of Object.entries(palette.shades)) {
            css += `  --color-${this.kebabCase(palette.name)}-${shade}: ${hex};\n`;
          }
        } else {
          css += `  --color-${this.kebabCase(palette.name)}: ${palette.hex};\n`;
        }
      }
    }

    // Typography
    css += '\n  /* Typography */\n';
    for (const typo of tokens.typography) {
      const name = this.kebabCase(typo.name);
      css += `  --font-family-${name}: ${typo.fontFamily};\n`;
      css += `  --font-size-${name}: ${typo.fontSize};\n`;
      css += `  --font-weight-${name}: ${typo.fontWeight};\n`;
      css += `  --line-height-${name}: ${typo.lineHeight};\n`;
    }

    // Spacing
    css += '\n  /* Spacing */\n';
    for (const [key, value] of Object.entries(tokens.spacing)) {
      css += `  --spacing-${this.kebabCase(key)}: ${value};\n`;
    }

    css += '}\n';
    return css;
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
}

/**
 * Export tokens as a JavaScript object (for runtime use)
 */
export function exportTokensAsObject(tokens: DesignTokens): Record<string, any> {
  return {
    colors: tokens.colors,
    palette: tokens.palette,
    typography: tokens.typography,
    spacing: tokens.spacing,
    components: tokens.components,
  };
}

/**
 * Create a token reference object with all values flattened
 */
export function createFlatTokenReference(tokens: DesignTokens): Record<string, string> {
  const flat: Record<string, string> = {};

  // Flatten colors
  for (const [key, value] of Object.entries(tokens.colors)) {
    flat[`color:${key}`] = value;
  }

  // Flatten spacing
  for (const [key, value] of Object.entries(tokens.spacing)) {
    flat[`spacing:${key}`] = value;
  }

  return flat;
}

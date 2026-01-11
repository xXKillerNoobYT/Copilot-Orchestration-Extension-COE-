/**
 * Design Token Generator
 */

export type ColorPaletteShadeMap = Record<string | number, string>;
export interface ColorPaletteItem {
  name: string;
  hex: string;
  shades?: ColorPaletteShadeMap;
}

export interface TypographyRule {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string;
}

export interface DesignTokens {
  colors: Record<string, string>;
  palette: ColorPaletteItem[];
  typography: TypographyRule[];
  spacing: Record<string, string>;
  components: Record<string, unknown>;
}

export class DesignTokenGenerator {
  generate(tokens: DesignTokens, format: 'json' | 'tailwind' | 'css'): string {
    const timestamp = new Date().toISOString();
    switch (format) {
      case 'json':
        return this.generateJSON(tokens, timestamp);
      case 'tailwind':
        return this.generateTailwind(tokens);
      case 'css':
        return this.generateCSS(tokens, timestamp);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  private generateJSON(tokens: DesignTokens, timestamp: string): string {
    const payload = {
      version: '1.0.0',
      timestamp,
      tokens,
    };
    return JSON.stringify(payload, null, 2);
  }

  private generateTailwind(tokens: DesignTokens): string {
    const colors = this.buildColors(tokens);
    const fontSize = Object.fromEntries(
      (tokens.typography || []).map((t) => [toKebab(t.name), t.fontSize])
    );
    const lineHeight = Object.fromEntries(
      (tokens.typography || []).map((t) => [toKebab(t.name), t.lineHeight])
    );
    const spacing = tokens.spacing || {};

    const indent = (n: number) => '  '.repeat(n);

    // Build JS string with JSON for nested maps to satisfy quoted key expectations
    const config = `module.exports = {
${indent(1)}theme: {
${indent(2)}extend: {
${indent(3)}colors: ${JSON.stringify(colors, null, 2)},
${indent(3)}fontSize: ${JSON.stringify(fontSize, null, 2)},
${indent(3)}lineHeight: ${JSON.stringify(lineHeight, null, 2)},
${indent(3)}spacing: ${JSON.stringify(spacing, null, 2)}
${indent(2)}}
${indent(1)}}
};`;
    return config;
  }

  private generateCSS(tokens: DesignTokens, timestamp: string): string {
    const lines: string[] = [];
    lines.push(`/* Generated ${timestamp} */`);
    lines.push(':root {');

    // Colors
    lines.push('  /* Colors */');
    Object.entries(tokens.colors || {}).forEach(([name, hex]) => {
      lines.push(`  --color-${toKebab(name)}: ${hex};`);
    });

    // Palette (optional)
    if (Array.isArray(tokens.palette) && tokens.palette.length > 0) {
      lines.push('  /* Color Palette */');
      tokens.palette.forEach((p) => {
        const baseName = toKebab(p.name);
        if (p.shades && Object.keys(p.shades).length > 0) {
          Object.entries(p.shades).forEach(([shade, value]) => {
            lines.push(`  --color-${baseName}-${shade}: ${value};`);
          });
        } else {
          lines.push(`  --color-${baseName}: ${p.hex};`);
        }
      });
    }

    // Typography
    lines.push('  /* Typography */');
    (tokens.typography || []).forEach((t) => {
      const key = toKebab(t.name);
      lines.push(`  --font-family-${key}: ${t.fontFamily};`);
      lines.push(`  --font-size-${key}: ${t.fontSize};`);
      lines.push(`  --font-weight-${key}: ${t.fontWeight};`);
      lines.push(`  --line-height-${key}: ${t.lineHeight};`);
    });

    // Spacing
    lines.push('  /* Spacing */');
    Object.entries(tokens.spacing || {}).forEach(([name, val]) => {
      lines.push(`  --spacing-${toKebab(name)}: ${val};`);
    });

    lines.push('}');
    return lines.join('\n');
  }

  private buildColors(tokens: DesignTokens): Record<string, any> {
    const colors: Record<string, any> = {};
    // Core colors
    Object.entries(tokens.colors || {}).forEach(([name, hex]) => {
      colors[toKebab(name)] = hex;
    });
    // Palette
    (tokens.palette || []).forEach((p) => {
      const base = toKebab(p.name);
      if (p.shades && Object.keys(p.shades).length > 0) {
        colors[base] = {};
        Object.entries(p.shades).forEach(([shade, value]) => {
          (colors[base] as Record<string, string>)[String(shade)] = value;
        });
      } else {
        colors[base] = p.hex;
      }
    });
    return colors;
  }
}

export function exportTokensAsObject(tokens: DesignTokens): DesignTokens {
  // Return a shallow copy to avoid mutation side-effects
  return {
    colors: { ...(tokens.colors || {}) },
    palette: Array.isArray(tokens.palette) ? [...tokens.palette] : [],
    typography: Array.isArray(tokens.typography) ? [...tokens.typography] : [],
    spacing: { ...(tokens.spacing || {}) },
    components: { ...(tokens.components || {}) },
  };
}

export function createFlatTokenReference(tokens: DesignTokens): Record<string, string> {
  const flat: Record<string, string> = {};
  Object.entries(tokens.colors || {}).forEach(([name, hex]) => {
    flat[`color:${toKebab(name)}`] = hex;
  });
  Object.entries(tokens.spacing || {}).forEach(([name, val]) => {
    flat[`spacing:${toKebab(name)}`] = val;
  });
  return flat;
}

function toKebab(str: string): string {
  return String(str)
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .toLowerCase()
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

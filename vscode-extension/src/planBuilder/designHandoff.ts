/**
 * Design Handoff Interfaces & Helpers
 */

import type { DesignTokens, TypographyRule, ColorPaletteItem } from './designSystem/tokenGenerator';
import { isValidHexColor, validateDesignTokens } from './designSystem/validator';

export interface DesignMetadata {
  source?: string;
  author?: string;
  createdAt?: string; // ISO timestamp
  notes?: string;
}

export interface DesignHandoff {
  tokens: DesignTokens;
  palette: ColorPaletteItem[];
  typography: TypographyRule[];
  spacing: Record<string, string>;
  metadata: DesignMetadata;
}

export type DesignHandoffPayload = DesignHandoff;

interface ConvertOptions {
  preserveProvidedValues?: boolean;
}

const DEFAULT_COLORS: Record<string, string> = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  accent: '#EC4899',
  background: '#0B1120',
  text: '#0F172A'
};

const DEFAULT_PALETTE: ColorPaletteItem[] = [
  { name: 'Primary', hex: DEFAULT_COLORS.primary, shades: { 50: '#E2E8F0', 500: DEFAULT_COLORS.primary, 900: '#1E3A8A' } },
  { name: 'Neutral', hex: '#64748B', shades: { 100: '#E2E8F0', 500: '#64748B', 900: '#0F172A' } }
];

const DEFAULT_TYPOGRAPHY: TypographyRule[] = [
  { name: 'Heading 1', fontFamily: 'Inter', fontSize: '2rem', fontWeight: '700', lineHeight: '1.2' },
  { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }
];

const DEFAULT_SPACING: Record<string, string> = { sm: '0.5rem', md: '1rem', lg: '1.5rem' };

/**
 * Convert arbitrary wizard or payload data into normalized design tokens
 */
export function convertToDesignTokens(
  payload: Partial<DesignHandoffPayload> | Record<string, unknown>,
  options: ConvertOptions = {}
): DesignTokens {
  const preserveProvidedValues = options.preserveProvidedValues ?? false;
  const source = (payload as any) ?? {};
  const tokensSource = (source.tokens ?? source) as Partial<DesignTokens>;

  const colors = normalizeColors(tokensSource.colors ?? (source as any).colors, preserveProvidedValues);
  const palette = normalizePalette(tokensSource.palette ?? (source as any).palette, colors, preserveProvidedValues);
  const typography = normalizeTypography(tokensSource.typography ?? (source as any).typography, preserveProvidedValues);
  const spacing = normalizeSpacing(tokensSource.spacing ?? (source as any).spacing, preserveProvidedValues);
  const components = typeof tokensSource.components === 'object' && tokensSource.components !== null ? tokensSource.components : {};

  return { colors, palette, typography, spacing, components };
}

/**
 * Extract design handoff payload from wizard state
 */
export function extractDesignDataFromWizard(wizardData: Record<string, unknown>): DesignHandoffPayload {
  const tokens = convertToDesignTokens(wizardData);

  return {
    tokens,
    palette: tokens.palette,
    typography: tokens.typography,
    spacing: tokens.spacing,
    metadata: {
      source: wizardData?.['source'] as string ?? 'wizard',
      author: wizardData?.['author'] as string ?? (wizardData?.['project_owner'] as string) ?? 'unknown',
      createdAt: new Date().toISOString(),
      notes: (wizardData?.['notes'] as string) ?? ''
    }
  };
}

/**
 * Validate design payload and return detailed errors
 */
export function validateDesignPayload(payload: DesignHandoffPayload | Record<string, unknown>): { valid: boolean; errors: string[] } {
  const tokens = convertToDesignTokens(payload, { preserveProvidedValues: true });
  const errors = validateDesignTokens(tokens).map(err => `${err.field}: ${err.message}`);

  const metadata = (payload as any)?.metadata;
  if (!metadata || typeof metadata !== 'object') {
    errors.push('metadata: Metadata is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Backward-compatible helpers
 */
export function extractDesignPayload(wizardData: any): DesignHandoffPayload {
  return extractDesignDataFromWizard(wizardData);
}

export function validateDesignData(data: DesignHandoffPayload): boolean {
  return validateDesignPayload(data).valid;
}

function normalizeColors(colors: Record<string, string> | undefined, preserve: boolean): Record<string, string> {
  const normalized: Record<string, string> = {};
  const entries = Object.entries(colors || {});

  if (entries.length === 0) {
    return preserve ? {} : { ...DEFAULT_COLORS };
  }

  entries.forEach(([name, value]) => {
    if (preserve) {
      normalized[name] = typeof value === 'string' ? value : String(value ?? '');
    } else {
      const sanitized = typeof value === 'string' && isValidHexColor(value) ? value : DEFAULT_COLORS[name] || DEFAULT_COLORS.primary;
      normalized[name] = sanitized;
    }
  });

  if (!preserve) {
    normalized.primary ||= DEFAULT_COLORS.primary;
    normalized.text ||= DEFAULT_COLORS.text;
    normalized.background ||= DEFAULT_COLORS.background;
  }

  return normalized;
}

function normalizePalette(palette: ColorPaletteItem[] | undefined, colors: Record<string, string>, preserve: boolean): ColorPaletteItem[] {
  if (!Array.isArray(palette) || palette.length === 0) {
    return preserve ? [] : DEFAULT_PALETTE;
  }

  return palette.map((item) => ({
    name: item?.name || 'Primary',
    hex: preserve && typeof item?.hex === 'string' ? item.hex : (isValidHexColor(item?.hex ?? '') ? (item?.hex as string) : colors.primary),
    shades: item?.shades && typeof item.shades === 'object' ? item.shades : undefined
  }));
}

function normalizeTypography(typography: TypographyRule[] | undefined, preserve: boolean): TypographyRule[] {
  if (!Array.isArray(typography) || typography.length === 0) {
    return preserve ? [] : DEFAULT_TYPOGRAPHY;
  }

  return typography.map((typo, index) => ({
    name: typo?.name || `Style ${index + 1}`,
    fontFamily: typo?.fontFamily || 'Inter',
    fontSize: typo?.fontSize || '1rem',
    fontWeight: typo?.fontWeight || '400',
    lineHeight: typo?.lineHeight || '1.5'
  }));
}

function normalizeSpacing(spacing: Record<string, string> | undefined, preserve: boolean): Record<string, string> {
  if (!spacing || typeof spacing !== 'object') {
    return preserve ? {} : DEFAULT_SPACING;
  }

  const normalized: Record<string, string> = {};
  Object.entries(spacing).forEach(([key, value]) => {
    if (typeof value === 'number') {
      normalized[key] = preserve ? `${value}` : `${value}px`;
    } else if (typeof value === 'string') {
      normalized[key] = value.trim();
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : (preserve ? {} : DEFAULT_SPACING);
}

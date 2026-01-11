/**
 * Design Handoff Interfaces & Helpers
 */

import type { DesignTokens, TypographyRule, ColorPaletteItem } from './designSystem/tokenGenerator';

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

export function extractDesignPayload(wizardData: any): DesignHandoff {
  const tokens: DesignTokens = {
    colors: (wizardData?.tokens?.colors ?? wizardData?.colors) || {},
    palette: (wizardData?.tokens?.palette ?? wizardData?.palette) || [],
    typography: (wizardData?.tokens?.typography ?? wizardData?.typography) || [],
    spacing: (wizardData?.tokens?.spacing ?? wizardData?.spacing) || {},
    components: (wizardData?.tokens?.components ?? wizardData?.components) || {},
  };

  const payload: DesignHandoff = {
    tokens,
    palette: tokens.palette,
    typography: tokens.typography,
    spacing: tokens.spacing,
    metadata: {
      source: wizardData?.source || 'wizard',
      author: wizardData?.author || 'unknown',
      createdAt: new Date().toISOString(),
      notes: wizardData?.notes || '',
    },
  };
  return payload;
}

export function validateDesignData(data: DesignHandoff): boolean {
  if (!data || typeof data !== 'object') return false;
  const hasColors = data.tokens && data.tokens.colors && Object.keys(data.tokens.colors).length >= 0;
  const hasSpacing = data.spacing !== undefined;
  const hasTypography = Array.isArray(data.typography);
  const hasPalette = Array.isArray(data.palette);
  return !!(hasColors && hasSpacing && hasTypography && hasPalette);
}

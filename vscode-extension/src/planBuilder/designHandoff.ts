/**
 * Plan Builder to Design Editor Handoff
 * Extracts design-related data from wizard state and passes to design system editor
 */

export interface DesignHandoffPayload {
  theme: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
    typography?: {
      fontFamily?: string;
      baseFontSize?: string;
      scale?: string;
    };
    spacing?: {
      scale?: string;
      baseUnit?: string;
    };
  };
  scale: 'small' | 'medium' | 'large' | 'enterprise';
  integrations: string[];
  metadata: {
    projectName: string;
    projectType: string;
    extractedAt: string;
  };
}

export interface WizardDesignData {
  project_name?: string;
  project_category?: string;
  project_scale?: string;
  project_theme_primary_color?: string;
  project_theme_secondary_color?: string;
  project_theme_accent_color?: string;
  project_typography_font?: string;
  project_typography_scale?: string;
  project_spacing_scale?: string;
  project_integrations?: string[];
}

/**
 * Extract design-related data from wizard state
 */
export function extractDesignDataFromWizard(wizardState: Record<string, unknown>): DesignHandoffPayload {
  const data = wizardState as WizardDesignData;

  return {
    theme: {
      colors: {
        primary: data.project_theme_primary_color,
        secondary: data.project_theme_secondary_color,
        accent: data.project_theme_accent_color,
      },
      typography: {
        fontFamily: data.project_typography_font,
        scale: data.project_typography_scale,
      },
      spacing: {
        scale: data.project_spacing_scale,
      },
    },
    scale: normalizeScale(data.project_scale),
    integrations: data.project_integrations || [],
    metadata: {
      projectName: data.project_name || 'Untitled Project',
      projectType: data.project_category || 'web_app',
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Normalize scale values to expected enum
 */
function normalizeScale(scale?: string): 'small' | 'medium' | 'large' | 'enterprise' {
  const normalized = (scale || 'medium').toLowerCase();
  if (['small', 'medium', 'large', 'enterprise'].includes(normalized)) {
    return normalized as 'small' | 'medium' | 'large' | 'enterprise';
  }
  return 'medium';
}

/**
 * Validate design handoff payload
 */
export function validateDesignPayload(payload: DesignHandoffPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required metadata
  if (!payload.metadata.projectName) {
    errors.push('Project name is required');
  }

  // Validate color format if provided
  const colorFields = ['primary', 'secondary', 'accent', 'background', 'text'];
  for (const field of colorFields) {
    const color = payload.theme.colors?.[field as keyof typeof payload.theme.colors];
    if (color && !isValidColorFormat(color)) {
      errors.push(`Invalid color format for ${field}: ${color}`);
    }
  }

  // Validate scale
  if (!['small', 'medium', 'large', 'enterprise'].includes(payload.scale)) {
    errors.push(`Invalid scale: ${payload.scale}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if color is in valid format (hex, rgb, rgba, hsl, hsla, or CSS color name)
 */
function isValidColorFormat(color: string): boolean {
  // Hex color
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    return true;
  }
  // RGB/RGBA
  if (/^rgba?\(/.test(color)) {
    return true;
  }
  // HSL/HSLA
  if (/^hsla?\(/.test(color)) {
    return true;
  }
  // CSS color names (basic check - just ensure it's alphanumeric)
  if (/^[a-z]+$/i.test(color)) {
    return true;
  }
  return false;
}

/**
 * Convert design handoff payload to design tokens structure
 * This maps wizard data to the structure expected by design system editor
 */
export function convertToDesignTokens(payload: DesignHandoffPayload): Record<string, unknown> {
  return {
    colors: {
      primary: payload.theme.colors?.primary || '#0066cc',
      secondary: payload.theme.colors?.secondary || '#6c757d',
      accent: payload.theme.colors?.accent || '#17a2b8',
      background: payload.theme.colors?.background || '#ffffff',
      text: payload.theme.colors?.text || '#212529',
    },
    typography: {
      fontFamily: payload.theme.typography?.fontFamily || 'Inter, system-ui, sans-serif',
      baseFontSize: payload.theme.typography?.baseFontSize || '16px',
      scale: payload.theme.typography?.scale || '1.25',
    },
    spacing: {
      baseUnit: payload.theme.spacing?.baseUnit || '8px',
      scale: payload.theme.spacing?.scale || '1.5',
    },
    metadata: {
      generatedFrom: 'plan-builder',
      projectName: payload.metadata.projectName,
      projectType: payload.metadata.projectType,
      timestamp: payload.metadata.extractedAt,
    },
  };
}

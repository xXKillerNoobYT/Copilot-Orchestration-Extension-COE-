import { describe, it, expect } from 'vitest';
import {
  convertToDesignTokens,
  extractDesignDataFromWizard,
  validateDesignPayload,
  type DesignHandoffPayload
} from './designHandoff';

const minimalWizardState = {} as Record<string, unknown>;

describe('designHandoff helpers', () => {
  it('generates defaults when wizard data is missing', () => {
    const payload = extractDesignDataFromWizard(minimalWizardState);
    const validation = validateDesignPayload(payload);

    expect(validation.valid).toBe(true);
    expect(payload.tokens.colors.primary).toBeTruthy();
    expect(payload.typography.length).toBeGreaterThan(0);
    expect(payload.spacing).toHaveProperty('md');
  });

  it('preserves provided tokens from wizard data', () => {
    const wizardState: Record<string, unknown> = {
      tokens: {
        colors: { primary: '#111111', secondary: '#222222' },
        palette: [{ name: 'Primary', hex: '#111111' }],
        typography: [{ name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }],
        spacing: { md: '12px' },
        components: { Button: { radius: '8px' } }
      }
    };

    const tokens = convertToDesignTokens(wizardState);

    expect(tokens.colors.primary).toBe('#111111');
    expect(tokens.palette[0].hex).toBe('#111111');
    expect(tokens.spacing.md).toBe('12px');
    expect(tokens.components).toHaveProperty('Button');
  });

  it('returns validation errors for invalid payloads', () => {
    const invalidPayload: DesignHandoffPayload = {
      tokens: {
        colors: { primary: 'not-a-hex' },
        palette: [{ name: 'Bad', hex: 'nope' } as any],
        typography: [],
        spacing: {},
        components: {}
      },
      palette: [],
      typography: [],
      spacing: {},
      metadata: { source: 'wizard' }
    };

    const validation = validateDesignPayload(invalidPayload);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('colors'))).toBe(true);
  });
});

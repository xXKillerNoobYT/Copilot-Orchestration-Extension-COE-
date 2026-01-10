# Visual Design System Editor - Vue 3

A comprehensive Vue 3 component for defining, managing, and exporting design tokens with support for colors, typography, spacing, and component variants.

## Features

### 1. **Color Management**
- Primary color picker with live preview
- Full color palette with shade definitions
- Support for hex colors (#RGB and #RRGGBB formats)
- Palette preview grid showing all colors and shades

### 2. **Typography Editor**
- Define typography styles (Heading 1, 2, Body, etc.)
- Configure font family, size, weight, and line height
- Live preview of each typography style
- Recommendations for system fonts, web-safe fonts, and variable fonts

### 3. **Spacing Scale**
- Define consistent spacing tokens
- Visual preview of spacing with actual dimensions
- Support for rem, px, em, and other CSS units
- Pre-configured scale examples (Tailwind, Material Design, Bootstrap)

### 4. **Component Variants**
- Create component definitions (Button, Card, Input, etc.)
- Define multiple variants (primary, secondary, default, etc.)
- Edit component properties (colors, padding, border-radius, etc.)
- Live preview of each component variant
- Component gallery view

### 5. **Live Preview**
- Real-time preview of color palette
- Typography showcase
- Spacing visualization
- Component gallery
- Full component demo with all design tokens applied

### 6. **Export & Save**
- **JSON Export**: Standard JSON format for tool integration
- **Tailwind Config**: Ready-to-use Tailwind CSS configuration
- **CSS Variables**: CSS custom properties for web use
- File save with custom filenames
- Timestamp tracking

### 7. **Validation**
- Comprehensive design token validation
- Hex color validation
- CSS value validation
- Required field checks
- Inline error display with clear messages

## Component Structure

```
DesignEditor.vue (Main Component)
├── ColorPickerEditor.vue
├── TypographyEditor.vue
├── SpacingEditor.vue
├── ComponentVariantEditor.vue
├── PreviewPanel.vue
└── ExportPanel.vue
```

## Backend Utilities

### Validator (`validator.ts`)
```typescript
validateDesignTokens(tokens): ValidationError[]
isValidHexColor(color): boolean
isValidCssValue(value): boolean
```

### Token Generator (`tokenGenerator.ts`)
```typescript
class DesignTokenGenerator {
  generate(tokens, format): string  // 'json' | 'tailwind' | 'css'
}

exportTokensAsObject(tokens): Record<string, any>
createFlatTokenReference(tokens): Record<string, string>
```

## Usage

### Basic Implementation

```vue
<template>
  <DesignEditor />
</template>

<script setup lang="ts">
import DesignEditor from './DesignEditor.vue';
</script>
```

### Props Interface

```typescript
interface DesignTokens {
  colors: Record<string, string>;                    // e.g. { primary: '#3B82F6' }
  palette: Array<{                                   // Color palette with shades
    name: string;
    hex: string;
    shades?: Record<string, string>;
  }>;
  typography: Array<{                                // Typography styles
    name: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
  }>;
  spacing: Record<string, string>;                   // e.g. { md: '1rem' }
  components: Record<string, Record<string, any>>;   // Component definitions
}
```

## Default Design Tokens

### Colors
- primary: `#3B82F6`
- secondary: `#8B5CF6`
- accent: `#EC4899`
- success: `#10B981`
- warning: `#F59E0B`
- error: `#EF4444`
- neutral: `#6B7280`

### Palette (with shades)
- Blue (50, 100, 500, 900)
- Purple (50, 100, 500, 900)
- Pink (50, 100, 500, 900)

### Typography
- Heading 1: Inter, 2rem, 700, 1.2
- Heading 2: Inter, 1.5rem, 600, 1.3
- Body: Inter, 1rem, 400, 1.5

### Spacing Scale
- xs: `0.25rem`
- sm: `0.5rem`
- md: `1rem`
- lg: `1.5rem`
- xl: `2rem`
- 2xl: `3rem`
- 3xl: `4rem`

### Components
- **Button**: primary, secondary variants
- **Card**: default variant
- **Input**: default variant

## Export Formats

### JSON Format
```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-10T12:00:00Z",
  "tokens": {
    "colors": { ... },
    "palette": [ ... ],
    "typography": [ ... ],
    "spacing": { ... },
    "components": { ... }
  }
}
```

### Tailwind Config
```javascript
module.exports = {
  theme: {
    extend: {
      colors: { ... },
      fontSize: { ... },
      lineHeight: { ... },
      spacing: { ... }
    }
  }
}
```

### CSS Variables
```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #8B5CF6;
  --spacing-md: 1rem;
  --font-family-body: Inter;
  /* ... */
}
```

## VS Code Integration

The component communicates with VS Code through `window.vscode.postMessage()`:

```typescript
// Export design tokens
window.vscode.postMessage({
  type: 'exportDesignTokens',
  payload: { format: 'json' | 'tailwind' | 'css', tokens, timestamp }
});

// Save design tokens
window.vscode.postMessage({
  type: 'saveDesignTokens',
  payload: { filename, tokens, timestamp }
});

// Load design tokens from file
window.vscode.postMessage({
  type: 'loadDesignTokens',
  payload: { action: 'pickFile' }
});
```

## Testing

### Unit Tests
```bash
npm run test -- validator.test.ts
npm run test -- tokenGenerator.test.ts
```

### Component Tests
```bash
npm run test -- DesignEditor.spec.ts
npm run test -- ColorPickerEditor.spec.ts
```

### Test Coverage
- **Validator**: Color validation, CSS value validation, complete token validation
- **Generator**: JSON, Tailwind, CSS output formats
- **Components**: Tab navigation, token updates, validation errors, exports

## Styling

All components use a VS Code dark theme with the following color scheme:
- Background: `#1e1e1e`
- Surface: `#252526`
- Text: `#e0e0e0`
- Accent: `#0e90d4`
- Error: `#f48771`

## Validation Rules

### Colors
- Must be valid hex format (#RGB or #RRGGBB)
- At least one color required

### Palette
- Must have name and hex color
- Shades must be valid hex colors
- Names must not be empty

### Typography
- Must have name, fontFamily, fontSize, fontWeight
- Line height is optional but recommended
- Font weight must be numeric (400, 600, 700, etc.)

### Spacing
- Must have valid CSS values (rem, px, em, %, etc.)
- At least one spacing value required

### Components
- Can be freely customized
- Property values should be valid CSS

## Error Messages

The editor provides clear, actionable error messages:
- `"colors: Colors must be an object"`
- `"colors.primary: Invalid hex color: #GGGGGG"`
- `"typography[0].name: Typography must have a name"`
- `"spacing.md: At least one spacing value is required"`

## Future Enhancements

- [ ] Import design tokens from file
- [ ] Design token versioning
- [ ] Collaboration features
- [ ] Theme generator (light/dark modes)
- [ ] Animation tokens
- [ ] Shadow definitions
- [ ] Border radius presets
- [ ] Opacity scale
- [ ] Grid/sizing systems
- [ ] Design token documentation generator

## File Structure

```
resources/planBuilder/
├── DesignEditor.vue                    # Main editor component
├── DesignEditor/
│   ├── ColorPickerEditor.vue
│   ├── TypographyEditor.vue
│   ├── SpacingEditor.vue
│   ├── ComponentVariantEditor.vue
│   ├── PreviewPanel.vue
│   ├── ExportPanel.vue
│   └── __tests__/
│       ├── DesignEditor.spec.ts
│       └── ColorPickerEditor.spec.ts

src/planBuilder/designSystem/
├── validator.ts
├── tokenGenerator.ts
└── __tests__/
    ├── validator.test.ts
    └── tokenGenerator.test.ts
```

## Related Documentation

- [Plan Builder Design System Phase 3](./PLAN-BUILDER-DESIGN-SYSTEM.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Design Tokens Format](https://design-tokens.github.io/community-group/format/)

# Design System Integration

## Overview

The Design System Integration feature allows the Copilot Orchestration Extension to automatically load and display design-system.json from the workspace, providing inline UI design references during development and verification workflows.

## Features

✅ **Implemented (Phase 1)**
- Automatically loads `design-system.json` from workspace root
- Supports both JSON and YAML formats
- File watcher for automatic reloading on changes
- Performance-optimized caching (5-minute TTL)
- Graceful fallback when file not found
- Color format conversion (hex → rgb/hsl)
- Search functionality across all design tokens
- Comprehensive validation and error handling

🚧 **Future Enhancements (Phase 2)**
- Visual Verification Panel integration (F023)
- Task Details Panel integration
- Standalone Design System Browser Panel
- Vue components for design system display

## Usage

### 1. Create Design System File

Create a `design-system.json` file in your workspace root:

```json
{
  "version": "1.0.0",
  "colors": {
    "primary": "#007AFF",
    "secondary": "#5AC8FA",
    "background": "#FFFFFF"
  },
  "typography": {
    "fontFamily": "Inter, sans-serif",
    "sizes": { "xs": "12px", "sm": "14px", "md": "16px" },
    "weights": { "regular": 400, "semibold": 600, "bold": 700 }
  },
  "spacing": ["4px", "8px", "12px", "16px", "24px", "32px"],
  "breakpoints": { "sm": "640px", "md": "1024px", "lg": "1280px" },
  "components": {
    "Button": { "doc": "Primary button component" },
    "Card": { "doc": "Card container component" }
  }
}
```

See `vscode-extension/design-system.json` for a complete example.

### 2. Access Design System in Code

```typescript
import { DesignSystemService } from './services/DesignSystemService';

// Get service instance
const designSystemService = DesignSystemService.getInstance();

// Initialize with workspace root
await designSystemService.initialize(workspaceRoot);

// Get current design system
const designSystem = designSystemService.getDesignSystem();

// Get color in different formats
const primaryHex = designSystemService.getColor('primary', 'hex');
// => "#007AFF"

const primaryRgb = designSystemService.getColor('primary', 'rgb');
// => "rgb(0, 122, 255)"

const primaryHsl = designSystemService.getColor('primary', 'hsl');
// => "hsl(211, 100%, 50%)"

// Search design tokens
const results = designSystemService.search('primary');
// => [{ type: 'color', name: 'primary', value: '#007AFF' }]
```

## Design System Schema

### Required Fields

```typescript
interface DesignSystem {
  colors: Record<string, string>;      // Color tokens (hex values)
  typography: TypographyRule[];        // Typography specifications
  spacing: Record<string, string>;     // Spacing scale
  components: Record<string, unknown>; // Component definitions
  palette: ColorPaletteItem[];         // Color palette with shades
}
```

### Optional Fields

```typescript
interface DesignSystem {
  breakpoints?: Record<string, string>;  // Responsive breakpoints
  version?: string;                      // Design system version
  metadata?: {
    name?: string;
    description?: string;
    lastModified?: string;
  };
}
```

### Typography Structure

```typescript
interface TypographyRule {
  name: string;           // e.g., "Heading 1"
  fontFamily: string;     // e.g., "Inter, sans-serif"
  fontSize: string;       // e.g., "32px"
  fontWeight: string | number; // e.g., "700" or 700
  lineHeight: string;     // e.g., "1.2"
}
```

### Color Palette Structure

```typescript
interface ColorPaletteItem {
  name: string;    // e.g., "Primary"
  hex: string;     // Base color hex value
  shades?: {       // Optional color shades
    [key: string]: string;  // e.g., "50": "#E3F2FD"
  };
}
```

## File Formats

### JSON Format (Recommended)

```json
{
  "colors": { "primary": "#007AFF" },
  "typography": [...],
  "spacing": {...}
}
```

### YAML Format

```yaml
colors:
  primary: "#007AFF"
typography:
  - name: "Heading 1"
    fontSize: "32px"
spacing:
  sm: "8px"
```

## Features in Detail

### 1. Automatic Loading

The service automatically searches for design system files in this order:
1. `design-system.json`
2. `design-system.yaml`
3. `design-system.yml`

### 2. File Watching

Changes to the design system file are automatically detected and reloaded:
- File modification triggers reload
- File creation triggers initial load
- File deletion clears design system

### 3. Caching

Design system data is cached for performance:
- Cache TTL: 5 minutes
- Automatic cache invalidation on file changes
- Force reload option available

### 4. Color Conversion

Colors can be retrieved in multiple formats:

```typescript
// Hex format (default)
getColor('primary', 'hex')  // => "#007AFF"

// RGB format
getColor('primary', 'rgb')  // => "rgb(0, 122, 255)"

// HSL format
getColor('primary', 'hsl')  // => "hsl(211, 100%, 50%)"
```

### 5. Search

Search across all design token types:

```typescript
// Search returns all matching tokens
const results = designSystemService.search('primary');

// Results structure:
// [
//   { type: 'color', name: 'primary', value: '#007AFF' },
//   { type: 'palette', name: 'Primary', value: {...} }
// ]
```

Token types:
- `color`: Color tokens
- `typography`: Typography rules
- `spacing`: Spacing values
- `component`: Component definitions

## API Reference

### DesignSystemService

#### Methods

##### `getInstance(): DesignSystemService`
Get singleton instance of the service.

##### `initialize(workspaceRoot: string): Promise<void>`
Initialize the service and set up file watcher.

##### `loadDesignSystem(workspaceRoot: string, forceReload?: boolean): Promise<DesignSystem | null>`
Load design system from workspace.
- `forceReload`: Skip cache and reload from file

##### `getDesignSystem(): DesignSystem | null`
Get current design system.

##### `getColor(name: string, format?: 'hex' | 'rgb' | 'hsl'): string | null`
Get color by name with optional format conversion.

##### `search(query: string): Array<{ type: string; name: string; value: any }>`
Search design system tokens (case-insensitive).

##### `dispose(): void`
Clean up resources and watchers.

## Testing

The service includes comprehensive unit tests covering:

- File loading (JSON/YAML)
- Caching behavior
- File watching
- Format validation
- Color conversion
- Search functionality
- Error handling
- Graceful fallback

Run tests:
```bash
npm test -- src/services/DesignSystemService.test.ts
```

## Error Handling

The service implements graceful error handling:

1. **File Not Found**: Returns `null`, no error thrown
2. **Invalid JSON/YAML**: Returns `null`, logs error
3. **Validation Errors**: Loads data with warnings
4. **File Watch Errors**: Logged, service continues

## Performance

- **Caching**: 5-minute TTL reduces file system access
- **Singleton Pattern**: Single instance across extension
- **Lazy Loading**: Only loads when requested
- **Efficient Watching**: Uses VS Code native file watcher

## Future Enhancements

### Visual Verification Panel (F023)
Display design system inline during UI verification:
- Color swatches for visual comparison
- Typography samples
- Component documentation

### Task Details Panel
Show design references for design-related tasks:
- Relevant colors/typography
- Component links

### Standalone Design System Browser
Full design system exploration panel:
- Search and filter
- Copy color values (hex/rgb/hsl)
- Export options

## Related Files

- `src/services/DesignSystemService.ts` - Main service
- `src/services/DesignSystemService.test.ts` - Unit tests
- `src/planBuilder/designSystem/tokenGenerator.ts` - Token generation
- `src/planBuilder/designSystem/validator.ts` - Validation
- `design-system.json` - Example design system

## References

- PRD.json Feature F005: Design System Integration
- PRD.json Feature F023: Visual Verification Panel
- PRD.json Feature F034: VS Code Extension UI

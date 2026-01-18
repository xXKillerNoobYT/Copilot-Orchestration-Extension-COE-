# Design System JSON Schema

The Visual Verification Panel can load a `design-system.json` file from your workspace to display design system reference information inline during verification.

## File Location

The panel will look for the file in these locations (in order):
1. `<workspace-root>/design-system.json`
2. `<workspace-root>/.vscode/design-system.json`
3. `<workspace-root>/resources/design-system.json`

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "colors": {
      "type": "object",
      "description": "Color palette for the application",
      "properties": {
        "primary": { "type": "string", "description": "Primary brand color (hex)" },
        "secondary": { "type": "string", "description": "Secondary color (hex)" },
        "accent": { "type": "string", "description": "Accent color (hex)" },
        "background": { "type": "string", "description": "Background color (hex)" },
        "text": { "type": "string", "description": "Text color (hex)" },
        "border": { "type": "string", "description": "Border color (hex)" }
      }
    },
    "typography": {
      "type": "object",
      "description": "Typography specifications",
      "properties": {
        "fontFamily": { "type": "string", "description": "CSS font-family value" },
        "weights": { 
          "type": "array", 
          "items": { "type": "number" },
          "description": "Available font weights"
        },
        "sizes": {
          "type": "object",
          "description": "Font size scale",
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "components": {
      "type": "object",
      "description": "Component style specifications",
      "properties": {
        "borderRadius": { "type": "string", "description": "Default border radius" },
        "padding": { "type": "string", "description": "Default padding" },
        "shadow": { "type": "string", "description": "Shadow level (none, sm, md, lg, xl)" }
      }
    },
    "links": {
      "type": "object",
      "description": "External documentation links",
      "properties": {
        "componentLibrary": { "type": "string", "description": "URL to component library" },
        "designDocs": { "type": "string", "description": "URL to design documentation" }
      }
    }
  }
}
```

## Example

See `test-workspace/design-system.json` for a complete example.

## Features

When a design-system.json is loaded, the Visual Verification Panel will display:

- **Color Palette**: Visual swatches with hex values for each color
- **Typography**: Font family preview, weights, and size scale
- **Components**: Border radius, padding, and shadow specifications with live previews
- **Links**: Clickable links to component library and design documentation

## Default Values

If no design-system.json is found, the panel will use default values based on a modern blue theme.

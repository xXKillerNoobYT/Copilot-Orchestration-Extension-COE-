# Plan Templates

This directory contains plan templates that users can use to quickly start new projects with pre-configured structures.

## Core Templates

We provide 4 core templates out of the box:

### 1. Web Application (`web-app-template.json`)
**Use When:** Building a full-stack web application with authentication, database, and rich UI
- **Category:** `web-app`
- **Estimated Duration:** 3-6 months
- **Team Size:** 4 people
- **Features:**
  - User authentication & authorization
  - User dashboard with real-time updates
  - CRUD operations for data management
  - Advanced search and filtering
  - User profile management
  - Admin panel
- **Best For:** SaaS products, dashboards, web platforms

### 2. API Service (`api-service-template.json`)
**Use When:** Creating a RESTful API or microservice
- **Category:** `api-service`
- **Estimated Duration:** 2-4 months
- **Team Size:** 3 people
- **Features:**
  - JWT-based authentication & RBAC
  - Core CRUD endpoints
  - OpenAPI/Swagger documentation
  - Data validation & sanitization
- **Best For:** Backend services, microservices, API-first applications

### 3. CLI Tool (`cli-tool-template.json`)
**Use When:** Building a command-line tool or automation script
- **Category:** `cli-tool`
- **Estimated Duration:** 1-3 months
- **Team Size:** 2 people
- **Features:**
  - Command parsing and routing
  - Configuration system (JSON/YAML)
  - Plugin architecture
  - Comprehensive help system
- **Best For:** Developer tools, automation scripts, build tools

### 4. Library/Package (`library-template.json`)
**Use When:** Creating a reusable library or package for distribution
- **Category:** `library`
- **Estimated Duration:** 1-2 months
- **Team Size:** 2 people
- **Features:**
  - TypeScript-first API
  - Comprehensive testing (90%+ coverage)
  - Complete API documentation
  - Build & publishing pipeline
- **Best For:** npm packages, reusable libraries, open-source projects

## Using Templates

### In the Plan Builder Wizard

1. Open the Interactive Plan Builder
2. Click the "📋 Use Template" button at the top
3. Browse or search for a template
4. Click "Preview" to see template details
5. Click "Apply" to use the template
6. Customize the project name, description, and other fields as needed

### Programmatically

```typescript
import { getTemplateService } from './services/TemplateService';

// Initialize the service
const service = getTemplateService(extensionPath);

// List all templates
const templates = await service.listTemplates();

// Filter by category
const webTemplates = await service.listTemplates({ category: 'web-app' });

// Search templates
const searchResults = await service.listTemplates({ 
  searchQuery: 'api' 
});

// Load a specific template
const template = await service.loadTemplate('core-web-app');

// Apply template with customizations
const plan = await service.applyTemplate('core-web-app', {
  projectName: 'My Awesome Project',
  projectDescription: 'A revolutionary web application',
  customizations: {
    author: 'John Doe'
  }
});
```

## Creating Custom Templates

### Via the UI

1. Complete your plan in the Plan Builder
2. Click "Save as Template" 
3. Fill in the template details:
   - Name (required)
   - Description (required)
   - Category (required)
   - Tags (optional)
   - Author (required)
4. Click "Save Template"

### Programmatically

```typescript
import { getTemplateService } from './services/TemplateService';

const service = getTemplateService(extensionPath);

// Save current plan as a template
const result = await service.saveTemplate(plan, {
  name: 'My Custom Template',
  description: 'A specialized template for my use case',
  category: 'custom',
  tags: ['nodejs', 'react', 'custom'],
  author: 'Your Name'
});

if (result.success) {
  console.log(`Template saved with ID: ${result.data}`);
}
```

## Template Structure

Each template is a JSON file with the following structure:

```json
{
  "metadata": {
    "id": "core-web-app",
    "name": "Full-Stack Web Application",
    "description": "Complete web application template...",
    "category": "web-app",
    "tags": ["web", "full-stack", "authentication"],
    "author": "Copilot Orchestration Extension",
    "version": "1.0.0",
    "createdAt": "2026-01-12T00:00:00.000Z",
    "updatedAt": "2026-01-12T00:00:00.000Z",
    "isCore": true,
    "icon": "globe",
    "estimatedDuration": "3-6 months",
    "recommendedTeamSize": 4
  },
  "plan": {
    "project": { ... },
    "architecture": { ... },
    "features": [ ... ],
    "timeline": { ... },
    "team": { ... },
    "success_criteria": [ ... ],
    "risks": [ ... ],
    "assumptions": [ ... ],
    "constraints": [ ... ]
  },
  "customizationHints": {
    "requiredCustomizations": [
      "project.name",
      "project.description"
    ],
    "optionalCustomizations": [
      {
        "field": "architecture.components",
        "description": "Customize the tech stack",
        "example": "Replace PostgreSQL with MySQL"
      }
    ]
  }
}
```

## Template Validation

Templates are automatically validated when loaded. A valid template must have:

### Required Metadata Fields:
- `id` - Unique identifier (e.g., "core-web-app")
- `name` - Human-readable name
- `description` - Detailed description
- `category` - One of: web-app, api-service, cli-tool, library, custom
- `tags` - Array of tags for search/filtering
- `author` - Template creator
- `version` - Semver format (e.g., "1.0.0")
- `createdAt` - ISO 8601 timestamp
- `updatedAt` - ISO 8601 timestamp
- `isCore` - Boolean (true for core templates, false for custom)

### Required Plan Fields:
- `project` - Project information
- `architecture` - Architecture details
- `features` - Array of features (can be empty but must exist)
- `timeline` - Project timeline
- `team` - Team structure

## Custom Templates Directory

Custom templates are stored in:
```
vscode-extension/templates/plan-templates/custom/
```

Each custom template is saved as `custom-<name>.json` where `<name>` is a URL-safe version of the template name.

## Best Practices

1. **Use Descriptive Names:** Make template names clear and specific
2. **Add Comprehensive Tags:** Help users find your templates
3. **Include Customization Hints:** Guide users on what to customize
4. **Test Your Templates:** Load and apply templates to verify they work
5. **Version Your Templates:** Update the version when making changes
6. **Document Assumptions:** List any assumptions in the template

## API Reference

See the [TemplateService.ts](../../src/planBuilder/services/TemplateService.ts) file for complete API documentation.

### Key Methods:
- `loadTemplate(templateId)` - Load a template by ID
- `listTemplates(options)` - List templates with optional filtering
- `validateTemplate(template)` - Validate template structure
- `applyTemplate(templateId, options)` - Apply template with customizations
- `saveTemplate(plan, options)` - Save a plan as a custom template
- `deleteTemplate(templateId)` - Delete a custom template

## Testing

Run the template tests with:
```bash
npm run test:jest -- src/planBuilder/services/TemplateService.test.ts
```

All 27 tests should pass, covering:
- Loading core templates
- Template validation
- Template application
- Custom template creation
- Custom template persistence

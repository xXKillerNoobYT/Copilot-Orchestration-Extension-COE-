# Context Bundle Size Limits

## Overview

Context bundles in the Copilot Orchestration Extension have size limits to prevent performance issues, memory problems, and timeout failures when communicating with the MCP server.

## Configuration

- **Maximum Files Per Bundle**: 100 files (`MAX_FILES_PER_BUNDLE`)
- **Warning Threshold**: 80 files (80% of maximum)

## Rationale

### Why Limit Context Bundle Size?

Large context bundles can cause several issues:

1. **Memory Issues**: Loading hundreds of files into memory can consume significant resources, especially in resource-constrained environments
2. **WebSocket Message Truncation**: Very large payloads may exceed WebSocket message size limits, causing incomplete data transmission
3. **MCP Request Timeouts**: Large context bundles increase serialization time and network transmission time, potentially exceeding timeout thresholds
4. **Poor Performance**: Processing large amounts of context data slows down the extension and agent responses

### Recommended Practices

- **Keep bundles focused**: Include only files directly relevant to the task
- **Split large contexts**: If you need more than 100 files, create multiple specialized bundles
- **Use file patterns**: Instead of listing every file, consider using broader context descriptions
- **Regular cleanup**: Remove files from bundles when they're no longer needed

## Validation Behavior

The extension validates context bundle sizes at two points:

### 1. When Opening a Bundle

When you open a context bundle file, the extension checks its size:

- **Under 80 files**: No warning, bundle opens normally
- **80-100 files**: Warning message displayed, bundle still opens
- **Over 100 files**: Error message displayed, bundle may have issues

### 2. When Inspecting a Bundle

When you inspect a bundle from the orchestrator panel:

- **Under 80 files**: Information message only
- **80-100 files**: Warning about approaching the limit
- **Over 100 files**: Strong warning about exceeding the limit

## Error Messages

### Exceeds Limit Error
```
Context bundle exceeds maximum file limit. Bundle has X files but limit is 100.
Large bundles can cause memory issues, WebSocket truncation, or MCP timeouts.
```

### Approaching Limit Warning
```
Context bundle is approaching the limit (X/100 files).
Consider splitting into multiple bundles to avoid performance issues.
```

## Telemetry

The extension logs context bundle file counts for monitoring:

```typescript
console.warn('Context bundle size warning:', {
  bundlePath: '/path/to/bundle.json',
  fileCount: 85,
  limit: 100
});
```

This helps identify patterns and optimize context usage over time.

## Technical Implementation

The validation is implemented in:
- `orchestratorPanel.ts`: Defines `MAX_FILES_PER_BUNDLE` constant
- `taskInteractionAPI.ts`: Implements `validateContextBundleSize()` function
- Tests: `taskInteractionAPI.bundleValidation.test.ts`

## Future Enhancements

Potential improvements to consider:

1. **Dynamic limits**: Adjust based on available system resources
2. **Size-based limits**: Limit by total byte size instead of file count
3. **Compression**: Automatically compress large context bundles
4. **Lazy loading**: Load bundle files on-demand rather than all at once
5. **Bundle merging**: Tools to combine multiple small bundles efficiently
6. **Usage analytics**: Track typical bundle sizes to optimize the limit

## Migration Guide

If you have existing bundles exceeding the limit:

1. **Review the bundle**: Identify which files are truly necessary
2. **Remove unused files**: Clean up files no longer relevant to the task
3. **Split by concern**: Create separate bundles for different aspects (e.g., frontend, backend, tests)
4. **Document splits**: Note relationships between related bundles
5. **Update references**: Update task files to reference the new bundle structure

## Examples

### Good Bundle Structure (45 files)
```json
{
  "id": "auth-feature-context",
  "name": "Authentication Feature",
  "files": [
    "src/auth/login.ts",
    "src/auth/register.ts",
    "src/auth/logout.ts",
    "src/models/User.ts",
    "tests/auth/login.test.ts",
    ...
  ]
}
```

### Oversized Bundle (150 files) - Should Split
```json
{
  "id": "entire-app-context",  // ❌ Too broad
  "name": "All Application Files",
  "files": [
    "src/**/*.ts",  // ❌ Over 100 files
    ...
  ]
}
```

### Better Approach - Split into Multiple Bundles
```json
// Bundle 1: Frontend (60 files)
{
  "id": "frontend-context",
  "name": "Frontend Components",
  "files": ["src/components/**/*.ts", ...]
}

// Bundle 2: Backend (55 files)
{
  "id": "backend-context",
  "name": "Backend Services",
  "files": ["src/services/**/*.ts", ...]
}

// Bundle 3: Tests (35 files)
{
  "id": "test-context",
  "name": "Test Files",
  "files": ["tests/**/*.test.ts", ...]
}
```

## Support

If you encounter issues with context bundle size limits:

1. Check the error message for the current file count
2. Review the bundle contents and remove unnecessary files
3. Consider splitting the bundle as described above
4. If the limit seems too restrictive for your use case, file an issue with details about your scenario

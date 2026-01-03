# Phase 3: Context Bundle System - COMPLETE

## Overview

The Context Bundle System provides intelligent context aggregation for tasks and agents. It parses documents, analyzes code, and creates versioned context bundles that can be linked to tasks for enhanced agent understanding.

## Architecture

### Components

1. **ContextBundleRepository** - Data access layer with versioning and caching
2. **ContextBundleService** - Business logic for bundle creation and management
3. **DocumentParserService** - Document parsing (Markdown, JSON, YAML, text)
4. **CodeAnalysisService** - Code analysis (PHP, TypeScript, JavaScript, Python)
5. **ContextBundleController** - RESTful API endpoints
6. **Events** - ContextBundleCreated, ContextBundleUpdated

### Data Flow

```
Task → ContextBundleService → DocumentParser/CodeAnalysis → ContextBundle
     ↓
ContextBundleRepository → Cache → Database
     ↓
Event Broadcasting (WebSocket)
```

## API Routes

### Task-Based Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/{taskId}/context-bundles` | List all bundles for task |
| POST | `/tasks/{taskId}/context-bundles/from-task` | Create from task data |
| POST | `/tasks/{taskId}/context-bundles/from-files` | Create from file paths |
| POST | `/tasks/{taskId}/context-bundles/from-repository` | Create from repository scan |
| GET | `/tasks/{taskId}/context-bundles/statistics` | Bundle statistics |
| GET | `/tasks/{taskId}/context-bundles/history` | Version history |
| GET | `/tasks/{taskId}/context-bundles/version/{version}` | Get specific version |
| POST | `/tasks/{taskId}/context-bundles/version` | Create new version |

### Bundle Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/context-bundles` | Create bundle manually |
| GET | `/context-bundles/{id}` | Get bundle by ID |
| POST | `/context-bundles/{id}/files` | Add files to bundle |
| DELETE | `/context-bundles/{id}/files` | Remove file from bundle |
| PATCH | `/context-bundles/{id}/metadata` | Update metadata |
| GET | `/context-bundles/search` | Search bundles by content |
| DELETE | `/context-bundles/{id}` | Delete bundle |

## Key Features

### 1. Multi-Format Document Parsing

**DocumentParserService** supports:

- **Markdown**: Headings, code blocks, links, frontmatter extraction
- **JSON**: Structure analysis, validation
- **YAML**: Configuration parsing
- **Text**: Word count, character analysis

```php
$parser = new DocumentParserService();
$result = $parser->parseMarkdown('path/to/file.md');

// Returns:
[
    'content' => '...',
    'metadata' => [
        'headings' => [['level' => 1, 'text' => 'Title'], ...],
        'code_blocks' => [['language' => 'php', 'code' => '...'], ...],
        'links' => [['text' => 'Link', 'url' => 'https://...'], ...],
    ],
    'line_count' => 150,
    'size' => 5000,
]
```

### 2. Code Analysis

**CodeAnalysisService** extracts metadata from:

- **PHP**: Namespaces, classes, functions, interfaces, traits, dependencies
- **TypeScript**: Imports, exports, classes, interfaces, types, functions
- **JavaScript**: ES6 imports/exports, functions, classes
- **Python**: Imports, classes, functions

```php
$analyzer = new CodeAnalysisService();
$analysis = $analyzer->analyzePhp('path/to/file.php');

// Returns:
[
    'language' => 'php',
    'namespace' => 'App\Services',
    'classes' => [
        ['name' => 'MyClass', 'extends' => 'BaseClass', 'implements' => ['Interface1']],
    ],
    'functions' => [
        ['name' => 'myMethod', 'parameters' => [...], 'return_type' => 'string'],
    ],
    'use_statements' => ['Illuminate\Support\Facades\Cache', ...],
    'complexity' => ['score' => 25, 'level' => 'medium'],
]
```

### 3. Versioning System

Context bundles support automatic versioning:

- Each task can have multiple bundle versions
- Version numbers auto-increment (1, 2, 3, ...)
- Version history tracking
- Compare versions over time

```php
// Create initial bundle (version 1)
$bundle1 = $service->createFromTask($task);

// Create new version (version 2)
$bundle2 = $service->createVersion($task->id, [
    'files' => $updatedFiles,
    'metadata' => ['change_note' => 'Updated dependencies'],
]);

// Get version history
$history = $repository->getVersionHistory($task->id);
```

### 4. Bundle Types

Four bundle types supported:

| Type | Description | Use Case |
|------|-------------|----------|
| `task_context` | Task description, criteria, dependencies | Agent task understanding |
| `file_context` | Specific file analysis | Code review, refactoring |
| `repository_context` | Full repository scan | Architecture analysis |
| `custom` | User-defined bundles | Special use cases |

### 5. Intelligent Caching

Cache strategy with tagged invalidation:

```php
// Context bundles: 15 min TTL
Cache::tags(['context_bundles', "bundle:{$id}"])
    ->remember("bundle:{$id}", 900, ...);

// Version history: 1 hour TTL
Cache::tags(['context_bundles', "task:{$taskId}"])
    ->remember("bundle:history:{$taskId}", 3600, ...);

// Statistics: 10 min TTL
Cache::tags(['context_bundles', "task:{$taskId}"])
    ->remember("bundle:stats:{$taskId}", 600, ...);
```

## Usage Examples

### Create Bundle from Task

```php
POST /api/v1/tasks/{taskId}/context-bundles/from-task
{
    "bundle_type": "task_context"
}

Response:
{
    "success": true,
    "message": "Context bundle created from task",
    "data": {
        "id": "uuid",
        "task_id": "task-uuid",
        "bundle_type": "task_context",
        "version": 1,
        "files": [
            {
                "path": "task_description.md",
                "type": "markdown",
                "content": "...",
                "size": 500
            }
        ],
        "metadata": {
            "task_type": "feature",
            "task_title": "Implement authentication",
            "dependencies": ["task-1", "task-2"]
        }
    }
}
```

### Create Bundle from Files

```php
POST /api/v1/tasks/{taskId}/context-bundles/from-files
{
    "file_paths": [
        "/path/to/Controller.php",
        "/path/to/Service.php",
        "/path/to/README.md"
    ],
    "bundle_type": "file_context"
}

Response:
{
    "success": true,
    "message": "Context bundle created from files",
    "data": {
        "id": "uuid",
        "version": 1,
        "files": [
            {
                "path": "Controller.php",
                "type": "php",
                "analysis": {
                    "classes": [...],
                    "functions": [...],
                    "complexity": {"level": "medium"}
                }
            },
            {
                "path": "README.md",
                "type": "markdown",
                "metadata": {
                    "headings": [...],
                    "code_blocks": [...]
                }
            }
        ]
    }
}
```

### Create Bundle from Repository

```php
POST /api/v1/tasks/{taskId}/context-bundles/from-repository
{
    "repository_path": "/path/to/project",
    "include": ["**/*.php", "**/*.ts"],
    "exclude": ["vendor/**", "node_modules/**"]
}

Response:
{
    "success": true,
    "message": "Context bundle created from repository",
    "data": {
        "id": "uuid",
        "version": 1,
        "bundle_type": "repository_context",
        "metadata": {
            "repository_path": "/path/to/project",
            "file_count": 45,
            "total_lines": 5420,
            "analyzed_at": "2026-01-02T..."
        }
    }
}
```

### Search Bundles

```php
GET /api/v1/context-bundles/search?query=authentication&bundle_type=file_context

Response:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "task_id": "task-uuid",
            "bundle_type": "file_context",
            "files": [
                {
                    "path": "AuthController.php",
                    "content": "...authentication logic..."
                }
            ]
        }
    ],
    "count": 1
}
```

### Get Bundle with Context

```php
GET /api/v1/context-bundles/{id}?include_context=true

Response:
{
    "success": true,
    "data": {
        "bundle": {
            "id": "uuid",
            "files": [...]
        },
        "statistics": {
            "total_files": 5,
            "total_size": 15000,
            "total_lines": 450,
            "file_types": {
                "php": 3,
                "markdown": 2
            }
        },
        "analysis": {
            "has_code": true,
            "has_documentation": true,
            "has_config": false,
            "complexity_estimate": "medium"
        }
    }
}
```

## Testing Coverage

### ContextBundleTest (22 Tests)

✅ **Creation & Validation**

- it_creates_a_context_bundle
- it_validates_required_fields_when_creating_bundle
- it_validates_bundle_type
- it_creates_bundle_from_task

✅ **Retrieval**

- it_retrieves_all_bundles_for_task
- it_retrieves_a_specific_bundle
- it_returns_404_for_nonexistent_bundle
- it_retrieves_bundle_with_context

✅ **File Operations**

- it_adds_files_to_bundle
- it_removes_file_from_bundle
- it_validates_file_paths_when_creating_from_files

✅ **Metadata**

- it_updates_bundle_metadata

✅ **Statistics & Analytics**

- it_gets_bundle_statistics

✅ **Versioning**

- it_gets_version_history
- it_gets_specific_version
- it_creates_new_version
- it_increments_version_numbers_correctly

✅ **Search**

- it_searches_bundles_by_content
- it_requires_minimum_search_query_length

✅ **Deletion**

- it_deletes_a_bundle

✅ **Bundle Types**

- it_handles_different_bundle_types

✅ **Repository Integration**

- it_validates_repository_path_when_creating_from_repository

## Performance Characteristics

### Caching Strategy

- **Bundle Data**: 15 minutes TTL (900s)
- **Version History**: 1 hour TTL (3600s)
- **Statistics**: 10 minutes TTL (600s)
- **Tagged Cache**: Granular invalidation per bundle/task

### Database Optimization

- Indexed columns: `task_id`, `bundle_type`, `version`, `created_at`
- JSON columns for flexible file/metadata storage
- Soft deletes for audit trail

### Memory Efficiency

- Lazy loading of file contents
- Streaming for large repositories
- Paginated search results

## Integration with Other Phases

### Phase 1: Task Orchestration

- Context bundles linked to tasks via `task_id`
- Automatic bundle creation on task creation (optional)
- Bundle versioning tracks task evolution

### Phase 2: Multi-Agent System

- Agents receive context bundles for task understanding
- Capability matching enhanced by bundle analysis
- Code complexity affects agent assignment

### Phase 4: GitHub Integration (Planned)

- Sync GitHub issue descriptions to bundles
- Parse PR diff as file context
- Link commits to bundle versions

### Phase 5: Monitoring (Planned)

- Bundle creation metrics
- Parse performance tracking
- Storage usage monitoring

## Configuration

### Environment Variables

```env
# Context Bundle Settings
CONTEXT_BUNDLE_CACHE_TTL=900
CONTEXT_BUNDLE_MAX_FILE_SIZE=10485760  # 10MB
CONTEXT_BUNDLE_MAX_FILES_PER_BUNDLE=100

# Repository Scanning
CONTEXT_BUNDLE_DEFAULT_INCLUDES="**/*.php,**/*.ts,**/*.js"
CONTEXT_BUNDLE_DEFAULT_EXCLUDES="vendor/**,node_modules/**,storage/**"
```

### Service Provider Registration

```php
// app/Providers/AppServiceProvider.php
public function register()
{
    $this->app->singleton(ContextBundleRepository::class);
    $this->app->singleton(DocumentParserService::class);
    $this->app->singleton(CodeAnalysisService::class);
    $this->app->bind(ContextBundleService::class);
}
```

## Error Handling

### ContextBundleException

```php
try {
    $bundle = $service->createBundle($data);
} catch (ContextBundleException $e) {
    // Validation or business logic error
    return response()->json([
        'success' => false,
        'message' => $e->getMessage(),
        'error_type' => 'ContextBundleException',
    ], 400);
}
```

### Common Errors

| Error | Status | Description |
|-------|--------|-------------|
| Task ID required | 400 | Missing task_id field |
| Invalid bundle type | 400 | Bundle type not in allowed list |
| Bundle not found | 404 | Bundle ID doesn't exist |
| File not found | 400 | File path doesn't exist |
| No existing bundle | 404 | Cannot create version without base |

## Event Broadcasting

### ContextBundleCreated

```php
event(new ContextBundleCreated($bundle));

// Broadcasts to: channel 'context-bundles'
{
    "bundle_id": "uuid",
    "task_id": "task-uuid",
    "bundle_type": "task_context",
    "version": 1,
    "created_at": "2026-01-02T..."
}
```

### ContextBundleUpdated

```php
event(new ContextBundleUpdated($bundle));

// Broadcasts to: channel 'context-bundles'
{
    "bundle_id": "uuid",
    "task_id": "task-uuid",
    "bundle_type": "task_context",
    "version": 1,
    "updated_at": "2026-01-02T..."
}
```

## Next Steps

### Phase 4: GitHub Integration

- Sync GitHub issues to context bundles
- Parse PR diffs and comments
- Link commits to bundle versions
- Two-way synchronization

### Phase 5: Monitoring & Observability

- Bundle creation metrics
- Parse performance tracking
- Storage usage monitoring
- Alert on large bundles

## Summary

**Phase 3 Complete** ✅

- ✅ ContextBundleRepository (280 lines) - Data access with versioning
- ✅ ContextBundleService (400 lines) - Business logic and orchestration
- ✅ DocumentParserService (380 lines) - Multi-format document parsing
- ✅ CodeAnalysisService (470 lines) - Code analysis for 4 languages
- ✅ ContextBundleController (480 lines) - 15 RESTful API endpoints
- ✅ Custom exceptions and events
- ✅ 22 comprehensive tests
- ✅ 15 API routes
- ✅ Complete documentation

**Total Phase 3 Code**: ~2,400 lines production code, ~420 lines tests

**Cumulative Project Stats**:

- **Production Code**: ~6,400 lines
- **Test Code**: ~1,320 lines
- **Test Cases**: 60 comprehensive tests
- **API Endpoints**: 36 RESTful routes
- **Files Created**: 27 core files

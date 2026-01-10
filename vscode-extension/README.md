# Copilot Orchestrator - VS Code Extension

A foundational VS Code extension scaffold for Copilot Orchestration with advanced task parsing, dependency resolution, and graph visualization capabilities.

## Features

### 📋 Task Management
- Parse structured Markdown task files with YAML frontmatter
- Tree view display of tasks and subtasks
- Support for task status, priority, type, and assignees
- Validation with detailed error reporting

### 🔗 Dependency Management
- Directed acyclic graph (DAG) generation
- Automatic cycle detection
- Topological sorting for execution order
- Parallel execution level identification
- Orphaned task detection

### 📊 Visualization & Analysis
- Mermaid diagram generation
- GraphViz DOT format export
- Critical path analysis
- Impact analysis (what tasks are blocked if one fails)
- Graph statistics and metrics

### 🚀 Commands

- **Copilot Orchestrator: Start** - Initialize the orchestrator
- **Copilot Orchestrator: Refresh Tasks** - Reload tasks from disk
- **Copilot Orchestrator: Show Task Graph** - Visualize task dependencies as Mermaid diagram
- **Copilot Orchestrator: Show Task Dependencies** - Display execution order and validation

## Installation

### Prerequisites
- VS Code 1.90.0 or higher
- Node.js 14+
- (Optional) OpenAI API key for cloud LLM models
- (Optional) LM Studio for local LLM inference

### Setup

1. Clone the repository
2. Navigate to the extension directory:
   ```bash
   cd vscode-extension
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Compile the extension:
   ```bash
   npm run compile
   ```

5. Run tests:
   ```bash
   npm test
   ```

## LLM Configuration

The extension supports OpenAI-compatible LLM endpoints including cloud providers and local inference servers.

### Configuring LLM Settings

1. **Open Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. **Type** "Configure LLM Settings"
3. **Enter** the following when prompted:
   - **Base URL**: OpenAI endpoint (default: `http://192.168.137.7:1234/v1` for LM Studio)
   - **API Key**: Your API key (marked secret in settings)
   - **Default Model**: Model name (e.g., `gpt-4`, `gpt-4-turbo`, `neural-chat`)
   - **Temperature**: Randomness 0.0–2.0 (default: 0.7)
   - **Timeout (ms)**: Request timeout in milliseconds (default: 30000)
   - **Task Roots**: Comma-separated folders to scan for workspace tasks (default: `_ZENTASKS`)

### LM Studio Setup (Local Inference)

1. Download [LM Studio](https://lmstudio.ai)
2. Download a model (e.g., Neural Chat, Dolphin, Mistral)
3. Start the local server (default: `http://localhost:1234`)
4. Configure the extension:
   - **Base URL**: `http://192.168.137.7:1234/v1`
   - **API Key**: `lm-studio` (dummy key, ignored locally)
   - **Model**: Name of downloaded model

### Cloud Providers

**OpenAI:**
- Base URL: `https://api.openai.com/v1`
- Model: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- API Key: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

**Azure OpenAI:**
- Base URL: `https://{resource}.openai.azure.com/v1`
- Model: Deployment name
- API Key: Get from Azure Portal

### Test Connection

1. **Open Command Palette** and type "Test LLM Connection"
2. Extension will ping your configured endpoint
3. Status shown in extension status bar and notification

## Workspace Task Loading

The extension automatically loads task files from your workspace:

### Default Behavior

- Scans `_ZENTASKS/` directory for `.task.md` and `.md` files
- Falls back to bundled `sample-tasks/` if workspace directory not found
- Shows status in tree view when tasks are loaded from workspace

### Custom Task Roots

Configure custom directories in LLM Settings (Task Roots field):
- Comma-separated list: `_ZENTASKS,docs/plans,backlog`
- Extension tries each in order until one is found
- Useful for monorepos with multiple task roots

## Usage

### Task File Format

Create `.md` or `.task.md` files with YAML frontmatter:

```markdown
---
id: TASK-001
title: Implement User Authentication
type: feature
status: pending
priority: high
dependencies:
  - TASK-000
assignees:
  - coder
  - tester
estimate: 4h
labels:
  - security
  - api
---

## Description

Implement JWT-based authentication system...

## Acceptance Criteria

- [ ] User registration endpoint
- [ ] Login with JWT token generation
- [ ] Token refresh mechanism
- [ ] Logout functionality
```

### Supported Task Fields

- **id**: Unique identifier (required)
- **title**: Task title (required)
- **type**: feature | bug | refactor | maintenance | architecture | testing | documentation
- **status**: pending | approved | in_progress | testing | review | completed | failed | blocked | cancelled
- **priority**: critical | high | medium | low
- **dependencies**: Array of task IDs this task depends on
- **assignees**: Array of agent types (planner, architect, coder, tester, etc.)
- **estimate**: Time estimate (e.g., "2h", "30m", "3d", "1w")
- **labels**: Array of string labels
- **subtasks**: Nested task structure

### Using the Task Graph Generator

#### In Code

```typescript
import {
  parseTasksFromDirectory,
  generateTaskGraph,
  getExecutionOrder,
  detectCycles,
  getReadyTasks,
} from './src/index';

// Parse tasks
const tasks = await parseTasksFromDirectory('_ZENTASKS');

// Generate graph
const graph = generateTaskGraph(tasks);

// Get execution order
const order = getExecutionOrder(tasks);

// Detect cycles
const cycles = detectCycles(tasks);

// Get ready tasks
const ready = getReadyTasks(tasks);
```

#### Via VS Code

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Copilot Orchestrator"
3. Choose desired command

## Development

### Build Commands

```bash
# Compile in production mode
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm test

# Run demo
npm run demo
```

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts           # Main extension entry point
│   ├── taskParser.ts          # Task parsing logic
│   ├── taskGraphGenerator.ts  # Graph generation and analysis
│   ├── taskGraphDemo.ts       # Demo application
│   ├── taskGraphTest.ts       # Test suite
│   ├── index.ts               # Unified exports
│   └── validate-parser.ts     # Parser validation
├── dist/                      # Compiled output
├── sample-tasks/              # Example task files
├── package.json               # NPM configuration
├── tsconfig.json              # TypeScript configuration
├── webpack.config.js          # Build configuration
├── QUICKSTART.md             # Quick start guide
├── TASK-GRAPH-GENERATOR.md   # Full API documentation
└── IMPLEMENTATION-SUMMARY.md  # Implementation details
```

## Documentation

- [Quick Start Guide](QUICKSTART.md) - Get up and running quickly
- [Task Graph Generator Documentation](TASK-GRAPH-GENERATOR.md) - Complete API reference
- [Implementation Summary](IMPLEMENTATION-SUMMARY.md) - Technical implementation details

## API Overview

### Task Parsing

```typescript
parseTasksFromDirectory(dir: string): Promise<ParsedTask[]>
parseTaskFile(content: string, options?: ParserOptions): ParseResult
parseTaskMarkdown(markdown: string, options?: { fileName?: string }): ParsedTask
```

### Graph Generation

```typescript
generateTaskGraph(tasks: ParsedTask[]): TaskGraph
getExecutionOrder(tasks: ParsedTask[]): string[][]
detectCycles(tasks: ParsedTask[]): string[][]
getReadyTasks(tasks: ParsedTask[]): ParsedTask[]
```

### Advanced Analysis

```typescript
const generator = new TaskGraphGenerator(tasks);
const graph = generator.generateGraph();

// Analysis methods
generator.getReadyTasks(graph): TaskNode[]
generator.getCriticalPath(graph): string[]
generator.getStats(graph): GraphStats
generator.getImpactedTasks(taskId: string): string[]
generator.validateDependencies(): ValidationResult
```

### Visualization

```typescript
exportToDot(graph: TaskGraph): string
exportToMermaid(graph: TaskGraph): string
```

## Testing

The extension includes a comprehensive test suite:

```bash
npm test
```

**Test Coverage:**
- ✅ Basic graph generation
- ✅ Parallel execution levels
- ✅ Cycle detection
- ✅ Ready task detection
- ✅ Orphaned task detection
- ✅ Depth calculation
- ✅ Critical path analysis
- ✅ Impact analysis
- ✅ Dependency validation
- ✅ Export formats
- ✅ Graph statistics

## Architecture

### Core Components

1. **Task Parser** - Parses Markdown files with YAML frontmatter
2. **Task Graph Generator** - Builds dependency graph using graphlib
3. **Validation Engine** - Validates task structure and dependencies
4. **Visualization Engine** - Exports to DOT and Mermaid formats
5. **VS Code Integration** - Commands, tree views, and UI

### Key Algorithms

- **Topological Sort** - Orders tasks by dependencies
- **Tarjan's Algorithm** - Detects circular dependencies
- **Depth-First Search** - Computes critical path and impact
- **Level-Order Grouping** - Enables parallel execution

## Dependencies

```json
{
  "dependencies": {
    "graphlib": "^2.1.8",
    "yaml": "^2.6.0"
  },
  "devDependencies": {
    "@types/graphlib": "^2.1.12",
    "@types/node": "^22.19.3",
    "@types/vscode": "^1.90.0",
    "ts-loader": "^9.5.1",
    "typescript": "^5.4.0",
    "webpack": "^5.91.0",
    "webpack-cli": "^5.1.4"
  }
}
```

## Examples

### Find High Priority Tasks Ready to Execute

```typescript
const tasks = await parseTasksFromDirectory('_ZENTASKS');
const ready = getReadyTasks(tasks);
const urgent = ready.filter(t => t.priority === 'critical' || t.priority === 'high');
console.log(`${urgent.length} urgent tasks ready to work on`);
```

### Validate Project Dependencies

```typescript
const generator = new TaskGraphGenerator(tasks);
const validation = generator.validateDependencies();

if (!validation.valid) {
  console.error('Dependency errors:', validation.errors);
}

const cycles = detectCycles(tasks);
if (cycles.length > 0) {
  console.error('Circular dependencies:', cycles);
}
```

### Track Project Progress

```typescript
const graph = generateTaskGraph(tasks);
const stats = generator.getStats(graph);

console.log(`Progress: ${stats.completedTasks}/${stats.totalTasks} tasks complete`);
console.log(`Ready to work: ${stats.readyToExecute} tasks`);
console.log(`Critical path: ${stats.criticalPathLength} tasks deep`);
```

### Generate Visualization

```typescript
const graph = generateTaskGraph(tasks);
const mermaid = exportToMermaid(graph);

// Save to file or display in VS Code
await vscode.workspace.openTextDocument({
  content: mermaid,
  language: 'mermaid'
});
```

## Troubleshooting

### Module not found errors

Run `npm install` to ensure all dependencies are installed.

### TypeScript compilation errors

Run `npm run compile` to check for errors.

### Tests failing

Ensure you're in the vscode-extension directory and run `npm test`.

### No tasks showing up

Check that your task files:
- Are in the correct directory
- Have valid YAML frontmatter
- Use `.md` or `.task.md` extension
- Have required fields (id, title)

## Performance

- Handles 1000+ tasks efficiently
- O(V + E) graph operations
- Minimal memory footprint
- Fast validation and analysis

## Future Enhancements

- [ ] Interactive graph visualization
- [ ] Gantt chart view
- [ ] Real-time collaboration
- [ ] GitHub issue sync
- [ ] AI-powered task recommendations
- [ ] Resource allocation
- [ ] Timeline estimation

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Check the [documentation](TASK-GRAPH-GENERATOR.md)
- Review the [examples](src/taskGraphDemo.ts)
- Run the [tests](src/taskGraphTest.ts)

---

**Version**: 1.0.0  
**Last Updated**: January 6, 2026  
**Status**: ✅ Production Ready

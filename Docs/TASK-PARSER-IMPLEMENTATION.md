# Task Parser Implementation Guide

**Version:** 1.0  
**Date:** January 7, 2026  
**Technology:** TypeScript/Node.js + PHP/Laravel  

---

## Overview

The task parser transforms Markdown task files (with YAML front matter) into structured Task objects. It supports:

- **YAML Metadata Parsing** — extract all front-matter fields
- **Markdown Section Extraction** — parse description, criteria, subtasks
- **Validation** — enforce schema rules before accepting tasks
- **Serialization** — convert Task objects back to Markdown
- **Error Handling** — report validation issues with clear messages

---

## Architecture

### TypeScript Implementation (VS Code Extension)

**File:** `vscode-extension/src/taskParser.ts`

**Responsibilities:**

- Load `.task.md` files from disk
- Parse YAML front matter and Markdown body
- Validate against schema
- Display in VS Code Tree View
- Enable edit operations (create, update, complete)

**Key Interfaces:**

```typescript
interface Task {
  // Metadata
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  complexity: Complexity;
  estimateMinutes: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Dependencies
  dependsOn: string[]; // task IDs
  parentTask?: string;

  // Agent
  assignedTo: {
    agentType: AgentType;
    agentName?: string;
  };

  // GitHub
  githubIssueId?: number;
  githubBranch?: string;

  // Body Content
  description: string;
  acceptanceCriteria: string[];
  implementationDetails: string;
  testStrategy: string;
  aiPrompt?: AiPrompt;
  subtasks: Subtask[];
  reviewNotes: ReviewNote[];
  completionSummary?: string;
}

interface AiPrompt {
  objective: string;
  context: string;
  requirements: string[];
  expectedOutput: string;
  guardrails: string[];
}

interface Subtask {
  order: number;
  title: string;
  completed: boolean;
  estimateMinutes?: number;
}
```

**Key Methods:**

```typescript
// Parse operations
parseFile(filePath: string): Task
parse(content: string): Task
parseYamlMetadata(yaml: string): Partial<Task>
parseMarkdownSections(markdown: string): Partial<Task>

// Extraction
extractSection(markdown: string, sectionName: string): string
extractChecklist(markdown: string, sectionName: string): string[]
extractBulletList(text: string, listName: string): string[]
parseSubtasks(markdown: string): Subtask[]
parseAiPrompt(markdown: string): AiPrompt | undefined
parseReviewNotes(markdown: string): ReviewNote[]

// Validation
validate(task: Task): ValidationError[]

// Serialization
toMarkdown(task: Task): string
toYaml(task: Task): string
toMarkdownBody(task: Task): string
```

---

### PHP Implementation (Laravel Backend)

**File:** `app/Services/TaskParsingService.php`

**Responsibilities:**

- Parse task files when synced to backend
- Store structured data in database (Task Eloquent model)
- Validate against schema before creating/updating
- Serialize Task model back to Markdown for export

**Key Methods:**

```php
namespace App\Services;

class TaskParsingService
{
    /**
     * Parse a task file (Markdown with YAML front matter)
     * @param string $filePath Path to task file
     * @return array Parsed task data (ready for Task model)
     */
    public function parseTaskFile(string $filePath): array;

    /**
     * Extract YAML metadata from front matter
     * @param string $yaml YAML content
     * @return array Metadata array
     */
    protected function parseYamlMetadata(string $yaml): array;

    /**
     * Extract Markdown sections
     * @param string $content Markdown content
     * @return array Sections (description, criteria, etc.)
     */
    protected function extractMarkdownSections(string $content): array;

    /**
     * Validate task data against schema
     * @param array $taskData Task data to validate
     * @return array Validation errors (empty if valid)
     */
    public function validateTask(array $taskData): array;

    /**
     * Generate YAML from task array
     * @param array $taskData Task data
     * @return string YAML string
     */
    public function generateYaml(array $taskData): string;

    /**
     * Generate Markdown from task array
     * @param array $taskData Task data
     * @return string Markdown string
     */
    public function generateMarkdown(array $taskData): string;

    /**
     * Sync task file to database
     * @param Task $task Eloquent model
     * @param array $parsedData Parsed from file
     * @return Task Updated model
     */
    public function syncToDatabase(Task $task, array $parsedData): Task;
}
```

---

## Parsing Algorithm

### Step 1: Split Front Matter

```
Input: Markdown file content
Regex: /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
Output: YAML string, Markdown string
```

**Example:**

```markdown
---
id: TASK-xxx-yyy
title: Example Task
status: pending
---

# Example Task

## Description
...
```

→ YAML: `id: TASK-xxx-yyy\ntitle: Example Task\nstatus: pending`  
→ Markdown: `# Example Task\n\n## Description\n...`

---

### Step 2: Parse YAML Metadata

```typescript
function parseYamlMetadata(yamlString: string): Partial<Task> {
  const data = YAML.parse(yamlString);
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    status: data.status,
    priority: data.priority,
    complexity: data.complexity,
    estimateMinutes: data.estimate_minutes,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    // ... all other YAML fields
  };
}
```

---

### Step 3: Parse Markdown Sections

Extract body content into structured fields:

```typescript
function parseMarkdownSections(markdown: string): Partial<Task> {
  return {
    description: extractSection(markdown, 'Description'),
    acceptanceCriteria: extractChecklist(markdown, 'Acceptance Criteria'),
    implementationDetails: extractSection(markdown, 'Implementation Details'),
    testStrategy: extractSection(markdown, 'Test Strategy'),
    aiPrompt: parseAiPrompt(markdown),
    subtasks: parseSubtasks(markdown),
    reviewNotes: parseReviewNotes(markdown),
    completionSummary: extractSection(markdown, 'Completion Summary'),
  };
}
```

**Section Extraction (Regex):**

```typescript
function extractSection(markdown: string, sectionName: string): string {
  const regex = new RegExp(
    `## ${sectionName}\n\n([\\s\\S]*?)(?=\n## |$)`,
    'i'
  );
  const match = markdown.match(regex);
  return match ? match[1].trim() : '';
}
```

**Checklist Extraction (Regex):**

```typescript
function extractChecklist(markdown: string, sectionName: string): string[] {
  const section = extractSection(markdown, sectionName);
  const items: string[] = [];
  const itemRegex = /- \[(?:x| )\]\s*(.+?)(?=\n|$)/gi;
  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    items.push(match[1].trim());
  }
  return items;
}
```

**Subtask Parsing:**

```typescript
function parseSubtasks(markdown: string): Subtask[] {
  const section = extractSection(markdown, 'Subtasks');
  const subtasks: Subtask[] = [];
  const itemRegex = /- \[(?:x| )\]\s*\[SUBTASK-(\d+)\]\s*(.+?)(?=\n|$)/gi;
  
  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    const order = parseInt(match[1], 10);
    const title = match[2].trim();
    subtasks.push({
      order,
      title,
      completed: match[0].includes('[x]'),
    });
  }
  
  return subtasks.sort((a, b) => a.order - b.order);
}
```

---

### Step 4: Merge and Validate

```typescript
function parse(content: string): Task {
  // Step 1-3: Parse YAML and Markdown
  const metadata = parseYamlMetadata(yamlString);
  const sections = parseMarkdownSections(markdown);
  
  // Merge
  const task: Task = { ...metadata, ...sections };
  
  // Step 4: Validate
  const errors = validate(task);
  if (errors.some(e => e.severity === 'error')) {
    throw new Error(`Validation failed: ${errors.map(e => e.message).join('\n')}`);
  }
  
  return task;
}
```

---

## Validation Rules

### Schema Constraints

**Required Fields:**

- `id` — matches `TASK-[a-z0-9]+-[a-z0-9]+`
- `title` — non-empty string
- `type` — one of enum values
- `status` — one of enum values
- `priority` — one of {critical, high, medium, low}
- `description` — non-empty string
- `acceptanceCriteria` — at least 1 item

**Enum Validation:**

```typescript
const validStatuses = ['pending', 'in_progress', 'review', 'testing', 'blocked', 'done', 'deferred', 'cancelled'];
if (!validStatuses.includes(task.status)) {
  errors.push({ field: 'status', message: 'Invalid status', severity: 'error' });
}
```

**Temporal Rules:**

```typescript
if (task.createdAt > task.updatedAt) {
  errors.push({ field: 'timestamps', message: 'createdAt > updatedAt', severity: 'error' });
}

if (task.completedAt && task.completedAt < task.updatedAt) {
  errors.push({ field: 'completedAt', message: 'completedAt < updatedAt', severity: 'error' });
}
```

**Dependency Rules:**

```typescript
if (task.dependsOn) {
  for (const depId of task.dependsOn) {
    if (!/^TASK-[a-z0-9]+-[a-z0-9]+$/i.test(depId)) {
      errors.push({ field: 'dependsOn', message: `Invalid task ID: ${depId}`, severity: 'error' });
    }
  }
}
```

---

## Serialization

### Convert Task Back to Markdown

```typescript
function toMarkdown(task: Task): string {
  const yaml = toYaml(task);
  const body = toMarkdownBody(task);
  return `---\n${yaml}\n---\n\n${body}`;
}
```

**YAML Generation:**

```typescript
function toYaml(task: Task): string {
  const data = {
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    priority: task.priority,
    complexity: task.complexity,
    estimate_minutes: task.estimateMinutes,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
    // ... all fields
  };
  
  return YAML.stringify(data, { lineWidth: 0 });
}
```

**Markdown Body Generation:**

```typescript
function toMarkdownBody(task: Task): string {
  let body = `# ${task.title}\n\n`;
  
  body += `## Description\n\n${task.description}\n\n`;
  
  if (task.acceptanceCriteria?.length > 0) {
    body += `## Acceptance Criteria\n\n`;
    task.acceptanceCriteria.forEach(criterion => {
      body += `- [ ] ${criterion}\n`;
    });
    body += '\n';
  }
  
  // ... other sections
  
  return body;
}
```

---

## Integration Points

### VS Code Extension

```typescript
// In extension activation
import TaskParser from './taskParser';

// Load tasks from _ZENTASKS directory
const taskFiles = await glob('_ZENTASKS/**/*.task.md');
const tasks = taskFiles.map(file => TaskParser.parseFile(file));

// Display in tree view
tasks.forEach(task => {
  treeView.addItem({
    label: task.title,
    id: task.id,
    icon: getPriorityIcon(task.priority),
    status: task.status,
  });
});

// On task complete
async function completeTask(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  task.status = 'done';
  task.completedAt = new Date();
  
  const markdown = TaskParser.toMarkdown(task);
  await fs.writeFile(`_ZENTASKS/${task.id}.task.md`, markdown);
}
```

### Laravel Backend

```php
// In TaskService or similar
$taskPath = resource_path("../\\_ZENTASKS/TASK-{$id}.task.md");
$parsedData = $this->taskParser->parseTaskFile($taskPath);

// Validate
$errors = $this->taskParser->validateTask($parsedData);
if (!empty($errors)) {
    throw ValidationException::withMessages($errors);
}

// Create or update in database
$task = Task::updateOrCreate(
    ['id' => $parsedData['id']],
    $parsedData
);

// When task completes, regenerate Markdown
$markdown = $this->taskParser->generateMarkdown($task->toArray());
Storage::disk('tasks')->put("TASK-{$task->id}.task.md", $markdown);
```

---

## Error Handling

### Parse Errors

```typescript
try {
  const task = TaskParser.parse(content);
} catch (error) {
  // Invalid YAML format
  // Missing front matter
  // Validation failed
  console.error(`Parse error: ${error.message}`);
}
```

### Validation Errors

```typescript
const errors = TaskParser.validate(task);

if (errors.length > 0) {
  console.log('Validation issues:');
  errors.forEach(err => {
    console.log(`  ${err.field}: ${err.message} (${err.severity})`);
  });
}
```

---

## Performance Considerations

- **Parsing:** <100ms per task file (YAML + regex)
- **Validation:** <50ms per task (enum checks, temporal rules)
- **Serialization:** <100ms per task (YAML generation)
- **Caching:** Cache parsed tasks in memory (tree view)
- **File I/O:** Use async file operations (don't block UI)

---

## Testing

### Unit Tests

```typescript
describe('TaskParser', () => {
  it('parses YAML front matter', () => {
    const content = `---\nid: TASK-xxx-yyy\ntitle: Test\n---\n# Test`;
    const task = TaskParser.parse(content);
    expect(task.id).toBe('TASK-xxx-yyy');
    expect(task.title).toBe('Test');
  });

  it('extracts sections', () => {
    const markdown = `## Description\n\nTest description\n## Next Section`;
    const desc = TaskParser.extractSection(markdown, 'Description');
    expect(desc).toBe('Test description');
  });

  it('validates task schema', () => {
    const task = { /* invalid data */ };
    const errors = TaskParser.validate(task);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('serializes back to Markdown', () => {
    const task = { /* valid task */ };
    const markdown = TaskParser.toMarkdown(task);
    expect(markdown).toMatch(/^---\n/);
    expect(markdown).toMatch(/\n---\n/);
  });
});
```

---

## Best Practices

1. **Always validate** after parsing — don't assume format is correct
2. **Handle errors gracefully** — show user-friendly error messages
3. **Cache parsed tasks** — don't re-parse on every access
4. **Use streaming for large files** — if tasks become very large
5. **Test with real task files** — parser must handle production data
6. **Keep parsers in sync** — TypeScript and PHP should match on field names
7. **Document format changes** — increment schema version on breaking changes

---

## Sign-off

Task parser specification provides robust, extensible parsing for `.task.md` files with full validation and serialization support.

**Status:** ✅ Ready for implementation

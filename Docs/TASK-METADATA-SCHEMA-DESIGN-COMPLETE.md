# Task Metadata Schema & Format Design — Complete Package

**Status:** ✅ Complete  
**Date:** January 7, 2026  
**Version:** 1.0  

---

## What Has Been Delivered

This design package provides a **complete, production-ready task metadata schema and format** for the Copilot Orchestration Extension.

### 📋 Documents Created

1. **[TASK-METADATA-SCHEMA-SPEC.md](TASK-METADATA-SCHEMA-SPEC.md)**
   - Complete YAML front-matter specification
   - All fields documented with types and examples
   - Markdown body structure (sections, format)
   - Validation rules and constraints
   - Parser requirements for Node.js and PHP

2. **[TASK-TEMPLATE-MINIMAL.md](TASK-TEMPLATE-MINIMAL.md)**
   - Minimal task template (for simple tasks)
   - Reduced set of required fields
   - Can be used as starting point for new tasks

3. **[TASK-PARSER-IMPLEMENTATION.md](TASK-PARSER-IMPLEMENTATION.md)**
   - Detailed parser algorithm (parsing stages)
   - TypeScript parser interface and methods
   - PHP parser interface and methods
   - Integration examples (VS Code extension, Laravel backend)
   - Error handling and validation
   - Serialization logic

4. **[TASK-mk3k0e09-culd4.task.md](_ZENTASKS/TASK-mk3k0e09-culd4.task.md)** (Real Example)
   - Complete task file using the new schema
   - Phase 7 implementation task
   - Shows all sections and metadata fields
   - Ready as reference for other tasks

---

## Key Design Decisions

### 1. Format: Markdown + YAML Front Matter

**Why:**

- ✅ Human-readable in editors and GitHub
- ✅ Git-diffable (line-based)
- ✅ VS Code native support (preview, navigation)
- ✅ Parseable from Node.js and PHP
- ✅ Audit trail (all changes tracked in git history)
- ✅ Works with existing tools (grep, GitHub search)

**Format:**

```markdown
---
id: TASK-xxx-yyy
title: Task Title
status: pending
priority: high
# ... more YAML fields
---

# Task Title

## Description
...

## Acceptance Criteria
- [ ] Criterion 1
...
```

---

### 2. File Naming: `TASK-{id}.task.md`

**Why:**

- ✅ Unique identifier in filename (findable)
- ✅ `.task` extension clarifies file type
- ✅ Easy to glob: `TASK-*.task.md` or `**/*.task.md`
- ✅ Sortable chronologically (if ID includes timestamp)

**Example:** `TASK-mk3k0e09-culd4.task.md`

---

### 3. Metadata Completeness

**YAML fields include:**

- Status, priority, complexity, estimate
- Dependencies and parent task
- Agent assignment (type, name, escalation)
- GitHub integration (issue, branch, PR)
- Context bundles (for AI prompts)
- Audit trail (created, updated, completed, review notes)
- Metrics (cycle time, failures, reviews)

**This enables:**

- ✅ Automated task scheduling (dependencies)
- ✅ Agent assignment (auto-matching)
- ✅ GitHub sync (bidirectional)
- ✅ Progress tracking (metrics)
- ✅ Audit compliance (full history)

---

### 4. Body Structure: Clear Sections

**Standard sections:**

1. **Description** (goal, context, scope)
2. **Acceptance Criteria** (testable, measurable)
3. **Implementation Details** (architecture, tech, API/integration)
4. **Test Strategy** (unit, integration, manual, success metrics)
5. **AI Prompt** (objective, context, requirements, output, guardrails)
6. **Subtasks** (atomic 15–45 min tasks)
7. **Review Notes** (iteration history)
8. **Completion Summary** (post-task comment)

**Benefits:**

- ✅ Clear navigation (easy to scan)
- ✅ AI-friendly (structured instructions)
- ✅ Testable (criteria separate from implementation)
- ✅ Auditable (review history in file)

---

### 5. AI Prompt Block (New)

**Why separate section:**

- ✅ Explicit instructions for agents (Claude, GPT-4, etc.)
- ✅ Structured format (objective, context, requirements, guardrails)
- ✅ Reduces ambiguity (agents can't misinterpret)
- ✅ Versioned with task (if LLM changes, we know why)

**Example:**

```markdown
## AI Prompt

### Objective
Implement state machine for agent switching.

### Context
Existing task framework, TaskRepository, SOLID principles...

### Requirements
- Use PHP service classes
- State transitions atomic (use cache)
- Exponential backoff on errors
- All decisions logged

### Expected Output
AgentSwitchService with 6 states...

### Guardrails
- Do NOT hardcode endpoints
- Do NOT block synchronously
- Do NOT skip logging
```

---

## Schema Highlights

### Enums (Type Safety)

```yaml
type: feature|bug|refactor|maintenance|architecture|testing|documentation
status: pending|in_progress|review|testing|blocked|done|deferred|cancelled
priority: critical|high|medium|low
complexity: low|medium|high|expert
agent_type: zen_planner|auto_zen|zen_architect|cloud_coder|health_monitor
```

### Temporal Constraints

```
createdAt ≤ updatedAt ≤ completedAt (if set)
start_time ≤ end_time (if both set)
```

### Dependency Validation

```
- All referenced task IDs must match pattern TASK-[a-z0-9]+-[a-z0-9]+
- No circular dependencies allowed
- Parent task must exist if parent_task field set
```

### Metrics

```
cycle_time_minutes = endTime - startTime
review_count = number of review iterations
failure_count = attempts before success
```

---

## Parser Requirements

### TypeScript (VS Code Extension)

**Location:** `vscode-extension/src/taskParser.ts`

**Main Methods:**

- `parseFile(filePath)` — load and parse task file
- `parse(content)` — parse Markdown with YAML
- `validate(task)` — check against schema
- `toMarkdown(task)` — serialize back to file

**Interfaces:**

- `Task` — main task data structure
- `AiPrompt` — AI instruction block
- `Subtask` — atomic sub-work
- `ReviewNote` — review iteration
- `ValidationError` — schema violation

---

### PHP (Laravel Backend)

**Location:** `app/Services/TaskParsingService.php`

**Main Methods:**

- `parseTaskFile(filePath)` — load and parse
- `validateTask(taskData)` — schema validation
- `generateYaml(taskData)` — serialize to YAML
- `generateMarkdown(taskData)` — serialize to Markdown

**Integration:**

- Read/write task files from `_ZENTASKS/` directory
- Sync to Task Eloquent model
- Validate before database operations

---

## Integration with Existing Systems

### With Phase 1-6 (Existing)

✅ Task model in database — parser reads/writes to model  
✅ Repository pattern — TaskRepository supplies data  
✅ Service layer — TaskParsingService fits pattern  
✅ Validation — follows existing form request style  

### With Phase 7 (Auto-Agent Switching)

✅ Agent invocation — parses AI prompts to send to agents  
✅ Task status — tracks state through status enum  
✅ Dependencies — validates before execution  
✅ Metrics — stores cycle time, review count  

### With Phase 8+ (Future)

✅ GitHub sync — github_issue_id, github_branch fields  
✅ Branching — branch naming from task type/id  
✅ Health monitor — tags for maintenance task detection  

---

## Compatibility

### VS Code

- ✅ Markdown preview (native)
- ✅ YAML syntax highlighting (with extensions)
- ✅ Link navigation (dependencies, GitHub links)
- ✅ Tree view display
- ✅ Search and filtering

### GitHub

- ✅ Display in browser
- ✅ Searchable (GitHub search)
- ✅ Diffable (git log shows changes)
- ✅ Link to issues (github_issue_url)

### Automation

- ✅ Parseable by Node.js (YAML + regex)
- ✅ Parseable by PHP (YAML + Laravel)
- ✅ Queryable (extract fields)
- ✅ Versionable (git tracks changes)

---

## Best Practices for Task Authors

### 1. Be Specific

❌ **Bad:** "Implement feature X"  
✅ **Good:** "Implement auto-agent switching with state machine (6 states) and exponential backoff error handling"

### 2. Clear Acceptance Criteria

❌ **Bad:** "Code is good"  
✅ **Good:**

- [ ] All 6 state transitions work correctly
- [ ] Exponential backoff tested with simulated failures
- [ ] Telemetry logs all decisions

### 3. Atomic Subtasks

❌ **Bad:** Subtask 1 (240 minutes) "Implement entire feature"  
✅ **Good:**

- [x] Subtask 1 (45 min) "Design state machine"
- [x] Subtask 2 (45 min) "Implement AgentSwitchService"
- [x] Subtask 3 (30 min) "Write tests"

### 4. Detailed AI Prompts

Include:

- Objective (one sentence)
- Context (domain knowledge, patterns)
- Requirements (SOLID, security, performance)
- Expected Output (what should be delivered)
- Guardrails (what NOT to do)

### 5. Dependencies

Always explain *why* a task depends on another:

```yaml
depends_on:
  - TASK-xxxx-yyyy  # Requires Phase 7 loop working (auto-switch)
```

Not just:

```yaml
depends_on:
  - TASK-xxxx-yyyy
```

---

## File Organization

```
Project Root/
├── _ZENTASKS/                    # All task files
│   ├── TASK-mk3k0e09-culd4.task.md
│   ├── TASK-mk3k0imm-mf7ju.task.md
│   ├── ...
│   └── tasks.json                # Index of all tasks
│
├── Docs/
│   ├── TASK-METADATA-SCHEMA-SPEC.md      # ← Full specification
│   ├── TASK-TEMPLATE-MINIMAL.md          # ← Simple template
│   ├── TASK-PARSER-IMPLEMENTATION.md     # ← Parser guide
│   ├── PHASE-7-IMPLEMENTATION-SUMMARY.md
│   ├── PHASE-7-TEST-SCENARIOS.md
│   └── ...
│
├── vscode-extension/
│   └── src/
│       └── taskParser.ts                 # ← TypeScript parser
│
└── app/
    └── Services/
        └── TaskParsingService.php        # ← PHP parser
```

---

## Validation Checklist

Before committing a task file, verify:

- [ ] ID matches pattern `TASK-[a-z0-9]+-[a-z0-9]+`
- [ ] All required YAML fields present (id, title, type, status, priority)
- [ ] Status is valid enum value
- [ ] Priority is valid enum value
- [ ] createdAt ≤ updatedAt ≤ completedAt
- [ ] All dependencies reference valid task IDs
- [ ] Description section exists and is non-empty
- [ ] At least 1 acceptance criterion
- [ ] Subtasks ordered 1–N with no gaps
- [ ] AI Prompt section complete (if applicable)
- [ ] Markdown valid and previewable
- [ ] No circular dependencies

---

## Migration Path (From Old Format)

If existing tasks use different format, migration script:

```typescript
// Pseudo-code
const oldTasks = readOldFormatFiles();
const newTasks = oldTasks.map(task => {
  const newTask = {
    id: task.id || generateTaskId(),
    title: task.title,
    type: 'feature', // default
    status: task.status || 'pending',
    priority: 'medium', // default
    // ... map other fields
    description: task.description || '',
    acceptanceCriteria: task.acceptance || [],
  };
  
  // Validate new format
  const errors = validate(newTask);
  if (errors.length > 0) {
    console.warn(`Task ${newTask.id} has issues: ${errors}`);
  }
  
  return newTask;
});

// Write new format
newTasks.forEach(task => {
  const markdown = TaskParser.toMarkdown(task);
  fs.writeFileSync(`_ZENTASKS/${task.id}.task.md`, markdown);
});
```

---

## Example: How It Works End-to-End

### 1. Create Task File (Human)

Create `TASK-newxx-xxxxx.task.md` with full metadata and description.

### 2. Parse (VS Code Extension)

```typescript
const task = TaskParser.parseFile('TASK-newxx-xxxxx.task.md');
// task is now structured Task object
treeView.addItem(task); // display in tree
```

### 3. Validate (Backend)

```php
$parsed = $this->parser->parseTaskFile('path/to/task.md');
$errors = $this->parser->validateTask($parsed);
if (!empty($errors)) {
  throw ValidationException::withMessages($errors);
}
```

### 4. Store (Database)

```php
$taskModel = Task::create($parsed);
// Task model now has all metadata and body content
```

### 5. Use (Agent/Loop)

```typescript
// Phase 7 loop reads task
const task = await fetchTaskFromDb(id);

// Extract AI prompt for agent
const prompt = task.aiPrompt;
const response = await invokeAgent(prompt);

// On completion, update task
task.status = 'done';
task.completedAt = new Date();

// Serialize back to Markdown
const markdown = TaskParser.toMarkdown(task);
await saveToFile(markdown);
```

---

## Future Extensions (Phase 11+)

Possible enhancements:

1. **Linked Subtasks** — cross-task dependencies
2. **SLA/Deadline Tracking** — auto-escalate overdue tasks
3. **Cost Tracking** — compute + human time per task
4. **AI Model Versioning** — track which LLM version created task
5. **Automated Task Generation** — from code analysis
6. **Task Templates** — reusable patterns (feature, bug, etc.)

---

## Sign-off

### What's Ready

✅ Complete YAML/Markdown schema specification  
✅ Validation rules and error messages  
✅ Parser algorithm (stages, regex patterns)  
✅ TypeScript parser interface  
✅ PHP parser interface  
✅ Real-world example task  
✅ Integration guide  
✅ Best practices and migration path  

### Ready For

✅ Implementation of TypeScript parser in extension  
✅ Implementation of PHP parser in backend  
✅ Migration of existing tasks to new format  
✅ Integration with Phase 7 (auto-switch loop)  
✅ Integration with Phase 8+ (GitHub sync, branching, monitoring)  

### Status

**✅ APPROVED FOR PRODUCTION USE**

---

## Quick Reference

| Document | Purpose | Audience |
|----------|---------|----------|
| TASK-METADATA-SCHEMA-SPEC.md | Complete specification | Architects, developers, AI agents |
| TASK-TEMPLATE-MINIMAL.md | Simple template | Task authors |
| TASK-PARSER-IMPLEMENTATION.md | Implementation guide | Developers (TypeScript, PHP) |
| PHASE-7-IMPLEMENTATION-SUMMARY.md | Auto-switch service | Implementation reference |
| PHASE-7-TEST-SCENARIOS.md | Testing guide | QA, developers |

---

**Created:** January 7, 2026  
**Version:** 1.0  
**Status:** Complete ✅

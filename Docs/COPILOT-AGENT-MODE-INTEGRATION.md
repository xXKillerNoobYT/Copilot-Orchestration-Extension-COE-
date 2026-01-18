# GitHub Copilot Agent Mode Integration Guide

## Overview

This document describes how to use the Copilot Orchestrator MCP Server with GitHub Copilot's Agent Mode to enable autonomous task execution, coordination, and orchestration.

## What is Agent Mode?

GitHub Copilot Agent Mode allows Copilot coding agents to:
- Execute multi-step workflows autonomously
- Interact with external tools and data sources via MCP servers
- Coordinate work across multiple systems
- Make decisions based on context and feedback

## Architecture

```
┌─────────────────────────────────────┐
│   GitHub Copilot Coding Agent       │
│   (VS Code / GitHub / JetBrains)    │
└──────────────┬──────────────────────┘
               │ MCP Protocol (JSON-RPC)
               │
┌──────────────▼──────────────────────┐
│   Copilot Orchestrator MCP Server   │
│   - Task Management Tools           │
│   - Agent Coordination Tools        │
│   - Context & Feedback Tools        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   VS Code Extension                 │
│   - Task Queue                      │
│   - Agent State                     │
│   - Workspace Context               │
└─────────────────────────────────────┘
```

## Setup

### 1. Configure MCP Server

Add the following to your repository's `.github/copilot-mcp.json`:

```json
{
  "mcpServers": {
    "copilot-orchestrator": {
      "command": "node",
      "args": [
        "/path/to/extension/dist/mcp-server/index.js"
      ],
      "description": "Copilot Orchestrator MCP Server - Task management and agent coordination",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Configure GitHub Integration (Optional)

To enable GitHub Issues creation for test failures and observations, set these environment variables:

```bash
export GITHUB_TOKEN="your_github_personal_access_token"
export GITHUB_OWNER="your_github_username_or_org"
export GITHUB_REPO="your_repository_name"
```

**Creating a GitHub Personal Access Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (for private repos) or `public_repo` (for public repos)
4. Copy the generated token

**Without GitHub configuration:**
- Test failures and observations will be logged locally to `.orchestrator-output/logs/agent-activity.jsonl`
- The system will gracefully degrade and continue to function

### 3. Install Extension

1. Install the Copilot Orchestrator extension in VS Code
2. Use Command Palette → "Copilot Orchestrator: Copy MCP Server Path"
3. Replace `/path/to/extension/` in `.github/copilot-mcp.json` with the actual path
4. Commit and push the configuration file

### 4. Verify Setup

The Copilot coding agent will automatically:
1. Read `.github/copilot-mcp.json` from your repository
2. Spawn the MCP server process
3. Discover available tools via `tools/list`
4. Validate tool schemas

## Available Tools

### Core Orchestration Tools

#### 1. `copilot_orchestrator_get_next_task`

Get the highest-priority task for the agent to work on.

**Input:**
```json
{
  "filter": "bug",              // Optional: filter string
  "priority": "high",            // Optional: critical|high|medium|low
  "agentType": "code-master"     // Optional: agent type for skill matching
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "task": {
      "taskId": "TASK-001",
      "title": "Implement authentication middleware",
      "description": "...",
      "status": "pending",
      "priority": "high",
      "assignedTo": "code-master",
      "acceptanceCriteria": ["..."],
      "context": {
        "relatedFiles": ["..."],
        "relatedIssues": [{...}],
        "techStack": ["TypeScript", "Express"]
      }
    },
    "queueDepth": 5,
    "message": "Task retrieved successfully..."
  }
}
```

#### 2. `copilot_orchestrator_report_task_status`

Update task progress and trigger workflow transitions.

**Input:**
```json
{
  "taskId": "TASK-001",
  "status": "in-progress",       // pending|in-progress|blocked|done|failed
  "progress": 0.75,              // 0.0 to 1.0
  "observations": "Making good progress on auth middleware",
  "blockers": ["Need API key"]   // Optional
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "statusUpdate": {
      "taskId": "TASK-001",
      "previousStatus": "pending",
      "newStatus": "in-progress",
      "progress": 0.75,
      "nextSteps": ["Continue implementation"]
    }
  }
}
```

#### 3. `copilot_orchestrator_get_context_bundle`

Get comprehensive task context including files, docs, and guidance.

**Input:**
```json
{
  "taskId": "TASK-001",
  "includeFiles": true,
  "includeDocs": true
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "context": {
      "task": {...},
      "relevantFiles": [{...}],
      "documentation": [{...}],
      "dependencies": [{...}],
      "agentGuidance": {
        "recommendedApproach": "Start with tests...",
        "commonPitfalls": ["..."],
        "bestPractices": ["..."]
      }
    }
  }
}
```

### Testing & Verification Tools

#### 4. `copilot_orchestrator_report_test_failure`

Report test failures and create investigation tasks.

**Input:**
```json
{
  "taskId": "TASK-001",
  "testName": "should authenticate user",
  "errorMessage": "Expected 200, got 401",
  "stackTrace": "at test.ts:42",         // Optional
  "suggestedFix": "Add auth token"       // Optional
}
```

#### 5. `copilot_orchestrator_report_verification_result`

Submit verification findings and trigger quality gates.

**Input:**
```json
{
  "taskId": "TASK-001",
  "verificationType": "functional",      // visual|functional|integration
  "passed": true,
  "findings": ["All tests passed"],
  "screenshots": ["path/to/screenshot.png"]  // Optional
}
```

### Communication Tools

#### 6. `copilot_orchestrator_report_observation`

Report discoveries, issues, or optimization opportunities.

**Input:**
```json
{
  "type": "issue",                       // discovery|issue|risk|optimization
  "message": "Found potential security vulnerability",
  "severity": "high",                    // low|medium|high|critical
  "suggestedAction": "Update dependency",
  "createTask": true                     // Create follow-up task
}
```

#### 7. `copilot_orchestrator_ask_user_question`

Ask the user for clarification or decisions.

**Input:**
```json
{
  "question": "Should we use JWT or session-based auth?",
  "context": {
    "currentApproach": "JWT",
    "alternatives": ["sessions", "OAuth"]
  }
}
```

### State & Configuration Tools

#### 8. `copilot_orchestrator_list_active_tasks`

List all active tasks with filtering.

**Input:**
```json
{
  "status": "in-progress",              // Optional
  "priority": "high",                   // Optional
  "assignee": "code-master"             // Optional
}
```

#### 9. `copilot_orchestrator_get_agent_state`

Get current orchestration system state.

**Input:**
```json
{
  "agentName": "code-master"            // Optional
}
```

#### 10. `copilot_orchestrator_get_workspace_config`

Get workspace configuration and settings.

**Input:**
```json
{
  "includeAgentProfiles": true
}
```

## Error Handling

All tools return errors in a standard format:

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID 'TASK-999' not found",
    "details": {...},
    "suggestion": "Use list_active_tasks to see available tasks..."
  }
}
```

### Error Codes

- `INVALID_INPUT` - Input validation failed
- `MISSING_REQUIRED_FIELD` - Required field missing
- `INVALID_FIELD_TYPE` - Field has wrong type
- `INVALID_ENUM_VALUE` - Enum value not allowed
- `TASK_NOT_FOUND` - Task doesn't exist
- `OPERATION_FAILED` - Operation failed
- `UNAUTHORIZED` - Not authorized
- `INTERNAL_ERROR` - Internal server error

## Example Agent Workflows

### Workflow 1: Autonomous Task Execution

```markdown
Agent Prompt:
"Work on the next high-priority task autonomously. 
Get the task, implement it, run tests, and report status."
```

Agent execution:
1. Calls `get_next_task` with `priority: "high"`
2. Calls `get_context_bundle` for the task
3. Implements the feature
4. Runs tests
5. If tests fail: calls `report_test_failure`
6. If tests pass: calls `report_task_status` with `status: "done"`
7. Calls `report_verification_result`

### Workflow 2: Investigation and Reporting

```markdown
Agent Prompt:
"Investigate the codebase for potential security issues 
and report findings."
```

Agent execution:
1. Scans codebase for vulnerabilities
2. For each finding: calls `report_observation` with `type: "risk"`
3. If critical: calls `report_observation` with `createTask: true`
4. Provides summary of findings

### Workflow 3: Test-Driven Development

```markdown
Agent Prompt:
"Get the next task and implement it using TDD."
```

Agent execution:
1. Calls `get_next_task`
2. Calls `get_context_bundle`
3. Writes tests first
4. Implements feature
5. Runs tests
6. If failures: fixes and reports via `report_test_failure`
7. Calls `report_task_status` when complete

## Best Practices

### For Agents

1. **Always get context first**: Call `get_context_bundle` before starting work
2. **Report progress frequently**: Use `report_task_status` to keep stakeholders informed
3. **Handle errors gracefully**: Check error responses and follow suggestions
4. **Ask when uncertain**: Use `ask_user_question` for clarifications
5. **Report all findings**: Use `report_observation` for discoveries

### For Users

1. **Provide clear acceptance criteria**: Include in task descriptions
2. **Keep tasks atomic**: Break down large tasks into smaller ones
3. **Review agent observations**: Monitor `report_observation` calls
4. **Respond to questions promptly**: Check for `ask_user_question` calls
5. **Verify results**: Review `report_verification_result` submissions

## Troubleshooting

### Agent Can't Find Tools

**Problem**: Agent reports tools are not available

**Solution**:
1. Verify `.github/copilot-mcp.json` is in repository root
2. Check MCP server path is correct
3. Ensure extension is installed and activated
4. Restart VS Code and try again

### Input Validation Errors

**Problem**: Agent receives `INVALID_INPUT` errors

**Solution**:
1. Check the error's `suggestion` field for guidance
2. Review the tool's input schema in this document
3. Ensure all required fields are provided
4. Validate enum values are correct

### Tasks Not Found

**Problem**: Agent reports `TASK_NOT_FOUND`

**Solution**:
1. Call `list_active_tasks` to see available tasks
2. Verify task ID is correct
3. Check if task was already completed
4. Create new tasks if queue is empty

### Server Connection Issues

**Problem**: MCP server won't start or crashes

**Solution**:
1. Check Node.js version (requires 18+)
2. Verify extension is compiled: `npm run compile`
3. Check server logs in VS Code Output panel
4. Restart extension host: Command Palette → "Reload Window"

## API Reference

### JSON-RPC Protocol

All MCP communication uses JSON-RPC 2.0:

**Tool Discovery**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Tool Execution**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "copilot_orchestrator_get_next_task",
    "arguments": {
      "priority": "high"
    }
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\": true, \"data\": {...}}"
    }]
  }
}
```

## Security Considerations

1. **Read-Only Operations**: MCP tools do not modify files or execute commands
2. **Validation**: All inputs are validated against schemas
3. **Authorization**: Future versions will include role-based access control
4. **Audit Trail**: All tool calls are logged for security review
5. **Sandboxing**: MCP server runs in isolated process

## Support

- **Documentation**: See `/Docs` folder in repository
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join discussions in GitHub Discussions
- **Contact**: See CONTRIBUTING.md for contact info

## Changelog

### v1.0.0 (Current)

- Initial Agent Mode integration
- 12 tools available
- Input validation with Zod
- Comprehensive error handling
- Agent-compatible response format

## Future Enhancements

- [ ] Real-time agent coordination
- [ ] Multi-agent task distribution
- [ ] Agent learning from feedback
- [ ] Advanced context retrieval
- [ ] Integration with CI/CD pipelines
- [ ] Agent performance metrics

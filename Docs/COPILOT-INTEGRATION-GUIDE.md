# Copilot Integration & Skills Management System

**Version**: 3.9 (Complete Copilot Integration)  
**Date**: January 20, 2026  
**Status**: Production-Ready Specifications  
**Source**: AI Teams Documentation v3.7-3.9  
**Synced with**: 05-MCP-API-Reference.md, 02-Agent-Role-Definitions.md

---

## Overview

This document provides comprehensive specifications for integrating GitHub Copilot with the COE system, including:
- Building and updating Copilot instructions, skills, and agents
- Copilot Workspace integration
- Next Action Window UI component
- LM prompts for Copilot operations
- MCP tools for Copilot to use
- Tool reporting mechanisms

---

## I. System for Building & Updating Copilot Instructions/Skills/Agents

### Core Concepts

**Instructions**: Repo-wide guidelines (.github/copilot-instructions.md) for coding norms, styles, workflows

**Skills**: Modular folders (.github/skills/{skill-name}/) with:
- SKILL.md: instructions, configuration
- Scripts: shell/JS files for automated tasks
- Resources: templates, configs

**Agents**: Personas defined in agents.md (.github/agents.md or AGENTS.md):
- Combine instructions + skills
- End-to-end workflow definitions
- Specialized roles (e.g., @test-agent loads testing skills)

### Building Process

1. **Initiation**: User (sidebar button), Planning Team (gap detection), or auto-gen on low queue
2. **LM Generation**: Boss initiates AutoGen chat with LM props
3. **Structuring**: Output to proper files/folders
4. **Validation**: Verification Team runs UV task to check compatibility
5. **Integration**: Push to repo; Copilot auto-loads

### Updating Process

1. **Detection**: Critic identifies need (e.g., "Linting skill outdated")
2. **Proposal**: AutoGen chat (Critic + Researcher scrapes docs)
3. **LM Refinement**: Use LM to update content
4. **UV Verification**: Boss runs UV task
5. **Apply**: Updating Tool edits files; version bump
6. **Post-Update**: Test cycle; notify sidebar

### YAML Example: Skill Building

```yaml
# .github/skills/linting-skill/SKILL.yaml
name: "Linting Auto-Fixer"
version: "1.2"
description: "Automatically fixes linting issues in code"

instructions: |
  When a linting error occurs:
  1. Identify the type (ESLint, TypeScript, etc.)
  2. Run the appropriate fixer (eslint --fix, tsc --noEmit, etc.)
  3. Report fixed files and remaining issues
  4. Suggest config updates if patterns emerge

tools:
  - eslint
  - prettier
  - typescript-compiler

triggers:
  - "linting"
  - "style"
  - "formatting"

references:
  - https://eslint.org/docs/rules
  - https://prettier.io/docs/en/options.html

props:
  priority_focus: ["P1", "P2"]  # Focus on critical issues
  auto_fix_threshold: 0.8  # Fix if confidence >80%
```

### Agent Definition Example

```yaml
# .github/agents.md
## @test-agent

**Role**: Automated testing specialist

**Skills**:
- testing-skill (Jest configuration, test writing)
- coverage-skill (Coverage reporting, thresholds)

**Instructions**:
When asked to test or verify:
1. Identify test scope (unit, integration, e2e)
2. Generate or update tests
3. Run test suite and report results
4. Suggest coverage improvements
5. Call MCP `reportTaskCompleted` with metrics

**Context**:
- PRD: tests/coverage >=80%
- Priority: P1 tests first
```

---

## II. Copilot Workspace Integration

### Setup & Configuration

```yaml
# .github/workspace.yaml
workspaces:
  development:
    agents:
      - @coding-agent
      - @test-agent
    skills:
      - linting-skill
      - coverage-skill
    context_limit: 5000
    auto_run_tests: true

  review:
    agents:
      - @critic-agent
      - @reviewer-agent
    skills:
      - code-review-skill
    context_limit: 4000
```

### Orchestration Flow

```
Boss detects coding task
   ↓
Launch Copilot Workspace (CLI or API)
   ├─ Load agents/skills from .github/
   │   └─ Execute P1 first (e.g., To Do List)
   ├─ MCP Reports from Workspace
   │   └─ Continuous feedback loop
   └─ Close Workspace on Done
       └─ If Token Hit: Brake + User Report Button
```

### Commands (via GitHub CLI, assumed extension)

```bash
# Start workspace with specific task
gh copilot workspace open --task TASK-0789 --agent @coding-agent

# List available agents/skills
gh copilot agents list
gh copilot skills list

# Close workspace
gh copilot workspace close
```

---

## III. Next Action Window UI Component

**Location**: Collapsible section on COE overview page  
**Purpose**: Quick-copy prompts for Copilot, pre-filled with context

### UI Layout

1. **Agent Selector Dropdown**
   - List: @docs-agent, @test-agent, @lint-agent, etc.
   - Auto-populated from repo configs

2. **Prompt Template Cards** (scrollable)
   - Title: Action name (e.g., "Update Linting Skill")
   - Prompt: Pre-filled template with props
   - Copy Button: 📋 (one-click, tooltip: "Copied to clipboard")
   - Preview Pane: Shows final prompt before copy

3. **Customization Fields**
   - Input: Priority ("P1 To Do List"), Module name, etc.
   - Auto-fills prompt with values
   - Real-time preview update

### Example Prompt Card

```
Title: "Update Linting Skill"

Prompt:
/agent @lint-agent Update instructions with new ESLint rules from {docs_excerpt}.
Align to P1 {p1_modules}: {p1_desc}.
Check config at .github/skills/linting-skill/SKILL.md

[Copy Button] [Preview]
```

### Workflow

```
Overview Page Load → Fetch Current State (Plan/Priorities)
   ├─ Generate Prompts (Boss + LM)
   │   └─ Fill Templates with Props
   └─ User Selects Agent/Edits → Preview Update → Copy → Paste to Copilot
       └─ Optional: Trigger Build/Update Flow
```

---

## IV. LM Prompts for Copilot Operations (Expanded)

### Prompt 1: Building a New Skill

```
Prompt Template: "Generate a GitHub Copilot Agent Skill for {skill_name}. 
Include SKILL.md with frontmatter (name, description, instructions), 
optional scripts ({script_needs}), and resources. 
Align to PRD {prd_section} and priorities {p1_modules}. 
Ensure compatible with Copilot auto-loading."

Props:
- skill_name: string (e.g., "linting-skill")
- script_needs: array (e.g., ["eslint-fix.sh"])
- prd_section: string (e.g., "Frontend Components")
- p1_modules: array (e.g., ["To Do List"])

Output: SKILL.md content + folder structure JSON
Token Est: ~800 (fits 3,500 min)
```

### Prompt 2: Updating an Agent

```
Prompt Template: "Update agents.md for {agent_name} persona. 
Revise instructions based on {change_reason}, incorporating new skills {new_skills}. 
Keep within {context_limit} tokens. 
Version to {new_version}. Maintain compatibility with Copilot."

Props:
- agent_name: string (e.g., "@test-agent")
- change_reason: string (e.g., "Add linting for P1")
- new_skills: array (e.g., ["linting-skill"])
- context_limit: integer (from config)
- new_version: string (e.g., "1.2")

Output: Updated agents.md section
Token Est: ~600
```

### Prompt 3: Resolving Ambiguity in Directive

```
Prompt Template: "Resolve ambiguity in coding directive {directive}. 
Research if needed using {research_query}. 
Provide clear answer, incorporating priorities {priority_map}. 
Limit response to {token_limit} tokens. 
If unresolved, suggest user escalation."

Props:
- directive: string (e.g., "Implement To Do List with unclear DB choice")
- research_query: string (e.g., "Best DB for task lists")
- priority_map: object (e.g., {"To Do List": "P1"})
- token_limit: integer (1,000)

Output: Structured answer
Token Est: ~600
```

### Prompt 4: CI/CD Pipeline Generation

```
Prompt Template: "Generate GitHub Actions workflow (.github/workflows/ci.yml) for {project_type} project. 
Stages: Lint (P3), Test (P2), Deploy (P1). 
Node version: {node_version}. 
Dependencies: {dependencies}. 
P1 focus: {p1_desc}. 
Deploy to: {deploy_target}."

Props:
- project_type: string (e.g., "fullstack")
- node_version: string (e.g., "18")
- dependencies: array (e.g., ["jest", "eslint"])
- p1_desc: string (e.g., "Core To Do List endpoints")
- deploy_target: string (e.g., "Vercel")

Output: Complete YAML workflow
Token Est: ~1,200
```

---

## V. Copilot Agent Prompts: Tools Mixed with Prompts

### Concept

Prompts include inline tool calls (MCP wrappers), enabling hybrid prompt-tool workflows. Example:

```
Prompt: "Implement {task}. 
If ambiguity (e.g., unclear requirement), use MCP tool: 
  askQuestion({question_props})
Report observations via:
  reportObservation({observation_props})
On completion, call:
  reportTaskCompleted({task_id}, {status}, {output})"
```

Copilot executes prompts + invokes MCP tools as needed.

---

## VI. MCP Tools That Copilot Can Use

### Available Tools (from MCP reference)

1. **askQuestion**: Request clarification on ambiguous directives
2. **reportObservation**: Log non-urgent insights (async)
3. **reportTaskCompleted**: Signal task finish with metrics
4. **reportIssue**: Flag blocking issues
5. **getImmediateAnswer**: Synchronous clarification (blocks caller)
6. **reportTaskStatus**: Rich in-progress updates

### Usage in Copilot Prompts

```
/agent @coding-agent Implement {task}.
Check for ambiguities using:
  MCP askQuestion {{"question": "...", "context_summary": "...", "task_id": "..." }}

When done, report via:
  MCP reportTaskCompleted {{"task_id": "...", "status": "success", "output": "..." }}
```

---

## VII. Expanded MCP Tool Schemas (v3.9)

### Tool: askQuestion (v1.2)

```json
{
  "tool_name": "askQuestion",
  "version": "1.2",
  "parameters": {
    "question": {"type": "string", "maxLength": 300},
    "context_summary": {"type": "string"},
    "current_file": {"type": ["string", "null"]},
    "relevant_snippets": {
      "type": "array",
      "items": {
        "file": "string",
        "line_start": "integer",
        "line_end": "integer",
        "content": {"type": "string", "maxLength": 1500}
      }
    },
    "task_id": {"type": "string", "required": true},
    "confidence_level": {"type": "integer", "minimum": 0, "maximum": 100},
    "priority_level": {"type": "integer", "enum": [1, 2, 3], "default": 2}
  },
  "returns": {
    "answer": "string",
    "source": ["string", "null"],
    "confidence": "integer (0-100)",
    "follow_up_needed": "boolean",
    "escalated_to_user": "boolean"
  },
  "token_impact": "~400-800 added",
  "copilot_compat": "/agent call MCP askQuestion {json props}"
}
```

### Tool: reportTaskCompleted (v1.2)

```json
{
  "tool_name": "reportTaskCompleted",
  "version": "1.2",
  "parameters": {
    "task_id": {"type": "string", "required": true},
    "status": {"type": "string", "enum": ["success", "partial", "failed"]},
    "output_summary": {"type": "string", "maxLength": 500},
    "files_modified": {"type": "array", "items": "string"},
    "coverage_percent": ["number", "null"],
    "test_results": {
      "passed": "integer",
      "failed": "integer"
    },
    "priority_completed": {"type": "integer", "enum": [1, 2, 3]}
  },
  "returns": {
    "acknowledged": "boolean",
    "next_task_suggested": ["string", "null"]
  },
  "token_impact": "~200-500",
  "copilot_compat": "/agent call MCP reportTaskCompleted {json props}"
}
```

### Tool: reportIssue (v1.1)

```json
{
  "tool_name": "reportIssue",
  "version": "1.1",
  "parameters": {
    "issue_description": {"type": "string", "maxLength": 800, "required": true},
    "severity": {"type": "integer", "enum": [1, 2, 3], "required": true},
    "task_id": "string",
    "file_path": ["string", "null"],
    "repro_steps": "string",
    "immediate": {"type": "boolean", "default": false}
  },
  "returns": {
    "logged": "boolean",
    "escalated": "boolean"
  },
  "token_impact": "~250-600",
  "copilot_compat": "/agent call MCP reportIssue {json props}"
}
```

---

## VIII. Copilot Brakes for Token Issues (Integration with Context Breaking)

### Mechanism

Pause Copilot Workspace if context nears limit; user button resumes with under-rated token allowance.

### Features

- **Detection**: Pre-prompt token check in Workspace
- **User Button**: Sidebar "Report & Continue" (logs issue, resumes)
- **Under-Rating**: Auto-adjust estimate (e.g., -20% buffer)
- **Continuous Workflow**: No full stops – queue tasks, notify sidebar

---

## IX. Reference Links

### GitHub Copilot Documentation
- [About Agent Skills - GitHub Docs](https://docs.github.com/copilot/concepts/agents/about-agent-skills)
- [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Awesome Copilot Skills GitHub](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md)
- [GitHub Copilot Agents - Concepts](https://docs.github.com/en/copilot/concepts/agents)

### Framework References
- [LangGraph - LangChain Docs](https://docs.langchain.com/oss/python/langgraph/overview)
- [AutoGen - Microsoft](https://microsoft.github.io/autogen/stable/index.html)
- [CrewAI Documentation](https://docs.crewai.com/)

---

## X. Implementation Roadmap

### Phase 1: Copilot Instructions/Skills Building (8-12 hours)
- Create .github/copilot-instructions.md template
- Build skill folder structure (.github/skills/{name}/)
- Implement LM-based skill generation (Boss + AutoGen)
- Timeline: Week 3 (Jan 28)

### Phase 2: Workspace Integration (10-15 hours)
- Create .github/workspace.yaml config
- Integrate Workspace launch via CLI/API wrapper
- Add Orchestrator support for Workspace sessions
- Timeline: Week 4 (Feb 4)

### Phase 3: Next Action Window (8-12 hours)
- Design and prototype UI component
- Implement agent selector + prompt templates
- Copy-to-clipboard functionality
- Timeline: Week 4 (Feb 4)

### Phase 4: MCP Tool Integration (6-10 hours)
- Add MCP wrappers for Copilot tools
- Implement hybrid prompt-tool execution
- Test tool-calling in Workspace
- Timeline: Week 5 (Feb 11)

### Phase 5: Error Handling & Brakes (8-12 hours)
- Integrate token brakes with Workspace
- Error recovery protocols
- User reporting modals
- Timeline: Week 5 (Feb 11)

---

## XI. Recommended Next Steps

1. Create .github/copilot-instructions.md with core guidance
2. Build skill templates (.github/skills/linting-skill/, etc.)
3. Prototype Next Action Window UI in VS Code
4. Integrate Workspace launch with Orchestrator
5. Test MCP tool calls from Copilot Workspace
6. Beta test with @WeirdTooLLC team in Jackson, WY

---

**End of Copilot Integration & Skills Management Documentation**

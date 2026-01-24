# Agent Profiles

## Overview

Agent profiles define the behavior, capabilities, and routing rules for the 4 specialized agent teams in the Copilot Orchestrator system. Profiles are stored as YAML files and loaded automatically when the `CopilotAgentClient` initializes.

## Available Profiles

### 1. Planning Team Agent
**File**: `planning-team.yaml`  
**Role**: Master planner and project architect

**Responsibilities:**
- Generate project plans from requirements
- Create dependency-aware task breakdowns
- Estimate effort and timelines
- Adapt plans based on execution feedback

**Triggers:**
- New project plan request
- Plan update or adjustment request
- Task breakdown needed
- Effort estimation required

**Handoff To:**
- Task Decomposition: When tasks > 1 hour or complexity > 0.7
- Verification: When plan validation needed

### 2. Answer Team Agent
**File**: `answer-team.yaml`  
**Role**: Context-aware Q&A specialist

**Responsibilities:**
- Answer technical questions using plan + codebase
- Provide source citations for all answers
- Score confidence (threshold: 0.7)
- Escalate low-confidence questions to humans

**Triggers:**
- `requiresContext` flag on task
- `hasOpenQuestions` flag on task
- Direct question from user
- Clarification needed during execution

**Handoff To:**
- Planning: When question requires plan modification
- Verification: When answer needs validation

### 3. Task Decomposition Agent
**File**: `decomposition-team.yaml`  
**Role**: Task complexity analyzer and splitter

**Responsibilities:**
- Detect complex tasks (> 1 hour)
- Generate 3-5 atomic subtasks
- Preserve parent-child relationships
- Maintain dependency graph integrity

**Triggers:**
- `estimatedHours > 1` on task
- Manual decomposition request
- Planning Team complexity flag

**Handoff To:**
- Planning: When decomposition needs validation
- Verification: When quality check required

### 4. Verification Team Agent
**File**: `verification-team.yaml`  
**Role**: Quality assurance and testing coordinator

**Responsibilities:**
- Run automated tests on completion
- Launch visual verification for UI tasks
- Wait for user Ready signal
- Create investigation tasks on failures

**Workflows:**
- **Automated**: Run tests → Report results
- **Visual**: Launch server → User verify → Report
- **Combined**: Auto tests first, then visual if UI task

**Triggers:**
- Status changed to 'done'
- Task completion reported
- Manual verification request

**Handoff To:**
- Planning: When major issues require plan changes
- Decomposition: When investigation tasks need breakdown

## YAML Schema

### Top-Level Fields

```yaml
# Required Fields
name: "Agent Display Name"              # Human-readable name
agentId: "unique-agent-id"              # Unique identifier (kebab-case)
role: "agent_role"                      # Role type: planning, answer, decomposition, verification
type: "backend_type"                    # Backend agent type: planner, documentation, tester, etc.

# Description
description: |
  Multi-line description of the agent's purpose,
  responsibilities, and behavior.

# Capabilities
capabilities:                           # List of agent capabilities
  - capability-1
  - capability-2
  - capability-3

# Configuration
configuration:
  llm_provider: "copilot"               # LLM provider: copilot, openai, local, etc.
  key1: value1                          # Agent-specific config
  key2: value2

# Optional Fields
routing_rules:                          # When to activate this agent
  triggers:
    - "Trigger condition 1"
    - "Trigger condition 2"
  handoff_to:                           # When to hand off to other agents
    agent_role:
      - "Condition for handoff"

metrics_tracked:                        # Metrics to collect
  - "Metric name 1"
  - "Metric name 2"

constraints:                            # Operational constraints
  max_response_time_seconds: 30
  retry_attempts: 3
  timeout_behavior: "fallback_to_human"
```

### Planning Team Example

```yaml
name: "Planning Team Agent"
agentId: "planning-team"
role: "planning"
type: "planner"

description: |
  Master planner that generates project plans, roadmaps, and task breakdowns.

capabilities:
  - plan-generation
  - task-breakdown
  - dependency-analysis
  - effort-estimation

configuration:
  llm_provider: "copilot"
  max_tasks_per_plan: 100
  default_task_duration_minutes: 30

routing_rules:
  triggers:
    - "New project plan request"
    - "Plan update needed"
  handoff_to:
    decomposition:
      - "Task hours > 1"

constraints:
  max_response_time_seconds: 30
  retry_attempts: 3
```

## Loading Agent Profiles

### Automatic Loading

Profiles are loaded automatically when `CopilotAgentClient` initializes:

```typescript
const client = new CopilotAgentClient();
// Profiles loaded from src/config/agent-profiles/*.yaml

// Get specific profile
const planningProfile = client.getAgentProfile('planning-team');
console.log(planningProfile.name); // "Planning Team Agent"
console.log(planningProfile.capabilities); // ["plan-generation", ...]
```

### Manual Loading

```typescript
import { parse as parseYAML } from 'yaml';
import * as fs from 'fs';

// Load profile from file
const yamlContent = fs.readFileSync('planning-team.yaml', 'utf-8');
const profile = parseYAML(yamlContent);

console.log(profile.name);         // "Planning Team Agent"
console.log(profile.agentId);      // "planning-team"
console.log(profile.capabilities); // ["plan-generation", ...]
```

## Using Profiles in Agent Registration

```typescript
import { CopilotAgentClient } from './services/copilotAgentClient';

const client = new CopilotAgentClient();

// Get profile
const profile = client.getAgentProfile('planning-team');

// Register agent using profile data
await client.registerAgent({
  agentId: profile.agentId,
  name: profile.name,
  role: profile.role,
  capabilities: profile.capabilities,
});
```

## Routing Logic

The `routing_rules` section defines when an agent should be activated:

### Triggers

Conditions that activate this agent:

```yaml
routing_rules:
  triggers:
    - "estimatedHours > 1 on task"
    - "Manual decomposition request"
    - "Planning Team complexity flag"
```

### Handoff Rules

When this agent should hand off to another agent:

```yaml
routing_rules:
  handoff_to:
    planning:
      - "Decomposition validation needed"
      - "Timeline adjustment required"
    verification:
      - "Decomposition complete for review"
```

## Metrics and Constraints

### Metrics Tracked

Define which metrics should be collected for this agent:

```yaml
metrics_tracked:
  - "Plans generated"
  - "Average plan generation time"
  - "Plan validation pass rate"
  - "Task accuracy rate"
```

### Constraints

Operational limits for the agent:

```yaml
constraints:
  max_response_time_seconds: 30     # Maximum time for response
  retry_attempts: 3                 # Number of retry attempts
  timeout_behavior: "fallback_to_human"  # What to do on timeout
  max_decomposition_depth: 5        # Max nesting level
  validate_atomicity: true          # Validate subtask atomicity
```

## Creating Custom Profiles

### Step 1: Create YAML File

```yaml
name: "Custom Agent Name"
agentId: "custom-agent"
role: "custom"
type: "coder"  # or planner, tester, etc.

description: |
  Description of what this agent does.

capabilities:
  - custom-capability-1
  - custom-capability-2

configuration:
  llm_provider: "copilot"
  custom_setting: value

routing_rules:
  triggers:
    - "When to activate"

metrics_tracked:
  - "Metric to track"

constraints:
  max_response_time_seconds: 30
  retry_attempts: 3
```

### Step 2: Save to Profiles Directory

Save your profile to:
```
vscode-extension/src/config/agent-profiles/custom-agent.yaml
```

### Step 3: Update Profile Loader

Add your profile to the loader in `copilotAgentClient.ts`:

```typescript
const profileFiles = [
  'planning-team.yaml',
  'answer-team.yaml',
  'decomposition-team.yaml',
  'verification-team.yaml',
  'custom-agent.yaml',  // Add your profile
];
```

## Best Practices

### DO ✅

- Use descriptive agent IDs (kebab-case)
- Include comprehensive capabilities lists
- Define clear routing triggers
- Document all configuration options
- Track relevant metrics
- Set realistic constraints

### DON'T ❌

- Use spaces or special characters in agent IDs
- Omit required fields (name, agentId, role, type)
- Set unrealistic time constraints
- Create circular handoff loops
- Forget to update the profile loader

## Validation

Profile structure is validated on load:

```typescript
interface AgentProfile {
  name: string;                       // Required
  agentId: string;                    // Required
  role: string;                       // Required
  type: string;                       // Required
  description: string;                // Required
  capabilities: string[];             // Required
  configuration: Record<string, any>; // Required
  routing_rules?: {                   // Optional
    triggers?: string[];
    handoff_to?: Record<string, string[]>;
  };
  metrics_tracked?: string[];         // Optional
  constraints?: Record<string, any>;  // Optional
}
```

## Troubleshooting

### Profile Not Loading

**Problem**: Profile YAML file not being loaded.

**Solutions:**
1. Check file path: `src/config/agent-profiles/filename.yaml`
2. Verify YAML syntax (use online validator)
3. Check console for loading errors
4. Ensure profile is added to `profileFiles` array

### Invalid YAML Syntax

**Problem**: YAML parsing error.

**Solutions:**
1. Use 2-space indentation (not tabs)
2. Quote strings with special characters
3. Use `|` for multi-line strings
4. Validate YAML online before committing

### Missing Required Fields

**Problem**: Profile validation fails.

**Solutions:**
1. Ensure all required fields are present
2. Check field names match schema exactly
3. Verify capabilities is an array
4. Confirm configuration is an object

## Related Documentation

- [CopilotAgentClient API](../services/copilotAgentClient.ts)
- [PRD.json - Multi-Agent Orchestration](../../../PRD.json)
- [GitHub Copilot Agent Mode Integration](../../../Docs/COPILOT-AGENT-MODE-INTEGRATION.md)
- [YAML Specification](https://yaml.org/spec/)

## License

Agent profiles are part of the Copilot Orchestrator Extension and follow the same license.

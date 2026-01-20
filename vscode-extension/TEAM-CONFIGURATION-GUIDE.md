# Team Configuration Dialog - User Guide

## Overview
The Team Configuration Dialog allows you to customize the behavior and permissions of the 4 specialized agent teams in the Copilot Orchestrator: Planning, Answer, Decomposition, and Verification.

## Accessing Team Configuration

1. Open the Settings Panel with `Ctrl+Shift+O` (or `Cmd+Shift+O` on Mac)
2. Navigate to the **Programming Orchestrator** tab
3. Click the **Configure** button on any team card

## Configuration Options

### Basic Settings

#### Timeout
- **Range**: 10-3600 seconds
- **Default**: 300 seconds (5 minutes)
- **Purpose**: Maximum time allowed for agent to complete a task

#### Retry Attempts
- **Range**: 0-10 attempts
- **Default**: 3 attempts
- **Purpose**: Number of times to retry failed operations

#### Max Task Depth
- **Range**: 1-10 levels
- **Default**: 3 levels (Planning), 5 levels (Decomposition)
- **Purpose**: Maximum depth for task decomposition

### Permissions

#### Read
- ✅ **Enabled by default** for all teams
- Allows agent to read files and context

#### Write
- ✅ **Enabled** for Planning and Decomposition teams
- ❌ **Disabled** for Answer and Verification teams
- Allows agent to create/modify files

#### Execute
- ❌ **Disabled by default** for all teams
- Allows agent to run commands

#### Test
- ✅ **Enabled** for Verification team only
- Allows agent to run tests

#### Approve
- ✅ **Enabled** for Verification team only
- Allows agent to approve task completion

## YAML Profile Management

### Upload a Profile

1. Click **Upload YAML** button
2. Select a `.yaml` or `.yml` file
3. Profile is validated automatically
4. If valid, YAML content loads into the editor
5. Click **Save Configuration** to apply

### Download Current Profile

1. Configure settings as desired
2. Click **Download YAML** button
3. Choose save location
4. YAML file is exported with current configuration

### Reset to Defaults

1. Click **Reset to Defaults** button
2. Team-specific default profile loads
3. Click **Save Configuration** to apply defaults

## YAML Profile Format

### Example: Planning Team Profile

```yaml
name: Planning Team
type: planning
version: 1.0.0
description: Master planner that generates project plans

config:
  timeout: 300
  retryAttempts: 3
  priority: high
  maxConcurrentTasks: 5
  maxDepth: 3
  autoDecompose: true

permissions:
  read: true
  write: true
  execute: false
  test: false
  approve: false
  apiAccess:
    - /api/v1/plans
    - /api/v1/tasks
  filePatterns:
    - "**/*.md"
    - "**/*.json"
  excludePatterns:
    - "node_modules/**"
    - ".git/**"

constraints:
  maxTokensPerRequest: 8000
  maxContextSize: 100000
  allowedOperations:
    - create_task
    - update_task
    - create_plan
    - update_plan
```

### Required Fields

- `name`: Display name (1-100 characters)
- `type`: Team type (planning, answer, decomposition, or verification)
- `version`: Semantic version (e.g., 1.0.0)

### Optional Sections

- `description`: Human-readable description
- `config`: Configuration settings
- `permissions`: Permission flags and access control
- `constraints`: Operational limits
- `metadata`: Authorship and tagging information

## Team-Specific Defaults

### Planning Team
- **Purpose**: Project planning and task breakdown
- **Permissions**: Read, Write
- **Max Depth**: 3 levels
- **Operations**: create_task, update_task, create_plan, update_plan

### Answer Team
- **Purpose**: Context-aware Q&A
- **Permissions**: Read only
- **Confidence Threshold**: 0.7
- **Priority**: High

### Decomposition Team
- **Purpose**: Automatic task splitting
- **Permissions**: Read, Write
- **Max Depth**: 5 levels
- **Auto Decompose**: Enabled
- **Operations**: create_task, update_task

### Verification Team
- **Purpose**: Testing and verification
- **Permissions**: Read, Test, Approve
- **Visual Verification**: Required
- **Priority**: High
- **Operations**: run_tests

## Validation Rules

### Configuration Ranges
- **timeout**: 10-3600 seconds
- **retryAttempts**: 0-10
- **maxConcurrentTasks**: 1-20
- **maxDepth**: 1-10
- **confidenceThreshold**: 0.0-1.0

### Priority Values
- critical
- high
- medium
- low

### Validation Errors

Common validation errors and solutions:

#### "Version must be in semver format"
- ❌ Bad: `version: 1.0`
- ✅ Good: `version: 1.0.0`

#### "Type must be one of: planning, answer, decomposition, verification"
- ❌ Bad: `type: custom`
- ✅ Good: `type: planning`

#### "Timeout must be between 10 and 3600 seconds"
- ❌ Bad: `timeout: 5`
- ✅ Good: `timeout: 300`

## Workspace Persistence

Profiles are saved to `.vscode/agent-profiles/` in your workspace:

```
.vscode/
  agent-profiles/
    planning-agent.yaml
    answer-agent.yaml
    decomposition-agent.yaml
    verification-agent.yaml
```

These files are loaded automatically when the dashboard starts.

## Best Practices

### Security
- ✅ Review file patterns before enabling write permissions
- ✅ Use `excludePatterns` to protect sensitive directories
- ✅ Limit API access to required endpoints only
- ❌ Don't enable execute permissions unless necessary

### Performance
- ✅ Set reasonable timeout values (300-600 seconds typical)
- ✅ Limit maxConcurrentTasks to avoid resource contention
- ✅ Use appropriate maxDepth to prevent excessive nesting

### Reliability
- ✅ Set retryAttempts to 3 for transient failures
- ✅ Configure priority based on criticality
- ✅ Test profiles with dry runs before deployment

## Troubleshooting

### Profile Won't Load
- Check YAML syntax (indentation, colons, quotes)
- Verify required fields are present
- Ensure version follows semver format (X.Y.Z)

### Validation Errors
- Read error messages carefully
- Check field values against allowed ranges
- Verify enum values (type, priority)

### Permissions Not Working
- Confirm workspace settings are saved
- Reload VS Code window
- Check file patterns for typos

## Example Profiles

See the `examples/` directory for complete profile examples:
- `planning-agent.yaml` - Planning team configuration
- `verification-agent.yaml` - Verification team configuration

## Support

For issues or questions:
1. Check validation error messages
2. Review example profiles
3. Consult the schema: `src/schemas/agent-profile.schema.json`
4. Open an issue on GitHub

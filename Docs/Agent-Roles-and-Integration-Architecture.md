# Agent Roles & Integration Architecture (Phase 7-10)

## Overview

This document defines the agent roles, responsibilities, and integration patterns for the Copilot Orchestration Extension (COE) Phase 7+ architecture. It covers both cloud agents (external LLMs) and background maintenance agents.

## Cloud Agent Roles

### Zen Planner
**Role**: Strategic planning and task decomposition
**Activation Trigger**: When new requirements are received or planning tasks are ready
**Context Bundle Contents**:
- Project vision and goals
- Current task queue
- Architecture overview
- Dependency graph
- Historical decisions
**Expected Outputs**:
- Structured task breakdown
- Dependency relationships
- Priority assignments
- Test strategies
**Success Criteria**:
- All tasks have clear acceptance criteria
- Dependencies are acyclic
- Priorities align with business value

### Zen Architect
**Role**: System design and architectural decisions
**Activation Trigger**: When design tasks are identified or architectural changes needed
**Context Bundle Contents**:
- Current architecture docs
- Codebase structure
- Performance requirements
- Security constraints
- Scalability needs
**Expected Outputs**:
- Updated architecture diagrams
- Design patterns recommendations
- Component specifications
- Integration points
**Success Criteria**:
- Architecture docs are current
- Design decisions are documented
- Component boundaries are clear

### Cloud Coder
**Role**: Complex code implementation and refactoring
**Activation Trigger**: When implementation tasks exceed local capabilities or require specialized knowledge
**Context Bundle Contents**:
- Task specifications
- Relevant code files
- Architecture constraints
- Test requirements
- Performance goals
**Expected Outputs**:
- Complete code implementations
- Unit tests
- Documentation updates
- Integration examples
**Success Criteria**:
- Code compiles and passes tests
- Follows project conventions
- Includes appropriate error handling

### Cloud Tester
**Role**: Automated test generation and validation
**Activation Trigger**: When test coverage gaps are identified or new features need testing
**Context Bundle Contents**:
- Code under test
- Existing test patterns
- Acceptance criteria
- Edge cases to cover
- Performance requirements
**Expected Outputs**:
- Comprehensive test suites
- Test data fixtures
- Coverage reports
- Test automation scripts
**Success Criteria**:
- Target coverage achieved
- Tests are maintainable
- Edge cases covered

## Background Agent Roles

### Health Monitor
**Role**: Continuous repository health assessment
**Activation Trigger**: Scheduled intervals (hourly/daily) or on-demand
**Context Bundle Contents**:
- Repository metrics
- CI/CD status
- Dependency information
- Code quality reports
- Performance benchmarks
**Expected Outputs**:
- Health score calculations
- Maintenance task recommendations
- Alert notifications
- Trend analysis
**Success Criteria**:
- Accurate health metrics
- Actionable recommendations
- Minimal false positives

### Dependency Updater
**Role**: Automated dependency management and security updates
**Activation Trigger**: When vulnerabilities detected or version drift identified
**Context Bundle Contents**:
- Current dependency versions
- Security advisories
- Compatibility requirements
- Test suites
- Rollback plans
**Expected Outputs**:
- Updated dependency manifests
- Compatibility test results
- Security patch summaries
- Rollback procedures
**Success Criteria**:
- No breaking changes introduced
- Security vulnerabilities resolved
- Tests pass after updates

### Branch Cleaner
**Role**: Automated branch lifecycle management
**Activation Trigger**: Scheduled cleanup or when stale branches detected
**Context Bundle Contents**:
- Branch metadata
- CI/CD status
- Merge status
- Commit activity
- Retention policies
**Expected Outputs**:
- Branch deletion recommendations
- Merge conflict reports
- Cleanup execution logs
- Policy compliance reports
**Success Criteria**:
- Safe branch deletions
- No active work lost
- Policy compliance maintained

## Integration Instructions

### Adding New Agents

1. **Define Agent Interface**
   ```typescript
   interface Agent {
     name: string;
     role: string;
     activationTriggers: string[];
     contextRequirements: ContextBundleSpec;
     expectedOutputs: OutputSpec[];
     successCriteria: Criteria[];
   }
   ```

2. **Implement Agent Handler**
   ```typescript
   class AgentHandler {
     async activate(trigger: Trigger): Promise<ContextBundle> {
       // Prepare context
     }
     
     async process(bundle: ContextBundle): Promise<Output> {
       // Execute agent logic
     }
     
     async validate(output: Output): Promise<ValidationResult> {
       // Check success criteria
     }
   }
   ```

3. **Configure API Endpoint**
   - Add endpoint to routes/api.php
   - Implement authentication middleware
   - Define request/response schemas
   - Add rate limiting and monitoring

4. **Set Context Shape**
   ```typescript
   interface ContextBundle {
     taskId: string;
     agent: string;
     context: {
       files: FileContext[];
       memory: MemoryEntry[];
       metadata: Metadata;
     };
     messages: Message[];
   }
   ```

5. **Register Agent**
   - Add to agent registry
   - Configure activation triggers
   - Set up monitoring and logging

## Agent Handoff Protocol

### Extension to External LLM Flow

1. **Trigger Detection**
   - Extension identifies need for external agent
   - Prepares context bundle
   - Selects appropriate agent

2. **Context Preparation**
   - Gathers relevant files and memory
   - Formats messages for LLM
   - Includes metadata for correlation

3. **API Communication**
   - Sends request to configured endpoint
   - Handles authentication and headers
   - Manages timeouts and retries

4. **Response Processing**
   - Parses LLM response
   - Validates against success criteria
   - Updates internal state

5. **Follow-up Actions**
   - Creates dependent tasks if needed
   - Updates documentation
   - Triggers next agent if required

### Error Handling

- Network failures: Retry with exponential backoff
- Authentication errors: Refresh tokens or notify user
- Invalid responses: Log and retry or escalate
- Timeout: Cancel and retry or mark failed

### Monitoring

- Track success rates per agent
- Monitor response times
- Log errors and failures
- Generate performance reports

## Example Context Bundles

### Zen Planner Context
```json
{
  "taskId": "task-123",
  "agent": "zen-planner",
  "context": {
    "files": [
      "Docs/Plan/detailed project description",
      "Docs/Plan/feature list",
      "_ZENTASKS/tasks.json"
    ],
    "memory": [
      "Previous planning decisions",
      "Architecture constraints"
    ],
    "metadata": {
      "projectPhase": "design",
      "complexity": "high"
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are Zen Planner..."
    },
    {
      "role": "user",
      "content": "Plan the implementation of feature X..."
    }
  ]
}
```

### Cloud Coder Context
```json
{
  "taskId": "task-456",
  "agent": "cloud-coder",
  "context": {
    "files": [
      "app/Models/User.php",
      "tests/Unit/UserTest.php"
    ],
    "memory": [
      "Coding standards",
      "Security requirements"
    ],
    "metadata": {
      "language": "php",
      "framework": "laravel"
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are Cloud Coder..."
    },
    {
      "role": "user",
      "content": "Implement user authentication..."
    }
  ]
}
```

## Configuration Schema

```typescript
interface AgentConfig {
  agents: {
    [agentName: string]: {
      enabled: boolean;
      endpoint: string;
      auth: {
        type: 'api-key' | 'oauth' | 'bearer';
        secret: string; // Redacted in logs
      };
      context: {
        maxFiles: number;
        maxTokens: number;
        timeout: number;
      };
      triggers: string[];
    };
  };
  handoff: {
    protocol: 'http' | 'websocket';
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
    };
    monitoring: {
      enabled: boolean;
      metrics: string[];
    };
  };
}
```

This architecture provides a scalable foundation for integrating multiple AI agents into the COE workflow, enabling sophisticated orchestration and continuous development capabilities.
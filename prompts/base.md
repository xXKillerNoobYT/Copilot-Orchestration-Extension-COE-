# Base Zen Tasks System

## System Overview

The Zen Tasks system is a lightweight, file-based task management framework designed for AI-assisted development workflows. It enables structured project planning, dependency tracking, and progress monitoring.

## Core Components

### Task Structure

Each task contains:

- **id**: Unique identifier (auto-generated)
- **title**: Brief, actionable description
- **description**: Detailed explanation
- **status**: Current state in lifecycle
- **priority**: Importance level
- **dependencies**: Tasks that must complete first
- **details**: Technical specifications
- **testStrategy**: Validation approach
- **timestamps**: Created, updated, completed dates

### Storage

- Tasks stored as GitHub Issues
- Query via `github-mcp-server-list_issues` or `github-mcp-server-search_issues`
- Human-readable and accessible via web UI
- Automatic versioning through GitHub

## Available Operations

### Query Operations

- **list_tasks**: View all tasks with optional filters
- **get_task**: Retrieve detailed task information
- **next_task**: Find ready-to-start tasks

### Modification Operations

- **add_task**: Create new task
- **update_task**: Modify task properties
- **set_status**: Change task status

### Bulk Operations

- **parse_requirements**: Convert requirements into tasks

## Status States

### Active States

- **pending**: Not yet started
- **in-progress**: Currently being worked on
- **blocked**: Waiting on external factor

### Review States

- **review**: Awaiting verification

### Terminal States

- **done**: Successfully completed
- **cancelled**: No longer needed
- **deferred**: Postponed

## Priority Levels

- **high**: Critical path, urgent work
- **medium**: Standard priority
- **low**: Nice-to-have, future work

## Dependency Rules

1. Tasks can depend on multiple other tasks
2. All dependencies must complete before task can start
3. Circular dependencies are not allowed
4. Dependencies reference task IDs

## Validation Strategy

Each task should define how completion will be verified:

- Unit tests to write
- Integration scenarios to test
- Manual verification steps
- Acceptance criteria

## File Format

### Task File Structure

```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Task Title",
      "description": "Detailed description",
      "status": "pending",
      "priority": "medium",
      "dependencies": [],
      "details": "Technical details",
      "testStrategy": "How to verify",
      "createdAt": "2026-01-02T00:00:00Z",
      "updatedAt": "2026-01-02T00:00:00Z"
    }
  ]
}
```

## Usage Guidelines

### Starting a Project

1. Load plan context from `Docs/Plan/` documents
2. Query existing GitHub issues or create initial issues
3. Review and refine issue structure
4. Begin execution with next ready issue

### During Development

1. Query next available issue via `github-mcp-server-search_issues`
2. Update issue labels to mark as in-progress
3. Implement according to issue details and test strategy
4. Update issue status upon completion
5. Move to next task

### Task Updates

- Update details as implementation proceeds
- Revise test strategy if needed
- Add notes about decisions or challenges
- Keep status current

## Best Practices

### Task Creation

- Use action verbs in titles
- Include enough detail for independent execution
- Define clear acceptance criteria
- Estimate dependencies accurately

### Status Management

- Update status promptly
- Use blocked for external dependencies
- Use review when ready for verification
- Only mark done after validation

### Dependency Management

- Keep dependency chains manageable
- Identify parallel work streams
- Break circular dependencies
- Document dependency rationale

### Testing

- Define test approach upfront
- Include edge cases
- Specify required test data
- Document manual verification steps

## Integration Points

### Version Control

- Tasks tracked in git repository
- Branch names can reference task IDs
- Commit messages link to tasks
- Pull requests associate with tasks

### CI/CD

- Task test strategies inform CI jobs
- Automated validation of completion criteria
- Status updates from build results

### Documentation

- Tasks reference relevant docs
- Completion updates documentation
- Architecture decisions documented in task details

## Error Scenarios

### Blocked Tasks

- Clearly identify blocker
- Create separate task to resolve if needed
- Update status to blocked
- Add notes explaining situation

### Circular Dependencies

- System should detect and reject
- Restructure task dependencies
- Consider task splitting or merging

### Invalid Status Transitions

- Follow logical status flow
- Document reason for unusual transitions
- Maintain audit trail

## Extensibility

The system supports:

- Custom task properties
- Additional status states
- Project-specific workflows
- Integration with external tools

## Performance Considerations

- JSON file suitable for projects with thousands of tasks
- Filter queries to reduce processing
- Archive completed tasks periodically
- Index by status and priority for quick access

## Security and Privacy

- Tasks stored locally in project
- No external API calls
- Sensitive data should not be in task descriptions
- Access controlled by file system permissions

## Migration and Backup

- Tasks in version control provide backup
- JSON format enables easy migration
- Export/import capabilities for integration
- History preserved through git commits

## Support and Troubleshooting

### Common Issues

- Missing task file: Will be created on first use
- Circular dependencies: Restructure task graph
- Status conflicts: Review task lifecycle
- Missing dependencies: Add required task references

### Debugging

- Review task JSON directly
- Check for malformed entries
- Validate dependency references
- Verify status transitions

## Conclusion

The Zen Tasks system provides a structured approach to project management while remaining simple and transparent. It enhances AI-assisted development by providing clear context, tracking progress, and ensuring systematic execution.

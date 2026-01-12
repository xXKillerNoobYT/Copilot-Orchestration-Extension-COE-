# ZenTasks to GitHub Issues Migration Script

This document lists all tasks from `_ZENTASKS/` that need to be migrated to GitHub Issues.

## Migration Status

**Created:** 2026-01-12  
**Status:** Ready for migration  
**Total Tasks:** TBD (will be counted during migration)

## Migration Commands

Use the following MCP GitHub tool commands to create issues:

### Example Migration Command

```
@Auto Zen migrate remaining ZenTasks to GitHub Issues using mcp_github_issue_write tool
```

## Task Files to Migrate

All `.md` files in `_ZENTASKS/` folder that are NOT completion files:

```
_ZENTASKS/TASK-*.md (excluding *-COMPLETION.md and *-POST-TASK-COMMENT.md files)
```

## Migration Process

1. **Read Task File** - Parse YAML frontmatter and extract:

    - title
    - description
    - task_type → labels (type:feature, type:bug, etc.)
    - priority → labels (priority:high, etc.)
    - status → state (open/closed) + labels
    - dependencies → issue body references

2. **Create GitHub Issue** using `mcp_github_issue_write`:

    ```yaml
    method: create
    owner: xXKillerNoobYT
    repo: Copilot-Orchestration-Extension-COE-
    title: [task title]
    body: |
        [task description]

        ## Dependencies
        - Depends on #[issue-number]

        ## Original Task ID
        [TASK-xxxxx]
    labels:
        - type:[task_type]
        - priority:[priority]
        - status:[status]
    ```

3. **Track Mapping** - Store mapping of TASK-ID → Issue #:

    ```json
    {
      "TASK-mjxz0spv-m4odq": 1,
      "TASK-mjxz0uwm-l7qt3": 2,
      ...
    }
    ```

4. **Sync to Local** - GitHub Issues Sync extension will auto-create `.github/issues/issue-N.md`

5. **Verify** - Confirm all tasks migrated:

    ```bash
    # Count tasks in _ZENTASKS
    ls _ZENTASKS/TASK-*.md | wc -l

    # Count issues on GitHub
    # Should match
    ```

6. **Archive \_ZENTASKS** - After successful migration:
    ```bash
    mv _ZENTASKS Docs/Archive/_ZENTASKS-archived-2026-01-12
    ```

## Post-Migration Verification

-   [ ] All task files converted to GitHub Issues
-   [ ] Labels applied correctly
-   [ ] Dependencies linked in issue bodies
-   [ ] Status reflected in issue state (open/closed)
-   [ ] All issues synced to `.github/issues/`
-   [ ] No data loss (spot check 10 random tasks)
-   [ ] \_ZENTASKS folder archived
-   [ ] Documentation updated
-   [ ] Agent instructions reference `.github/issues/`

## Migration Notes

**Important:**

-   Do NOT migrate _-COMPLETION.md or _-POST-TASK-COMMENT.md files
-   These are historical records and should be archived as-is
-   Only migrate active task files
-   Preserve original TASK-ID in issue body for traceability

**Dependencies:**

-   When task references TASK-xxx dependency, need to map to Issue #
-   Build mapping table first, then update issue bodies with correct references

## Ready to Migrate

Run this command to start migration:

```
@Auto Zen start migration from _ZENTASKS to GitHub Issues
```

Auto Zen will:

1. Count total tasks to migrate
2. Read each task file
3. Create corresponding GitHub Issue
4. Track TASK-ID → Issue # mapping
5. Update dependency references
6. Verify all issues created
7. Archive \_ZENTASKS folder
8. Update documentation references
9. Report completion

---

**Migration Owner:** Auto Zen  
**Estimated Time:** 30-60 minutes (depends on task count)  
**Rollback Plan:** Restore \_ZENTASKS from git history if needed

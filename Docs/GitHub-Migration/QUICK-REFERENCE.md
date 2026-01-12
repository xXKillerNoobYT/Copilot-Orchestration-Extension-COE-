# _ZENTASKS Migration: Quick Reference

**Date**: 2026-01-12  
**Full Report**: See `audit-report.md` for complete details

---

## Quick Stats

| Metric | Count |
|--------|-------|
| **Total _ZENTASKS References** | 232 |
| **Agents Using zen-tasks Tools** | 5 of 7 (71%) |
| **Tool Declarations to Remove** | 35 (7 tools × 5 agents) |
| **Workflow Files to Update** | 2 |
| **Documentation Files** | 50+ |

---

## Agent Status Matrix

| Agent | zen-tasks Tools | Status | Priority |
|-------|----------------|--------|----------|
| Auto Zen | ✗ None | 🟡 Partial (legacy prompt) | HIGH |
| Cloud Agent | ✗ None | ✅ Complete | - |
| Zen Planner | ✓ All 7 | 🔴 Not Migrated | CRITICAL |
| Testing Agent | ✓ All 7 | 🔴 Not Migrated | HIGH |
| Plan Agent | ✓ All 7 | 🔴 Not Migrated | MEDIUM |
| Issue Handler | ✓ All 7 | 🔴 Not Migrated | MEDIUM |
| Dependency Agent | ✓ All 7 | 🔴 Not Migrated | MEDIUM |

---

## Tool Migration Map

| zen-tasks Tool | GitHub Equivalent | Complexity |
|----------------|-------------------|------------|
| `listTasks` | `github-mcp-server-search_issues` | LOW |
| `getTask` | `github-mcp-server-issue_read` | LOW |
| `nextTask` | Search + dependency check | MEDIUM |
| `addTask` | GitHub API: Create Issue | MEDIUM |
| `updateTask` | GitHub API: Update Issue | LOW |
| `setStatus` | GitHub API: Update Labels/Close | MEDIUM |
| `parseRequirements` | Manual parse + bulk create | HIGH |

---

## Migration Timeline

```
Week 1: Foundation
  ├─ Remove Auto Zen legacy prompt
  ├─ Create migration utilities
  └─ Test GitHub Issues integration

Week 2: Planning
  ├─ Migrate Zen Planner
  ├─ Update workflow documentation
  └─ Test requirements → issues flow

Week 3: Support Agents
  ├─ Migrate Testing Agent
  ├─ Migrate Plan Agent
  └─ Test quality workflows

Week 4: Integration
  ├─ Migrate Dependency Agent
  ├─ Migrate Issue Handler (last)
  └─ Test full system integration

Week 5: Cleanup
  ├─ Archive _ZENTASKS
  ├─ Update all documentation
  └─ Full system validation
```

---

## Risk Summary

### 🔴 High Risk
- **Zen Planner**: Core planning workflow (parse_requirements)
- **Issue Handler**: Bidirectional sync complexity

### 🟡 Medium Risk
- **Dependency Resolution**: Parse "Depends on #X" from issue bodies
- **Status Transitions**: Label management complexity

### 🟢 Low Risk
- **Documentation**: Update references
- **Auto Zen**: Remove legacy prompt only

---

## Critical Dependencies

**Blocking Chain**:
```
Migration Utilities 
  → Zen Planner 
    → Testing Agent
    → Plan Agent  
      → Dependency Agent
        → Issue Handler (LAST)
```

**Must Complete First**:
1. GitHub Issues bulk creation API wrapper
2. Dependency parsing utilities
3. Label management helpers
4. Status transition utilities

---

## Success Criteria Checklist

- [ ] All 7 agents operate without zen-tasks tools
- [ ] GitHub Issues is single source of truth
- [ ] All workflow loops functional
- [ ] Dependency resolution works
- [ ] No data loss
- [ ] 30-day production validation

---

## Next Actions

1. ✅ Review audit report
2. Create GitHub issues for each agent migration
3. Build migration utilities
4. Start with Auto Zen prompt removal
5. Proceed to Zen Planner migration

---

For detailed analysis, see full **audit-report.md**

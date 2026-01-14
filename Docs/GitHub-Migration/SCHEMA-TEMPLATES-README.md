# GitHub Issues Migration - Schema & Templates Guide

**Created**: 2026-01-13  
**Version**: 1.0  
**Parent Task**: Issue #24 (Subtask 2)

---

## 📚 Overview

This directory contains all the resources needed to migrate from the _ZENTASKS task.json system to GitHub Issues as the single source of truth for task management.

---

## 📂 Deliverables

### 1. **issues-schema.md**
**Purpose**: Comprehensive schema specification document

**Contains**:
- Complete field mapping (task.json → GitHub Issues)
- Label taxonomy (25 labels across 4 categories)
- Custom fields design for GitHub Projects
- Dependency handling documentation
- Migration JSON schema
- Issue body structure template

**Use for**: Understanding the complete schema design and migration strategy

---

### 2. **create-github-labels.sh**
**Location**: `/_ZENTASKS/scripts/create-github-labels.sh`

**Purpose**: Automated script to create all 25 GitHub labels

**Labels Created**:
- 7 Type labels (feature, bug, refactor, maintenance, architecture, testing, documentation)
- 4 Priority labels (critical, high, medium, low)
- 8 Status labels (pending, approved, in-progress, blocked, review, testing, failed, cancelled)
- 6 Agent labels (auto-zen, zen-planner, testing-agent, plan-agent, dependency-agent, issue-handler)

**Usage**:
```bash
# Set your GitHub token
export GITHUB_TOKEN="ghp_your_token_here"

# Run the script
cd _ZENTASKS/scripts
./create-github-labels.sh xXKillerNoobYT Copilot-Orchestration-Extension-COE-
```

**Features**:
- Automatically creates labels with correct colors
- Updates existing labels if they already exist
- Provides colored output for status tracking
- Error handling and validation

---

### 3. **Issue Templates**
**Location**: `/.github/ISSUE_TEMPLATE/`

**Templates**:
1. **feature-task.md** - For feature implementation
2. **bug-task.md** - For bug fixes
3. **architecture-task.md** - For architecture decisions
4. **testing-task.md** - For test creation
5. **config.yml** - Template configuration

**Auto-applied Labels**:
- Feature: `type: feature`, `status: pending`, `priority: medium`
- Bug: `type: bug`, `status: pending`, `priority: high`
- Architecture: `type: architecture`, `status: pending`, `priority: high`
- Testing: `type: testing`, `status: pending`, `priority: medium`

**Usage**: 
When creating a new issue on GitHub, select the appropriate template from the dropdown.

---

## 🚀 Quick Start Guide

### Step 1: Create Labels
```bash
# Navigate to scripts directory
cd _ZENTASKS/scripts

# Ensure script is executable
chmod +x create-github-labels.sh

# Set GitHub token (requires 'repo' scope)
export GITHUB_TOKEN="your_github_personal_access_token"

# Run the script
./create-github-labels.sh xXKillerNoobYT Copilot-Orchestration-Extension-COE-
```

**Expected Output**:
```
========================================
GitHub Labels Creation Script
========================================

Repository: xXKillerNoobYT/Copilot-Orchestration-Extension-COE-

Creating TYPE labels...
Creating label: type: feature
✓ Created successfully
...

Summary:
  - Type labels: 7
  - Priority labels: 4
  - Status labels: 8
  - Agent labels: 6
  - Total: 25 labels

Done!
```

### Step 2: Verify Labels
1. Go to: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/labels
2. Verify all 25 labels are present
3. Check colors match the schema

### Step 3: Test Issue Templates
1. Go to: https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/issues/new/choose
2. Verify all 4 templates appear
3. Click each template to preview
4. Create a test issue to verify auto-labeling works

### Step 4: Begin Migration
Follow the migration plan in `MIGRATION-ROADMAP.md`

---

## 📊 Label Reference

### Type Labels
| Label | Color | Description |
|-------|-------|-------------|
| `type: feature` | 🟢 Green | New functionality |
| `type: bug` | 🔴 Red | Bug fixes |
| `type: refactor` | 🟡 Yellow | Code improvements |
| `type: maintenance` | 🟣 Purple | Maintenance work |
| `type: architecture` | 🔵 Blue | Design decisions |
| `type: testing` | 🔵 Dark Blue | Test work |
| `type: documentation` | 🟦 Teal | Documentation |

### Priority Labels
| Label | Color | When to Use |
|-------|-------|-------------|
| `priority: critical` | 🔴 Dark Red | Blocking all work |
| `priority: high` | 🟠 Orange-Red | Critical path |
| `priority: medium` | 🟡 Yellow | Standard work |
| `priority: low` | 🟢 Green | Nice-to-have |

### Status Labels
| Label | Color | Meaning |
|-------|-------|---------|
| `status: pending` | ⚪ Light Gray | Not started |
| `status: approved` | 🔵 Light Blue | Ready for work |
| `status: in-progress` | 🟡 Light Yellow | Active work |
| `status: blocked` | 🔴 Light Red | Blocked |
| `status: review` | 🔵 Pale Blue | In review |
| `status: testing` | 🟣 Lavender | In testing |
| `status: failed` | 🔴 Red | Failed |
| `status: cancelled` | ⚫ Gray | Cancelled |

### Agent Labels
| Label | Color | Agent |
|-------|-------|-------|
| `agent: auto-zen` | 🟢 Pale Green | Auto Zen |
| `agent: zen-planner` | 🔵 Pale Blue | Zen Planner |
| `agent: testing-agent` | 🟣 Lavender | Testing Agent |
| `agent: plan-agent` | 🌸 Pale Pink | Plan Agent |
| `agent: dependency-agent` | 🟠 Pale Orange | Dependency Agent |
| `agent: issue-handler` | 🟣 Pale Purple | Issue Handler |

---

## 🔄 Migration Workflow

### For Existing Tasks (tasks.json → GitHub Issues)

1. **Parse task.json**
   ```bash
   # Read existing task
   task = tasks.json["tasks"][index]
   ```

2. **Map fields using schema**
   ```json
   {
     "title": task.title,
     "body": compose_body(task),
     "labels": map_labels(task),
     "assignees": map_assignees(task)
   }
   ```

3. **Create GitHub issue**
   Use GitHub API or CLI to create issue

4. **Link dependencies**
   Add "Depends on #123" to issue body

5. **Validate migration**
   Check that all fields mapped correctly

### For New Tasks

1. Go to GitHub Issues
2. Click "New Issue"
3. Select appropriate template
4. Fill in all sections
5. Apply labels (auto-applied by template)
6. Submit issue

---

## ✅ Validation Checklist

### After Label Creation
- [ ] All 25 labels created
- [ ] Colors match schema specification
- [ ] Descriptions are accurate
- [ ] No duplicate labels

### After Template Setup
- [ ] 4 templates appear in issue creation
- [ ] Templates have correct auto-labels
- [ ] Template structure matches schema
- [ ] config.yml loads correctly

### After First Migration
- [ ] Issue created successfully
- [ ] All fields populated correctly
- [ ] Labels applied correctly
- [ ] Dependencies linked properly
- [ ] Issue searchable and filterable

---

## 🛠️ Troubleshooting

### Script Issues

**Problem**: "GITHUB_TOKEN not set"
```bash
# Solution: Set your token
export GITHUB_TOKEN="ghp_your_token_here"
```

**Problem**: "Failed to create (HTTP 401)"
```bash
# Solution: Check token has 'repo' scope
# Regenerate token at: https://github.com/settings/tokens
```

**Problem**: "Label already exists"
```
# This is normal - script will update existing labels
# ✓ Updated successfully
```

### Template Issues

**Problem**: Templates not appearing
```bash
# Solution: Check file location and YAML frontmatter
# Templates must be in .github/ISSUE_TEMPLATE/
# Frontmatter must have valid YAML
```

**Problem**: Labels not auto-applying
```yaml
# Solution: Check labels array in template frontmatter
labels: ['type: feature', 'status: pending', 'priority: medium']
# Labels must exist in repository first
```

---

## 📖 Related Documentation

- [issues-schema.md](./issues-schema.md) - Complete schema specification
- [MIGRATION-ROADMAP.md](./MIGRATION-ROADMAP.md) - Migration plan visualization
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Quick status reference
- [audit-report.md](./audit-report.md) - Full migration audit
- [../GitHub-Migration-Tool-Mapping.md](../GitHub-Migration-Tool-Mapping.md) - Tool equivalency guide

---

## 🎯 Next Steps

1. ✅ Create labels (run script)
2. ✅ Verify labels created
3. ✅ Test issue templates
4. ⏳ Begin bulk migration (Subtask 3)
5. ⏳ Migrate agents (Subtasks 4-7)
6. ⏳ Archive _ZENTASKS (Subtask 8)

---

## 🆘 Support

**Questions?**
- Check the [audit-report.md](./audit-report.md) for detailed analysis
- Review [GitHub-Migration-Tool-Mapping.md](../GitHub-Migration-Tool-Mapping.md) for tool equivalents
- Create a discussion issue for clarification

**Issues?**
- Check troubleshooting section above
- Verify GitHub token permissions
- Check repository settings

---

**Version**: 1.0  
**Last Updated**: 2026-01-13  
**Maintainer**: xXKillerNoobYT  
**Status**: Ready for Use

# Docs Folder Structure & Navigation

This folder contains all technical documentation, plans, and session records for the Copilot Orchestration Extension project.

## 📂 Folder Organization

### [Plan/](./Plan/) - Planning & Vision
Core planning documents that define the project vision and features.

**Key Documents**:
- `detailed project description` — Complete project vision, goals, and architecture
- `feature list` — All planned features with descriptions and status
- `todo` — Master task list and roadmap

**Purpose**: Read these FIRST before starting any development work.

---

### [Implementation/](./Implementation/) - Technical Documentation
Technical guides and implementation specifications.

**Key Documents**:
- Technical architecture guides
- Component specifications
- API documentation
- Database schemas
- Integration guides

---

### [Setup/](./Setup/) - Setup & Installation Guides
Step-by-step guides for setting up development environments.

**Key Documents**:
- Laravel/PHP setup
- Database setup
- Docker setup
- Development environment configuration
- Dependency installation

---

### [Testing/](./Testing/) - Test Documentation
Test strategies, coverage reports, and quality gates.

**Key Documents**:
- Test strategy documents
- Coverage reports
- Quality gate definitions
- Test frameworks and tools

---

### [Delivery/](./Delivery/) - Release & Deployment
Release notes, deployment guides, and delivery documentation.

**Key Documents**:
- Release notes and changelogs
- Deployment procedures
- Migration guides
- Deliverables lists

---

### [Sessions/](./Sessions/) - Session Records & Task Completions
Session reports and completed task documentation created after each work session.

**File Naming Convention**:
- `SESSION-YYYY-MM-DD-[topic].md` — Session completion reports
- `TASK-[id]-[description].md` — Individual task completion records

**Contents**:
- What was completed
- Files changed
- Tests run and results
- Issues discovered
- Follow-up tasks created

---

## 🚀 Quick Start - Where to Go First

1. **Understanding the Project**: Read [Plan/detailed project description](./Plan/detailed%20project%20description)
2. **Feature Overview**: Check [Plan/feature list](./Plan/feature%20list)
3. **Current Tasks**: Review [../Docs/Plan/todo](./Plan/todo)
4. **Setting Up**: Follow guides in [Setup/](./Setup/)
5. **Recent Work**: Check [Sessions/](./Sessions/) for latest completion reports

---

## 📋 Document Types & Templates

### Session Report Template
```markdown
# [Session Title/Date]

## Status: COMPLETED/IN-PROGRESS

## Work Completed
- Item 1
- Item 2

## Files Modified
- path/to/file.ext
- path/to/other.ext

## Tests Results
- Unit: X/X passing
- Integration: Y/Y passing
- E2E: Z/Z passing

## Related Tasks
- TASK-id-name
- TASK-id-name2

## Next Steps
- Recommendation 1
- Recommendation 2
```

### Task Completion Template
```markdown
# Task: [Title]

## Task ID: TASK-xxx-xxxxx
## Status: COMPLETED

## What Was Done
- Detailed description

## Files Changed
- list files

## How to Verify
- Testing instructions
- Manual verification steps

## Session Reference
- Link to SESSION file if applicable

## Blockers/Issues
- Any issues encountered
- Resolutions applied
```

---

## 🔍 Using This Documentation

### For Developers
- Start with [Plan/](./Plan/) to understand project scope
- Check [Implementation/](./Implementation/) for technical details
- Reference [Sessions/](./Sessions/) to see what was already done
- Follow [Setup/](./Setup/) guides for development environment

### For Project Managers
- Review [Plan/feature list](./Plan/feature%20list) for feature status
- Check [Delivery/](./Delivery/) for release information
- Monitor [Sessions/](./Sessions/) for progress tracking

### For QA/Testing
- Check [Testing/](./Testing/) for test strategies
- Review [Sessions/](./Sessions/) for test results in completion reports
- See [Implementation/](./Implementation/) for component details to test

---

## 📍 Key Files Across Project

| Purpose | Location |
|---------|----------|
| Project vision | [Plan/detailed project description](./Plan/detailed%20project%20description) |
| Feature list | [Plan/feature list](./Plan/feature%20list) |
| Current tasks | [Plan/todo](./Plan/todo) |
| Task state | `_ZENTASKS/tasks.json` |
| Agent instructions | `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md` |
| API routes | `routes/api.php` |
| Models | `app/Models/` |
| Services | `app/Services/` |

---

## ✨ Best Practices

1. **Always read Plan/ first** before starting development
2. **Create session docs** after completing work
3. **Link to other docs** using relative markdown links
4. **Keep docs updated** as implementation progresses
5. **Use consistent file naming** for easy discovery
6. **Archive completed sessions** for reference

---

## 🔄 Document Maintenance

- Review and update regularly as work progresses
- Move completed features to historical archives
- Keep Plan/ documents as source of truth
- Session records are permanent (never delete)
- Implementation docs should evolve with code

---

**Last Updated**: 2026-01-10  
**Status**: Active Navigation Guide

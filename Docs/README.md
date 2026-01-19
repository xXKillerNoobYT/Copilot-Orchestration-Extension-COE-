# Docs Folder Structure & Navigation

This folder contains all technical documentation, plans, and architecture guides for the Copilot Orchestration Extension project.

## 📂 Folder Organization

### Core Documentation (Root Level)

**Essential Reading**:
- `PROJECT-RUNBOOK.md` — **START HERE**: Execution order, commands, task expectations
- `QUICK-REFERENCE.md` — Quick commands, common fixes, test status
- `GITHUB-ISSUES-PLAN.md` — Issue tracking and management
- `README.md` — This file: Documentation navigation guide

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
Historical session reports and completed task documentation.

**Note**: Active session reports have been moved to `../reports/` for better organization.

---

## 🚀 Quick Start - Where to Go First

1. **Understanding the Project**: Read [PROJECT-RUNBOOK.md](./PROJECT-RUNBOOK.md)
2. **Quick Commands**: Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
3. **Feature Overview**: Check [Plan/feature list](./Plan/feature%20list)
4. **Current Tasks**: Review [GITHUB-ISSUES-PLAN.md](./GITHUB-ISSUES-PLAN.md)
5. **Setting Up**: Follow guides in [Setup/](./Setup/)

---

## 📋 AI Agent Guidelines

**When completing work, UPDATE existing docs instead of creating new files:**

✅ **DO**:
- Update `PROJECT-RUNBOOK.md` with status changes
- Update `QUICK-REFERENCE.md` with new commands/fixes
- Add dated entries to existing documentation
- Update relevant sections in `Plan/` or `Implementation/`

❌ **DON'T**:
- Create new session report files (unless specifically requested)
- Create duplicate documentation
- Create summary/status files in root or Docs
- Generate completion reports automatically

**Exception**: Historical session reports belong in `../reports/sessions/` when explicitly requested.

---

## 🔍 Using This Documentation

### For Developers
- Start with [PROJECT-RUNBOOK.md](./PROJECT-RUNBOOK.md) for execution guide
- Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for commands
- Reference [Plan/](./Plan/) to understand project scope
- Follow [Setup/](./Setup/) guides for development environment

### For AI Agents
- Always read PROJECT-RUNBOOK.md first
- Consult GITHUB-ISSUES-PLAN.md for issue tracking
- Update existing docs, don't create new ones
- Follow the "DO/DON'T" guidelines above

### For Project Managers
- Review [Plan/feature list](./Plan/feature%20list) for feature status
- Check [Delivery/](./Delivery/) for release information
- Monitor [../reports/](../reports/) for historical progress

### For QA/Testing
- Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for test commands
- Review [Implementation/](./Implementation/) for component details
- See test expectations in PROJECT-RUNBOOK.md

---

## 📍 Key Files Across Project

| Purpose | Location |
|---------|----------|
| **Execution guide** | [PROJECT-RUNBOOK.md](./PROJECT-RUNBOOK.md) |
| **Quick commands** | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) |
| **Project vision** | [Plan/detailed project description](./Plan/detailed%20project%20description) |
| **Feature list** | [Plan/feature list](./Plan/feature%20list) |
| **Issue tracking** | [GITHUB-ISSUES-PLAN.md](./GITHUB-ISSUES-PLAN.md) |
| **Historical reports** | [../reports/](../reports/) |
| **Agent instructions** | [../.github/copilot-instructions.md](../.github/copilot-instructions.md) |
| **API routes** | `../routes/api.php` |
| **Models** | `../app/Models/` |
| **Services** | `../app/Services/` |

---

## ✨ Best Practices

1. **Always read PROJECT-RUNBOOK.md first** before starting development
2. **Update existing docs** instead of creating new files
3. **Link to other docs** using relative markdown links
4. **Keep docs current** as implementation progresses
5. **Use consistent formatting** for easy discovery

---

## 🔄 Document Maintenance

- **Living documents**: PROJECT-RUNBOOK.md, QUICK-REFERENCE.md, GITHUB-ISSUES-PLAN.md
- **Update regularly** as work progresses
- **Archive session reports** to `../reports/`
- **Keep Plan/ documents as source of truth**
- **Remove outdated/redundant files** to reduce clutter
- Session records are permanent (never delete)
- Implementation docs should evolve with code

---

**Last Updated**: 2026-01-10  
**Status**: Active Navigation Guide

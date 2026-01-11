# Plan Builder - Comprehensive User Guide

The Plan Builder is an interactive wizard that helps you define, plan, and execute software projects with precision. It integrates with the Copilot Orchestrator backend to generate tasks, manage dependencies, and track progress.

---

## Quick Start

### Opening Plan Builder

1. **Via Command Palette** (`Ctrl+Shift+P`)
   - Search for `copilot-orchestrator.openPlanBuilder`

2. **Via Status Bar**
   - Click the Copilot Orchestrator icon in the bottom status bar

3. **Via Keyboard Shortcut**
   - Default: `Ctrl+Alt+P`

---

## Wizard Overview

The Plan Builder wizard consists of **10 pages** that guide you through project definition:

### Page 1: Introduction
- Welcome message
- Brief overview of what the wizard does
- Option to skip or start fresh

### Page 2: Project Basics
- **Project Name** (required)
- **Project Type** (fullstack, frontend, backend, mobile, etc.)
- **Description** (what does your project do?)
- **Team Size** (small: 1-3, medium: 4-8, large: 9+)

### Page 3: Architecture Style
- **Architectural Pattern** (monolithic, microservices, serverless)
- **Primary Language** (TypeScript, Python, Java, Go, etc.)
- **Frontend Framework** (React, Vue, Angular, None)
- **Backend Framework** (Laravel, Node.js, Django, Spring Boot, etc.)

### Page 4: Integrations & Services
- **Authentication** (None, OAuth, JWT, SAML)
- **Payment Processing** (Stripe, PayPal, Square, None)
- **Analytics** (Google Analytics, Mixpanel, PostHog, None)
- **Email Service** (SendGrid, AWS SES, Mailgun, None)
- **Cloud Provider** (AWS, Azure, GCP, Digital Ocean)

### Page 5: Deployment Strategy
- **Deployment Target** (Docker, Kubernetes, Heroku, Vercel, AWS Lambda)
- **CI/CD Pipeline** (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- **Environment Strategy** (Dev, Staging, Production)
- **Monitoring & Logging** (Datadog, New Relic, ELK Stack, CloudWatch)

### Page 6: Testing Strategy
- **Testing Level** (None, Basic, Comprehensive, Enterprise)
- **Unit Test Framework** (Jest, Vitest, PHPUnit, pytest)
- **E2E Test Tool** (Cypress, Playwright, Selenium)
- **Target Coverage** (50%, 70%, 80%, 90%+)

### Page 7: Documentation
- **Documentation Level** (None, Basic, Comprehensive)
- **API Documentation** (OpenAPI/Swagger, GraphQL introspection)
- **Architecture Docs** (ADRs, C4 diagrams, README)
- **How-to Guides** (Installation, setup, contribution)

### Page 8: Team & Process
- **Development Process** (Waterfall, Agile, Kanban, Scrum)
- **Code Review Process** (Yes, No)
- **Design System** (Custom, Material Design, Tailwind)
- **Team Tools** (Slack, Discord, Jira, Linear)

### Page 9: Timeline & Milestones
- **Project Duration** (3 months, 6 months, 12 months, ongoing)
- **Key Milestones** (MVP, Beta, Launch, Scale)
- **Critical Path** (Identify bottlenecks)
- **Resource Allocation** (Dedicated, Part-time, Outsourced)

### Page 10: Review & Summary
- Review all answers
- Edit any section
- Option to regenerate tasks
- Status selection (Draft, Active, Archived)

---

## Core Features

### 1. **Plan Persistence** 🗂️

Save your work and load it anytime.

#### Saving a Plan

1. Complete the wizard or pause at any step
2. Click **"Save Plan"** button
3. Enter a plan name (auto-suggested from project name)
4. Choose status: Draft, Active, or Archived
5. ✓ Plan saved and indexed

#### Loading a Plan

1. Open Plan Builder
2. Click **"Load Existing Plan"** on Page 1
3. Choose from list (filtered by status)
4. Wizard populates with saved answers
5. Edit and re-save if desired

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current plan |
| `Ctrl+L` | Load plan |
| `Ctrl+Shift+T` | Open task list |
| `Ctrl+Enter` | Go to next page |
| `Ctrl+Shift+Enter` | Go to previous page |

---

### 2. **Design System Integration** 🎨

Automatically extract theme and design tokens from wizard answers.

#### What Gets Extracted

- **Color Palette** (primary, secondary, accent, status colors)
- **Typography Scale** (font families, sizes, weights)
- **Spacing Scale** (margins, padding, gaps)
- **Component Variants** (buttons, cards, inputs with design states)

#### How It Works

1. Complete wizard through "Design Style" questions
2. On summary page, click **"Open Design Editor"**
3. Design tokens pre-filled from wizard answers
4. Further customize colors, typography, spacing
5. Export as design tokens (JSON) or Tailwind config

#### Export Options

- `design-tokens.json` (JSON format for CSS-in-JS)
- `tailwind.config.js` (Tailwind CSS config)
- `_design-system/colors.ts` (TypeScript enums)
- `_design-system/tokens.css` (CSS custom properties)

---

### 3. **Plan Diff Preview** 📊

Compare wizard-generated changes before applying.

#### What's Compared

- New tasks to be created
- Existing tasks to be modified
- Tasks to be archived
- Dependency changes
- Timeline impact

#### Reading the Diff

```
╔════════════════════════════════════════════════╗
║         Plan Diff Report                      ║
╠════════════════════════════════════════════════╣
║ ✅ Add 15 new tasks                           ║
║ 📝 Modify 3 existing tasks                    ║
║ ❌ Remove 2 tasks (archive)                   ║
║                                              ║
║ Impact: MEDIUM                               ║
║ Timeline change: +2 weeks                    ║
╚════════════════════════════════════════════════╝
```

#### Actions

- **✓ Accept** → Apply changes, regenerate tasks
- **✕ Reject** → Discard changes, close wizard
- **✎ Edit** → Return to wizard, adjust answers

---

### 4. **Task Regeneration** 🔄

Automatically create tasks from wizard answers.

#### What Gets Generated

1. **Decomposed Tasks**
   - Each feature/module becomes a task
   - Subtasks for implementation, testing, review

2. **Task Metadata**
   - Title, description, acceptance criteria
   - Estimated effort, priority, dependencies
   - Assigned team member templates

3. **Task Files**
   - Saved in `_ZENTASKS/` folder
   - Named: `TASK-{id}-{slug}.md`
   - YAML frontmatter + Markdown content

#### Example Generated Task

```yaml
---
id: TASK-proj001-auth-system
title: Implement JWT authentication system
type: feature
status: pending
priority: critical
estimate: 40 hours
dependencies: [TASK-proj002-db-schema]
tags: [backend, security, authentication]
---

# Task: Implement JWT authentication system

## Acceptance Criteria
- [ ] User registration with email/password
- [ ] Login returns JWT token
- [ ] Token refresh endpoint working
- [ ] Logout clears token

## Implementation Plan
1. Create auth middleware
2. Implement JWT generation/verification
3. Add user registration endpoint
4. Add login endpoint
...
```

#### Quick Task Access

Use keyboard shortcut `Ctrl+Shift+T` to instantly open the task list after generation.

---

### 5. **Design Token Drift Detection** 🔍

Monitor design tokens for unintended changes.

#### How It Works

- Watches design token files for changes
- Detects drift from design system version
- Notifies when changes exceed threshold
- Offers one-click sync back to design editor

#### Monitored Files

- `design-tokens.json`
- `resources/design-tokens/**/*.json`
- `src/styles/design-tokens.ts`
- `_design-system/tokens/*.json`

#### Drift Notification Example

```
⚠️  Design Token Drift Detected

File: design-tokens.json
Changes: 5 token modifications
Severity: MEDIUM

[View Changes]  [Re-export]  [Dismiss]
```

#### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| LOW | <3 changes, cosmetic | Optional |
| MEDIUM | 3-10 changes, observable | Review soon |
| HIGH | >10 changes, significant | Address ASAP |
| CRITICAL | Structure changed | Immediate sync needed |

---

### 6. **Connection Status Monitoring** 📡

Real-time status of MCP and WebSocket connections.

#### Status Bar Indicators

```
✓ Orchestrator (Connected)    ✗ WebSocket (Disconnected)    🔄 Drift (None)
```

#### Click Status for Details

Shows:
- Connection state (Connected/Degraded/Disconnected)
- Last check time
- Retry count
- Any error messages

#### Auto-Retry

- Failed connections retry automatically
- Exponential backoff (1s → 2s → 4s → 10s max)
- Max 3 retries before manual intervention needed

#### Troubleshooting Connection Issues

**"Cannot connect to MCP server"**
- Verify server running: `php artisan serve`
- Check base URL in settings: `Ctrl+Shift+P` → Copilot Orchestrator Settings
- Default URL: `http://localhost:8000`

**"WebSocket connection failed"**
- Verify WebSocket driver enabled in `.env`
- Check firewall settings
- Restart VS Code and server

**"Frequent disconnections"**
- Check network stability
- Increase timeout in settings (default: 10s)
- Check server logs for errors

---

## Keyboard Shortcuts Quick Reference

| Shortcut | Action | Page |
|----------|--------|------|
| `Ctrl+Shift+P` | Open Command Palette | Any |
| `Ctrl+Alt+P` | Open Plan Builder | Any |
| `Ctrl+Shift+T` | Open Task List | Any |
| `Ctrl+S` | Save Current Plan | Wizard |
| `Ctrl+L` | Load Plan | Wizard |
| `Ctrl+Enter` | Next Page | Wizard |
| `Ctrl+Shift+Enter` | Previous Page | Wizard |
| `Tab` | Next Field | Form |
| `Shift+Tab` | Previous Field | Form |
| `Escape` | Close Wizard | Any |

---

## Settings & Configuration

Open settings: `Ctrl+Shift+P` → Copilot Orchestrator Settings

### MCP Connection

```json
{
  "copilot-orchestrator.mcp.baseUrl": "http://localhost:8000",
  "copilot-orchestrator.mcp.timeout": 10000
}
```

### WebSocket

```json
{
  "copilot-orchestrator.websocket.enabled": true,
  "copilot-orchestrator.websocket.driver": "pusher",
  "copilot-orchestrator.websocket.url": "http://localhost:6001"
}
```

### Design System

```json
{
  "copilot-orchestrator.designSystem.autoExport": true,
  "copilot-orchestrator.designSystem.exportFormat": "json",
  "copilot-orchestrator.designSystem.driftThreshold": 5
}
```

---

## Workflow Examples

### Example 1: Creating a New Project Plan

1. Open Plan Builder (`Ctrl+Alt+P`)
2. Start fresh on Page 1
3. Fill out all 10 pages (5-10 minutes)
4. Review summary on Page 10
5. Click **"Generate Tasks"**
6. Review diff preview
7. Click **"Accept"**
8. Tasks generated in `_ZENTASKS/`
9. Hit `Ctrl+Shift+T` to open task list

### Example 2: Updating an Existing Plan

1. Open Plan Builder
2. Click **"Load Existing Plan"**
3. Select "Project X - v2"
4. Modify answers (e.g., add payment integration)
5. Review diff showing changes
6. Click **"Accept"** to apply
7. New/modified tasks generated

### Example 3: Designing a Custom Design System

1. Complete wizard through Page 7
2. On Page 10 summary, click **"Open Design Editor"**
3. Customize:
   - Primary color palette
   - Font families and scales
   - Spacing/size scales
   - Component variants
4. Click **"Export Design Tokens"**
5. Choose format (JSON, Tailwind, TypeScript, CSS)
6. Tokens saved to project

---

## Troubleshooting

### "Wizard closes without saving"

- Plan changes are auto-saved in memory
- Always click **"Save Plan"** before closing to persist to database
- Use `Ctrl+S` for quick save

### "Generated tasks don't match my plan"

- Review task decomposition algorithm settings
- Adjust team size, architecture, and timeline on wizard
- Edit generated tasks individually in `_ZENTASKS/`

### "Design tokens don't apply to my project"

- Verify export format matches your project (Tailwind, CSS, etc.)
- Import exported tokens into your build process
- Check file paths in import statements

### "Connection keeps dropping"

- See **Connection Status Monitoring** → Troubleshooting section
- Check network stability
- Increase timeout in settings
- Check server logs

---

## Best Practices

1. **Save Plans Frequently**
   - Save after each page to prevent data loss
   - Use descriptive names for different plan versions

2. **Review Diffs Before Accepting**
   - Always check task changes before accepting
   - Verify dependencies and timeline impact

3. **Keep Design Tokens Synced**
   - Run drift detection regularly
   - Re-export when design changes
   - Commit tokens to version control

4. **Use Keyboard Shortcuts**
   - Speeds up workflow significantly
   - Reduce mouse usage

5. **Name Tasks Clearly**
   - Generated tasks inherit naming conventions
   - Keep titles concise (< 60 chars)
   - Use consistent slugs for grouping

---

## Related Documentation

- [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) - Technical integration details
- [../](../) - VS Code Extension main docs
- MCP API: See backend documentation at `/docs/mcp-api.md`

---

## Support & Issues

- **Bug Report**: Open issue on GitHub with `plan-builder` tag
- **Feature Request**: Discuss in GitHub Discussions
- **Questions**: See FAQ or check Copilot chat

---

**Happy Planning!** 🚀

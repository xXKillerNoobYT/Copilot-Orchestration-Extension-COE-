# Direct Prompt for Planning Master (Notion AI)

**Copy this entire message and paste it into Notion AI to execute the updates.**

---

Planning Master, I need you to update the Copilot Orchestration Extension documentation in Notion by adding 6 missing sections. The current workspace has 5 complete documents (Architecture, Agents, Workflows, Data Flow, MCP API) but is missing critical user-facing features.

## Your Task

Create 6 new pages in Notion with the exact content specified below. Use rich formatting (tables, callouts, headers, code blocks) and match the style of existing documents.

---

## Page 1: "09. Interactive Design Phase"

Create this page with these sections:

### Overview
Add:
"The Interactive Design Phase is a guided, question-driven system where users design their planning tool step-by-step with continuous visual feedback. It's the core differentiator of Planner Mode."

### The Three-Panel Interface

Create a section explaining:
- **Left Panel**: Questions with A/B/C/D/E options (E = custom)
- **Center Panel**: Live preview updating in real-time (200-500ms)
- **Right Panel**: Context showing affected sections, AI suggestions, user notes

Add a callout: "Updates happen instantly as users select options - no save/submit buttons needed"

### The 10 Core Design Questions

Create a table with these questions (each row):

| # | Question | Options | Affects |
|---|----------|---------|---------|
| 1 | Page Layout Organization | A) Sidebar Nav, B) Top Tabs, C) Wizard, D) Custom | page_navigation, layout |
| 2 | Color Theme | A) Light & Clean, B) Dark & Modern, C) High Contrast, D) Custom | color_palette, all_pages |
| 3 | Task Display Format | A) Hierarchical Tree, B) Kanban Board, C) List Grid, D) Custom | task_list, display |
| 4 | Dependency Visualization | A) Network Graph, B) Hierarchical Diagram, C) Timeline with Arrows, D) List | dependency_graph |
| 5 | Timeline Representation | A) Gantt Chart, B) Linear Timeline, C) Kanban by Phase, D) Calendar | timeline_page |
| 6 | User Input Style | A) Inline Editing, B) Modal Form, C) Right Sidebar, D) Full Page | task_editor |
| 7 | AI Assistance Level | A) Manual Only, B) Suggestions, C) Smart Defaults, D) Custom Hybrid | ai_features |
| 8 | Collaboration Model | A) Solo, B) Team (Async), C) Real-Time, D) Custom | permissions, sync |
| 9 | Data Storage | A) Local Only, B) Cloud + Cache, C) Hybrid, D) Custom Backend | persistence |
| 10 | User's Design Role | A) Visual Designer, B) Business Analyst, C) Technical Architect, D) Holistic | question_path |

For each question, add note: "Users can add custom notes explaining their choice"

### User Journey Paths

Create 3 subsections with callout boxes:

**Visual Designer Path** (callout in blue)
- Duration: 15-20 minutes
- Focuses on: Colors, layouts, typography, components
- Skips: Questions 6-9 (not relevant to visual design)
- Outcome: Design system + mockups

**Business Analyst Path** (callout in green)
- Duration: 25-35 minutes
- Focuses on: Requirements, workflows, task decomposition
- Skips: Questions 1-5 (let designer handle visuals)
- Outcome: Requirements specification + task breakdown

**Technical Architect Path** (callout in purple)
- Duration: 45-60 minutes
- Covers: All aspects (visual + functional + technical)
- Answers: All 10 questions + 10-15 deep-dive questions
- Outcome: Complete implementation specification ready for coding

### Real-Time Feedback System

Create bullet list:
- ✅ **Live Preview Updates**: All pages update within 200-500ms of selection
- ✅ **Compatibility Indicators**: Green checkmark for synergies, yellow warning for conflicts
- ✅ **Progress Tracking**: Visual bar showing "Question 5 of 10 complete"
- ✅ **Visual Element Selection**: Highlights affected UI sections as you hover options

### AI Follow-Up Questions

Add paragraph:
"After the 10 core questions, AI asks 5-15 contextual questions based on your role and choices. Example: If you chose 'Sidebar Navigation', AI asks 'Should sidebar collapse on mobile?' These can be skipped if not critical."

### Key Differentiators

Create a callout box titled "What Makes This Unique" with:
- One question at a time (focused, not overwhelming)
- Live preview, not mockups (see exact design instantly)
- Auto-navigating side panel (relevant context always visible)
- Multiple choice + custom option (guided yet flexible)
- Three user paths (15-60 min depending on expertise)
- Can jump back and change anything (continuous refinement)

---

## Page 2: "13. Visual Verification System"

Create this page:

### Overview
Add: "The Visual Verification System appears when tasks require visual testing (UI changes, theme toggles, accessibility). It provides a guided checklist and plan references to help users verify implementation matches specifications."

### Visual Verification Panel Components

Create sections for each:

**1. Server Status**
```
Display:
● Running on http://localhost:3000
[Open in Browser] [Restart Server] [Stop Server]

Features:
- Auto-start dev server when verification begins
- Real-time status (running/stopped/starting/error)
- Server log stream (optional)
```

**2. What to Verify Checklist**

Create example format:
```
✓ Color Palette Display
  Page: /design-system/colors
  Expected: All 12 colors with 3 variants each
  Action: Verify colors match design-system.json

✓ Theme Toggle
  Element: Toggle button (top-right)
  Expected: Switches between light/dark theme
  Action: Click toggle, verify all colors invert

✓ Accessibility
  Element: All color swatches
  Expected: WCAG AA contrast ratios
  Action: Use browser dev tools to check contrast
```

**3. Already Tested Section**

Add explanation: "Shows items verified in previous runs to avoid re-testing:"
```
✅ CSS variables output correctly
✅ Light mode renders correctly
✅ WCAG AA contrast verified
```

**4. Retest Required Section**

Add explanation: "Highlights components that changed since last verification:"
```
🔄 Dark mode color inversion
   Reason: Color values updated in last commit

🔄 Button component theming
   Reason: Depends on color palette
```

**5. Not Being Tested Section**

Add explanation: "Clarifies what's out of scope for this verification:"
```
⊝ Typography system
⊝ Navigation components
⊝ Form validation
```

**6. Plan Reference Section**

Add explanation: "Shows exact specifications to verify against:"
```
Colors > Primary
  light: #E3F2FD (highlighted in preview)
  medium: #2196F3 (highlighted in preview)
  dark: #1565C0 (highlighted in preview)

[View Full Plan] [Compare with Current]
```

### User Actions

Create 3 subsections with workflow diagrams:

**"Everything Looks Good" Flow**
```
User clicks ✓ Everything Looks Good
  ↓
Verification task → DONE
Original task → VERIFIED ✓
  ↓
Next task in queue
```

**"Found Issues" Flow**
```
User clicks ✗ Found Issues
  ↓
Form opens:
- What's wrong? (text field)
- Which element? (dropdown)
- Severity? (critical/major/minor)
  ↓
Investigation task created (high priority)
Original task → BLOCKED
```

**"I'd Like to Change Something" Flow**
```
User clicks 💭 Change Something
  ↓
Plan Adjustment Wizard opens
  ↓
(See Page 3 for wizard details)
```

Add callout: "Verification integrates with MCP server to start/stop dev server and emit WebSocket events for real-time UI updates"

---

## Page 3: "14. Plan Adjustment & Evolution"

Create this page:

### Overview
Add: "The Plan Adjustment Wizard appears when users want to modify the plan during verification or review. It analyzes impact, asks scoped questions, and generates tasks automatically."

### 5-Step Wizard Flow

Create numbered sections:

**Step 1: Capture Change Request**

Create form layout:
```
What would you like to change?
[Text area: User describes desired change]

Current plan value:
Primary color: #2196F6 (blue)

You want to change to:
[Input field or color picker]
```

**Step 2: Impact Analysis**

Create example output:
```
This change affects:
✓ Color palette CSS variables
✓ Button component theming (8 components)
✓ Card component theming (5 components)
✓ 12 other components

Impact Summary:
- Version bump: 1.0.0 → 1.1.0 (MINOR)
- New tasks: 5 tasks
- Estimated time: 3.5 hours
- Breaking changes: None
```

**Step 3: Scoped Planning Questions**

Add explanation: "System asks ONLY relevant questions based on the type of change:"

Create table:

| Change Type | Questions Asked |
|-------------|-----------------|
| Color/Theme | Palette source, contrast targets, dark mode rules, affected components |
| Layout | Breakpoints, navigation behavior, key pages affected |
| API | Contract, consumers, migrations, backward compatibility |
| Copy/UX | Locales, tone, screens affected, acceptance criteria updates |

Add note: "Questions are pre-filled with current answers - user just edits what changed"

**Step 4: Plan Diff View**

Create visual example:
```
Current vs. Proposed:

- Primary color: #2196F3 (removed)
+ Primary color: #9C27B0 (added)
~ Dark mode: Updated inversion formula (modified)

Legend:
RED (-) = Removed
GREEN (+) = Added
YELLOW (~) = Modified
```

**Step 5: Confirmation & Task Generation**

Create workflow:
```
User confirms update
  ↓
Plan version incremented (1.0.0 → 1.1.0)
  ↓
Tasks auto-generated:
- TASK-090: Update color palette CSS
- TASK-091: Update button components
- TASK-092: Update card components
- TASK-093: Test theme toggle
- TASK-094: Verify accessibility
  ↓
New verification tasks queued
  ↓
Dashboard updated with new work
```

### Version Bump Rules

Create table:

| Change Type | Bump | Example |
|-------------|------|---------|
| Breaking API/UX, redesign, incompatible data | MAJOR (x.0.0) | Kanban → Tree view, Solo → Real-time collab |
| New features, additive visuals, non-breaking | MINOR (1.x.0) | Color change, new page added, enable AI |
| Fixes, copy tweaks, small improvements | PATCH (1.0.x) | Typo fixes, clarifications, accessibility fixes |

Add callout: "Version increments trigger automatic task generation and code synchronization workflows"

---

## Page 4: "12. Visual Review & Annotation System"

Create this page:

### Overview
Add: "The Visual Review Tool enables team collaboration through annotations on plan elements. Stakeholders can comment, suggest changes, raise issues, and approve sections without technical knowledge."

### The 6 Annotation Types

Create a table:

| Type | Icon | Color | Purpose | Example |
|------|------|-------|---------|---------|
| Comment | 💬 | Blue (#3B82F6) | General feedback or questions | "Can we merge this with task above?" |
| Suggestion | 💡 | Yellow (#FBBF24) | Propose change to element | "Reduce from 8 hours to 4 hours" |
| Issue | ⚠️ | Red (#DC2626) | Flag blocker or problem | "This creates circular dependency" |
| Approval | ✅ | Green (#10B981) | Mark element as approved | "Looks good - approved" |
| Question | ❓ | Purple (#8B5CF6) | Ask for clarification | "What does 'RBAC' mean here?" |
| Action Item | → | Cyan (#06B6D4) | Mark as follow-up action | "TODO: Get estimate from John" |

For each annotation type, add features:
- Comment: Threading, @mentions, reactions
- Suggestion: Accept/reject buttons, edit capability, compare mode
- Issue: Severity levels (critical/major/minor), auto-create task
- Approval: Workflow tracking, sign-off system
- Question: Q&A threading, mark as answered
- Action Item: Assign to user, due dates, completion tracking

### Smart Task Selector

Create 3 modes section:

**Hover Mode**
- Hover over plan element → See annotation count badges
- Preview tooltip shows summary
- No selection made (just preview)

**Click Mode**
- Click element → Annotation panel opens
- All annotations displayed for that element
- Can add new annotation

**Compare Mode**
- Select multiple elements → Side-by-side view
- See annotations across elements
- Identify patterns in feedback

### Threading & Reactions

Create two subsections:

**Threading**
- Nested conversations up to 3 levels deep
- Thread collapse/expand controls
- Resolution workflow (mark thread as resolved)
- Thread notifications for participants

**Reactions**
- Quick feedback: 👍 👎 ❤️ 😄 🎉 🤔
- Reaction counts shown on annotations
- Filter annotations by reaction type
- Reactions don't create notifications

### Real-Time Collaboration

Create feature list:
- 🔴 Live updates via WebSocket when team adds annotations
- 👤 Presence indicators (who's viewing what section)
- ⌨️ Typing indicators in annotation threads
- 🔔 Notification system for @mentions
- 📧 Email notifications (configurable)

### Export Formats

Create table:

| Format | Content | Use Case |
|--------|---------|----------|
| Markdown | All annotations with metadata, threading preserved | Documentation, archiving, version control |
| PDF | Formatted report with visual layout | Stakeholder review, presentations, printable |
| CSV | Spreadsheet with annotation data | Analysis, tracking, filtering |
| JSON | Complete data structure | Backup, migration, programmatic access |

Add callout: "Annotations are versioned with the plan - you can see historical feedback on previous plan versions"

---

## Page 5: "10. Complete Visual Design System"

Create this page:

### Color Palette (35 Colors)

Create a comprehensive table:

| Category | Name | Hex | RGB | Usage | Contrast |
|----------|------|-----|-----|-------|----------|
| **Brand** | Primary | #3B82F6 | rgb(59,130,246) | Links, primary actions, focus | 4.5:1 |
| | Primary Light | #DBEAFE | rgb(219,234,254) | Highlights, info backgrounds | 10.5:1 |
| | Primary Dark | #1E40AF | rgb(30,64,175) | Dark backgrounds, emphasis | 9.0:1 |
| **Priority** | Critical | #DC2626 | rgb(220,38,38) | Critical priority, errors, blocking | 5.8:1 |
| | High | #EA580C | rgb(234,88,12) | High priority, warnings | 6.2:1 |
| | Medium | #FBBF24 | rgb(251,191,36) | Medium priority, cautions | 3.2:1 |
| | Low | #10B981 | rgb(16,185,129) | Low priority, success, go | 6.4:1 |
| **Task Types** | Feature | #10B981 | rgb(16,185,129) | Feature tasks, additions | 6.4:1 |
| | Bug | #DC2626 | rgb(220,38,38) | Bug fixes, issues | 5.8:1 |
| | Refactor | #8B5CF6 | rgb(139,92,246) | Refactoring, improvements | 5.5:1 |
| | Testing | #06B6D4 | rgb(6,182,212) | Testing, validation | 5.2:1 |
| | Docs | #92400E | rgb(146,64,14) | Documentation, writing | 8.0:1 |
| | Maintenance | #6B7280 | rgb(107,114,128) | Maintenance, cleanup | 7.0:1 |
| **Semantic** | Success | #10B981 | rgb(16,185,129) | Positive outcomes, completions | 6.4:1 |
| | Error | #DC2626 | rgb(220,38,38) | Errors, failures, deletions | 5.8:1 |
| | Warning | #FBBF24 | rgb(251,191,36) | Warnings, attention needed | 3.2:1 |
| | Info | #3B82F6 | rgb(59,130,246) | Information, neutral updates | 4.5:1 |
| **Text** | Text Dark | #111827 | rgb(17,24,39) | Primary text, highest contrast | 21.0:1 |
| | Text Medium | #4B5563 | rgb(75,85,99) | Secondary text, reduced emphasis | 8.5:1 |
| | Text Light | #9CA3AF | rgb(156,163,175) | Tertiary text, hints, placeholders | 4.5:1 |
| **Backgrounds** | BG Light | #F9FAFB | rgb(249,250,251) | Page background, lightest | 1.5:1 |
| | BG Medium | #F3F4F6 | rgb(243,244,246) | Card background, sections | 1.8:1 |
| | Border | #D1D5DB | rgb(209,213,219) | Borders, dividers, separators | 6.0:1 |

Add note in callout: "✓ All colors meet WCAG AA standards (4.5:1 for text, 3:1 for UI elements)"

### Typography System

Create table:

| Level | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| H1 - Page Title | Inter, sans-serif | 32px | Bold (700) | 1.2 | Page headings |
| H2 - Section | Inter, sans-serif | 24px | Bold (700) | 1.3 | Major sections |
| H3 - Subsection | Inter, sans-serif | 20px | Semibold (600) | 1.4 | Subsections, card headers |
| H4 - Card Title | Inter, sans-serif | 16px | Semibold (600) | 1.4 | Card titles, task names |
| Body - Regular | Inter, sans-serif | 14px | Regular (400) | 1.5 | Primary body text |
| Body - Small | Inter, sans-serif | 12px | Regular (400) | 1.5 | Secondary text, hints |
| Label | Inter, sans-serif | 12px | Medium (500) | 1.3 | Form labels, badges |
| Code | Courier New, mono | 12px | Regular (400) | 1.4 | Code snippets, technical |
| Caption | Inter, sans-serif | 11px | Regular (400) | 1.4 | Captions, metadata, timestamps |

### Spacing System (8px base unit)

Create table:

| Scale | Value | Multiple | Usage |
|-------|-------|----------|-------|
| XS | 4px | 0.5x | Tight spacing, icon margins, badge padding |
| S | 8px | 1x | Default unit, small gaps, list items |
| M | 12px | 1.5x | Card padding, section gaps, form fields |
| L | 16px | 2x | Panel padding, component spacing |
| XL | 24px | 3x | Major section spacing, large gaps |
| 2XL | 32px | 4x | Page margins, hero sections |
| 3XL | 48px | 6x | Major page sections, large separations |

Add note: "All spacing is a multiple of 8px base unit for consistency"

### Border Radius Scale

Create table:

| Scale | Value | Usage Example |
|-------|-------|---------------|
| None | 0px | Sharp corners (alerts, code blocks) |
| XS | 2px | Tight buttons, minimal rounding |
| S | 4px | Small components (badges, tags) |
| M | 8px | Default (buttons, cards, inputs) |
| L | 12px | Large cards, modals, panels |
| Full | 9999px | Pills, fully rounded (avatars, status dots) |

### Icon System

Create table for all 23 icons:

| Icon | Name | Usage | Sizes | Animation |
|------|------|-------|-------|-----------|
| 🏠 | home | Welcome/Home page link | 16, 20, 24px | none |
| ➕ | plus-circle | Create new plan button | 20, 24px | pulse on hover |
| 📄 | file-text | Requirements page | 16, 20, 24px | none |
| 🌳 | list-tree | Task decomposition page | 16, 20, 24px | none |
| 🔗 | network | Dependency graph page | 16, 20, 24px | none |
| 📅 | calendar | Timeline/Gantt page | 16, 20, 24px | none |
| ✏️ | edit-3 | Task editor page | 16, 20, 24px | none |
| 📚 | layers | Template library page | 16, 20, 24px | none |
| ✅ | check-circle | Review & validation page | 16, 20, 24px | none |
| 📤 | share-2 | Export & share page | 16, 20, 24px | none |
| ⭕ | circle | Task status (pending) | 12, 16px | none |
| ✓ | check | Task completed | 12, 16px | none |
| ⚠️ | alert-circle | Blocked/warning | 12, 16px | pulse |
| 🗑️ | trash-2 | Delete action | 16, 20px | none |
| 📋 | copy | Duplicate task/plan | 16, 20px | none |
| 🔗 | external-link | Open in GitHub/new tab | 16, 20px | none |
| ⬇️ | download | Export/download | 16, 20px | none |
| ⚙️ | settings | Settings page/button | 16, 20, 24px | spin on click |
| ⚡ | zap | Feature task type | 14, 18px | none |
| 🐛 | bug | Bug task type | 14, 18px | none |
| 🔄 | shuffle | Refactor task type | 14, 18px | none |
| 🔧 | wrench | Maintenance task type | 14, 18px | none |
| 🧪 | beaker | Testing task type | 14, 18px | none |

Add note: "Source: Feather Icons (MIT licensed, open source)"

---

## Page 6: "11. UI Page Specifications"

Create this page:

### Overview
Add: "This section details all 10 pages in the Planner Mode interface with exact layouts, sections, and user actions."

### Template Structure

For each of the 10 pages below, create a section using this structure:

```
### Page [#]: [Name]

**Route**: /planner/[path]
**Icon**: [icon-name]
**Settings Available**: Yes/No

**Purpose**: [What this page does]

**Layout**:
- Left Sidebar: [Content]
- Main Content: [Detailed layout]
- Right Sidebar: [Content]
- Bottom Actions: [Buttons]

**Responsive Behavior**: [How it adapts to mobile]

**Data Requirements**: [What data this page needs]
```

### The 10 Pages

Create sections for:

1. **Welcome & Dashboard**
   - Route: /planner/welcome
   - Icon: home
   - Purpose: Entry point showing recent plans, templates, quick actions

2. **New Plan Wizard**
   - Route: /planner/new-plan
   - Icon: plus-circle
   - Purpose: 5-step wizard for creating new plans from requirements

3. **Requirements Analysis**
   - Route: /planner/{plan_id}/requirements
   - Icon: file-text
   - Purpose: Detailed requirement capture and AI-powered breakdown

4. **Task Decomposition Canvas**
   - Route: /planner/{plan_id}/tasks
   - Icon: list-tree
   - Purpose: Interactive task breakdown and hierarchy editing

5. **Dependency Graph Visualization**
   - Route: /planner/{plan_id}/dependencies
   - Icon: network
   - Purpose: Visual task relationship mapping and critical path

6. **Timeline & Milestones**
   - Route: /planner/{plan_id}/timeline
   - Icon: calendar
   - Purpose: Gantt chart view with milestone planning

7. **Task Details & Editor**
   - Route: /planner/{plan_id}/task/{task_id}
   - Icon: edit-3
   - Purpose: Deep task editing and full metadata management

8. **Template Library**
   - Route: /planner/templates
   - Icon: layers
   - Purpose: Pre-built and custom plan templates

9. **Plan Review & Validation**
   - Route: /planner/{plan_id}/review
   - Icon: check-circle
   - Purpose: Pre-execution validation and quality gates

10. **Export & Sharing**
    - Route: /planner/{plan_id}/export
    - Icon: share-2
    - Purpose: Multi-format export and collaboration

---

## Completion Instructions

Planning Master, please:

1. ✅ Create all 6 pages in the order shown above
2. ✅ Use rich formatting: tables, callouts, headers, code blocks, bullet lists
3. ✅ Match the style and formatting of the existing 5 documents
4. ✅ Add cross-references between related sections
5. ✅ Use emojis and icons where helpful for visual clarity
6. ✅ Create a navigation structure linking all documents

After completing all 6 pages, reply with:
- Confirmation that all pages are created
- Links to each new page
- Any questions or clarifications needed

Begin with Page 1 (Interactive Design Phase) and proceed through all 6 pages.

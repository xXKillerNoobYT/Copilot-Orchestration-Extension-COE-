# Instructions for Planning Master (Notion AI)

**Date**: January 17, 2026  
**Purpose**: Complete update instructions for synchronizing Notion workspace with COE Master Plan  
**Source**: `code master Full plan.ipynb` + COE-Master-Plan documentation  
**Target**: Notion workspace for Copilot Orchestration Extension

---

## Overview for Planning Master

You are the Planning Master AI in Notion. This document contains complete instructions for updating the Notion workspace with missing content from the COE (Copilot Orchestration Extension) master plan.

**Current State**: Notion has 5 documents covering Architecture, Agents, Workflows, Data Flow, and MCP API. These are accurate and complete.

**What's Missing**: Critical user-facing features, UI specifications, and the Interactive Design Phase that make this system unique.

**Your Task**: Add 6 new major sections to Notion based on the detailed specifications below.

---

## Section 1: Interactive Design Phase (HIGH PRIORITY)

### Location in Notion
Create new page: **"09. Interactive Design Phase"**

### Content to Add

#### Overview
The Interactive Design Phase is a guided, question-driven system where users design their planning tool step-by-step with continuous visual feedback. It's the core differentiator that makes Planner Mode unique.

#### Core Components

**1. The Three-Panel Interface**

Create a section explaining the layout:
- **Left Panel**: Question & multiple choice options (A/B/C/D/E with custom option)
- **Center Panel**: Live preview that updates in real-time as user selects options
- **Right Panel**: Context panel showing affected sections, AI suggestions, and accumulated notes

**2. The 10 Core Design Questions**

Add subsections for each question with this format:

```
Question 1: Page Layout Organization
- Options:
  A) Sidebar Navigation (Left) - Vertical sidebar with page links
  B) Top Tab Navigation - Horizontal tabs, minimalist
  C) Wizard Steps (Linear) - One step at a time with progress bar
  D) Custom Approach - User provides their own vision
- Notes Section: Enabled (users can add custom notes)
- Visual Examples: mockup_sidebar.png, mockup_tabs.png, mockup_wizard.png
- Affects Sections: page_navigation, page_layout, sidebar_visibility
```

Repeat this structure for all 10 questions:
1. Page Layout Organization
2. Color Theme Selection
3. Task Display Format
4. Dependency Visualization
5. Timeline Representation
6. User Input Style
7. AI Assistance Level
8. Collaboration Model
9. Data Storage Location
10. User's Design Role

**3. User Journey Paths**

Create three subsections:

**Visual Designer Path (15-20 minutes)**
- Focuses on: Colors, layouts, typography, components
- Skips: Questions 6-9 (AI, collaboration, storage)
- Outcome: Design system + mockups

**Business Analyst Path (25-35 minutes)**
- Focuses on: Requirements, workflows, task decomposition
- Skips: Questions 1-5 (visual design)
- Outcome: Requirements + task breakdown

**Technical Architect Path (45-60 minutes)**
- Covers: All aspects (visual + functional + technical)
- Answers: All 10 questions + 10-15 deep-dive questions
- Outcome: Complete implementation specification

**4. Real-Time Feedback System**

Add section explaining:
- Live Preview Updates (200-500ms response time)
- Compatibility Indicators (✓ green for synergy, ⚠️ yellow for conflicts)
- Progress Tracking (visual progress bar showing X of 10 questions)
- Visual Element Selection Feedback (highlight affected sections)

**5. AI Follow-Up Questions**

Explain the contextual question system:
- After 10 core questions, AI asks 5-15 follow-up questions based on user's role
- Questions are specific to choices made (e.g., "Should sidebar collapse on mobile?")
- Can be skipped if not critical
- Each question shows impact on affected sections

**6. Continuous Refinement Cycle**

Document the iterative flow:
1. Answer 10 core questions
2. Review design summary
3. AI asks contextual follow-ups
4. Jump back to refine any choice
5. See impact of changes in real-time
6. Export when satisfied

#### Key Differentiators

Add a callout box highlighting:
- **One question at a time** - Focused, not overwhelming
- **Live preview (not mockups)** - See exact design instantly
- **Auto-navigating side panel** - Relevant context always visible
- **Multiple choice + custom** - Guided yet flexible
- **Three user paths** - 15-60 min depending on expertise
- **Continuous refinement** - Can jump back and change anything

---

## Section 2: Visual Verification System (HIGH PRIORITY)

### Location in Notion
Create new page: **"13. Visual Verification System"**

### Content to Add

#### Overview
The Visual Verification System is a user-assisted verification panel that appears when tasks require visual testing (UI changes, theme toggles, accessibility checks).

#### Visual Verification Panel UI

Create sections for each component:

**1. Server Status Section**
```
Status Display:
● Running on http://localhost:3000
[Open in Browser] [Restart Server] [Stop Server]

Features:
- Auto-start server when verification task begins
- Status indicator (running/stopped/starting/error)
- Direct browser link
- Server log stream (optional)
```

**2. What to Verify Checklist**
```
Format per item:
✓ [Check Name]
  Page: /route/to/page
  Expected: Description of expected behavior
  Action: Steps user should take

Example:
✓ Color Palette Display
  Page: /design-system/colors
  Expected: All 12 colors with 3 variants each
  Action: Verify colors match design-system.json
```

**3. Already Tested Section**
```
Shows items tested in previous verifications:
✅ CSS variables output correctly
✅ Light mode renders correctly
✅ WCAG AA contrast verified

Purpose: Avoid re-testing what's already confirmed
```

**4. Retest Required Section**
```
Highlights items that need re-verification:
🔄 Dark mode color inversion
   Reason: Color values updated in last commit
🔄 Button component theming
   Reason: Depends on color palette

Purpose: Focus user attention on changed components
```

**5. Not Being Tested Section**
```
Shows out-of-scope items:
⊝ Typography system
⊝ Navigation components
⊝ Form validation

Purpose: Clarify scope boundaries
```

**6. Plan Reference Section**
```
Shows relevant plan specs with highlighting:
Colors > Primary
  light: #E3F2FD (highlighted)
  medium: #2196F3 (highlighted)
  dark: #1565C0 (highlighted)

[View Full Plan] [Compare with Current]

Purpose: Give user exact specifications to verify against
```

#### User Actions

Document three workflows:

**1. "Everything Looks Good" Flow**
```
User clicks ✓ Everything Looks Good
  ↓
Verification task marked DONE
  ↓
Original task marked VERIFIED ✓
  ↓
Next task in queue
```

**2. "Found Issues" Flow**
```
User clicks ✗ Found Issues
  ↓
Issue reporting form opens:
- What's wrong? (text)
- Which element? (dropdown)
- Severity? (critical/major/minor)
  ↓
System creates investigation task
  ↓
Investigation task added to queue (high priority)
  ↓
Verification task marked BLOCKED
```

**3. "I'd Like to Change Something" Flow**
```
User clicks 💭 I'd Like to Change Something...
  ↓
Plan Adjustment Wizard opens
  ↓
(See Section 3 for wizard details)
```

#### Integration Points

Add section explaining:
- **Triggered by**: reportTaskDone when task has visual acceptance criteria
- **Server management**: MCP server starts/stops dev server via commands
- **Status updates**: WebSocket events update UI in real-time
- **Plan references**: Pulled from plan.json and design-system.json

---

## Section 3: Plan Adjustment Wizard (HIGH PRIORITY)

### Location in Notion
Create new page: **"14. Plan Adjustment & Evolution"**

### Content to Add

#### Overview
The Plan Adjustment Wizard appears when users want to modify the plan during verification or design review. It guides users through scoped questions and generates tasks for the changes.

#### Wizard UI Flow

Document each step:

**Step 1: Capture Change Request**
```
UI:
What would you like to change?
[Text area for user input]

Current plan value:
Primary color: #2196F3 (blue)

You want to change to:
[Color picker or text input]
```

**Step 2: Impact Analysis**
```
This change affects:
✓ Color palette CSS variables
✓ Button component theming
✓ Card component theming
✓ 12 other components

Impact analysis:
- Version bump: 1.0.0 → 1.1.0 (MINOR)
- New tasks: 5 tasks (update components)
- Estimated time: 3.5 hours
```

**Step 3: Scoped Planning Questions**
```
System asks ONLY relevant questions based on change:
- For color change → palette source, contrast targets, dark mode rules
- For layout change → breakpoints, navigation behavior, affected pages
- For API change → contract, consumers, migrations, compatibility

User edits answers (pre-filled from current plan)
```

**Step 4: Plan Diff View**
```
Shows current vs. proposed:
RED: Removed values
GREEN: New values
YELLOW: Modified values

Example:
- Primary color: #2196F3 (old)
+ Primary color: #9C27B0 (new)
~ Dark mode: Updated inversion formula
```

**Step 5: Confirmation & Task Generation**
```
User confirms plan update
  ↓
Plan version incremented
  ↓
Tasks auto-generated for changes:
- TASK-090: Update color palette CSS
- TASK-091: Update button components
- TASK-092: Update card components
- TASK-093: Test theme toggle
- TASK-094: Verify accessibility
  ↓
New verification tasks for updated components
  ↓
Back to normal flow
```

#### Version Bump Rules

Add table:

| Change Type | Version Bump | Examples |
|-------------|--------------|----------|
| Breaking API/UX, redesign, incompatible data | MAJOR (1.0.0 → 2.0.0) | Kanban → Tree view, Solo → Real-time collab |
| New features, additive visuals, non-breaking options | MINOR (1.0.0 → 1.1.0) | Color theme change, new page added |
| Fixes, copy tweaks, small accessibility fixes | PATCH (1.0.0 → 1.0.1) | Typo fixes, clarifications |

#### Integration with Verification

Add section explaining:
- Triggered from Visual Verification Panel "Change Something" button
- Can also be triggered from Review Tool annotations
- Generates tasks that enter normal execution flow
- Updates plan files (plan.json, metadata.json)
- Emits WebSocket events to update dashboard

---

## Section 4: Visual Review & Annotation Tool (HIGH PRIORITY)

### Location in Notion
Create new page: **"12. Visual Review & Annotation System"**

### Content to Add

#### Overview
The Visual Review Tool enables team collaboration through visual annotations on plan elements. Stakeholders can comment, suggest changes, raise issues, and approve sections without technical knowledge.

#### The 6 Annotation Types

Create subsection for each:

**1. Comment (💬 Blue)**
```
Purpose: General feedback or questions
Icon: message-circle
Color: #3B82F6
Use Case: "Can we merge this with task above?"
Features: Threading, @mentions, reactions
```

**2. Suggestion (💡 Yellow)**
```
Purpose: Propose change to element
Icon: lightbulb
Color: #FBBF24
Use Case: "Reduce from 8 hours to 4 hours"
Features: Accept/reject, edit suggestion, compare
```

**3. Issue (⚠️ Red)**
```
Purpose: Flag blocker or problem
Icon: alert-circle
Color: #DC2626
Use Case: "This creates circular dependency"
Features: Severity levels, auto-create task
```

**4. Approval (✅ Green)**
```
Purpose: Mark element as approved/reviewed
Icon: check-circle
Color: #10B981
Use Case: "✓ Looks good - approved"
Features: Approval workflow, sign-off tracking
```

**5. Question (❓ Purple)**
```
Purpose: Ask for clarification
Icon: help-circle
Color: #8B5CF6
Use Case: "What does 'RBAC' mean in this context?"
Features: Q&A threading, mark as answered
```

**6. Action Item (→ Cyan)**
```
Purpose: Mark as follow-up action
Icon: arrow-right-circle
Color: #06B6D4
Use Case: "TODO: Get estimation from John"
Features: Assign to user, due dates, track completion
```

#### Smart Task Selector

Document the three modes:

**Hover Mode**
- Hover over any plan element
- See annotation count badges
- Preview tooltip shows summary
- No selection made

**Click Mode**
- Click element to select
- Annotation panel opens
- All annotations for element displayed
- Can add new annotation

**Compare Mode**
- Select multiple elements
- See annotations side-by-side
- Compare feedback across elements
- Identify patterns

#### Threading & Reactions

Add section explaining:
```
Threading:
- Any annotation can have replies
- Nested conversations up to 3 levels
- Thread collapse/expand
- Thread resolution workflow

Reactions:
- 👍 👎 ❤️ 😄 🎉 🤔
- Quick feedback without full comment
- Reaction counts shown on annotations
- Filter by reaction type
```

#### Real-Time Collaboration

Document features:
```
WebSocket Integration:
- Live updates when team members add annotations
- Presence indicators (who's viewing what)
- Typing indicators in threads
- Notification system for @mentions

Notification Types:
- New annotation on your work
- Reply to your annotation
- @mention notification
- Resolution of your issue
- Approval of your section
```

#### Export Formats

Add table:

| Format | Content | Use Case |
|--------|---------|----------|
| Markdown | All annotations with metadata | Documentation, archiving |
| PDF | Formatted report with visual layout | Stakeholder review, presentations |
| CSV | Spreadsheet with annotation data | Analysis, tracking |
| JSON | Complete data for import/export | Backup, migration |

---

## Section 5: Complete Visual Design System (MEDIUM PRIORITY)

### Location in Notion
Expand existing page or create: **"10. Complete Visual Design System"**

### Content to Add

#### Color Palette (35 Colors)

Create table with all colors:

| Name | Hex | RGB | Usage | Contrast Ratio |
|------|-----|-----|-------|----------------|
| Primary | #3B82F6 | rgb(59, 130, 246) | Links, primary actions, focus | 4.5 |
| Primary Light | #DBEAFE | rgb(219, 234, 254) | Highlights, info backgrounds | 10.5 |
| Primary Dark | #1E40AF | rgb(30, 64, 175) | Dark backgrounds, emphasis | 9.0 |
| Critical | #DC2626 | rgb(220, 38, 38) | Critical priority, errors | 5.8 |
| High | #EA580C | rgb(234, 88, 12) | High priority, warnings | 6.2 |
| Medium | #FBBF24 | rgb(251, 191, 36) | Medium priority, cautions | 3.2 |
| Low | #10B981 | rgb(16, 185, 129) | Low priority, success | 6.4 |
| Feature | #10B981 | rgb(16, 185, 129) | Feature tasks | 6.4 |
| Bug | #DC2626 | rgb(220, 38, 38) | Bug fixes | 5.8 |
| Refactor | #8B5CF6 | rgb(139, 92, 246) | Refactoring | 5.5 |
| Testing | #06B6D4 | rgb(6, 182, 212) | Testing tasks | 5.2 |
| Documentation | #92400E | rgb(146, 64, 14) | Docs tasks | 8.0 |
| Maintenance | #6B7280 | rgb(107, 114, 128) | Maintenance | 7.0 |
| Success | #10B981 | rgb(16, 185, 129) | Positive outcomes | 6.4 |
| Error | #DC2626 | rgb(220, 38, 38) | Errors, failures | 5.8 |
| Warning | #FBBF24 | rgb(251, 191, 36) | Warnings | 3.2 |
| Info | #3B82F6 | rgb(59, 130, 246) | Information | 4.5 |
| Text Dark | #111827 | rgb(17, 24, 39) | Primary text | 21.0 |
| Text Medium | #4B5563 | rgb(75, 85, 99) | Secondary text | 8.5 |
| Text Light | #9CA3AF | rgb(156, 163, 175) | Tertiary text | 4.5 |
| BG Light | #F9FAFB | rgb(249, 250, 251) | Page background | 1.5 |
| BG Medium | #F3F4F6 | rgb(243, 244, 246) | Card background | 1.8 |
| Border | #D1D5DB | rgb(209, 213, 219) | Borders, dividers | 6.0 |

Add note: ✓ All colors meet WCAG AA standards (4.5:1 for text, 3:1 for UI)

#### Typography System

Create table:

| Level | Font Family | Size | Weight | Line Height | Usage |
|-------|-------------|------|--------|-------------|-------|
| H1 - Page Title | Inter, sans-serif | 32px | Bold (700) | 1.2 | Page headings |
| H2 - Section | Inter, sans-serif | 24px | Bold (700) | 1.3 | Major sections |
| H3 - Subsection | Inter, sans-serif | 20px | Semibold (600) | 1.4 | Subsections |
| H4 - Card Title | Inter, sans-serif | 16px | Semibold (600) | 1.4 | Card titles |
| Body - Regular | Inter, sans-serif | 14px | Regular (400) | 1.5 | Primary text |
| Body - Small | Inter, sans-serif | 12px | Regular (400) | 1.5 | Secondary text |
| Label | Inter, sans-serif | 12px | Medium (500) | 1.3 | Form labels |
| Code | Courier New, monospace | 12px | Regular (400) | 1.4 | Code snippets |
| Caption | Inter, sans-serif | 11px | Regular (400) | 1.4 | Metadata |

#### Spacing System

Create table:

| Scale | Value | Usage |
|-------|-------|-------|
| XS | 4px (0.5x) | Tight spacing, icon margins |
| S | 8px (1x) | Default spacing unit |
| M | 12px (1.5x) | Card padding, section gaps |
| L | 16px (2x) | Panel padding |
| XL | 24px (3x) | Major section spacing |
| 2XL | 32px (4x) | Page margins |
| 3XL | 48px (6x) | Hero sections |

Add note: Base unit is 8px (all spacing is multiple of 8)

#### Border Radius Scale

Create table:

| Scale | Value | Usage |
|-------|-------|-------|
| None | 0px | Sharp corners |
| XS | 2px | Tight buttons, minimal |
| S | 4px | Small components |
| M | 8px | Default (most components) |
| L | 12px | Large cards, modals |
| Full | 9999px | Pills, fully rounded |

#### Icon System (23 Core Icons)

Create table:

| Icon | Name | Usage | Sizes | Animation |
|------|------|-------|-------|-----------|
| 🏠 | home | Welcome/Home page | 16px, 20px, 24px | none |
| ➕ | plus-circle | Create new plan | 20px, 24px | pulse on hover |
| 📄 | file-text | Requirements page | 16px, 20px, 24px | none |
| 🌳 | list-tree | Task decomposition | 16px, 20px, 24px | none |
| 🔗 | network | Dependency graph | 16px, 20px, 24px | none |
| 📅 | calendar | Timeline/Gantt | 16px, 20px, 24px | none |
| ✏️ | edit-3 | Task editor | 16px, 20px, 24px | none |
| 📚 | layers | Template library | 16px, 20px, 24px | none |
| ✅ | check-circle | Verification | 16px, 20px, 24px | none |
| 📤 | share-2 | Export/share | 16px, 20px, 24px | none |
| ⭕ | circle | Pending status | 12px, 16px | none |
| ✓ | check | Completed | 12px, 16px | none |
| ⚠️ | alert-circle | Warning/blocked | 12px, 16px | pulse |
| 🗑️ | trash-2 | Delete | 16px, 20px | none |
| 📋 | copy | Duplicate | 16px, 20px | none |
| 🔗 | external-link | Open in new tab | 16px, 20px | none |
| ⬇️ | download | Export/download | 16px, 20px | none |
| ⚙️ | settings | Settings | 16px, 20px, 24px | spin on click |
| ⚡ | zap | Feature type | 14px, 18px | none |
| 🐛 | bug | Bug type | 14px, 18px | none |
| 🔄 | shuffle | Refactor type | 14px, 18px | none |
| 🔧 | wrench | Maintenance type | 14px, 18px | none |
| 🧪 | beaker | Testing type | 14px, 18px | none |

Add note: Source = Feather Icons (MIT licensed)

---

## Section 6: UI Page Specifications (MEDIUM PRIORITY)

### Location in Notion
Create new page: **"11. UI Page Specifications"**

### Content to Add

#### Overview
This section details all 10 pages in the Planner Mode interface with exact layouts, sections, and actions.

#### Template for Each Page

Use this structure for all 10 pages:

```
Page Name: [Name]
Route: [URL path]
Icon: [Icon name]
Position: [1-10]
Settings Available: [Yes/No]

Purpose:
[What this page does]

Main Sections:
[List of sections]

Left Sidebar:
[What appears in left sidebar]

Main Content:
[Detailed layout of main area]

Right Sidebar:
[What appears in right sidebar]

Bottom Actions:
[Action buttons]

Responsive Behavior:
[How it adapts to mobile]

Data Requirements:
[What data this page needs]
```

#### The 10 Pages

Document each page (use the structure above):

1. **Welcome & Dashboard** - Entry point, recent plans, templates
2. **New Plan Wizard** - 5-step wizard for plan creation
3. **Requirements Analysis** - Raw requirements + AI breakdown
4. **Task Decomposition Canvas** - Hierarchical task tree editor
5. **Dependency Graph Visualization** - Network diagram of dependencies
6. **Timeline & Milestones** - Gantt chart with resource allocation
7. **Task Details & Editor** - Deep task editing with tabs
8. **Template Library** - Pre-built and custom templates
9. **Plan Review & Validation** - Quality gates and checklist
10. **Export & Sharing** - Multi-format export options

For each page, provide:
- Exact layout description
- All interactive elements
- All actions available
- Responsive breakpoints
- Data sources

---

## Priority Summary for Planning Master

### Add These First (Critical):
1. ✅ Interactive Design Phase (Section 1)
2. ✅ Visual Verification System (Section 2)
3. ✅ Plan Adjustment Wizard (Section 3)
4. ✅ Visual Review & Annotation (Section 4)

### Add These Next (Important):
5. ⚠️ Complete Visual Design System (Section 5)
6. ⚠️ UI Page Specifications (Section 6)

### Already in Notion (No Action Needed):
- Architecture Document
- Agent Role Definitions
- Workflow Orchestration
- Data Flow & State Management
- MCP API Reference

---

## Formatting Guidelines for Planning Master

1. **Use rich text formatting**:
   - Headers for sections (H1, H2, H3)
   - Tables for structured data
   - Code blocks for technical specs
   - Callout boxes for key points
   - Bullet lists for features

2. **Add visual elements**:
   - Diagrams where helpful
   - Screenshots if available
   - Color swatches for design system
   - Icons in tables

3. **Create cross-references**:
   - Link between related sections
   - Reference existing pages
   - Build navigation structure

4. **Maintain consistency**:
   - Match style of existing 5 documents
   - Use same terminology
   - Keep same heading hierarchy

---

## Verification Checklist for Planning Master

After adding content, verify:

- [ ] All 6 sections created as new Notion pages
- [ ] Content matches specifications above
- [ ] Tables formatted correctly
- [ ] Cross-references work
- [ ] Diagrams display properly
- [ ] Code blocks syntax-highlighted
- [ ] Callout boxes used for key points
- [ ] Navigation structure complete
- [ ] All examples included
- [ ] No content omitted

---

## Questions for Human Review

If Planning Master encounters issues:

1. **Unclear specifications**: Ask for clarification on specific points
2. **Formatting conflicts**: Ask about preferred Notion structure
3. **Content priorities**: Confirm which sections to add first
4. **Cross-reference ambiguity**: Ask about linking strategy

---

**End of Instructions for Planning Master**

Planning Master: Please acknowledge receipt of these instructions and confirm you understand the task. Begin with Section 1 (Interactive Design Phase) and proceed through all 6 sections in the priority order specified.

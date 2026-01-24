# Live Preview System - Visual Guide

## UI Integration Overview

### Before Integration
```
┌─────────────────────────────────────────────────┐
│  Interactive Plan Builder                      │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐      │
│  │                                      │      │
│  │    Wizard Question Content          │      │
│  │                                      │      │
│  │                                      │      │
│  └──────────────────────────────────────┘      │
│                                                 │
│  [← Back]                          [Next →]    │
└─────────────────────────────────────────────────┘
```

### After Integration
```
┌──────────────────────────────────────────────────────────────────────┐
│  Interactive Plan Builder         [📋 Template] [👁️ Preview] [💡 AI]│
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┬────────────────────┬───────────────────┐   │
│  │                     │                    │                   │   │
│  │  Wizard Questions   │  Live Preview     │  AI Assistant     │   │
│  │                     │  (NEW!)           │  (Optional)       │   │
│  │  - Project Name     │  ┌──────────────┐ │  💡 Suggestions  │   │
│  │  - Technologies     │  │ Your Project │ │     - React      │   │
│  │  - Features         │  │              │ │     - Node.js    │   │
│  │                     │  │ Tech: React  │ │     - TypeScript │   │
│  │                     │  │       Node   │ │                   │   │
│  │                     │  │              │ │  [Accept] [Reject]│   │
│  │                     │  │ Features:    │ │                   │   │
│  │                     │  │  • Auth      │ │                   │   │
│  │                     │  │  • Dashboard │ │                   │   │
│  │                     │  └──────────────┘ │                   │   │
│  │                     │  ⏱️ 15ms         │                   │   │
│  └─────────────────────┴────────────────────┴───────────────────┘   │
│  [← Back]                                              [Next →]     │
└──────────────────────────────────────────────────────────────────────┘
```

## Toggle States

### Preview OFF
```
Grid: [Questions - flexible width]
Toggle: 👁️ Preview OFF (gray)
```

### Preview ON (Default)
```
Grid: [Questions - flexible width] [Preview - 400px fixed]
Toggle: 👁️ Preview ON (highlighted)
Render Time: Displayed in preview header
```

### Preview + AI Assistant
```
Grid: [Questions - flexible width] [Preview - 400px fixed] [AI - 350px fixed]
Toggles: 👁️ Preview ON | 💡 AI ON
```

## Preview Panel Components

### Header
```
┌─────────────────────────────────────┐
│ Live Preview          ⏱️ 15ms [▶] [🔄] │
└─────────────────────────────────────┘
  ✓ Shows render time
  ✓ Color codes performance:
    - Green: <100ms
    - Yellow: 100-350ms
    - Red: >350ms
  ✓ Auto-refresh toggle
  ✓ Manual refresh button
```

### Feedback Section
```
┌─────────────────────────────────────┐
│ Score: 85/100     ⚠️ 2  ℹ️ 3       │
├─────────────────────────────────────┤
│ ⚠️ Missing project description      │
│   💡 Add a brief description        │
│                                     │
│ ℹ️ Consider adding timeline         │
│   💡 Set milestones and dates       │
└─────────────────────────────────────┘
  ✓ Overall score
  ✓ Error/warning/info counts
  ✓ Actionable suggestions
```

### Preview Content
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ Your Project Name               │ │
│ │ web                             │ │
│ │ A complete web application      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ## Technologies                     │
│ • React                             │
│ • Node.js                           │
│ • PostgreSQL                        │
│                                     │
│ ## Features                         │
│ • User Authentication (high)        │
│ • Dashboard (medium)                │
│ • Reports (medium)                  │
└─────────────────────────────────────┘
  ✓ Styled HTML output
  ✓ Syntax highlighting
  ✓ Priority indicators
  ✓ VS Code theme integration
```

## User Interaction Flow

### 1. User Answers Question
```
User types: "React" → technologies field
         ↓
WizardContainer updates state
         ↓
wizardState computed property updates
         ↓
PreviewContainer receives new prop
```

### 2. Observer Detects Change
```
WizardStateObserver watches wizardState
         ↓
Detects change after 200ms debounce
         ↓
Triggers render callback
```

### 3. Preview Renders
```
PreviewEngine.render(state)
         ↓
Generate HTML sections
         ↓
Escape user input
         ↓
Track render time
         ↓
Return result (typically <30ms)
```

### 4. Feedback Analyzes
```
PreviewFeedback.analyze(state)
         ↓
Check completeness
         ↓
Calculate score
         ↓
Generate suggestions
         ↓
Return feedback
```

### 5. UI Updates
```
Preview HTML displayed
         ↓
Render time shown (green if <100ms)
         ↓
Feedback score shown
         ↓
Suggestions listed
```

## Performance Indicators

### Render Time Badge
```
⏱️ 15ms   → Green  (Excellent)
⏱️ 150ms  → Yellow (Good)
⏱️ 450ms  → Red    (Warning)
⏱️ 550ms  → Red    (Critical - shows warning)
```

### Feedback Score
```
Score: 90/100 → Green  (Good)
Score: 70/100 → Yellow (Fair)
Score: 50/100 → Red    (Needs Work)
```

### Warning Types
```
❌ Error   → Critical issue (red border)
⚠️ Warning → Suggestion (yellow background)
ℹ️ Info    → Helpful tip (blue background)
✅ Success → Validation passed (green)
```

## Responsive Behavior

The current implementation uses a fixed-width grid layout with CSS Grid. The main content area uses `1fr` (flexible width) to take up remaining space, while the preview panel and AI assistant have fixed widths:

- **Preview panel:** 400px fixed width
- **AI assistant:** 350px fixed width  
- **Main content:** Flexible width (`1fr`)

### Layout Variations
```
Preview OFF:
  grid-template-columns: auto (no grid, flexbox)

Preview ON:
  grid-template-columns: 1fr 400px
  
Preview + AI Assistant:
  grid-template-columns: 1fr 400px 350px
```

**Note:** Additional responsive breakpoints for narrow screens are not currently implemented.

## Keyboard Shortcuts

Currently implemented shortcuts:

```
Ctrl/Cmd + S  → Save wizard state
Shift + Tab   → Go to previous step
```

**Note:** Additional shortcuts for toggling preview (Ctrl/Cmd + P), AI assistant (Ctrl/Cmd + A), and closing panels (Escape) are not currently implemented.

## State Transitions

```
Empty State
    ↓
"Start filling out the wizard to see preview"
    ↓
First Answer Entered
    ↓
Preview appears with basic content
    ↓
More Answers Added
    ↓
Preview expands with sections
    ↓
Wizard Complete
    ↓
Full preview with all sections
    ↓
Export/Submit
```

## Error States

### Render Error
```
┌─────────────────────────────────────┐
│ ❌ Preview Unavailable              │
│                                     │
│ Failed to render preview            │
│ [Retry]                            │
└─────────────────────────────────────┘
```

### Performance Warning
```
┌─────────────────────────────────────┐
│ ⚠️ Slow Render: 520ms              │
│                                     │
│ Preview may be laggy. Consider     │
│ reducing content complexity.       │
└─────────────────────────────────────┘
```

## Developer Console Output

### Normal Operation
```
[PreviewContainer] State changed (field: projectName)
[PreviewEngine] Rendered in 18ms
[PreviewFeedback] Score: 75/100
```

### Performance Warning
```
[WizardContainer] Preview render time exceeded 500ms: 520ms
[PreviewEngine] WARNING: Render took 520ms (limit: 500ms)
```

### Error
```
[PreviewContainer] Render error: Invalid state structure
[PreviewEngine] ERROR: Unable to render state
```

## Testing UI

### Manual Testing Checklist
- [ ] Toggle preview on/off
- [ ] Toggle AI assistant
- [ ] Answer a question → preview updates
- [ ] Rapid typing → debouncing works
- [ ] Navigate between pages → preview updates
- [ ] Check render time display
- [ ] Check feedback score
- [ ] Verify suggestions appear
- [ ] Test with empty state
- [ ] Test with complete state
- [ ] Resize window → responsive
- [ ] Check VS Code theme integration

### Visual Regression Points
- Preview panel width (400px)
- AI panel width (350px)
- Render time badge colors
- Feedback score colors
- Section styling
- Typography
- Spacing

---

**Note:** All screenshots and visual examples above are text-based representations. 
The actual UI uses VS Code's native styling and theme system for seamless integration.

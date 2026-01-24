# Visual Verification Panel - User Guide

## Overview

The Visual Verification Panel is an interactive UI component for user-guided testing of task completion in the Copilot Orchestration Extension. It provides a comprehensive interface for verifying implementation quality, managing test checklists, and reporting issues.

## Features

### 1. Server Controls Panel
- **Start/Stop/Restart** development server with one click
- **Status indicator** showing real-time server state (running/stopped/starting/error)
- **Port configuration** and logs display
- **URL management** for accessing the development server

### 2. Smart Checklist
- **Auto-detection** of already-tested items
- **Draggable/reorderable** checklist items
- **Subtask support** with hierarchical organization
- **Status tracking**: Pending, In Progress, Passed, Failed
- **Real-time sync** with backend via WebSocket
- **Progress visualization** with percentage and visual progress bar
- **Plan navigation** - Jump directly to plan sections from checklist items

### 3. Design System Reference ⭐ NEW
- **Color Palette Display**
  - Visual color swatches with hex values
  - Primary, Secondary, Accent, Background, Text, and Border colors
  - Live preview of each color
  
- **Typography Specifications**
  - Font family with live preview
  - Available font weights
  - Font size scale (xs, sm, base, lg, xl, 2xl)
  
- **Component Styles**
  - Border radius with live preview
  - Padding specifications
  - Shadow levels
  
- **Documentation Links**
  - Component library URL
  - Design documentation URL

**Design System Setup:**
Create a `design-system.json` file in one of these locations:
- `<workspace-root>/design-system.json`
- `<workspace-root>/.vscode/design-system.json`
- `<workspace-root>/resources/design-system.json`

See `docs/DESIGN-SYSTEM-JSON-SCHEMA.md` for the full schema and examples.

### 4. Issue Reporting Workflow
- **Quick issue submission** directly from verification UI
- **Context attachment** (screenshots, logs, checklist item)
- **Auto-creates investigation tasks** in the orchestrator
- **Links to parent task** for traceability
- **Severity levels**: Low, Medium, High, Critical

### 5. Plan Adjustment Wizard
- **Modify acceptance criteria** during verification
- **Add/remove checklist items** dynamically
- **Save changes** back to the plan
- **Impact assessment** for plan changes

### 6. Real-time Updates
- **WebSocket integration** for live updates
- **Instant checklist sync** across instances
- **Server status monitoring**
- **Task status notifications**

## Usage

### Opening the Panel

1. **Command Palette**: `Ctrl+Shift+P` → "Copilot Orchestrator: Show Visual Verification"
2. **Status Menu**: Click the Orchestrator status bar item → "Visual Verification"
3. **Programmatically**: 
   ```typescript
   VisualVerificationPanel.createOrShow(context.extensionUri, {
     taskId: 'TASK-001',
     taskTitle: 'Your task title',
     planVersion: '1.0.0',
     serverUrl: 'http://localhost:3000',
     requiresUserReady: true,
   });
   ```

### Server Control Workflow

1. Click **Start** to launch the development server
2. Wait for status to change to "Running" (green badge)
3. Access your application at the displayed URL
4. Use **Restart** if you need to reload changes
5. Click **Stop** when verification is complete

### Checklist Verification Workflow

1. Review each checklist item
2. Click the dropdown to change status:
   - **Pending** - Not yet tested
   - **In Progress** - Currently testing
   - **Passed** - Verified successfully
   - **Failed** - Issue found
3. Click **📍** to jump to the plan section for context
4. Click **🐛** to report an issue for that item
5. Monitor the progress bar at the top

### Reporting Issues

1. Click the **🐛** button next to a failing checklist item
2. Fill in:
   - **Title**: Brief description of the issue
   - **Description**: Detailed explanation
   - **Severity**: Low, Medium, High, or Critical
3. Click **Create Task**
4. The issue is automatically created as an investigation task

### Using the User Ready Gate

Some verification tasks require manual confirmation before proceeding:

1. Review the verification requirements
2. Ensure you're ready to begin testing
3. Click **I'm Ready** button
4. The gate will unlock and show "Ready ✅"

### Design System Reference

If you have a `design-system.json` file in your workspace:

1. The panel will automatically load it on startup
2. View the **Design System Reference** section
3. See color swatches, typography, and component styles
4. Click links to access component library and docs

If no file is found, a default Ocean Blue theme is used.

### Plan Adjustment

When you need to modify the plan during verification:

1. Scroll to **Change Request (Plan Adjustment)** section
2. Enter a summary of what you want to change
3. Optionally describe the impact
4. Click **Request Plan Adjustment**
5. The Plan Adjustment Wizard will guide you through changes

## Integration with MCP

The Visual Verification Panel integrates with the MCP (Model Context Protocol) server for:

- **Task status reporting**
- **Observation logging**
- **Verification result submission**
- **Issue task creation**

All actions are automatically synced to the backend for team coordination.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Panel | `Ctrl+Shift+P` → "Show Visual Verification" |
| Navigate to Plan | Click **📍** on checklist item |
| Report Issue | Click **🐛** on checklist item |

## Troubleshooting

### Design System Not Loading

- Verify `design-system.json` exists in one of the supported locations
- Check JSON syntax is valid
- Look for errors in the Output panel (View → Output → Copilot Orchestrator)

### Server Status Stuck on "Starting"

- Check MCP connection is active (status bar)
- Verify server URL is correct
- Check server logs for errors

### Checklist Not Syncing

- Ensure WebSocket connection is active
- Check backend API is running
- Verify taskId matches the backend

### Plan Navigation Not Working

- Ensure `planFile`, `planLineStart`, and `planLineEnd` are set on checklist items
- Verify the plan file exists in the workspace
- Check file permissions

## API Reference

### VerificationState Interface

```typescript
interface VerificationState {
  taskId: string;
  taskTitle: string;
  planVersion: string;
  serverStatus: 'stopped' | 'starting' | 'running' | 'error';
  serverUrl: string;
  requiresUserReady: boolean;
  checklist: ChecklistItem[];
  alreadyTested: string[];
  retestRequired: string[];
  notInScope: string[];
  planHighlights: { title: string; details: string }[];
  changeRequests: { summary: string; impact?: string }[];
  designSystem?: DesignSystemReference;
}
```

### ChecklistItem Interface

```typescript
interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'passed' | 'failed';
  planSectionId?: string;
  planFile?: string;
  planLineStart?: number;
  planLineEnd?: number;
}
```

### DesignSystemReference Interface

```typescript
interface DesignSystemReference {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    border?: string;
  };
  typography?: {
    fontFamily?: string;
    weights?: number[];
    sizes?: { [key: string]: string };
  };
  components?: {
    borderRadius?: string;
    padding?: string;
    shadow?: string;
  };
  links?: {
    componentLibrary?: string;
    designDocs?: string;
  };
}
```

## Related Documentation

- [Design System JSON Schema](./DESIGN-SYSTEM-JSON-SCHEMA.md)
- [Plan Adjustment Workflow](../PLAN-ADJUSTMENT-WORKFLOW.md)
- [MCP Integration Guide](../MCP-INTEGRATION.md)

## Version History

### v1.1.0 (Current)
- ✨ Added Design System Reference section
- ✨ Color palette display with swatches
- ✨ Typography preview with live font rendering
- ✨ Component style preview
- ✨ External documentation links
- 📝 Comprehensive documentation

### v1.0.0
- ✅ Server control panel
- ✅ Smart checklist
- ✅ Issue reporting
- ✅ Plan navigation
- ✅ Real-time WebSocket sync
- ✅ User ready gate
- ✅ Progress tracking

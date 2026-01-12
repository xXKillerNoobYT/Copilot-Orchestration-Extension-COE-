# Implement Live Preview System for Interactive Design Phase

## Task Information

**ID:** TASK-mk9547oe-xj9fd

**Status:** done

**Priority:** high

**Dependencies:** None

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Complete Section 9 of Code Master by implementing real-time live preview in wizard. Connect wizard answers to preview panel with <200ms latency. Show live design updates as user answers questions. Add design impact indicators and visual feedback for user selections.

## Implementation Details

**Status**: Wizard container and Vue components complete (60%), but live preview not connected (0%).

**Current State**:
- Wizard container built (360 LOC)
- Vue components created (450 + 280 LOC)  
- Preview panel scaffold exists
- State management ready

**What's Missing**:
- Real-time answer → preview data binding
- Page section rendering from answers
- Design preview refresh on state changes
- Live feedback indicators (compatibility, impact)
- Visual element selection/highlighting

**Specification** (from Code Master Section 9):
- Preview updates within 200-500ms of answer change
- Show mockup of final design based on answers
- Indicate compatibility issues
- Show design impact of answers
- Page section highlighting when relevant questions answered

**Files to Create/Modify**:
1. Create: vscode-extension/src/planBuilder/livePreview.ts (200-300 LOC)
   - Real-time preview update engine
   - Answer → design mapping
   - Component rendering logic

2. Modify: vscode-extension/src/planBuilder/wizardContainer.ts
   - Wire preview updates to state changes
   - Add answer change listeners
   - Throttle updates for performance

3. Modify: resources/planBuilder/WizardContainer.vue
   - Connect preview panel to live data
   - Add design render component
   - Show feedback indicators

4. Add: resources/planBuilder/DesignPreview.vue (150-200 LOC)
   - Preview rendering component
   - Responsive design display
   - Real-time update handling

**Performance Requirements**:
- State change latency: <50ms
- Preview render: <200ms  
- Overall latency: <300ms (target)

**Testing**:
- Unit tests for preview update logic
- Integration tests for wizard → preview flow
- Performance tests (measure latency)
- Visual regression tests (preview accuracy)

## Test Strategy

Create integration test that: answers questions, captures preview state, verifies updates within 300ms, checks design accuracy. Measure performance with high-resolution timer. Manually test designer, analyst, architect paths.

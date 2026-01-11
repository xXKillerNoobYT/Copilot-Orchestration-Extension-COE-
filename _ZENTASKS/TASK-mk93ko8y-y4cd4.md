# Integrate WizardContainer into Plan Builder UI

## Task Information

**ID:** TASK-mk93ko8y-y4cd4

**Status:** done

**Priority:** high

**Dependencies:** TASK-mk9352eu-xm9qr

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Wire WizardContainer.vue component into planBuilderPanel.ts. Update panel to render wizard, handle completion messages, and dispatch to MCP backend for plan persistence.

## Implementation Details

1. Import WizardContainer in App.vue or create dedicated wizard view
2. Replace existing wizard scaffold with new WizardContainer
3. Update planBuilderPanel message handlers to process 'planComplete' messages
4. Add plan ID extraction and storage
5. Dispatch TaskDecompositionRequested event to MCP server
6. Update UI to show decomposition progress
7. Test end-to-end: wizard → plan → tasks → notification

## Test Strategy

Manual: Complete wizard, verify plan saved to backend, check tasks created in queue. Automated: Unit test plan dispatch logic, mock MCP responses.

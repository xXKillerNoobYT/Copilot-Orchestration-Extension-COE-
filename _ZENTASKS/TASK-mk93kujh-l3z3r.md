# Add AI-Powered Contextual Questions

## Task Information

**ID:** TASK-mk93kujh-l3z3r

**Status:** in-progress

**Priority:** high

**Dependencies:** TASK-mk9352eu-xm9qr

**Created:** 1/10/2026

**Updated:** 1/10/2026

## Description

Integrate MCP askQuestion tool into wizard UI. Add contextual AI-powered follow-up questions based on user answers and role. Display suggestions in side panel.

## Implementation Details

1. Create AiAssistanceService to call MCP askQuestion tool
2. Build ContextualAssistant component (Vue 3)
3. On answer change: debounce 1s, call askQuestion with current page context
4. Display suggestions in optional side panel
5. Allow user to accept/reject suggestions
6. Update answers if suggestion accepted
7. Log accepted suggestions for improvement
8. Test with mock LLM responses

## Test Strategy

Unit: Mock askQuestion responses, verify suggestion display. Integration: Test with live MCP server, verify latency < 2s, graceful error handling.

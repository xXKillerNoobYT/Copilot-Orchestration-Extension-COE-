# AI Assistance in Wizard Flow

This guide explains how AI-powered contextual assistance works in the Interactive Plan Builder wizard.

## Overview

The AI Assistance feature provides intelligent, context-aware suggestions as you work through the wizard, helping you make better decisions and complete your plan more efficiently.

## Features

### 1. Ask AI for Help Button

Every wizard question includes an "Ask AI for Help" button that triggers contextual assistance.

**How to use:**
1. Navigate to any question in the wizard
2. Click the "🤖 Ask AI for Help" button
3. The AI Assistant panel opens with relevant suggestions

### 2. Inline AI Hints

Smart hints appear above question inputs based on:
- Question type (text, select, etc.)
- Question content (name, description, etc.)
- Your previous answers
- Project context from workspace

**Example hints:**
- "Common answers include descriptive names that reflect your project's purpose. Consider your target audience."
- "Provide a clear overview focusing on what problem you're solving and who it helps."

### 3. AI Assistant Panel

The side panel shows:
- **Suggestions**: Up to 3 contextual follow-up questions
- **Context**: Explanation for each suggestion
- **Sources**: Citations from documentation and best practices
- **Confidence**: AI confidence level (High/Medium/Low)
- **Statistics**: Acceptance rate and suggestion count

### 4. Suggestion Actions

Each suggestion has three actions:

#### ✓ Use
Marks the suggestion as helpful and logs it for future improvements.

#### ↪️ Apply
Automatically applies the suggested answer to the current question field.

#### ✗ Skip
Dismisses the suggestion from the list.

### 5. Source Citations

Every AI suggestion includes sources, such as:
- Project planning best practices
- Architecture guidelines
- Industry standards
- Documentation references

**Why citations matter:**
- Verify suggestion quality
- Learn from authoritative sources
- Understand the reasoning behind suggestions

## Context Bundle

The AI uses a rich context bundle to generate intelligent suggestions:

### Included Context
1. **Current Answers**: All previous wizard answers
2. **Question Context**: Current page and question details
3. **Plan Context**: Project description, features, architecture notes
4. **Workspace Context**: Constraints and technical requirements
5. **User Role**: Your role in the project (analyst, developer, etc.)

### Context Limits
- Maximum context size: ~50KB
- Automatically prioritized to most relevant information
- Privacy-conscious: only includes necessary project data

## Error Handling

The system gracefully handles errors:

### When AI is Unavailable
- Wizard continues to function normally
- Error message shown in AI panel
- "Retry" button available
- No impact on core wizard functionality

### Timeout Handling
- 10-second timeout for AI requests
- Automatic fallback to empty suggestions
- User notified of timeout

### Malformed Responses
- Invalid suggestions filtered out
- Valid suggestions still displayed
- Error logged for debugging

## Integration with Answer Team

The AI Assistant communicates with the Answer Team agent via MCP:

1. **User clicks "Ask AI"** → Request sent to MCP server
2. **MCP routes to Answer Team** → Agent analyzes context
3. **Answer Team generates suggestions** → Based on context bundle
4. **Response returned** → Suggestions displayed in panel
5. **User interacts** → Acceptance tracked for improvement

## Best Practices

### When to Use AI Assistance
✅ When you're unsure how to answer a question
✅ When you want to explore different options
✅ When you need examples or guidance
✅ When you want to validate your approach

### When NOT to Use AI Assistance
❌ For simple, straightforward questions you already know
❌ When you have strict organizational requirements
❌ For sensitive or confidential information

## Acceptance Rate

The system tracks how often suggestions are accepted:

- **High acceptance (>70%)**: AI is providing valuable suggestions
- **Medium acceptance (40-70%)**: AI is somewhat helpful
- **Low acceptance (<40%)**: AI may need improvement

Your feedback helps improve the AI over time!

## Privacy & Security

### What Data is Sent
- Question text and context
- Your previous answers in the wizard
- Project plan information from workspace

### What Data is NOT Sent
- Source code files (unless explicitly included)
- Credentials or secrets
- Personal information
- Files outside the Docs/Plan folder

### Data Retention
- Suggestions are stored in-memory only
- No persistent storage of AI requests
- Session-based tracking only

## Troubleshooting

### AI Panel Not Showing
1. Click the "💡 AI ON/OFF" button in the header
2. Ensure the panel toggle is set to ON
3. Try refreshing the wizard

### No Suggestions Generated
1. Check error message in AI panel
2. Click "Retry" button
3. Verify MCP server is running
4. Check network connectivity

### Suggestions Not Relevant
1. Try answering a few more questions first
2. Provide more detail in your previous answers
3. Add project context in Docs/Plan folder
4. Use the "Skip" button to dismiss irrelevant suggestions

### Apply Button Not Working
1. Ensure the current question accepts the suggestion type
2. Check for validation errors
3. Try manual copy-paste as fallback

## Technical Details

### Architecture
- **Service**: `aiAssistanceService.ts`
- **Component**: `ContextualAssistant.vue`
- **Integration**: `WizardContainer.vue`
- **MCP Endpoint**: `/api/v1/mcp/askQuestion`

### Dependencies
- MCP Client for Answer Team communication
- Plan Context Service for workspace data
- Wizard Store for answer management

### Testing
- Unit tests: `aiAssistanceService.test.ts`
- Integration tests: `__tests__/integration/aiAssistance.test.ts`
- Coverage: Context bundling, error handling, source citations

## Future Enhancements

Planned improvements:
- [ ] Multi-language support
- [ ] Custom suggestion templates
- [ ] Learning from user patterns
- [ ] Offline suggestion caching
- [ ] Visual answer previews
- [ ] Collaborative suggestions (team mode)

## Support

For issues or questions:
1. Check this guide first
2. Review test files for examples
3. Check MCP server logs
4. File a GitHub issue with details

## Related Documentation

- [MCP Server Documentation](../../services/README.md)
- [Wizard Flow Guide](./WIZARD_GUIDE.md)
- [Context Service](./services/PlanContextService.ts)
- [Question Framework](./questionFramework.ts)

# AI-Assisted Five Core Questions Implementation Summary

## Overview
This implementation adds AI-assisted, self-building question capabilities to the five core wizard questions, enabling dynamic follow-up questions based on the project plan documents in `Docs/Plan/`.

## Components Implemented

### 1. Core Infrastructure

#### PlanContextService (`src/planBuilder/services/PlanContextService.ts`)
- **Purpose**: Reads and parses project plan documents from `Docs/Plan/` folder
- **Key Features**:
  - Loads `detailed project description` and `feature list` from plan folder
  - Extracts architecture notes, constraints, and technical requirements
  - Provides context-aware question generation
  - Generates smart suggestions based on plan content
  - Caches plan context for performance

#### DynamicFollowUpQuestions Component (`src/planBuilder/components/DynamicFollowUpQuestions.vue`)
- **Purpose**: Reusable component for rendering AI-generated follow-up questions
- **Key Features**:
  - Supports multiple input types: text, textarea, select, checkbox, radio
  - Collapsible/expandable interface
  - AI loading indicator
  - Answer persistence and change tracking
  - Responsive design with VS Code theme integration

### 2. Enhanced Question Components

#### Q1 - ProjectOverviewQuestion.vue (Enhanced)
- **AI Features Added**:
  - Generates follow-up questions based on selected project type
  - Web apps: Frontend framework selection, backend needs
  - APIs: API type (REST/GraphQL/gRPC), database selection
  - Plan-aware questions: Tech stack alignment, compliance requirements
- **Integration**: Reads from plan context to suggest technology choices

#### Q2 - ArchitectureQuestion.vue (Enhanced)
- **AI Features Added**:
  - Microservices: Service discovery, inter-service communication, API gateway
  - Serverless: Platform selection, event sources
  - MVC/Monolithic: Deployment strategy
  - Universal: Scalability requirements, performance targets, plan alignment
- **Integration**: Architecture suggestions based on project description

#### Q3 - FeatureBreakdownQuestion.vue (To Be Enhanced)
- **Planned AI Features**:
  - Auto-populate features from plan's feature list
  - Suggest feature priorities based on dependencies
  - Recommend feature phasing for large projects
  - Identify critical path features

#### Q4 - TimelineQuestion.vue (To Be Enhanced)
- **Planned AI Features**:
  - Generate milestone suggestions based on feature count
  - Recommend sprint/iteration structure
  - Calculate realistic timelines based on team size
  - Suggest milestone dependencies

#### Q5 - TeamStructureQuestion.vue (To Be Enhanced)
- **Planned AI Features**:
  - Recommend roles based on project type and tech stack
  - Suggest skill requirements for selected technologies
  - Calculate team composition based on project size
  - Map agents to appropriate roles

## How It Works

### Multi-Stage Self-Building Question Flow

1. **Initial Questions** (Core 5 questions)
   - User answers basic questions (name, description, type, etc.)
   - Validation ensures quality input

2. **Plan Context Loading**
   - PlanContextService reads `Docs/Plan/` folder
   - Extracts relevant context from project description and feature list
   - Parses architecture notes, constraints, and technical requirements

3. **AI-Assisted Follow-Up Generation**
   - Based on user's answers, generate contextual follow-up questions
   - Questions adapt to:
     - Selected project type (web, API, CLI, library)
     - Chosen architecture pattern (microservices, serverless, MVC, etc.)
     - Plan-specific requirements and constraints
     - Technical stack mentioned in plan

4. **Dynamic Question Rendering**
   - DynamicFollowUpQuestions component displays AI-generated questions
   - Questions appear after user completes core question
   - Expandable/collapsible to reduce cognitive load
   - Answers persist in wizardStore

5. **Answer Persistence**
   - All answers (core + follow-up) saved to wizardStore
   - Data persists across page navigation
   - localStorage backup for draft recovery

## Integration Points

### With Existing Systems

1. **WizardStore Integration**
   - Follow-up answers stored alongside core answers
   - Structure: `{ name, description, type, followUpAnswers: {...} }`
   - Automatic persistence and undo/redo support

2. **Plan Documents** (`Docs/Plan/`)
   - `detailed project description`: Project vision, architecture, constraints
   - `feature list`: Numbered features with descriptions
   - Service parses both files to generate contextual questions

3. **AI Assistance Service** (Future Enhancement)
   - Can integrate with `aiAssistanceService.ts`
   - Use MCP `askQuestion` for more advanced suggestions
   - Real-time question generation based on conversation

## Usage Example

### User Flow

1. **Q1 - Project Overview**
   ```
   User inputs:
   - Name: "Gym Automation System"
   - Description: "A web app to manage gym memberships and schedules"
   - Type: Web Application
   
   AI generates:
   - "What frontend framework will you use?" (React/Vue/Angular/Svelte)
   - "Does this web app need a backend?" (Yes/No checkbox)
   - "What specific technical stack will you use?" (based on plan)
   ```

2. **Q2 - Architecture**
   ```
   User selects:
   - Pattern: Microservices
   
   AI generates:
   - "What service discovery mechanism will you use?"
   - "How will services communicate?" (REST/gRPC/Message Queue)
   - "Will you use an API Gateway?"
   - "What are your scalability requirements?"
   ```

3. **Q3-Q5** (Pattern continues)
   - Features: AI suggests features from plan's feature list
   - Timeline: AI recommends milestones based on feature count
   - Team: AI suggests roles based on tech stack

## Benefits

### For Users
- **Guided Experience**: Questions adapt to skill level and project type
- **Plan-Aware**: Leverages existing plan documents
- **Time-Saving**: Auto-populates suggestions from plan
- **Comprehensive**: Ensures all important aspects are considered

### For System
- **Consistency**: All projects have complete planning data
- **Quality**: Better input = better task decomposition
- **Traceability**: Clear connection between plan and implementation
- **Extensibility**: Easy to add more question types

## File Structure

```
vscode-extension/src/planBuilder/
├── services/
│   └── PlanContextService.ts          # NEW: Plan document reader
├── components/
│   └── DynamicFollowUpQuestions.vue   # NEW: Reusable follow-up component
├── questions/
│   ├── ProjectOverviewQuestion.vue    # ENHANCED: AI follow-ups
│   ├── ArchitectureQuestion.vue       # ENHANCED: AI follow-ups
│   ├── FeatureBreakdownQuestion.vue   # TODO: Enhance
│   ├── TimelineQuestion.vue           # TODO: Enhance
│   └── TeamStructureQuestion.vue      # TODO: Enhance
└── wizardStore.ts                     # Stores all answers

Docs/Plan/                             # Plan documents
├── detailed project description       # Source of project context
└── feature list                       # Source of features
```

## Next Steps

1. **Complete Remaining Components**
   - [ ] Add AI follow-ups to FeatureBreakdownQuestion
   - [ ] Add AI follow-ups to TimelineQuestion
   - [ ] Add AI follow-ups to TeamStructureQuestion

2. **Enhanced AI Integration**
   - [ ] Integrate with aiAssistanceService for real-time suggestions
   - [ ] Add confidence scoring for suggestions
   - [ ] Implement suggestion acceptance tracking

3. **Testing**
   - [ ] Unit tests for PlanContextService
   - [ ] Integration tests for wizard flow
   - [ ] E2E tests with sample plan documents

4. **Documentation**
   - [ ] User guide for creating plan documents
   - [ ] Developer guide for adding new question types
   - [ ] API documentation for services

## Technical Decisions

### Why Vue Components?
- Consistent with existing planBuilder architecture
- Reactive data binding simplifies state management
- Component reusability across questions

### Why Separate PlanContextService?
- Single responsibility: reading plan documents
- Testable in isolation
- Can be mocked for testing
- Shared across all question components

### Why Collapsible Follow-Ups?
- Reduces cognitive load
- Optional engagement (users can skip if not relevant)
- Progressive disclosure pattern
- Maintains focus on core questions

## Known Limitations

1. **Static Plan Documents**
   - Currently reads from file system
   - No real-time updates if plan changes
   - Solution: Add file watcher or manual refresh

2. **Limited AI Intelligence**
   - Currently rule-based (if/then logic)
   - Not using LLM for question generation (yet)
   - Solution: Integrate with aiAssistanceService

3. **No Validation on Follow-Ups**
   - Follow-up answers not validated
   - Optional by design
   - Solution: Add optional validation rules

## References

- Issue: #[issue-number] - Implement Five Core Questions for Wizard MVP
- Original ZenTask: TASK-mk935327-9r7k4
- Plan Documents: `Docs/Plan/detailed project description`, `Docs/Plan/feature list`
- Code Master Reference: Section 9.2 (Wizard Store), Section 9.4 (AI-Assisted Planning)

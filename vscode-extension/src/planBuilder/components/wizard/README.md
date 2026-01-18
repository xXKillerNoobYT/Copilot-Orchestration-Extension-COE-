# Five Core Wizard Questions - Implementation

## Overview

This implementation provides an interactive wizard for capturing project requirements through five core questions. The wizard automatically generates comprehensive project plans with acceptance criteria, task decomposition, and risk management.

## Architecture

### Components

1. **Question Components** (`src/planBuilder/components/wizard/`)
   - `QuestionOne.vue` - What are you building?
   - `QuestionTwo.vue` - Who are the users/stakeholders?
   - `QuestionThree.vue` - What are success criteria?
   - `QuestionFour.vue` - What are constraints?
   - `QuestionFive.vue` - What are risks?
   - `WizardSummary.vue` - Review & generate plan

2. **Service Layer** (`src/planBuilder/services/`)
   - `WizardService.ts` - Answer processing and plan generation

3. **Integration**
   - `WizardContainer.vue` - Main wizard orchestration
   - `wizardStore.ts` - State management

## The Five Core Questions

### Q1: What are you building?
Captures:
- Project name (required)
- Project type: API, UI, Service, Library, Other
- Brief description (min 20 chars)
- Key objectives (3-5 bullet points)

**Example:**
```json
{
  "projectName": "E-Commerce Platform",
  "projectType": "ui",
  "projectDescription": "A modern e-commerce platform...",
  "objectives": [
    "Provide seamless shopping experience",
    "Integrate with multiple payment gateways",
    "Support inventory management"
  ]
}
```

### Q2: Who are the users/stakeholders?
Captures:
- Primary users (required, at least 1)
- Secondary users (optional)
- Key stakeholders (required, at least 1)
- User needs description (min 50 chars)

**Example:**
```json
{
  "primaryUsers": ["Online shoppers", "Mobile users"],
  "secondaryUsers": ["Store administrators"],
  "stakeholders": ["CEO", "Product Manager"],
  "userNeeds": "Users need a fast, intuitive platform..."
}
```

### Q3: What are success criteria?
Captures:
- Success criteria (required, dynamic list)
- Measurable metrics (optional, dynamic list)
- Non-functional requirements (required, dynamic list)
- User acceptance criteria (required, min 50 chars)

**Example:**
```json
{
  "successCriteria": [
    "Users can complete purchase in under 3 minutes",
    "Cart abandonment rate below 20%"
  ],
  "metrics": ["Checkout time", "Conversion rate"],
  "nonFunctionalRequirements": [
    "Page load time under 2 seconds",
    "GDPR compliant"
  ],
  "userAcceptanceCriteria": "Users can browse, checkout, and receive confirmation"
}
```

### Q4: What are constraints?
Captures:
- Timeline/deadline (required)
- Technology constraints (required, dynamic list)
- Resource limits (required, min 20 chars)
- Dependencies (required, dynamic list)

**Example:**
```json
{
  "timeline": "6 months - Launch by Q2 2024",
  "technologyConstraints": ["React", "Node.js", "AWS"],
  "resourceLimits": "Team of 5, budget $200k",
  "dependencies": ["Payment API", "Shipping API"]
}
```

### Q5: What are risks?
Captures:
- Technical risks (required, dynamic list)
- Resource risks (required, dynamic list)
- Business risks (required, dynamic list)
- Mitigation strategies (optional, dynamic list)

**Example:**
```json
{
  "technicalRisks": ["Payment integration complexity"],
  "resourceRisks": ["Budget constraints"],
  "businessRisks": ["Market competition"],
  "mitigations": ["Early POC", "Load testing"]
}
```

## Plan Generation

The `WizardService` processes answers and generates:

### 1. Acceptance Criteria (Auto-Generated)
- Success criteria from Q3
- Objectives from Q1 as acceptance criteria
- Non-functional requirements from Q3
- User acceptance criteria from Q3

### 2. Task Decomposition
Tasks are automatically created in phases:
- **Setup Phase**: Project initialization
- **Development Phase**: 
  - Type-specific foundation tasks (API/UI/Service/Library)
  - Objective-based tasks (one per objective)
- **QA Phase**: Quality assurance and testing
- **Deployment Phase**: Production deployment
- **Risk Management Phase**: Mitigation tasks (if provided)

### 3. Task Dependencies
- Development tasks depend on setup
- QA tasks depend on all development tasks
- Deployment depends on QA completion
- Proper dependency chains maintained

## Usage

### Basic Flow

1. User answers all 5 questions
2. Navigate to summary page
3. Review all answers
4. Click "Generate Plan"
5. Plan is created with:
   - Auto-generated acceptance criteria
   - Decomposed tasks with dependencies
   - Phase organization
   - Risk mitigation tasks

### Programmatic Usage

```typescript
import { WizardService, type WizardAnswers } from './services/WizardService';

// Validate answers
const validation = WizardService.validateAnswers(answers);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Generate plan
const plan = await WizardService.generatePlan(answers);

// Export plan
const markdown = WizardService.exportPlan(plan, 'markdown');
const json = WizardService.exportPlan(plan, 'json');
```

## Testing

### Unit Tests
- `WizardService.test.ts` - Service layer tests
  - Answer validation
  - Plan generation
  - Export functionality

### Integration Tests
- `fiveCoreWizardFlow.test.ts` - End-to-end wizard flow
  - Complete wizard journey
  - All 5 questions
  - Plan generation
  - Task decomposition

### Manual Verification
Run the verification script:
```bash
npm run compile
node dist/verification/wizardVerification.js
```

## Validation Rules

### Q1 Validation
- Project name: required, min 3 chars
- Project type: required
- Description: required, min 20 chars
- Objectives: required, 3-5 items

### Q2 Validation
- Primary users: required, at least 1
- Stakeholders: required, at least 1
- User needs: required, min 50 chars

### Q3 Validation
- Success criteria: required, at least 1
- Non-functional requirements: required, at least 1
- User acceptance criteria: required, min 50 chars

### Q4 Validation
- Timeline: required
- Technology constraints: required, at least 1
- Resource limits: required, min 20 chars
- Dependencies: required, at least 1

### Q5 Validation
- Technical risks: required, at least 1
- Resource risks: required, at least 1
- Business risks: required, at least 1
- Mitigations: optional

## Export Formats

### JSON Export
Complete structured data with all plan details.

### Markdown Export
Formatted document with:
- Project overview
- Users & stakeholders
- Acceptance criteria (as checkboxes)
- Task breakdown by phase
- Risk analysis

## Features

✅ All 5 questions implemented with good UX
✅ Questions support multi-line input where needed
✅ Acceptance criteria auto-generated from answers
✅ Plan is decomposed based on answers
✅ Wizard provides helpful hints/examples for each question
✅ Answers can be saved/edited
✅ Integration with plan decomposition working
✅ Tests passing (unit + integration)

## Example Output

For a sample e-commerce project, the wizard generates:
- 14 acceptance criteria
- 13 tasks across 5 phases
- Proper task dependencies
- Risk mitigation strategies
- 6,540 character markdown document

See `wizardVerification.ts` for a complete example.

## Future Enhancements

- [ ] Visual progress indicator
- [ ] Answer templates for common project types
- [ ] AI-powered suggestions for each question
- [ ] Export to additional formats (YAML, PDF)
- [ ] Integration with GitHub Issues
- [ ] Collaborative wizard sessions
- [ ] Answer validation with LLM assistance

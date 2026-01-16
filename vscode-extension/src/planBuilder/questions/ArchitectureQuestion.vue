<template>
  <div class="question-container architecture-question">
    <div class="question-header">
      <h2>Architecture Pattern</h2>
      <p class="question-hint">
        Select the architecture pattern that best fits your project. This will influence task decomposition and team structure recommendations.
      </p>
    </div>

    <div class="architecture-grid">
      <div
        v-for="pattern in architecturePatterns"
        :key="pattern.value"
        class="architecture-card"
        :class="{ selected: selectedArchitecture === pattern.value }"
        @click="selectArchitecture(pattern.value)"
      >
        <div class="card-icon">{{ pattern.icon }}</div>
        <div class="card-content">
          <h3>{{ pattern.label }}</h3>
          <p class="card-description">{{ pattern.description }}</p>
        </div>
        <div v-if="selectedArchitecture === pattern.value" class="checkmark">✓</div>
      </div>
    </div>

    <div v-if="selectedArchitecture" class="diagram-section">
      <div class="diagram-header">
        <h3>Architecture Overview</h3>
        <button
          class="diagram-button"
          :class="{ active: showDiagram }"
          @click="showDiagram = !showDiagram"
        >
          {{ showDiagram ? '▼' : '▶' }} Diagram
        </button>
      </div>

      <transition name="slide">
        <div v-if="showDiagram" class="diagram-container">
          <div class="diagram-placeholder">
            <div class="diagram-ascii">{{ getArchitectureDiagram(selectedArchitecture) }}</div>
          </div>
        </div>
      </transition>
    </div>

    <div v-if="selectedArchitecture" class="notes-section">
      <label for="architecture-notes" class="optional">Architecture Notes</label>
      <textarea
        id="architecture-notes"
        v-model="architectureNotes"
        maxlength="300"
        rows="4"
        placeholder="Add any specific requirements or considerations for your architecture..."
        class="form-control"
      ></textarea>
      <div class="character-count">{{ architectureNotes.length }}/300</div>
    </div>

    <div v-if="!selectedArchitecture" class="validation-summary">
      Please select an architecture pattern to proceed.
    </div>

    <div v-if="selectedArchitecture" class="validation-summary success">
      ✓ Architecture pattern selected: <strong>{{ getPatternLabel(selectedArchitecture) }}</strong>
    </div>

    <!-- AI-Assisted Follow-up Questions -->
    <DynamicFollowUpQuestions
      v-if="selectedArchitecture"
      :questions="followUpQuestions"
      :existing-answers="followUpAnswers"
      :show-ai-loader="isLoadingFollowUps"
      header-text="🤖 Architecture Deep Dive"
      hint-text="Based on your architecture choice, let's dive deeper into the technical details."
      @answers-changed="handleFollowUpAnswers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '../wizardStore';
import DynamicFollowUpQuestions from '../components/DynamicFollowUpQuestions.vue';
import type { FollowUpQuestion } from '../components/DynamicFollowUpQuestions.vue';
import { PlanContextService } from '../services/PlanContextService';

// Props
interface Props {
  questionId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q2-architecture',
});

// Store
const wizardStore = useWizardStore();
const planContextService = PlanContextService.getInstance();

// State
const selectedArchitecture = ref('');
const architectureNotes = ref('');
const showDiagram = ref(true);
const followUpQuestions = ref<FollowUpQuestion[]>([]);
const followUpAnswers = ref<Record<string, unknown>>({});
const isLoadingFollowUps = ref(false);

// Architecture patterns
const architecturePatterns = [
  {
    value: 'mvc',
    label: 'MVC',
    icon: '🏗️',
    description:
      'Model-View-Controller. Traditional three-tier architecture, good for monolithic applications with clear separation of concerns.',
  },
  {
    value: 'microservices',
    label: 'Microservices',
    icon: '🔗',
    description:
      'Distributed system of small, independent services. Scalable and flexible, requires robust DevOps practices.',
  },
  {
    value: 'serverless',
    label: 'Serverless',
    icon: '☁️',
    description:
      'Event-driven functions (Lambda, Cloud Functions). Pay-per-use, excellent for variable workloads.',
  },
  {
    value: 'monolithic',
    label: 'Monolithic',
    icon: '🧊',
    description:
      'Single unified codebase and deployment. Simple to develop initially, may become harder to scale.',
  },
  {
    value: 'modular-monolith',
    label: 'Modular Monolith',
    icon: '🎲',
    description:
      'Monolith organized into independent modules. Balances simplicity with modularity and future scalability.',
  },
];

// Helper functions
function selectArchitecture(value: string): void {
  selectedArchitecture.value = value;
  updateStore();
  generateFollowUpQuestions();
}

function getPatternLabel(value: string): string {
  const pattern = architecturePatterns.find(p => p.value === value);
  return pattern?.label || value;
}

function getArchitectureDiagram(architecture: string): string {
  const diagrams: Record<string, string> = {
    mvc: `┌─────────────────────────────────┐
│        CLIENT (Browser)         │
└────────────────┬────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ Router  │  │Controller│  │  Views   │
└────┬────┘  └────┬─────┘  └──────────┘
     │            │
     └────────────┤
                  ▼
            ┌──────────┐
            │  Models  │
            │          │
            │ Database │
            └──────────┘`,

    microservices: `┌──────────────────────────────────────┐
│         API Gateway / Load Balancer  │
└────┬──────────┬──────────┬──────────┘
     │          │          │
     ▼          ▼          ▼
  ┌────┐    ┌────┐    ┌────┐
  │Svc1│    │Svc2│    │Svc3│
  └─┬──┘    └─┬──┘    └─┬──┘
    │        │        │
    ▼        ▼        ▼
  ┌────┐  ┌────┐  ┌────┐
  │DB1 │  │DB2 │  │DB3 │
  └────┘  └────┘  └────┘`,

    serverless: `┌─────────────────────────────────┐
│         Event Sources           │
│ (API, S3, DynamoDB, Queue, etc) │
└────────────────┬────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│Lambda 1│  │Lambda 2│  │Lambda 3│
└────────┘  └────────┘  └────────┘
                 │
                 ▼
           ┌──────────────┐
           │Cloud Storage │
           │ (S3, etc)    │
           └──────────────┘`,

    monolithic: `┌──────────────────────────────────┐
│          Application              │
│ ┌──────────────────────────────┐ │
│ │ Presentation Layer (Views)   │ │
│ ├──────────────────────────────┤ │
│ │ Business Logic Layer         │ │
│ ├──────────────────────────────┤ │
│ │ Data Access Layer            │ │
│ └──────────────────────────────┘ │
└────────────┬─────────────────────┘
             ▼
        ┌──────────┐
        │ Database │
        └──────────┘`,

    'modular-monolith': `┌─────────────────────────────────┐
│       Monolithic Application    │
│  ┌────────────┐  ┌────────────┐ │
│  │  Module 1  │  │  Module 2  │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────┐  ┌────────────┐ │
│  │  Module 3  │  │  Module 4  │ │
│  └──────┬─────┘  └──────┬─────┘ │
│         │                │       │
│         └────────┬───────┘       │
│                  ▼               │
│            ┌──────────┐          │
│            │  Shared  │          │
│            │  Utils   │          │
│            └──────────┘          │
└────────────┬──────────────────────┘
             ▼
        ┌──────────┐
        │ Database │
        └──────────┘`,
  };

  return diagrams[architecture] || 'No diagram available';
}

function updateStore(): void {
  wizardStore.setAnswer(props.questionId, {
    pattern: selectedArchitecture.value,
    notes: architectureNotes.value,
    followUpAnswers: followUpAnswers.value,
  });
}

// Generate follow-up questions based on architecture selection
async function generateFollowUpQuestions(): Promise<void> {
  isLoadingFollowUps.value = true;

  try {
    const planContext = await planContextService.loadPlanContext();
    const questions: FollowUpQuestion[] = [];

    // Architecture-specific questions
    if (selectedArchitecture.value === 'microservices') {
      questions.push({
        id: 'service-discovery',
        text: 'What service discovery mechanism will you use?',
        type: 'select',
        options: [
          { value: 'consul', label: 'Consul' },
          { value: 'eureka', label: 'Eureka' },
          { value: 'kubernetes', label: 'Kubernetes Service Discovery' },
          { value: 'etcd', label: 'etcd' },
        ],
      });
      questions.push({
        id: 'inter-service-communication',
        text: 'How will services communicate?',
        type: 'radio',
        options: [
          { value: 'rest', label: 'REST/HTTP' },
          { value: 'grpc', label: 'gRPC' },
          { value: 'message-queue', label: 'Message Queue' },
        ],
      });
      questions.push({
        id: 'api-gateway',
        text: 'Will you use an API Gateway?',
        type: 'checkbox',
        checkboxLabel: 'Yes, use an API Gateway for routing and authentication',
      });
    }

    if (selectedArchitecture.value === 'serverless') {
      questions.push({
        id: 'serverless-provider',
        text: 'Which serverless platform will you use?',
        type: 'select',
        options: [
          { value: 'aws-lambda', label: 'AWS Lambda' },
          { value: 'azure-functions', label: 'Azure Functions' },
          { value: 'google-cloud-functions', label: 'Google Cloud Functions' },
          { value: 'cloudflare-workers', label: 'Cloudflare Workers' },
        ],
      });
      questions.push({
        id: 'event-sources',
        text: 'What will trigger your functions?',
        type: 'textarea',
        placeholder: 'e.g., HTTP requests, S3 events, database changes...',
        rows: 3,
      });
    }

    if (selectedArchitecture.value === 'mvc' || selectedArchitecture.value === 'monolithic') {
      questions.push({
        id: 'deployment-strategy',
        text: 'How will you deploy the application?',
        type: 'select',
        options: [
          { value: 'traditional', label: 'Traditional server deployment' },
          { value: 'container', label: 'Containerized (Docker)' },
          { value: 'paas', label: 'Platform as a Service (Heroku, etc.)' },
        ],
      });
    }

    // Universal architecture questions
    questions.push({
      id: 'scalability-requirements',
      text: 'What are your scalability requirements?',
      type: 'textarea',
      placeholder: 'Expected concurrent users, data volume, request rate...',
      rows: 3,
      hint: 'This helps determine infrastructure and caching strategies.',
    });

    questions.push({
      id: 'performance-targets',
      text: 'Do you have specific performance targets?',
      type: 'text',
      placeholder: 'e.g., Response time < 200ms, 99.9% uptime...',
    });

    if (planContext.architectureNotes) {
      questions.push({
        id: 'plan-alignment',
        text: 'How does this architecture align with your plan?',
        type: 'textarea',
        placeholder: 'Explain how your architecture choice meets the plan requirements...',
        rows: 3,
        hint: 'Reference specific architectural requirements from your plan.',
      });
    }

    followUpQuestions.value = questions;
  } catch (error) {
    console.error('[Architecture] Error generating follow-up questions:', error);
  } finally {
    isLoadingFollowUps.value = false;
  }
}

// Handle follow-up answers
function handleFollowUpAnswers(answers: Record<string, unknown>): void {
  followUpAnswers.value = answers;
  updateStore();
}

// Load existing answer from store
onMounted(() => {
  const existingAnswer = wizardStore.getAnswer<{
    pattern: string;
    notes: string;
    followUpAnswers?: Record<string, unknown>;
  }>(props.questionId);

  if (existingAnswer) {
    selectedArchitecture.value = existingAnswer.pattern || '';
    architectureNotes.value = existingAnswer.notes || '';
    followUpAnswers.value = existingAnswer.followUpAnswers || {};

    if (existingAnswer.pattern) {
      generateFollowUpQuestions();
    }
  }
});

// Watch notes for changes
const handleNotesChange = (): void => {
  updateStore();
};

// Expose validation for parent component
defineExpose({
  validate: () => selectedArchitecture.value !== '',
  isValid: computed(() => selectedArchitecture.value !== ''),
});
</script>

<style scoped>
.question-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.question-header {
  margin-bottom: 2rem;
}

.question-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--vscode-foreground);
}

.question-hint {
  color: var(--vscode-descriptionForeground);
  font-size: 0.95rem;
  line-height: 1.5;
}

.architecture-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.architecture-card {
  position: relative;
  cursor: pointer;
  padding: 1.2rem;
  border: 2px solid var(--vscode-input-border);
  border-radius: 8px;
  background: var(--vscode-input-background);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.architecture-card:hover {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-hoverBackground);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.architecture-card.selected {
  border-color: var(--vscode-focusBorder);
  border-width: 3px;
  background: var(--vscode-list-activeSelectionBackground);
}

.card-icon {
  font-size: 2rem;
  text-align: center;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.card-content h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0;
}

.card-description {
  font-size: 0.8rem;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
  margin: 0;
}

.checkmark {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 1.2rem;
  color: var(--vscode-testing-iconPassed);
  font-weight: bold;
}

.diagram-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  border: 1px solid var(--vscode-input-border);
}

.diagram-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.diagram-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}

.diagram-button {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.diagram-button:hover {
  background: var(--vscode-button-hoverBackground);
}

.diagram-button.active {
  background: var(--vscode-button-hoverBackground);
}

.diagram-container {
  margin-top: 1rem;
}

.diagram-placeholder {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
}

.diagram-ascii {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.2;
  color: var(--vscode-foreground);
  white-space: pre;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.slide-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.notes-section {
  margin: 1.5rem 0;
}

.notes-section label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--vscode-foreground);
}

.notes-section label.optional::after {
  content: ' (optional)';
  color: var(--vscode-descriptionForeground);
  font-weight: normal;
  font-size: 0.85rem;
}

.form-control {
  width: 100%;
  padding: 0.6rem;
  font-family: var(--vscode-font-family);
  font-size: 0.9rem;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  resize: vertical;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.character-count {
  font-size: 0.8rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 0.3rem;
  text-align: right;
}

.validation-summary {
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-top: 1rem;
  text-align: center;
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  color: var(--vscode-inputValidation-warningForeground);
}

.validation-summary.success {
  background: var(--vscode-testing-iconPassed);
  opacity: 0.15;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-testing-iconPassed);
}

@media (max-width: 768px) {
  .architecture-grid {
    grid-template-columns: 1fr;
  }

  .diagram-ascii {
    font-size: 0.65rem;
  }

  .question-container {
    padding: 1rem;
  }
}
</style>

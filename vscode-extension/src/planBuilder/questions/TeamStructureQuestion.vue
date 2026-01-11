<template>
  <div class="question-container team-structure-question">
    <div class="question-header">
      <h2>Team Structure</h2>
      <p class="question-hint">
        Define the team members and their roles. Map agents to team positions. At least 1 role is required to proceed.
      </p>
    </div>

    <div class="team-toolbar">
      <button class="btn btn-primary" @click="addRole">
        + Add Team Member
      </button>
      <span class="member-count">{{ teamMembers.length }} member(s)</span>
    </div>

    <div v-if="teamErrors.length > 0" class="error-message">
      {{ teamErrors[0] }}
    </div>

    <div v-if="teamMembers.length === 0" class="empty-state">
      <div class="empty-icon">👥</div>
      <p>No team members added yet. Click "Add Team Member" to get started.</p>
    </div>

    <div v-else class="team-members-list">
      <div
        v-for="(member, index) in teamMembers"
        :key="`member-${index}`"
        class="team-member-item"
      >
        <div class="member-header">
          <span class="member-badge">{{ getRoleBadge(member.role) }}</span>
          <select
            v-model="member.role"
            class="role-select"
            @change="validateTeam"
          >
            <option value="">Select role...</option>
            <option v-for="role in predefinedRoles" :key="role" :value="role">
              {{ formatRoleName(role) }}
            </option>
            <option value="other">Custom Role...</option>
          </select>

          <input
            v-if="member.role === 'other'"
            v-model="member.customRole"
            type="text"
            placeholder="Enter custom role"
            class="custom-role-input"
            @input="validateTeam"
          />

          <button
            class="btn btn-danger btn-sm"
            @click="removeRole(index)"
          >
            Remove
          </button>
        </div>

        <div class="member-content">
          <div class="form-group">
            <label class="small-label">Skills (comma-separated)</label>
            <input
              v-model="member.skills"
              type="text"
              placeholder="e.g., TypeScript, React, Node.js"
              class="form-control small"
              @input="validateTeam"
            />
            <small class="hint">Add skills separated by commas</small>
          </div>

          <div class="form-group">
            <label class="small-label">Agent Mapping</label>
            <select
              v-model="member.agentMapping"
              class="form-control small"
              @change="validateTeam"
            >
              <option :value="null">No agent assigned</option>
              <option
                v-for="agent in availableAgents"
                :key="agent"
                :value="agent"
              >
                {{ agent }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="small-label">Availability</label>
            <select
              v-model="member.availability"
              class="form-control small"
              @change="validateTeam"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="consulting">Consulting</option>
            </select>
          </div>
        </div>

        <div v-if="member.error" class="member-error">
          {{ member.error }}
        </div>

        <div class="skill-tags">
          <div
            v-for="skill in parseSkills(member.skills)"
            :key="skill"
            class="skill-tag"
          >
            {{ skill }}
            <button
              class="remove-skill"
              @click="removeSkill(index, skill)"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="teamMembers.length > 0" class="team-analysis">
      <h3>Team Coverage Analysis</h3>
      <div class="coverage-grid">
        <div
          v-for="(count, skill) in getSkillCoverage()"
          :key="skill"
          class="coverage-item"
        >
          <span class="skill-name">{{ skill }}</span>
          <span class="coverage-bar">
            <span class="coverage-fill" :style="{ width: `${count * 15}%` }"></span>
          </span>
          <span class="coverage-count">{{ count }} member(s)</span>
        </div>
      </div>
    </div>

    <div v-if="teamMembers.length > 0" class="team-preview">
      <h3>Team Structure</h3>
      <div class="team-grid">
        <div
          v-for="(member, index) in teamMembers"
          :key="`preview-${index}`"
          class="team-card"
        >
          <div class="card-header">
            <div class="role-icon">{{ getRoleIcon(member.role || member.customRole) }}</div>
            <div class="role-info">
              <strong>{{ member.role === 'other' ? member.customRole : formatRoleName(member.role) }}</strong>
              <small>{{ member.availability }}</small>
            </div>
          </div>
          <div class="card-body">
            <div v-if="member.agentMapping" class="agent-badge">
              🤖 {{ member.agentMapping }}
            </div>
            <div v-if="parseSkills(member.skills).length > 0" class="skills-preview">
              <span
                v-for="skill in parseSkills(member.skills).slice(0, 2)"
                :key="skill"
                class="skill-mini-tag"
              >
                {{ skill }}
              </span>
              <span v-if="parseSkills(member.skills).length > 2" class="skill-more">
                +{{ parseSkills(member.skills).length - 2 }} more
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isValid" class="validation-summary error">
      ⚠️ Please ensure at least 1 team member with a role is defined.
    </div>

    <div v-if="isValid" class="validation-summary success">
      ✓ Team with {{ teamMembers.length }} member(s) is valid
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '../wizardStore';

interface TeamMember {
  role: string;
  customRole: string;
  skills: string;
  agentMapping: string | null;
  availability: string;
  error: string;
}

interface Props {
  questionId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  questionId: 'q5-team',
});

// Store
const wizardStore = useWizardStore();

// State
const teamMembers = ref<TeamMember[]>([
  { role: '', customRole: '', skills: '', agentMapping: null, availability: 'full-time', error: '' },
]);
const teamErrors = ref<string[]>([]);

// Predefined roles
const predefinedRoles = [
  'frontend-engineer',
  'backend-engineer',
  'full-stack-engineer',
  'devops-engineer',
  'qa-engineer',
  'designer-ux',
  'designer-ui',
  'product-manager',
  'tech-lead',
  'project-manager',
];

// Available agents
const availableAgents = [
  'Auto Zen',
  'Zen Planner',
  'Testing Agent',
  'Plan Agent',
  'Dependency Agent',
  'Issue Handler',
];

// Computed
const isValid = computed(() => {
  return teamMembers.value.length > 0 &&
    teamMembers.value.some(m => m.role || m.customRole);
});

// Methods
function addRole(): void {
  teamMembers.value.push({
    role: '',
    customRole: '',
    skills: '',
    agentMapping: null,
    availability: 'full-time',
    error: '',
  });
}

function removeRole(index: number): void {
  if (teamMembers.value.length > 1) {
    teamMembers.value.splice(index, 1);
    validateTeam();
  }
}

function getRoleBadge(role: string): string {
  const badges: Record<string, string> = {
    'frontend-engineer': '🎨',
    'backend-engineer': '⚙️',
    'full-stack-engineer': '🔄',
    'devops-engineer': '🚀',
    'qa-engineer': '✅',
    'designer-ux': '🎯',
    'designer-ui': '🖌️',
    'product-manager': '📊',
    'tech-lead': '👑',
    'project-manager': '📋',
  };
  return badges[role] || '👤';
}

function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    'frontend-engineer': '🎨',
    'backend-engineer': '⚙️',
    'full-stack-engineer': '🔄',
    'devops-engineer': '🚀',
    'qa-engineer': '✅',
    'designer-ux': '🎯',
    'designer-ui': '🖌️',
    'product-manager': '📊',
    'tech-lead': '👑',
    'project-manager': '📋',
  };
  return icons[role] || '👤';
}

function formatRoleName(role: string): string {
  return role
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseSkills(skillsStr: string): string[] {
  return skillsStr
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function removeSkill(memberIndex: number, skill: string): void {
  const member = teamMembers.value[memberIndex];
  const skills = parseSkills(member.skills);
  const updated = skills.filter(s => s !== skill).join(', ');
  member.skills = updated;
  validateTeam();
}

function getSkillCoverage(): Record<string, number> {
  const coverage: Record<string, number> = {};

  teamMembers.value.forEach(member => {
    parseSkills(member.skills).forEach(skill => {
      coverage[skill] = (coverage[skill] || 0) + 1;
    });
  });

  return Object.fromEntries(
    Object.entries(coverage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  );
}

function validateTeam(): void {
  teamErrors.value = [];

  // Check minimum
  if (teamMembers.value.length === 0) {
    teamErrors.value.push('At least 1 team member is required');
  }

  // Validate each member
  teamMembers.value.forEach((member, index) => {
    member.error = '';

    // Check role
    if (!member.role && !member.customRole) {
      member.error = 'Role is required';
    }

    // Check custom role if selected
    if (member.role === 'other' && !member.customRole.trim()) {
      member.error = 'Please enter a custom role name';
    } else if (member.role === 'other' && member.customRole.length > 50) {
      member.error = 'Custom role must not exceed 50 characters';
    }

    // Validate skills format
    if (member.skills) {
      const skills = parseSkills(member.skills);
      if (skills.some(s => s.length > 30)) {
        member.error = 'Individual skills must not exceed 30 characters';
      }
      if (skills.length > 10) {
        member.error = 'Maximum 10 skills per member';
      }
    }
  });

  updateStore();
}

function updateStore(): void {
  if (isValid.value) {
    wizardStore.setAnswer(props.questionId, {
      teamMembers: teamMembers.value.map(m => ({
        role: m.role === 'other' ? m.customRole : m.role,
        skills: parseSkills(m.skills),
        agentMapping: m.agentMapping,
        availability: m.availability,
      })),
    });
  }
}

// Load existing answer from store
onMounted(() => {
  const existingAnswer = wizardStore.getAnswer<{
    teamMembers: Array<{
      role: string;
      skills: string[];
      agentMapping?: string | null;
      availability: string;
    }>;
  }>(props.questionId);

  if (existingAnswer && existingAnswer.teamMembers) {
    teamMembers.value = existingAnswer.teamMembers.map(m => ({
      role: m.role,
      customRole: '',
      skills: m.skills.join(', '),
      agentMapping: m.agentMapping ?? null,
      availability: m.availability,
      error: '',
    }));
  }

  validateTeam();
});

// Expose validation
defineExpose({
  validate: () => isValid.value,
  isValid,
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

.team-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  gap: 1rem;
}

.member-count {
  color: var(--vscode-descriptionForeground);
  font-size: 0.9rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn-danger {
  background: var(--vscode-inputValidation-errorBorder);
  color: white;
}

.btn-danger:hover {
  opacity: 0.8;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.error-message {
  color: var(--vscode-errorForeground);
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  padding: 0.8rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--vscode-descriptionForeground);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.team-members-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.team-member-item {
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  padding: 1rem;
  background: var(--vscode-input-background);
}

.member-header {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  align-items: center;
}

.member-badge {
  font-size: 1.2rem;
  min-width: 30px;
  text-align: center;
}

.role-select {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.9rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  font-family: var(--vscode-font-family);
}

.role-select:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.custom-role-input {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.9rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  font-family: var(--vscode-font-family);
}

.custom-role-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.member-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.small-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.form-control {
  padding: 0.5rem;
  font-family: var(--vscode-font-family);
  font-size: 0.85rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.form-control.small {
  font-size: 0.8rem;
  padding: 0.4rem;
}

.hint {
  font-size: 0.75rem;
  color: var(--vscode-descriptionForeground);
  margin-top: 0.2rem;
}

.member-error {
  color: var(--vscode-errorForeground);
  font-size: 0.8rem;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.skill-tag {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.remove-skill {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-skill:hover {
  opacity: 1;
}

.team-analysis {
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.team-analysis h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--vscode-foreground);
}

.coverage-grid {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.coverage-item {
  display: grid;
  grid-template-columns: 120px 1fr 60px;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.8rem;
}

.skill-name {
  font-weight: 500;
  color: var(--vscode-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
}

.coverage-bar {
  background: var(--vscode-input-border);
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
}

.coverage-fill {
  display: block;
  height: 100%;
  background: var(--vscode-testing-iconPassed);
  transition: width 0.3s;
}

.coverage-count {
  text-align: right;
  color: var(--vscode-descriptionForeground);
}

.team-preview {
  padding: 1rem;
  background: var(--vscode-input-background);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.team-preview h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--vscode-foreground);
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.team-card {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.team-card:hover {
  border-color: var(--vscode-focusBorder);
}

.card-header {
  display: flex;
  gap: 0.8rem;
  padding: 0.8rem;
  border-bottom: 1px solid var(--vscode-input-border);
  align-items: center;
}

.role-icon {
  font-size: 1.5rem;
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
}

.role-info strong {
  font-size: 0.85rem;
  color: var(--vscode-foreground);
}

.role-info small {
  font-size: 0.7rem;
  color: var(--vscode-descriptionForeground);
}

.card-body {
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.agent-badge {
  font-size: 0.75rem;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 0.3rem 0.5rem;
  border-radius: 3px;
  width: fit-content;
}

.skills-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.skill-mini-tag {
  font-size: 0.7rem;
  background: var(--vscode-input-border);
  color: var(--vscode-foreground);
  padding: 0.2rem 0.4rem;
  border-radius: 8px;
}

.skill-more {
  font-size: 0.7rem;
  color: var(--vscode-descriptionForeground);
}

.validation-summary {
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-top: 1rem;
  text-align: center;
}

.validation-summary.error {
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  color: var(--vscode-errorForeground);
}

.validation-summary.success {
  background: var(--vscode-testing-iconPassed);
  opacity: 0.15;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-testing-iconPassed);
}

@media (max-width: 768px) {
  .team-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .team-grid {
    grid-template-columns: 1fr;
  }

  .member-header {
    flex-wrap: wrap;
  }

  .coverage-item {
    grid-template-columns: auto 1fr;
    gap: 0.5rem;
  }

  .coverage-count {
    grid-column: 2;
  }

  .question-container {
    padding: 1rem;
  }
}
</style>

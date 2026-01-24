<template>
  <div v-if="visible" class="modal-overlay" @click="handleCancel">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Save as Template</h2>
        <button class="modal-close" @click="handleCancel">✕</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Template Name -->
        <div class="form-group" :class="{ 'has-error': errors.name }">
          <label for="template-name">
            Template Name <span class="required">*</span>
          </label>
          <input
            id="template-name"
            v-model="formData.name"
            type="text"
            placeholder="e.g., My Project Template"
            maxlength="50"
            required
            @blur="validateField('name')"
          />
          <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
        </div>

        <!-- Description -->
        <div class="form-group" :class="{ 'has-error': errors.description }">
          <label for="template-description">
            Description <span class="required">*</span>
          </label>
          <textarea
            id="template-description"
            v-model="formData.description"
            placeholder="Describe what this template is for and when to use it..."
            rows="3"
            maxlength="200"
            required
            @blur="validateField('description')"
          />
          <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
          <span class="char-count">{{ formData.description.length }}/200</span>
        </div>

        <!-- Category -->
        <div class="form-group" :class="{ 'has-error': errors.category }">
          <label for="template-category">
            Category <span class="required">*</span>
          </label>
          <select
            id="template-category"
            v-model="formData.category"
            required
            @change="validateField('category')"
          >
            <option value="">Select a category...</option>
            <option value="web-app">Web Application</option>
            <option value="api-service">API Service</option>
            <option value="cli-tool">CLI Tool</option>
            <option value="library">Library/Package</option>
            <option value="custom">Custom</option>
          </select>
          <span v-if="errors.category" class="error-message">{{ errors.category }}</span>
        </div>

        <!-- Tags -->
        <div class="form-group">
          <label for="template-tags">
            Tags (comma-separated)
          </label>
          <input
            id="template-tags"
            v-model="tagsInput"
            type="text"
            placeholder="e.g., typescript, react, nodejs"
            @blur="parseTags"
          />
          <div v-if="formData.tags.length > 0" class="tags-preview">
            <span
              v-for="(tag, index) in formData.tags"
              :key="index"
              class="tag"
            >
              {{ tag }}
              <button
                type="button"
                class="tag-remove"
                @click="removeTag(index)"
                :aria-label="`Remove tag ${tag}`"
              >
                ✕
              </button>
            </span>
          </div>
        </div>

        <!-- Author -->
        <div class="form-group" :class="{ 'has-error': errors.author }">
          <label for="template-author">
            Author <span class="required">*</span>
          </label>
          <input
            id="template-author"
            v-model="formData.author"
            type="text"
            placeholder="Your name or team name"
            maxlength="50"
            required
            @blur="validateField('author')"
          />
          <span v-if="errors.author" class="error-message">{{ errors.author }}</span>
        </div>

        <!-- Make Public (future feature) -->
        <div class="form-group checkbox-group">
          <label>
            <input
              v-model="formData.isPublic"
              type="checkbox"
            />
            Make this template public (shareable)
          </label>
          <p class="help-text">
            Public templates can be shared with your team
          </p>
        </div>

        <!-- Validation Summary -->
        <div v-if="validationError" class="validation-summary error">
          <strong>⚠️ Please fix the following errors:</strong>
          <ul>
            <li v-for="(error, field) in errors" :key="field">{{ error }}</li>
          </ul>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="validation-summary success">
          <strong>✓ {{ successMessage }}</strong>
        </div>

        <!-- General Error -->
        <div v-if="generalError" class="validation-summary error">
          <strong>⚠️ {{ generalError }}</strong>
        </div>
      </form>

      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          @click="handleCancel"
          :disabled="saving"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="!isFormValid || saving"
        >
          {{ saving ? 'Saving...' : 'Save Template' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TemplateCategory, TemplateSaveOptions } from '../types/PlanTemplate';
import type { PlanJSON } from '../planGenerator';
import { getTemplateService } from '../services/TemplateService';

// Props
interface Props {
  visible: boolean;
  plan: PlanJSON;
  extensionPath: string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  close: [];
  saved: [templateId: string];
}>();

// Form data
const formData = ref<{
  name: string;
  description: string;
  category: TemplateCategory | '';
  tags: string[];
  author: string;
  isPublic: boolean;
}>({
  name: '',
  description: '',
  category: '',
  tags: [],
  author: '',
  isPublic: false,
});

// Tags input (comma-separated string)
const tagsInput = ref('');

// Validation
const errors = ref<Record<string, string>>({});
const validationError = ref(false);
const generalError = ref('');
const successMessage = ref('');

// State
const saving = ref(false);

// Computed
const isFormValid = computed(() => {
  return (
    formData.value.name.trim().length > 0 &&
    formData.value.description.trim().length > 0 &&
    formData.value.category !== '' &&
    formData.value.author.trim().length > 0 &&
    Object.keys(errors.value).length === 0
  );
});

// Methods
const validateField = (field: keyof typeof formData.value) => {
  delete errors.value[field];

  switch (field) {
    case 'name':
      if (!formData.value.name.trim()) {
        errors.value.name = 'Template name is required';
      } else if (formData.value.name.trim().length < 3) {
        errors.value.name = 'Template name must be at least 3 characters';
      }
      break;

    case 'description':
      if (!formData.value.description.trim()) {
        errors.value.description = 'Description is required';
      } else if (formData.value.description.trim().length < 10) {
        errors.value.description = 'Description must be at least 10 characters';
      }
      break;

    case 'category':
      if (!formData.value.category) {
        errors.value.category = 'Please select a category';
      }
      break;

    case 'author':
      if (!formData.value.author.trim()) {
        errors.value.author = 'Author name is required';
      }
      break;
  }

  validationError.value = Object.keys(errors.value).length > 0;
};

const validateAll = () => {
  errors.value = {};
  validateField('name');
  validateField('description');
  validateField('category');
  validateField('author');
  return Object.keys(errors.value).length === 0;
};

const parseTags = () => {
  const tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  formData.value.tags = [...new Set(tags)]; // Remove duplicates
};

const removeTag = (index: number) => {
  formData.value.tags.splice(index, 1);
  tagsInput.value = formData.value.tags.join(', ');
};

const handleSubmit = async () => {
  generalError.value = '';
  successMessage.value = '';

  if (!validateAll()) {
    generalError.value = 'Please fix validation errors before saving';
    return;
  }

  saving.value = true;

  try {
    const service = getTemplateService(props.extensionPath);

    const options: TemplateSaveOptions = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      category: formData.value.category as TemplateCategory,
      tags: formData.value.tags,
      author: formData.value.author.trim(),
      isPublic: formData.value.isPublic,
    };

    const result = await service.saveTemplate(props.plan, options);

    if (result.success && result.data) {
      successMessage.value = 'Template saved successfully!';
      
      // Wait a moment to show success message
      setTimeout(() => {
        emit('saved', result.data!);
        resetForm();
      }, 1000);
    } else {
      generalError.value = result.error || 'Failed to save template';
    }
  } catch (error) {
    generalError.value = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Error saving template:', error);
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  if (!saving.value) {
    resetForm();
    emit('close');
  }
};

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    category: '',
    tags: [],
    author: '',
    isPublic: false,
  };
  tagsInput.value = '';
  errors.value = {};
  validationError.value = false;
  generalError.value = '';
  successMessage.value = '';
};

// Auto-populate author from plan metadata if available
watch(() => props.visible, (visible) => {
  if (visible && props.plan.metadata?.author) {
    formData.value.author = props.plan.metadata.author;
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--vscode-editor-foreground);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--vscode-icon-foreground);
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-close:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.modal-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group.has-error input,
.form-group.has-error textarea,
.form-group.has-error select {
  border-color: var(--vscode-inputValidation-errorBorder);
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--vscode-editor-foreground);
}

.required {
  color: var(--vscode-inputValidation-errorForeground);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: 1px solid var(--vscode-focusBorder);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.error-message {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--vscode-inputValidation-errorForeground);
}

.char-count {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--vscode-descriptionForeground);
  text-align: right;
}

.tags-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 3px;
  font-size: 0.75rem;
}

.tag-remove {
  background: none;
  border: none;
  color: currentColor;
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
  opacity: 0.7;
}

.tag-remove:hover {
  opacity: 1;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.help-text {
  margin: 0.25rem 0 0 1.75rem;
  font-size: 0.8rem;
  color: var(--vscode-descriptionForeground);
}

.validation-summary {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.validation-summary.error {
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-inputValidation-errorForeground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
}

.validation-summary.success {
  background: var(--vscode-testing-iconPassed);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-testing-iconPassed);
}

.validation-summary ul {
  margin: 0.5rem 0 0 1.25rem;
  padding: 0;
}

.validation-summary li {
  margin: 0.25rem 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--vscode-panel-border);
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-primary:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

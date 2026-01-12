<template>
  <div class="template-selector">
    <!-- Header -->
    <div class="selector-header">
      <h2>Choose a Template</h2>
      <p class="subtitle">Start your project from a pre-built template or create from scratch</p>
    </div>

    <!-- Filters and Search -->
    <div class="selector-controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search templates..."
          class="search-input"
          @input="handleSearch"
        />
        <span class="search-icon">🔍</span>
      </div>

      <div class="category-filters">
        <button
          v-for="category in categories"
          :key="category.value"
          class="category-btn"
          :class="{ active: selectedCategory === category.value }"
          @click="selectCategory(category.value)"
        >
          <span class="category-icon">{{ category.icon }}</span>
          {{ category.label }}
        </button>
      </div>
    </div>

    <!-- Template Grid -->
    <div class="template-grid" v-if="!loading && filteredTemplates.length > 0">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
        :class="{ selected: selectedTemplateId === template.id }"
        @click="selectTemplate(template)"
      >
        <div class="card-header">
          <div class="card-icon">
            {{ getCategoryIcon(template.category) }}
          </div>
          <div class="card-badges">
            <span v-if="template.isCore" class="badge badge-core">Core</span>
            <span v-else class="badge badge-custom">Custom</span>
          </div>
        </div>

        <div class="card-body">
          <h3 class="card-title">{{ template.name }}</h3>
          <p class="card-description">{{ template.description }}</p>

          <div class="card-meta">
            <div class="meta-item" v-if="template.estimatedDuration">
              <span class="meta-icon">⏱️</span>
              <span>{{ template.estimatedDuration }}</span>
            </div>
            <div class="meta-item" v-if="template.recommendedTeamSize">
              <span class="meta-icon">👥</span>
              <span>{{ template.recommendedTeamSize }} people</span>
            </div>
          </div>

          <div class="card-tags">
            <span
              v-for="tag in template.tags.slice(0, 3)"
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
            <span v-if="template.tags.length > 3" class="tag tag-more">
              +{{ template.tags.length - 3 }}
            </span>
          </div>
        </div>

        <div class="card-footer">
          <button
            class="btn-preview"
            @click.stop="previewTemplate(template)"
          >
            👁️ Preview
          </button>
          <button
            class="btn-apply"
            @click.stop="applyTemplate(template)"
          >
            ✨ Apply
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" v-else-if="!loading && filteredTemplates.length === 0">
      <div class="empty-icon">📭</div>
      <h3>No templates found</h3>
      <p>Try adjusting your search or filters</p>
      <button class="btn btn-secondary" @click="clearFilters">
        Clear Filters
      </button>
    </div>

    <!-- Loading State -->
    <div class="loading-state" v-else-if="loading">
      <div class="spinner"></div>
      <p>Loading templates...</p>
    </div>

    <!-- Error State -->
    <div class="error-state" v-else-if="error">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Templates</h3>
      <p>{{ error }}</p>
      <button class="btn btn-secondary" @click="loadTemplates">
        Retry
      </button>
    </div>

    <!-- Template Preview Modal -->
    <div v-if="previewedTemplate" class="modal-overlay" @click="closePreview">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ previewedTemplate.name }}</h2>
          <button class="modal-close" @click="closePreview">✕</button>
        </div>

        <div class="modal-body">
          <div class="preview-section">
            <h4>Description</h4>
            <p>{{ previewedTemplate.description }}</p>
          </div>

          <div class="preview-section">
            <h4>Category</h4>
            <span class="badge">{{ getCategoryLabel(previewedTemplate.category) }}</span>
          </div>

          <div class="preview-section" v-if="previewedTemplate.tags.length > 0">
            <h4>Tags</h4>
            <div class="preview-tags">
              <span v-for="tag in previewedTemplate.tags" :key="tag" class="tag">
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="preview-section">
            <h4>Details</h4>
            <ul class="preview-details">
              <li><strong>Author:</strong> {{ previewedTemplate.author }}</li>
              <li><strong>Version:</strong> {{ previewedTemplate.version }}</li>
              <li v-if="previewedTemplate.estimatedDuration">
                <strong>Duration:</strong> {{ previewedTemplate.estimatedDuration }}
              </li>
              <li v-if="previewedTemplate.recommendedTeamSize">
                <strong>Team Size:</strong> {{ previewedTemplate.recommendedTeamSize }} people
              </li>
              <li><strong>Type:</strong> {{ previewedTemplate.isCore ? 'Core Template' : 'Custom Template' }}</li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closePreview">
            Cancel
          </button>
          <button class="btn btn-primary" @click="applyPreviewedTemplate">
            ✨ Apply Template
          </button>
        </div>
      </div>
    </div>

    <!-- Action Footer -->
    <div class="selector-footer">
      <button class="btn btn-secondary" @click="$emit('cancel')">
        Cancel
      </button>
      <button
        class="btn btn-primary"
        :disabled="!selectedTemplateId"
        @click="applySelectedTemplate"
      >
        Continue with Selected Template
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { PlanTemplateMetadata, TemplateCategory } from '../types/PlanTemplate';
import { getTemplateService } from '../services/TemplateService';

// Props
interface Props {
  extensionPath: string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  templateSelected: [templateId: string];
  cancel: [];
}>();

// State
const searchQuery = ref('');
const selectedCategory = ref<TemplateCategory | 'all'>('all');
const templates = ref<PlanTemplateMetadata[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const selectedTemplateId = ref<string | null>(null);
const previewedTemplate = ref<PlanTemplateMetadata | null>(null);

// Categories configuration
const categories = [
  { value: 'all' as const, label: 'All', icon: '📋' },
  { value: 'web-app' as const, label: 'Web App', icon: '🌐' },
  { value: 'api-service' as const, label: 'API Service', icon: '🔌' },
  { value: 'cli-tool' as const, label: 'CLI Tool', icon: '⌨️' },
  { value: 'library' as const, label: 'Library', icon: '📦' },
  { value: 'custom' as const, label: 'Custom', icon: '🎨' },
];

// Computed
const filteredTemplates = computed(() => {
  let filtered = templates.value;

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(t => t.category === selectedCategory.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
});

// Methods
const loadTemplates = async () => {
  loading.value = true;
  error.value = null;

  try {
    const service = getTemplateService(props.extensionPath);
    templates.value = await service.listTemplates();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load templates';
    console.error('Error loading templates:', err);
  } finally {
    loading.value = false;
  }
};

const selectCategory = (category: TemplateCategory | 'all') => {
  selectedCategory.value = category;
};

const handleSearch = () => {
  // Debounce is handled by the input v-model
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = 'all';
};

const selectTemplate = (template: PlanTemplateMetadata) => {
  selectedTemplateId.value = template.id;
};

const previewTemplate = (template: PlanTemplateMetadata) => {
  previewedTemplate.value = template;
};

const closePreview = () => {
  previewedTemplate.value = null;
};

const applyTemplate = (template: PlanTemplateMetadata) => {
  emit('templateSelected', template.id);
};

const applyPreviewedTemplate = () => {
  if (previewedTemplate.value) {
    emit('templateSelected', previewedTemplate.value.id);
    closePreview();
  }
};

const applySelectedTemplate = () => {
  if (selectedTemplateId.value) {
    emit('templateSelected', selectedTemplateId.value);
  }
};

const getCategoryIcon = (category: TemplateCategory): string => {
  const cat = categories.find(c => c.value === category);
  return cat?.icon || '📋';
};

const getCategoryLabel = (category: TemplateCategory): string => {
  const cat = categories.find(c => c.value === category);
  return cat?.label || category;
};

// Lifecycle
onMounted(() => {
  loadTemplates();
});
</script>

<style scoped>
.template-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.selector-header {
  margin-bottom: 1.5rem;
}

.selector-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--vscode-editor-foreground);
}

.subtitle {
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-size: 0.9rem;
}

.selector-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
}

.category-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-btn {
  padding: 0.5rem 1rem;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.category-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.category-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.category-icon {
  margin-right: 0.5rem;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.template-card {
  background: var(--vscode-editor-inactiveSelectionBackground);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  border-color: var(--vscode-focusBorder);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.template-card.selected {
  border-color: var(--vscode-button-background);
  background: var(--vscode-list-activeSelectionBackground);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.card-icon {
  font-size: 2rem;
}

.card-badges {
  display: flex;
  gap: 0.25rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-core {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.badge-custom {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.card-body {
  flex: 1;
}

.card-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--vscode-editor-foreground);
}

.card-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
  color: var(--vscode-descriptionForeground);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 3px;
  font-size: 0.7rem;
}

.tag-more {
  opacity: 0.7;
}

.card-footer {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--vscode-panel-border);
}

.btn-preview,
.btn-apply {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-preview {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.btn-preview:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.btn-apply {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn-apply:hover {
  background: var(--vscode-button-hoverBackground);
}

.empty-state,
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 3rem;
  text-align: center;
}

.empty-icon,
.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--vscode-progressBar-background);
  border-top-color: var(--vscode-button-background);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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
  max-height: 80vh;
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

.preview-section {
  margin-bottom: 1.5rem;
}

.preview-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.preview-details {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-details li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.preview-details li:last-child {
  border-bottom: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--vscode-panel-border);
}

.selector-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vscode-panel-border);
  margin-top: 1rem;
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

.btn-secondary:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}
</style>

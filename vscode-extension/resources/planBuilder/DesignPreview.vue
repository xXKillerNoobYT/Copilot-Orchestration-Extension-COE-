<template>
  <div class="design-preview-container">
    <!-- Preview header -->
    <div class="preview-header">
      <h3 class="preview-title">Live Design Preview</h3>
      <div class="preview-stats">
        <span
          v-if="previewState"
          class="stat-item"
          :class="'risk-' + previewState.riskLevel"
        >
          Risk: {{ previewState.riskLevel }}
        </span>
        <span v-if="previewState" class="stat-item">
          {{ previewState.estimatedHours }}h
        </span>
        <span v-if="updateLatency !== null" class="stat-item latency">
          {{ updateLatency }}ms
        </span>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="preview-loading">
      <div class="spinner"></div>
      <p>Generating preview...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!previewState" class="preview-empty">
      <p>Complete some questions to see design preview</p>
    </div>

    <!-- Main preview content -->
    <div v-else class="preview-content">
      <!-- Project info -->
      <section class="preview-section project-info">
        <h4>{{ previewState.projectName }}</h4>
        <p class="project-description">{{ previewState.description }}</p>
        <div class="project-meta">
          <span class="badge">{{ previewState.architecture }}</span>
        </div>
      </section>

      <!-- Pages mockup -->
      <section class="preview-section pages-preview">
        <h4>Pages</h4>
        <div class="pages-grid">
          <div
            v-for="page in previewState.pages"
            :key="page.id"
            class="page-card"
            :class="'status-' + page.status"
            :title="page.description"
          >
            <span v-if="page.icon" class="page-icon">{{ page.icon }}</span>
            <span class="page-title">{{ page.title }}</span>
            <span class="page-status">{{ page.status }}</span>
          </div>
        </div>
      </section>

      <!-- Key sections -->
      <section class="preview-section key-sections">
        <h4>Key Features</h4>
        <div class="sections-list">
          <!-- Users section -->
          <div class="section-item" :class="'status-' + previewState.usersSection.status">
            <div class="section-header">
              <span v-if="previewState.usersSection.icon" class="section-icon">
                {{ previewState.usersSection.icon }}
              </span>
              <span class="section-name">{{ previewState.usersSection.title }}</span>
            </div>
            <p class="section-description">{{ previewState.usersSection.description }}</p>
            <ul v-if="previewState.usersSection.compatibility" class="compatibility-list">
              <li v-for="(item, idx) in previewState.usersSection.compatibility" :key="idx">
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Admin section -->
          <div
            v-if="previewState.adminSection.status !== 'incomplete'"
            class="section-item"
            :class="'status-' + previewState.adminSection.status"
          >
            <div class="section-header">
              <span v-if="previewState.adminSection.icon" class="section-icon">
                {{ previewState.adminSection.icon }}
              </span>
              <span class="section-name">{{ previewState.adminSection.title }}</span>
            </div>
            <p class="section-description">{{ previewState.adminSection.description }}</p>
            <ul v-if="previewState.adminSection.compatibility" class="compatibility-list">
              <li v-for="(item, idx) in previewState.adminSection.compatibility" :key="idx">
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Reports section -->
          <div
            v-if="previewState.reportsSection.status !== 'incomplete'"
            class="section-item"
            :class="'status-' + previewState.reportsSection.status"
          >
            <div class="section-header">
              <span v-if="previewState.reportsSection.icon" class="section-icon">
                {{ previewState.reportsSection.icon }}
              </span>
              <span class="section-name">{{ previewState.reportsSection.title }}</span>
            </div>
            <p class="section-description">{{ previewState.reportsSection.description }}</p>
            <ul v-if="previewState.reportsSection.compatibility" class="compatibility-list">
              <li v-for="(item, idx) in previewState.reportsSection.compatibility" :key="idx">
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Settings section -->
          <div class="section-item" :class="'status-' + previewState.settingsSection.status">
            <div class="section-header">
              <span v-if="previewState.settingsSection.icon" class="section-icon">
                {{ previewState.settingsSection.icon }}
              </span>
              <span class="section-name">{{ previewState.settingsSection.title }}</span>
            </div>
            <p class="section-description">{{ previewState.settingsSection.description }}</p>
            <ul v-if="previewState.settingsSection.compatibility" class="compatibility-list">
              <li v-for="(item, idx) in previewState.settingsSection.compatibility" :key="idx">
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Compatibility issues -->
      <section
        v-if="previewState.compatibilityIssues.length > 0"
        class="preview-section issues"
      >
        <h4 class="issues-title">⚠️ Compatibility Issues</h4>
        <ul class="issues-list">
          <li v-for="(issue, idx) in previewState.compatibilityIssues" :key="idx">
            {{ issue }}
          </li>
        </ul>
      </section>

      <!-- Estimate info -->
      <section class="preview-section estimate-info">
        <div class="estimate-card">
          <div class="estimate-value">{{ previewState.estimatedHours }}h</div>
          <div class="estimate-label">Estimated Development</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { type PreviewDesignState, livePreviewEngine } from '../../src/planBuilder/livePreview';

const props = defineProps<{
  wizardAnswers?: Record<string, unknown>;
  visible?: boolean;
}>();

const previewState = ref<PreviewDesignState | null>(null);
const loading = ref(false);
const updateLatency = ref<number | null>(null);

let unsubscribe: (() => void) | null = null;

const handlePreviewUpdate = (event: any) => {
  loading.value = false;
  previewState.value = event.previewState;
  updateLatency.value = Math.round(event.latency);

  // Reset latency display after 2 seconds
  setTimeout(() => {
    updateLatency.value = null;
  }, 2000);
};

const updatePreview = async () => {
  if (!props.wizardAnswers) return;

  loading.value = true;
  await livePreviewEngine.updatePreview(props.wizardAnswers);
};

onMounted(() => {
  // Subscribe to preview updates
  unsubscribe = livePreviewEngine.onPreviewUpdate(handlePreviewUpdate);

  // Initial preview generation
  if (props.wizardAnswers) {
    updatePreview();
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

watch(
  () => props.wizardAnswers,
  async (newAnswers) => {
    if (newAnswers) {
      await updatePreview();
    }
  },
  { deep: true }
);
</script>

<style scoped>
.design-preview-container {
  height: 100%;
  overflow-y: auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.preview-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  border-bottom: 2px solid #e1e8ed;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.preview-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.preview-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-item {
  font-size: 12px;
  padding: 4px 8px;
  background: #f0f4f8;
  border-radius: 4px;
  color: #666;
  font-weight: 500;
}

.stat-item.risk-low {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-item.risk-medium {
  background: #fff3e0;
  color: #e65100;
}

.stat-item.risk-high {
  background: #ffebee;
  color: #c62828;
}

.stat-item.latency {
  background: #e3f2fd;
  color: #1565c0;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 16px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-section {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preview-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.project-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.project-info h4 {
  color: white;
  font-size: 16px;
  margin-bottom: 4px;
}

.project-description {
  font-size: 12px;
  opacity: 0.9;
  margin: 4px 0;
  line-height: 1.4;
}

.project-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.pages-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.page-card {
  padding: 8px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-card:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.page-card.status-planned {
  color: #666;
}

.page-card.status-in-progress {
  border-color: #ffa726;
  background: #fff3e0;
}

.page-card.status-complete {
  border-color: #66bb6a;
  background: #e8f5e9;
}

.page-card.status-incomplete {
  border-color: #ef5350;
  background: #ffebee;
  opacity: 0.6;
}

.page-icon {
  font-size: 16px;
}

.page-title {
  font-weight: 500;
}

.page-status {
  font-size: 10px;
  opacity: 0.7;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-item {
  padding: 8px;
  border-left: 4px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
}

.section-item.status-in-progress {
  border-left-color: #ffa726;
  background: #fffbf0;
}

.section-item.status-planned {
  border-left-color: #667eea;
  background: #f5f7ff;
}

.section-item.status-complete {
  border-left-color: #66bb6a;
  background: #f1f8e9;
}

.section-item.status-incomplete {
  border-left-color: #ef5350;
  opacity: 0.6;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.section-icon {
  font-size: 14px;
}

.section-name {
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
}

.section-description {
  margin: 4px 0;
  font-size: 11px;
  color: #666;
  line-height: 1.3;
}

.compatibility-list {
  margin: 6px 0 0 0;
  padding-left: 16px;
  font-size: 10px;
  color: #555;
}

.compatibility-list li {
  margin: 2px 0;
}

.issues {
  border: 2px solid #ffb74d;
  background: #fff9e6;
}

.issues-title {
  color: #e65100;
}

.issues-list {
  margin: 0;
  padding-left: 20px;
  font-size: 11px;
  color: #d84315;
}

.issues-list li {
  margin: 4px 0;
  line-height: 1.3;
}

.estimate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
}

.estimate-value {
  font-size: 24px;
  font-weight: bold;
}

.estimate-label {
  font-size: 11px;
  opacity: 0.9;
}
</style>

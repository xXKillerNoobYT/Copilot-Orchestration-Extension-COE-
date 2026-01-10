<template>
  <div class="design-editor">
    <!-- Header -->
    <div class="editor-header">
      <h1 class="text-2xl font-bold text-gray-100">Visual Design System Editor</h1>
      <p class="text-gray-400 mt-2">Define colors, typography, spacing, and component variants</p>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Content Area -->
    <div class="editor-content">
      <!-- Colors Tab -->
      <div v-if="activeTab === 'colors'" class="tab-content">
        <ColorPickerEditor
          :colors="designTokens.colors"
          :palette="designTokens.palette"
          @update:colors="designTokens.colors = $event"
          @update:palette="designTokens.palette = $event"
        />
      </div>

      <!-- Typography Tab -->
      <div v-if="activeTab === 'typography'" class="tab-content">
        <TypographyEditor
          :typography="designTokens.typography"
          @update:typography="designTokens.typography = $event"
        />
      </div>

      <!-- Spacing Tab -->
      <div v-if="activeTab === 'spacing'" class="tab-content">
        <SpacingEditor
          :spacing="designTokens.spacing"
          @update:spacing="designTokens.spacing = $event"
        />
      </div>

      <!-- Components Tab -->
      <div v-if="activeTab === 'components'" class="tab-content">
        <ComponentVariantEditor
          :components="designTokens.components"
          :colors="designTokens.colors"
          :typography="designTokens.typography"
          :spacing="designTokens.spacing"
          @update:components="designTokens.components = $event"
        />
      </div>

      <!-- Preview Tab -->
      <div v-if="activeTab === 'preview'" class="tab-content">
        <PreviewPanel :designTokens="designTokens" />
      </div>

      <!-- Export Tab -->
      <div v-if="activeTab === 'export'" class="tab-content">
        <ExportPanel
          :designTokens="designTokens"
          @export="handleExport"
          @save="handleSave"
        />
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="errors.length" class="error-panel">
      <div v-for="(error, idx) in errors" :key="idx" class="error-item">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error }}</span>
        <button class="error-close" @click="errors.splice(idx, 1)">×</button>
      </div>
    </div>

    <!-- Action Footer -->
    <div class="editor-footer">
      <button class="btn btn-secondary" @click="resetToDefaults">
        Reset to Defaults
      </button>
      <button class="btn btn-secondary" @click="loadFromFile">
        Load from File
      </button>
      <button class="btn btn-primary" @click="validateAndExport">
        Export Design Tokens
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import ColorPickerEditor from './DesignEditor/ColorPickerEditor.vue';
import TypographyEditor from './DesignEditor/TypographyEditor.vue';
import SpacingEditor from './DesignEditor/SpacingEditor.vue';
import ComponentVariantEditor from './DesignEditor/ComponentVariantEditor.vue';
import PreviewPanel from './DesignEditor/PreviewPanel.vue';
import ExportPanel from './DesignEditor/ExportPanel.vue';
import { DesignTokenGenerator } from '../../src/planBuilder/designSystem/tokenGenerator';
import { validateDesignTokens, type ValidationError } from '../../src/planBuilder/designSystem/validator';

interface DesignTokens {
  colors: Record<string, string>;
  palette: Array<{ name: string; hex: string; shades?: Record<string, string> }>;
  typography: Array<{
    name: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
  }>;
  spacing: Record<string, string>;
  components: Record<string, any>;
}

const tabs = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'components', label: 'Components' },
  { id: 'preview', label: 'Live Preview' },
  { id: 'export', label: 'Export' },
];

const activeTab = ref('colors');
const errors = ref<string[]>([]);
const tokenGenerator = new DesignTokenGenerator();

const designTokens = reactive<DesignTokens>({
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    neutral: '#6B7280',
  },
  palette: [
    { name: 'Blue', hex: '#3B82F6', shades: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 900: '#1E3A8A' } },
    { name: 'Purple', hex: '#8B5CF6', shades: { 50: '#FAF5FF', 100: '#F3E8FF', 500: '#8B5CF6', 900: '#4C1D95' } },
    { name: 'Pink', hex: '#EC4899', shades: { 50: '#FDF2F8', 100: '#FCE7F3', 500: '#EC4899', 900: '#831843' } },
  ],
  typography: [
    { name: 'Heading 1', fontFamily: 'Inter', fontSize: '2rem', fontWeight: '700', lineHeight: '1.2' },
    { name: 'Heading 2', fontFamily: 'Inter', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3' },
    { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
  ],
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  components: {
    Button: {
      primary: {
        background: '#3B82F6',
        color: '#FFFFFF',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
      },
      secondary: {
        background: '#E5E7EB',
        color: '#1F2937',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
      },
    },
    Card: {
      default: {
        background: '#FFFFFF',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '1rem',
      },
    },
    Input: {
      default: {
        borderColor: '#D1D5DB',
        borderRadius: '0.375rem',
        padding: '0.5rem 0.75rem',
        fontSize: '1rem',
      },
    },
  },
});

function resetToDefaults() {
  if (confirm('Reset all design tokens to defaults?')) {
    Object.assign(designTokens, {
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#EC4899',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        neutral: '#6B7280',
      },
      palette: [
        { name: 'Blue', hex: '#3B82F6', shades: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 900: '#1E3A8A' } },
        { name: 'Purple', hex: '#8B5CF6', shades: { 50: '#FAF5FF', 100: '#F3E8FF', 500: '#8B5CF6', 900: '#4C1D95' } },
        { name: 'Pink', hex: '#EC4899', shades: { 50: '#FDF2F8', 100: '#FCE7F3', 500: '#EC4899', 900: '#831843' } },
      ],
      typography: [
        { name: 'Heading 1', fontFamily: 'Inter', fontSize: '2rem', fontWeight: '700', lineHeight: '1.2' },
        { name: 'Heading 2', fontFamily: 'Inter', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3' },
        { name: 'Body', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' },
      ],
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      components: {
        Button: {
          primary: {
            background: '#3B82F6',
            color: '#FFFFFF',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
          },
          secondary: {
            background: '#E5E7EB',
            color: '#1F2937',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
          },
        },
        Card: {
          default: {
            background: '#FFFFFF',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '1rem',
          },
        },
        Input: {
          default: {
            borderColor: '#D1D5DB',
            borderRadius: '0.375rem',
            padding: '0.5rem 0.75rem',
            fontSize: '1rem',
          },
        },
      },
    });
    errors.value = [];
  }
}

function loadFromFile() {
  // This will be hooked to VS Code file picker
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'loadDesignTokens',
      payload: { action: 'pickFile' },
    });
  }
}

function validateAndExport() {
  errors.value = [];
  const validationErrors = validateDesignTokens(designTokens);
  
  if (validationErrors.length > 0) {
    errors.value = validationErrors.map(e => `${e.field}: ${e.message}`);
    return;
  }

  activeTab.value = 'export';
}

function handleExport(format: 'json' | 'tailwind' | 'css') {
  const validation = validateDesignTokens(designTokens);
  if (validation.length > 0) {
    errors.value = validation.map(e => `${e.field}: ${e.message}`);
    return;
  }

  const tokens = tokenGenerator.generate(designTokens, format);
  
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'exportDesignTokens',
      payload: { format, tokens, timestamp: new Date().toISOString() },
    });
  }
}

function handleSave(filename: string) {
  const validation = validateDesignTokens(designTokens);
  if (validation.length > 0) {
    errors.value = validation.map(e => `${e.field}: ${e.message}`);
    return;
  }

  if (window.vscode) {
    window.vscode.postMessage({
      type: 'saveDesignTokens',
      payload: { filename, tokens: designTokens, timestamp: new Date().toISOString() },
    });
  }
}
</script>

<style scoped>
.design-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.editor-header {
  padding: 1.5rem;
  border-bottom: 1px solid #3e3e42;
  background: #252526;
}

.editor-header h1 {
  margin: 0;
  color: #e0e0e0;
}

.editor-header p {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
}

.tab-navigation {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #1e1e1e;
  border-bottom: 1px solid #3e3e42;
  overflow-x: auto;
}

.tab-button {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #858585;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  color: #e0e0e0;
}

.tab-button.active {
  color: #0e90d4;
  border-bottom-color: #0e90d4;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.tab-content {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.error-panel {
  padding: 1rem;
  background: #3d2525;
  border-top: 1px solid #3e3e42;
  max-height: 150px;
  overflow-y: auto;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: #5a2c2c;
  border-radius: 0.375rem;
  color: #f48771;
  font-size: 0.875rem;
}

.error-icon {
  flex-shrink: 0;
}

.error-text {
  flex: 1;
}

.error-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #f48771;
  cursor: pointer;
  padding: 0;
  font-size: 1.25rem;
  line-height: 1;
}

.editor-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: #252526;
  border-top: 1px solid #3e3e42;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #0e90d4;
  color: #fff;
  margin-left: auto;
}

.btn-primary:hover {
  background: #1177b1;
}

.btn-secondary {
  background: #3e3e42;
  color: #cccccc;
}

.btn-secondary:hover {
  background: #464647;
}
</style>

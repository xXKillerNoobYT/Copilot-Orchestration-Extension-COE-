<template>
  <div class="export-panel">
    <div class="export-section">
      <h2 class="section-title">Export Format</h2>
      <div class="format-options">
        <div
          v-for="fmt in exportFormats"
          :key="fmt.id"
          class="format-card"
          :class="{ active: selectedFormat === fmt.id }"
          @click="selectedFormat = fmt.id"
        >
          <div class="format-icon">{{ fmt.icon }}</div>
          <div class="format-name">{{ fmt.name }}</div>
          <div class="format-desc">{{ fmt.description }}</div>
        </div>
      </div>
    </div>

    <div class="export-section">
      <h2 class="section-title">Preview</h2>
      <div class="preview-box">
        <pre><code>{{ getPreview() }}</code></pre>
      </div>
    </div>

    <div class="export-section">
      <h2 class="section-title">Save Options</h2>
      <div class="save-form">
        <div class="form-group">
          <label class="form-label">Filename</label>
          <input
            v-model="filename"
            class="form-input"
            placeholder="design-tokens"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Save Location</label>
          <div class="location-display">
            <code>{{ getSaveLocation() }}</code>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" @click="$emit('export', selectedFormat)">
            Export Only
          </button>
          <button class="btn btn-primary" @click="$emit('save', filename)">
            Save & Export
          </button>
        </div>
      </div>
    </div>

    <div class="export-section">
      <h2 class="section-title">Export Information</h2>
      <div class="info-cards">
        <div class="info-card">
          <h4>JSON Export</h4>
          <p>
            Standard JSON format containing all design tokens. Perfect for importing into
            design tools, documentation generators, or token management systems.
          </p>
        </div>
        <div class="info-card">
          <h4>Tailwind Config</h4>
          <p>
            Generates a Tailwind CSS configuration file that integrates your design tokens
            directly into Tailwind's configuration system.
          </p>
        </div>
        <div class="info-card">
          <h4>CSS Variables</h4>
          <p>
            Exports CSS custom properties (variables) for use in stylesheets. Compatible
            with all modern browsers.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface DesignTokens {
  colors: Record<string, string>;
  palette: Array<{ name: string; hex: string; shades?: Record<string, string> }>;
  typography: any[];
  spacing: Record<string, string>;
  components: Record<string, any>;
}

defineProps<{
  designTokens: DesignTokens;
}>();

defineEmits<{
  export: [format: 'json' | 'tailwind' | 'css'];
  save: [filename: string];
}>();

const exportFormats = [
  {
    id: 'json',
    name: 'JSON',
    icon: '{}',
    description: 'Standard JSON format',
  },
  {
    id: 'tailwind',
    name: 'Tailwind Config',
    icon: 'TW',
    description: 'Tailwind CSS configuration',
  },
  {
    id: 'css',
    name: 'CSS Variables',
    icon: 'CSS',
    description: 'CSS custom properties',
  },
];

const selectedFormat = ref<'json' | 'tailwind' | 'css'>('json');
const filename = ref('design-tokens');

const preview = computed(() => {
  const tokens = this.$props.designTokens;
  switch (selectedFormat.value) {
    case 'json':
      return JSON.stringify(tokens, null, 2).substring(0, 500) + '\n...';
    case 'tailwind':
      return generateTailwindPreview(tokens);
    case 'css':
      return generateCssPreview(tokens);
    default:
      return '';
  }
});

function getPreview(): string {
  return preview.value;
}

function getSaveLocation(): string {
  const ext = selectedFormat.value === 'tailwind' ? '.js' : selectedFormat.value === 'css' ? '.css' : '.json';
  return `design-tokens/${filename.value}${ext}`;
}

function generateTailwindPreview(tokens: DesignTokens): string {
  return `module.exports = {
  theme: {
    colors: {
      ${Object.entries(tokens.colors)
        .map(([k, v]) => `${k}: '${v}'`)
        .join(',\n      ')}
    },
    spacing: {
      ${Object.entries(tokens.spacing)
        .map(([k, v]) => `${k}: '${v}'`)
        .join(',\n      ')}
    }
  }
}`;
}

function generateCssPreview(tokens: DesignTokens): string {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(tokens.colors)) {
    css += `  --color-${key}: ${value};\n`;
  }
  for (const [key, value] of Object.entries(tokens.spacing)) {
    css += `  --spacing-${key}: ${value};\n`;
  }
  css += '}';
  return css;
}
</script>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.export-section {
  padding: 1.5rem;
  background: #252526;
  border-radius: 0.5rem;
  border: 1px solid #3e3e42;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e0e0e0;
}

.format-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.format-card {
  padding: 1.5rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 2px solid #3e3e42;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.format-card:hover {
  border-color: #0e90d4;
}

.format-card.active {
  background: #1e3a4a;
  border-color: #0e90d4;
}

.format-icon {
  font-size: 2rem;
  font-weight: 700;
  color: #0e90d4;
  margin-bottom: 0.5rem;
}

.format-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 0.25rem;
}

.format-desc {
  font-size: 0.75rem;
  color: #858585;
}

.preview-box {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.preview-box pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: #d4d4d4;
  line-height: 1.5;
}

.preview-box code {
  color: #ce9178;
}

.save-form {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: #0e90d4;
}

.location-display {
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.location-display code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: #ce9178;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #0e90d4;
  color: #fff;
  flex: 1;
}

.btn-primary:hover {
  background: #1177b1;
}

.btn-secondary {
  background: #3e3e42;
  color: #cccccc;
  flex: 1;
}

.btn-secondary:hover {
  background: #464647;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-card {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.info-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0e90d4;
}

.info-card p {
  margin: 0;
  font-size: 0.8125rem;
  color: #cccccc;
  line-height: 1.5;
}
</style>

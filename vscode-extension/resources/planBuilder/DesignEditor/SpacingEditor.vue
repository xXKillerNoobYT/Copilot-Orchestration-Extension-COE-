<template>
  <div class="spacing-editor">
    <div class="editor-section">
      <h2 class="section-title">Spacing Scale</h2>
      <div class="spacing-list">
        <div
          v-for="(value, key) in spacing"
          :key="key"
          class="spacing-item"
        >
          <div class="spacing-header">
            <input
              :value="key"
              @input="(e) => updateSpacingKey(key, e.target.value)"
              class="spacing-key-input"
              placeholder="Token name (e.g., sm, md)"
            />
            <input
              :value="value"
              @input="(e) => updateSpacingValue(key, e.target.value)"
              class="spacing-value-input"
              placeholder="Value (e.g., 1rem, 16px)"
            />
            <button
              class="btn-delete"
              @click="deleteSpacing(key)"
              title="Remove spacing value"
            >
              ×
            </button>
          </div>
          <div
            class="spacing-preview"
            :style="{ width: value, height: '40px', backgroundColor: '#0e90d4' }"
            :title="`${key}: ${value}`"
          ></div>
        </div>
      </div>

      <button class="btn-add" @click="addSpacing">
        + Add Spacing Value
      </button>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Spacing Preview</h2>
      <div class="spacing-showcase">
        <div
          v-for="(value, key) in spacing"
          :key="`preview-${key}`"
          class="showcase-column"
        >
          <h4 class="showcase-label">{{ key }}</h4>
          <div class="showcase-value">{{ value }}</div>
          <div
            class="showcase-preview"
            :style="{ marginBottom: value }"
          >
            <div class="box">Margin: {{ key }}</div>
          </div>
          <div class="showcase-preview" :style="{ padding: value }">
            <div class="box">Padding: {{ key }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Spacing Guide</h2>
      <div class="guide-content">
        <p>Define a consistent spacing scale to maintain visual hierarchy and rhythm throughout your application.</p>
        <h4>Common scales:</h4>
        <div class="scale-examples">
          <div class="scale-example">
            <strong>Tailwind (base 4px):</strong>
            <code>xs: 0.25rem, sm: 0.5rem, md: 1rem, lg: 1.5rem, xl: 2rem, 2xl: 3rem</code>
          </div>
          <div class="scale-example">
            <strong>Material Design (base 8px):</strong>
            <code>4px, 8px, 12px, 16px, 24px, 32px, 48px</code>
          </div>
          <div class="scale-example">
            <strong>Bootstrap (base 1rem):</strong>
            <code>xs: 0.25rem, sm: 0.5rem, md: 1rem, lg: 1.5rem, xl: 3rem</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  spacing: Record<string, string>;
}>();

const emit = defineEmits<{
  'update:spacing': [spacing: Record<string, string>];
}>();

function updateSpacingKey(oldKey: string, newKey: string) {
  if (!newKey || oldKey === newKey) return;
  const newSpacing = { ...props.spacing };
  if (newKey in newSpacing) return; // Prevent duplicates
  newSpacing[newKey] = newSpacing[oldKey];
  delete newSpacing[oldKey];
  emit('update:spacing', newSpacing);
}

function updateSpacingValue(key: string, value: string) {
  if (!value) return;
  const newSpacing = { ...props.spacing };
  newSpacing[key] = value;
  emit('update:spacing', newSpacing);
}

function deleteSpacing(key: string) {
  const newSpacing = { ...props.spacing };
  delete newSpacing[key];
  emit('update:spacing', newSpacing);
}

function addSpacing() {
  let keyNum = 1;
  let newKey = `spacing${keyNum}`;
  while (newKey in props.spacing) {
    keyNum++;
    newKey = `spacing${keyNum}`;
  }
  const newSpacing = {
    ...props.spacing,
    [newKey]: '1rem',
  };
  emit('update:spacing', newSpacing);
}
</script>

<style scoped>
.spacing-editor {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.editor-section {
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

.spacing-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.spacing-item {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.spacing-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.spacing-key-input,
.spacing-value-input {
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.875rem;
}

.spacing-key-input {
  flex: 0 1 100px;
}

.spacing-value-input {
  flex: 1;
}

.spacing-key-input:focus,
.spacing-value-input:focus {
  outline: none;
  border-color: #0e90d4;
}

.btn-delete {
  padding: 0.25rem 0.5rem;
  background: #5a2c2c;
  border: 1px solid #6b3e3e;
  border-radius: 0.375rem;
  color: #f48771;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #6b3e3e;
}

.spacing-preview {
  border-radius: 0.25rem;
  border: 2px dashed #3e3e42;
}

.btn-add {
  padding: 0.75rem 1.5rem;
  background: #0e90d4;
  border: none;
  border-radius: 0.375rem;
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  align-self: flex-start;
  margin-top: 0.5rem;
}

.btn-add:hover {
  background: #1177b1;
}

.spacing-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.showcase-column {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.showcase-label {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0e90d4;
}

.showcase-value {
  font-size: 0.75rem;
  color: #858585;
  font-family: 'Monaco', 'Menlo', monospace;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #2d2d30;
  border-radius: 0.25rem;
}

.showcase-preview {
  margin-bottom: 1rem;
}

.box {
  padding: 0.5rem;
  background: #0e90d4;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.25rem;
  text-align: center;
}

.guide-content {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.guide-content p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #cccccc;
}

.guide-content h4 {
  margin: 1rem 0 0.75rem 0;
  font-size: 0.875rem;
  color: #e0e0e0;
}

.scale-examples {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scale-example {
  padding: 0.75rem;
  background: #2d2d30;
  border-radius: 0.375rem;
  border-left: 3px solid #0e90d4;
}

.scale-example strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #e0e0e0;
  font-size: 0.8125rem;
}

.scale-example code {
  display: block;
  color: #ce9178;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}
</style>

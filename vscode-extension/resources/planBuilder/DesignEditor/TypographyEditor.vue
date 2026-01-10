<template>
  <div class="typography-editor">
    <div class="editor-section">
      <h2 class="section-title">Typography Styles</h2>
      <div class="typography-list">
        <div
          v-for="(typo, idx) in typography"
          :key="idx"
          class="typography-item"
        >
          <div class="typo-header">
            <input
              v-model="typo.name"
              @input="(e) => updateTypography(idx, 'name', e.target.value)"
              class="name-input"
              placeholder="Style name (e.g., Heading 1)"
            />
            <button
              class="btn-delete"
              @click="deleteTypography(idx)"
              title="Remove typography style"
            >
              ×
            </button>
          </div>

          <div class="typo-grid">
            <div class="form-group">
              <label>Font Family</label>
              <select
                :value="typo.fontFamily"
                @input="(e) => updateTypography(idx, 'fontFamily', e.target.value)"
                class="form-select"
              >
                <option>Inter</option>
                <option>Roboto</option>
                <option>Open Sans</option>
                <option>Poppins</option>
                <option>Playfair Display</option>
                <option>Lora</option>
                <option>Courier New</option>
                <option>Georgia</option>
              </select>
            </div>

            <div class="form-group">
              <label>Font Size</label>
              <input
                :value="typo.fontSize"
                @input="(e) => updateTypography(idx, 'fontSize', e.target.value)"
                class="form-input"
                placeholder="e.g., 1rem, 16px, 1.5em"
              />
            </div>

            <div class="form-group">
              <label>Font Weight</label>
              <select
                :value="typo.fontWeight"
                @input="(e) => updateTypography(idx, 'fontWeight', e.target.value)"
                class="form-select"
              >
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi-bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra-bold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Line Height</label>
              <input
                :value="typo.lineHeight"
                @input="(e) => updateTypography(idx, 'lineHeight', e.target.value)"
                class="form-input"
                placeholder="e.g., 1.5, 1.2, 1"
              />
            </div>
          </div>

          <div class="preview-section">
            <label class="preview-label">Preview</label>
            <div
              class="preview-text"
              :style="{
                fontFamily: typo.fontFamily,
                fontSize: typo.fontSize,
                fontWeight: typo.fontWeight,
                lineHeight: typo.lineHeight,
              }"
            >
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        </div>
      </div>

      <button class="btn-add" @click="addTypography">
        + Add Typography Style
      </button>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Live Preview</h2>
      <div class="live-preview">
        <div
          v-for="(typo, idx) in typography"
          :key="`preview-${idx}`"
          class="preview-item"
        >
          <div class="preview-label-text">{{ typo.name }}</div>
          <div
            :style="{
              fontFamily: typo.fontFamily,
              fontSize: typo.fontSize,
              fontWeight: typo.fontWeight,
              lineHeight: typo.lineHeight,
              color: '#e0e0e0',
              marginBottom: '0.5rem',
            }"
          >
            {{ typo.name }} - The quick brown fox jumps over the lazy dog
          </div>
          <div class="preview-meta">
            {{ typo.fontFamily }} • {{ typo.fontSize }} • {{ typo.fontWeight }}
          </div>
        </div>
      </div>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Font Recommendations</h2>
      <div class="recommendations">
        <div class="rec-card">
          <h4>System Fonts</h4>
          <p>Use system fonts for best performance and consistency.</p>
          <code>-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto</code>
        </div>
        <div class="rec-card">
          <h4>Web Safe Fonts</h4>
          <p>Fonts available on most systems without embedding.</p>
          <code>Georgia, 'Times New Roman', serif</code>
        </div>
        <div class="rec-card">
          <h4>Variable Fonts</h4>
          <p>Modern single-file fonts supporting multiple weights/widths.</p>
          <code>Inter, Roboto Flex, Titillium Web</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TypographyStyle {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
}

const props = defineProps<{
  typography: TypographyStyle[];
}>();

const emit = defineEmits<{
  'update:typography': [typography: TypographyStyle[]];
}>();

function updateTypography(
  idx: number,
  field: keyof TypographyStyle,
  value: string
) {
  const newTypography = [...props.typography];
  newTypography[idx] = { ...newTypography[idx], [field]: value };
  emit('update:typography', newTypography);
}

function deleteTypography(idx: number) {
  const newTypography = props.typography.filter((_, i) => i !== idx);
  emit('update:typography', newTypography);
}

function addTypography() {
  const newTypography = [
    ...props.typography,
    {
      name: `Style ${props.typography.length + 1}`,
      fontFamily: 'Inter',
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
  ];
  emit('update:typography', newTypography);
}
</script>

<style scoped>
.typography-editor {
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

.typography-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.typography-item {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.typo-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.name-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.875rem;
}

.name-input:focus {
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

.typo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.875rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #0e90d4;
}

.preview-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #3e3e42;
}

.preview-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
}

.preview-text {
  padding: 1rem;
  background: #2d2d30;
  border-radius: 0.375rem;
  color: #e0e0e0;
  border: 1px solid #3e3e42;
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

.live-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.preview-item {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.preview-label-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.preview-meta {
  font-size: 0.75rem;
  color: #858585;
  margin-top: 0.5rem;
}

.recommendations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.rec-card {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.rec-card h4 {
  margin: 0 0 0.5rem 0;
  color: #0e90d4;
  font-size: 0.875rem;
  font-weight: 600;
}

.rec-card p {
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  color: #858585;
}

.rec-card code {
  display: block;
  padding: 0.75rem;
  background: #2d2d30;
  border-radius: 0.25rem;
  color: #ce9178;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
  overflow-x: auto;
  word-break: break-all;
}
</style>

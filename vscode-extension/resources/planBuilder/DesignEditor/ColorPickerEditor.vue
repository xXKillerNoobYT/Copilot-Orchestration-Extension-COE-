<template>
  <div class="color-picker-editor">
    <div class="editor-section">
      <h2 class="section-title">Primary Colors</h2>
      <div class="color-grid">
        <div
          v-for="(color, key) in colors"
          :key="key"
          class="color-item"
        >
          <label class="color-label">{{ formatLabel(key) }}</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              :value="color"
              @input="(e) => updateColor(key, e.target.value)"
              class="color-picker"
            />
            <span class="color-value">{{ color }}</span>
          </div>
          <div
            class="color-preview"
            :style="{ backgroundColor: color }"
          ></div>
        </div>
      </div>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Color Palette</h2>
      <div class="palette-list">
        <div
          v-for="(paletteItem, idx) in palette"
          :key="idx"
          class="palette-item"
        >
          <div class="palette-header">
            <input
              v-model="paletteItem.name"
              @input="(e) => updatePaletteName(idx, e.target.value)"
              class="palette-name-input"
              placeholder="Color name"
            />
            <input
              type="color"
              :value="paletteItem.hex"
              @input="(e) => updatePaletteHex(idx, e.target.value)"
              class="color-picker"
            />
            <span class="color-value">{{ paletteItem.hex }}</span>
            <button
              class="btn-delete"
              @click="deletePalette(idx)"
              title="Remove color"
            >
              ×
            </button>
          </div>

          <div class="shades-section" v-if="paletteItem.shades">
            <label class="shades-label">Shades (optional)</label>
            <div class="shades-grid">
              <div
                v-for="(shade, shadeName) in paletteItem.shades"
                :key="shadeName"
                class="shade-item"
              >
                <label class="shade-label">{{ shadeName }}</label>
                <div class="shade-input-wrapper">
                  <input
                    type="color"
                    :value="shade"
                    @input="(e) => updatePaletteShade(idx, shadeName, e.target.value)"
                    class="color-picker"
                  />
                  <span class="color-value">{{ shade }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn-add" @click="addPaletteColor">
        + Add Color to Palette
      </button>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Palette Preview</h2>
      <div class="palette-preview">
        <div
          v-for="paletteItem in palette"
          :key="paletteItem.name"
          class="preview-column"
        >
          <h3 class="preview-title">{{ paletteItem.name }}</h3>
          <div class="preview-shades">
            <div
              v-if="paletteItem.shades"
              v-for="(shade, shadeName) in paletteItem.shades"
              :key="`${paletteItem.name}-${shadeName}`"
              class="preview-shade"
              :style="{ backgroundColor: shade }"
              :title="`${shadeName}: ${shade}`"
            >
              <span class="shade-text">{{ shadeName }}</span>
            </div>
            <div
              v-else
              class="preview-shade"
              :style="{ backgroundColor: paletteItem.hex }"
              :title="paletteItem.hex"
            >
              <span class="shade-text">Base</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PaletteItem {
  name: string;
  hex: string;
  shades?: Record<string, string>;
}

const props = defineProps<{
  colors: Record<string, string>;
  palette: PaletteItem[];
}>();

const emit = defineEmits<{
  'update:colors': [colors: Record<string, string>];
  'update:palette': [palette: PaletteItem[]];
}>();

function updateColor(key: string, value: string) {
  emit('update:colors', { ...props.colors, [key]: value });
}

function updatePaletteName(idx: number, name: string) {
  const newPalette = [...props.palette];
  newPalette[idx] = { ...newPalette[idx], name };
  emit('update:palette', newPalette);
}

function updatePaletteHex(idx: number, hex: string) {
  const newPalette = [...props.palette];
  newPalette[idx] = { ...newPalette[idx], hex };
  emit('update:palette', newPalette);
}

function updatePaletteShade(idx: number, shadeName: string, hex: string) {
  const newPalette = [...props.palette];
  const shades = { ...(newPalette[idx].shades || {}) };
  shades[shadeName] = hex;
  newPalette[idx] = { ...newPalette[idx], shades };
  emit('update:palette', newPalette);
}

function deletePalette(idx: number) {
  const newPalette = props.palette.filter((_, i) => i !== idx);
  emit('update:palette', newPalette);
}

function addPaletteColor() {
  const newPalette = [
    ...props.palette,
    {
      name: `Color ${props.palette.length + 1}`,
      hex: '#000000',
      shades: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        500: '#000000',
        900: '#111827',
      },
    },
  ];
  emit('update:palette', newPalette);
}

function formatLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
</script>

<style scoped>
.color-picker-editor {
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

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.color-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.color-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cccccc;
}

.color-input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-picker {
  width: 50px;
  height: 40px;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  cursor: pointer;
}

.color-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  color: #858585;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-preview {
  width: 100%;
  height: 60px;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.palette-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.palette-item {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.palette-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.palette-name-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.875rem;
}

.palette-name-input:focus {
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

.shades-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shades-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.shades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.shade-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.shade-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #858585;
}

.shade-input-wrapper {
  display: flex;
  gap: 0.25rem;
  align-items: center;
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

.palette-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
}

.preview-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #e0e0e0;
}

.preview-shades {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
}

.preview-shade {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #3e3e42;
  color: #000;
  font-size: 0.75rem;
  font-weight: 500;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
}

.shade-text {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
</style>

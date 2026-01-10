<template>
  <div class="preview-panel">
    <div class="preview-section">
      <h2 class="section-title">Color Palette Preview</h2>
      <div class="colors-showcase">
        <div v-for="(color, key) in designTokens.colors" :key="key" class="color-swatch">
          <div class="color-box" :style="{ backgroundColor: color }"></div>
          <div class="color-info">
            <div class="color-name">{{ key }}</div>
            <div class="color-value">{{ color }}</div>
          </div>
        </div>
      </div>

      <div class="palette-showcase">
        <div v-for="palette in designTokens.palette" :key="palette.name" class="palette-column">
          <h4 class="palette-name">{{ palette.name }}</h4>
          <div v-if="palette.shades" class="shades-row">
            <div
              v-for="(shade, shadeName) in palette.shades"
              :key="`${palette.name}-${shadeName}`"
              class="shade-box"
              :style="{ backgroundColor: shade }"
              :title="`${shadeName}: ${shade}`"
            >
              <span class="shade-label">{{ shadeName }}</span>
            </div>
          </div>
          <div v-else class="shade-box" :style="{ backgroundColor: palette.hex }" :title="palette.hex">
            <span class="shade-label">Base</span>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="section-title">Typography Preview</h2>
      <div class="typography-showcase">
        <div v-for="typo in designTokens.typography" :key="typo.name" class="typo-preview">
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
            {{ typo.name }}
          </div>
          <div class="typo-meta">
            {{ typo.fontFamily }} • {{ typo.fontSize }} • Weight {{ typo.fontWeight }}
          </div>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="section-title">Spacing Scale</h2>
      <div class="spacing-showcase">
        <div v-for="(value, key) in designTokens.spacing" :key="key" class="spacing-preview">
          <div class="spacing-label">{{ key }}: {{ value }}</div>
          <div class="spacing-bars">
            <div class="bar" :style="{ width: value, backgroundColor: '#0e90d4' }"></div>
            <div class="bar" :style="{ width: value, backgroundColor: '#8b5cf6' }"></div>
            <div class="bar" :style="{ width: value, backgroundColor: '#ec4899' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="section-title">Component Variants</h2>
      <div class="components-showcase">
        <div v-for="(componentDef, compName) in designTokens.components" :key="compName" class="component-showcase">
          <h4 class="component-name">{{ compName }}</h4>
          <div class="variants-grid">
            <div v-for="(variantDef, variantName) in componentDef" :key="`${compName}-${variantName}`" class="variant-preview">
              <div class="variant-label">{{ variantName }}</div>
              <div :style="getPreviewStyle(variantDef)" class="variant-element">
                {{ variantName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="section-title">Full Component Demo</h2>
      <div class="demo-section">
        <div class="demo-card" :style="getDemoCardStyle()">
          <h3 class="demo-title" :style="getDemoTitleStyle()">Welcome</h3>
          <p class="demo-text" :style="getDemoTextStyle()">
            This is a live preview of your design system applied to a card component.
          </p>
          <div class="demo-buttons">
            <button class="demo-btn demo-btn-primary" :style="getDemoButtonStyle('primary')">
              Primary Button
            </button>
            <button class="demo-btn demo-btn-secondary" :style="getDemoButtonStyle('secondary')">
              Secondary Button
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

defineProps<{
  designTokens: DesignTokens;
}>();

function getPreviewStyle(variantDef: Record<string, string>): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(variantDef)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    style[cssKey] = value;
  }
  return style;
}

function getDemoCardStyle(): Record<string, string> {
  const cardDef = this.$props.designTokens.components.Card?.default || {};
  return getPreviewStyle(cardDef);
}

function getDemoTitleStyle(): Record<string, string> {
  const heading = this.$props.designTokens.typography.find(t => t.name.includes('Heading'))
    || this.$props.designTokens.typography[0];
  return {
    fontFamily: heading.fontFamily,
    fontSize: heading.fontSize,
    fontWeight: heading.fontWeight,
    lineHeight: heading.lineHeight,
    color: this.$props.designTokens.colors.primary || '#000',
    margin: '0 0 1rem 0',
  };
}

function getDemoTextStyle(): Record<string, string> {
  const body = this.$props.designTokens.typography.find(t => t.name.includes('Body'))
    || this.$props.designTokens.typography[this.$props.designTokens.typography.length - 1];
  return {
    fontFamily: body.fontFamily,
    fontSize: body.fontSize,
    fontWeight: body.fontWeight,
    lineHeight: body.lineHeight,
    color: this.$props.designTokens.colors.neutral || '#666',
    margin: '0 0 1rem 0',
  };
}

function getDemoButtonStyle(variant: string): Record<string, string> {
  const btnDef = this.$props.designTokens.components.Button?.[variant] || {};
  return getPreviewStyle(btnDef);
}
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-section {
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

.colors-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.color-swatch {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-box {
  height: 100px;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.color-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e0e0e0;
}

.color-value {
  font-size: 0.75rem;
  color: #858585;
  font-family: 'Monaco', 'Menlo', monospace;
}

.palette-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #3e3e42;
}

.palette-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.palette-name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0e90d4;
}

.shades-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
}

.shade-box {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #3e3e42;
  border-radius: 0.25rem;
}

.shade-label {
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem 0.5rem;
  border-radius: 0.125rem;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.typography-showcase {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.typo-preview {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.typo-meta {
  font-size: 0.75rem;
  color: #858585;
}

.spacing-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.spacing-preview {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.spacing-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e0e0e0;
  margin-bottom: 0.75rem;
  display: block;
}

.spacing-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar {
  height: 30px;
  border-radius: 0.25rem;
  border: 1px solid #3e3e42;
}

.components-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.component-showcase {
  padding: 1.5rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.component-name {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0e90d4;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.variants-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.variant-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.variant-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.variant-element {
  padding: 0.75rem;
  border-radius: 0.375rem;
  text-align: center;
  font-weight: 500;
  color: #fff;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-section {
  padding: 2rem;
  background: #1e1e1e;
  border-radius: 0.5rem;
  border: 1px solid #3e3e42;
}

.demo-card {
  border-radius: 0.5rem;
  max-width: 400px;
}

.demo-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
}

.demo-text {
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.demo-buttons {
  display: flex;
  gap: 0.75rem;
}

.demo-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.demo-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.demo-btn-primary {
  background: #0e90d4;
  color: #fff;
}

.demo-btn-secondary {
  background: #e5e7eb;
  color: #1f2937;
}
</style>

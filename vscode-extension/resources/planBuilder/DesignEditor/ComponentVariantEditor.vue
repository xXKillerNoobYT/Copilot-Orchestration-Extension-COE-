<template>
  <div class="component-variant-editor">
    <div class="editor-section">
      <h2 class="section-title">Component Variants</h2>
      <div class="component-list">
        <div
          v-for="(componentDef, compName) in components"
          :key="compName"
          class="component-item"
        >
          <div class="component-header">
            <h3 class="component-title">{{ compName }}</h3>
            <button
              class="btn-delete"
              @click="deleteComponent(compName)"
              title="Remove component"
            >
              ×
            </button>
          </div>

          <div class="variants-list">
            <div
              v-for="(variantDef, variantName) in componentDef"
              :key="`${compName}-${variantName}`"
              class="variant-item"
            >
              <div class="variant-header">
                <input
                  :value="variantName"
                  @input="(e) => updateVariantName(compName, variantName, e.target.value)"
                  class="variant-name-input"
                  placeholder="Variant name (e.g., primary, secondary)"
                />
                <button
                  class="btn-small-delete"
                  @click="deleteVariant(compName, variantName)"
                  title="Remove variant"
                >
                  ×
                </button>
              </div>

              <div class="variant-properties">
                <div
                  v-for="(value, propName) in variantDef"
                  :key="`${compName}-${variantName}-${propName}`"
                  class="property-item"
                >
                  <label class="property-label">{{ propName }}</label>
                  <input
                    :value="value"
                    @input="(e) => updateVariantProperty(compName, variantName, propName, e.target.value)"
                    class="property-input"
                    :placeholder="`e.g., ${propName === 'background' ? '#3B82F6' : propName === 'padding' ? '0.5rem' : 'value'}`"
                  />
                </div>

                <button
                  class="btn-add-prop"
                  @click="addVariantProperty(compName, variantName)"
                >
                  + Add Property
                </button>
              </div>

              <div class="variant-preview">
                <div
                  class="preview-element"
                  :style="getPreviewStyle(variantDef)"
                >
                  {{ variantName }} Variant
                </div>
              </div>
            </div>
          </div>

          <button
            class="btn-add-variant"
            @click="addVariant(compName)"
          >
            + Add Variant to {{ compName }}
          </button>
        </div>
      </div>

      <button class="btn-add" @click="addComponent">
        + Add Component
      </button>
    </div>

    <div class="editor-section">
      <h2 class="section-title">Component Gallery</h2>
      <div class="gallery">
        <div v-for="(componentDef, compName) in components" :key="`gallery-${compName}`" class="gallery-section">
          <h3 class="gallery-title">{{ compName }}</h3>
          <div class="gallery-variants">
            <div
              v-for="(variantDef, variantName) in componentDef"
              :key="`${compName}-${variantName}-gallery`"
              class="gallery-item"
            >
              <div class="gallery-label">{{ variantName }}</div>
              <div
                :style="getPreviewStyle(variantDef)"
                class="gallery-element"
              >
                {{ variantName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  components: Record<string, Record<string, Record<string, string>>>;
  colors: Record<string, string>;
  typography: any[];
  spacing: Record<string, string>;
}>();

const emit = defineEmits<{
  'update:components': [components: Record<string, Record<string, Record<string, string>>>];
}>();

function deleteComponent(compName: string) {
  const newComponents = { ...props.components };
  delete newComponents[compName];
  emit('update:components', newComponents);
}

function updateVariantName(compName: string, oldName: string, newName: string) {
  if (!newName || oldName === newName) return;
  const newComponents = { ...props.components };
  newComponents[compName] = { ...newComponents[compName] };
  newComponents[compName][newName] = newComponents[compName][oldName];
  delete newComponents[compName][oldName];
  emit('update:components', newComponents);
}

function deleteVariant(compName: string, variantName: string) {
  const newComponents = { ...props.components };
  newComponents[compName] = { ...newComponents[compName] };
  delete newComponents[compName][variantName];
  emit('update:components', newComponents);
}

function updateVariantProperty(
  compName: string,
  variantName: string,
  propName: string,
  value: string
) {
  if (!value) return;
  const newComponents = { ...props.components };
  newComponents[compName] = { ...newComponents[compName] };
  newComponents[compName][variantName] = {
    ...newComponents[compName][variantName],
    [propName]: value,
  };
  emit('update:components', newComponents);
}

function addVariantProperty(compName: string, variantName: string) {
  const propNum = Object.keys(props.components[compName][variantName]).length + 1;
  const newComponents = { ...props.components };
  newComponents[compName] = { ...newComponents[compName] };
  newComponents[compName][variantName] = {
    ...newComponents[compName][variantName],
    [`property${propNum}`]: 'value',
  };
  emit('update:components', newComponents);
}

function addVariant(compName: string) {
  const newComponents = { ...props.components };
  newComponents[compName] = {
    ...newComponents[compName],
    [`variant${Object.keys(newComponents[compName]).length + 1}`]: {
      background: '#fff',
      color: '#000',
      padding: '0.5rem',
    },
  };
  emit('update:components', newComponents);
}

function addComponent() {
  const newComponents = {
    ...props.components,
    [`Component${Object.keys(props.components).length + 1}`]: {
      default: {
        background: '#fff',
        color: '#000',
        padding: '0.5rem',
        borderRadius: '0.375rem',
      },
    },
  };
  emit('update:components', newComponents);
}

function getPreviewStyle(variantDef: Record<string, string>): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(variantDef)) {
    // Convert CSS property names from camelCase to kebab-case
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    style[cssKey] = value;
  }
  return style;
}
</script>

<style scoped>
.component-variant-editor {
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

.component-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.component-item {
  padding: 1.5rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #3e3e42;
}

.component-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0e90d4;
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

.variants-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.variant-item {
  padding: 1rem;
  background: #2d2d30;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.variant-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.variant-name-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.875rem;
}

.variant-name-input:focus {
  outline: none;
  border-color: #0e90d4;
}

.btn-small-delete {
  padding: 0.25rem 0.5rem;
  background: #5a2c2c;
  border: 1px solid #6b3e3e;
  border-radius: 0.375rem;
  color: #f48771;
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  transition: all 0.2s;
}

.btn-small-delete:hover {
  background: #6b3e3e;
}

.variant-properties {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.property-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.property-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-input {
  padding: 0.5rem 0.5rem;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 0.375rem;
  color: #cccccc;
  font-size: 0.8125rem;
  font-family: 'Monaco', 'Menlo', monospace;
}

.property-input:focus {
  outline: none;
  border-color: #0e90d4;
}

.btn-add-prop {
  padding: 0.5rem 0.75rem;
  background: #2d2d30;
  border: 1px dashed #3e3e42;
  border-radius: 0.375rem;
  color: #858585;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  grid-column: 1 / -1;
}

.btn-add-prop:hover {
  background: #3e3e42;
  color: #0e90d4;
  border-color: #0e90d4;
}

.variant-preview {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #3e3e42;
}

.preview-element {
  padding: 1rem;
  border-radius: 0.375rem;
  text-align: center;
  font-weight: 500;
  color: #fff;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add-variant {
  padding: 0.75rem 1rem;
  background: #0e90d4;
  border: none;
  border-radius: 0.375rem;
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  width: 100%;
  margin-top: 1rem;
}

.btn-add-variant:hover {
  background: #1177b1;
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

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.gallery-section {
  padding: 1.5rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid #3e3e42;
}

.gallery-title {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0e90d4;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gallery-variants {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gallery-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gallery-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gallery-element {
  padding: 1rem;
  border-radius: 0.375rem;
  text-align: center;
  font-weight: 500;
  color: #fff;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

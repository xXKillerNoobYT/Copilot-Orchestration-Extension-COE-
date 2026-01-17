<script setup lang="ts">
import { ref } from 'vue';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head } from '@inertiajs/vue3';
import ColorThemePicker from '@/Components/DesignSystem/ColorThemePicker.vue';
import FontSelector from '@/Components/DesignSystem/FontSelector.vue';
import ComponentStyleEditor from '@/Components/DesignSystem/ComponentStyleEditor.vue';
import LivePreview from '@/Components/DesignSystem/LivePreview.vue';
import type { ColorTheme, FontOption, ComponentStyle } from '@/types/designSystem';

// Initialize with default values
const selectedTheme = ref<ColorTheme>({
  id: 'ocean',
  name: 'Ocean Blue',
  primary: '#0284c7',
  secondary: '#0ea5e9',
  accent: '#06b6d4',
  background: '#f0f9ff',
  text: '#0c4a6e',
  border: '#bae6fd',
});

const selectedFont = ref<FontOption>({
  id: 'inter',
  name: 'Inter',
  family: 'Inter, system-ui, -apple-system, sans-serif',
  weights: [400, 500, 600, 700],
});

const componentStyle = ref<ComponentStyle>({
  borderRadius: '0.5rem',
  padding: '1rem',
  shadow: 'md',
});

const activeTab = ref<'theme' | 'font' | 'style'>('theme');

const handleThemeUpdate = (theme: ColorTheme) => {
  selectedTheme.value = theme;
};

const handleFontUpdate = (font: FontOption) => {
  selectedFont.value = font;
};

const handleStyleUpdate = (style: ComponentStyle) => {
  componentStyle.value = style;
};
</script>

<template>
  <Head title="Design System Editor" />

  <AuthenticatedLayout>
    <template #header>
      <h2 class="font-semibold text-xl text-gray-800 leading-tight">Visual Design System Editor</h2>
    </template>

    <div class="py-12">
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
          <div class="p-6">
            <!-- Introduction -->
            <div class="mb-8">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">Design System Editor</h1>
              <p class="text-gray-600">
                Create and customize your application's visual design system with real-time preview.
                Choose from 5 color themes, 3 font options, and customize component styles.
              </p>
            </div>

            <!-- Main Layout: Editor + Preview -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Left Column: Editor Controls -->
              <div class="editor-column space-y-8">
                <!-- Tab Navigation -->
                <div class="border-b border-gray-200">
                  <nav class="flex space-x-8" aria-label="Tabs">
                    <button
                      @click="activeTab = 'theme'"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      :class="{
                        'border-blue-500 text-blue-600': activeTab === 'theme',
                        'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'theme',
                      }"
                    >
                      🎨 Color Theme
                    </button>
                    <button
                      @click="activeTab = 'font'"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      :class="{
                        'border-blue-500 text-blue-600': activeTab === 'font',
                        'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'font',
                      }"
                    >
                      🔤 Font Family
                    </button>
                    <button
                      @click="activeTab = 'style'"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      :class="{
                        'border-blue-500 text-blue-600': activeTab === 'style',
                        'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'style',
                      }"
                    >
                      ✨ Component Style
                    </button>
                  </nav>
                </div>

                <!-- Tab Content -->
                <div class="tab-content">
                  <ColorThemePicker
                    v-show="activeTab === 'theme'"
                    :selected-theme="selectedTheme"
                    @update:selected-theme="handleThemeUpdate"
                  />
                  <FontSelector
                    v-show="activeTab === 'font'"
                    :selected-font="selectedFont"
                    @update:selected-font="handleFontUpdate"
                  />
                  <ComponentStyleEditor
                    v-show="activeTab === 'style'"
                    :style="componentStyle"
                    @update:style="handleStyleUpdate"
                  />
                </div>

                <!-- Current Selection Summary -->
                <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 class="font-semibold text-blue-900 mb-2">Current Design</h3>
                  <div class="space-y-1 text-sm text-blue-800">
                    <div><strong>Theme:</strong> {{ selectedTheme.name }}</div>
                    <div><strong>Font:</strong> {{ selectedFont.name }}</div>
                    <div><strong>Border Radius:</strong> {{ componentStyle.borderRadius }}</div>
                    <div><strong>Padding:</strong> {{ componentStyle.padding }}</div>
                    <div><strong>Shadow:</strong> {{ componentStyle.shadow }}</div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Live Preview -->
              <div class="preview-column">
                <div class="sticky top-6">
                  <LivePreview
                    :theme="selectedTheme"
                    :font="selectedFont"
                    :style="componentStyle"
                  />
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-8 flex gap-4">
              <button
                class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
                @click="() => window.alert('Export functionality would be implemented here')"
                title="Export design system (placeholder)"
              >
                💾 Export Design System
              </button>
              <button
                class="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700 transition-colors"
                @click="() => window.alert('Save functionality would be implemented here')"
                title="Save configuration (placeholder)"
              >
                💾 Save Configuration
              </button>
              <button
                class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                @click="() => window.alert('Reset functionality would be implemented here')"
                title="Reset to defaults (placeholder)"
              >
                🔄 Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AuthenticatedLayout>
</template>

<style scoped>
.sticky {
  position: sticky;
}
</style>

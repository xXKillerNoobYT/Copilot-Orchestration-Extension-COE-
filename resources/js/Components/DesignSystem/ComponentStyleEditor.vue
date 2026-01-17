<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ComponentStyle } from '@/types/designSystem';

const props = defineProps<{
  style?: ComponentStyle;
}>();

const emit = defineEmits<{
  (e: 'update:style', style: ComponentStyle): void;
}>();

// Border radius options
const borderRadiusOptions = [
  { value: '0px', label: 'None (Square)' },
  { value: '0.25rem', label: 'Small (4px)' },
  { value: '0.5rem', label: 'Medium (8px)' },
  { value: '0.75rem', label: 'Large (12px)' },
  { value: '1rem', label: 'Extra Large (16px)' },
];

// Padding options
const paddingOptions = [
  { value: '0.5rem', label: 'Compact (8px)' },
  { value: '0.75rem', label: 'Cozy (12px)' },
  { value: '1rem', label: 'Comfortable (16px)' },
  { value: '1.5rem', label: 'Spacious (24px)' },
];

// Shadow options
const shadowOptions = [
  { value: 'none', label: 'None', class: 'shadow-none' },
  { value: 'sm', label: 'Small', class: 'shadow-sm' },
  { value: 'md', label: 'Medium', class: 'shadow-md' },
  { value: 'lg', label: 'Large', class: 'shadow-lg' },
  { value: 'xl', label: 'Extra Large', class: 'shadow-xl' },
];

const currentStyle = computed<ComponentStyle>(() => ({
  borderRadius: props.style?.borderRadius || '0.5rem',
  padding: props.style?.padding || '1rem',
  shadow: props.style?.shadow || 'md',
}));

const updateBorderRadius = (value: string) => {
  emit('update:style', {
    ...currentStyle.value,
    borderRadius: value,
  });
};

const updatePadding = (value: string) => {
  emit('update:style', {
    ...currentStyle.value,
    padding: value,
  });
};

const updateShadow = (value: string) => {
  emit('update:style', {
    ...currentStyle.value,
    shadow: value,
  });
};
</script>

<template>
  <div class="component-style-editor">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Component Styling</h3>
    <p class="text-sm text-gray-600 mb-6">Customize the appearance of UI components</p>
    
    <div class="space-y-6">
      <!-- Border Radius -->
      <div class="style-section">
        <label class="block text-sm font-medium text-gray-700 mb-3">Border Radius</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            v-for="option in borderRadiusOptions"
            :key="option.value"
            class="style-option px-3 py-2 text-sm border-2 rounded transition-all"
            :class="{
              'border-blue-500 bg-blue-50 text-blue-700 font-medium': currentStyle.borderRadius === option.value,
              'border-gray-200 bg-white text-gray-700 hover:border-gray-300': currentStyle.borderRadius !== option.value,
            }"
            @click="updateBorderRadius(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Padding -->
      <div class="style-section">
        <label class="block text-sm font-medium text-gray-700 mb-3">Padding</label>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            v-for="option in paddingOptions"
            :key="option.value"
            class="style-option px-3 py-2 text-sm border-2 rounded transition-all"
            :class="{
              'border-blue-500 bg-blue-50 text-blue-700 font-medium': currentStyle.padding === option.value,
              'border-gray-200 bg-white text-gray-700 hover:border-gray-300': currentStyle.padding !== option.value,
            }"
            @click="updatePadding(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Shadow -->
      <div class="style-section">
        <label class="block text-sm font-medium text-gray-700 mb-3">Shadow</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            v-for="option in shadowOptions"
            :key="option.value"
            class="style-option px-3 py-2 text-sm border-2 rounded transition-all"
            :class="{
              'border-blue-500 bg-blue-50 text-blue-700 font-medium': currentStyle.shadow === option.value,
              'border-gray-200 bg-white text-gray-700 hover:border-gray-300': currentStyle.shadow !== option.value,
            }"
            @click="updateShadow(option.value)"
          >
            <div :class="[option.class, 'w-full h-8 bg-white border border-gray-200 rounded']"></div>
            <span class="block mt-1">{{ option.label }}</span>
          </button>
        </div>
      </div>

      <!-- Preview of current settings -->
      <div class="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Current Settings</h4>
        <div class="space-y-1 text-xs text-gray-600">
          <div>Border Radius: <span class="font-mono">{{ currentStyle.borderRadius }}</span></div>
          <div>Padding: <span class="font-mono">{{ currentStyle.padding }}</span></div>
          <div>Shadow: <span class="font-mono">{{ currentStyle.shadow }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-option {
  cursor: pointer;
}
</style>

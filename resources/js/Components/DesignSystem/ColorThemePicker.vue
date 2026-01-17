<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ColorTheme } from '@/types/designSystem';

const props = defineProps<{
  selectedTheme?: ColorTheme;
}>();

const emit = defineEmits<{
  (e: 'update:selectedTheme', theme: ColorTheme): void;
}>();

// 5 predefined color theme presets
const colorThemes = ref<ColorTheme[]>([
  {
    id: 'ocean',
    name: 'Ocean Blue',
    primary: '#0284c7',
    secondary: '#0ea5e9',
    accent: '#06b6d4',
    background: '#f0f9ff',
    text: '#0c4a6e',
    border: '#bae6fd',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    primary: '#16a34a',
    secondary: '#22c55e',
    accent: '#4ade80',
    background: '#f0fdf4',
    text: '#14532d',
    border: '#bbf7d0',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    primary: '#ea580c',
    secondary: '#f97316',
    accent: '#fb923c',
    background: '#fff7ed',
    text: '#7c2d12',
    border: '#fed7aa',
  },
  {
    id: 'lavender',
    name: 'Lavender Purple',
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    accent: '#a78bfa',
    background: '#faf5ff',
    text: '#4c1d95',
    border: '#ddd6fe',
  },
  {
    id: 'slate',
    name: 'Modern Slate',
    primary: '#475569',
    secondary: '#64748b',
    accent: '#94a3b8',
    background: '#f8fafc',
    text: '#1e293b',
    border: '#cbd5e1',
  },
]);

const currentTheme = computed(() => props.selectedTheme || colorThemes.value[0]);

const selectTheme = (theme: ColorTheme) => {
  emit('update:selectedTheme', theme);
};
</script>

<template>
  <div class="color-theme-picker">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Color Theme</h3>
    <p class="text-sm text-gray-600 mb-4">Choose from 5 beautiful preset themes</p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="theme in colorThemes"
        :key="theme.id"
        class="theme-card cursor-pointer border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-lg text-left"
        :class="{
          'border-blue-500 ring-2 ring-blue-200': currentTheme.id === theme.id,
          'border-gray-200 hover:border-gray-300': currentTheme.id !== theme.id,
        }"
        @click="selectTheme(theme)"
        :aria-label="`Select ${theme.name} color theme`"
        :aria-pressed="currentTheme.id === theme.id"
      >
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-gray-900">{{ theme.name }}</h4>
          <span v-if="currentTheme.id === theme.id" class="text-blue-500" aria-hidden="true">✓</span>
        </div>
        
        <div class="color-palette flex gap-2 mb-2">
          <div
            class="w-8 h-8 rounded"
            :style="{ backgroundColor: theme.primary }"
            :title="`Primary: ${theme.primary}`"
            role="img"
            :aria-label="`Primary color: ${theme.primary}`"
          ></div>
          <div
            class="w-8 h-8 rounded"
            :style="{ backgroundColor: theme.secondary }"
            :title="`Secondary: ${theme.secondary}`"
            role="img"
            :aria-label="`Secondary color: ${theme.secondary}`"
          ></div>
          <div
            class="w-8 h-8 rounded"
            :style="{ backgroundColor: theme.accent }"
            :title="`Accent: ${theme.accent}`"
            role="img"
            :aria-label="`Accent color: ${theme.accent}`"
          ></div>
        </div>
        
        <div class="text-xs text-gray-500 space-y-1">
          <div class="flex items-center gap-2">
            <div 
              class="w-3 h-3 rounded" 
              :style="{ backgroundColor: theme.background }"
              role="img"
              :aria-label="`Background color: ${theme.background}`"
            ></div>
            <span>Background</span>
          </div>
          <div class="flex items-center gap-2">
            <div 
              class="w-3 h-3 rounded border" 
              :style="{ backgroundColor: theme.text }"
              role="img"
              :aria-label="`Text color: ${theme.text}`"
            ></div>
            <span>Text</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-card {
  background: white;
}
</style>

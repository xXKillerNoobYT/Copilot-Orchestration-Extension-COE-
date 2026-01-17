<script setup lang="ts">
import { ref, computed } from 'vue';
import type { FontOption } from '@/types/designSystem';

const props = defineProps<{
  selectedFont?: FontOption;
}>();

const emit = defineEmits<{
  (e: 'update:selectedFont', font: FontOption): void;
}>();

// 3 font options
const fontOptions = ref<FontOption[]>([
  {
    id: 'inter',
    name: 'Inter',
    family: 'Inter, system-ui, -apple-system, sans-serif',
    weights: [400, 500, 600, 700],
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: 'Roboto, Arial, sans-serif',
    weights: [300, 400, 500, 700],
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    weights: [400, 500, 600, 700, 800],
  },
]);

const currentFont = computed(() => props.selectedFont || fontOptions.value[0]);

const selectFont = (font: FontOption) => {
  emit('update:selectedFont', font);
};
</script>

<template>
  <div class="font-selector">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Font Family</h3>
    <p class="text-sm text-gray-600 mb-4">Choose from 3 carefully selected fonts</p>
    
    <div class="space-y-3">
      <button
        v-for="font in fontOptions"
        :key="font.id"
        class="font-option cursor-pointer border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-md w-full text-left"
        :class="{
          'border-blue-500 ring-2 ring-blue-200 bg-blue-50': currentFont.id === font.id,
          'border-gray-200 hover:border-gray-300 bg-white': currentFont.id !== font.id,
        }"
        @click="selectFont(font)"
        :aria-label="`Select ${font.name} font family`"
        :aria-pressed="currentFont.id === font.id"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <span v-if="currentFont.id === font.id" class="text-blue-500 text-xl" aria-hidden="true">●</span>
            <span v-else class="text-gray-300 text-xl" aria-hidden="true">○</span>
            <h4 class="font-medium text-gray-900">{{ font.name }}</h4>
          </div>
          <span v-if="currentFont.id === font.id" class="text-xs text-blue-600 font-semibold">SELECTED</span>
        </div>
        
        <div class="ml-8">
          <p
            class="text-2xl mb-2"
            :style="{ fontFamily: font.family }"
          >
            The quick brown fox jumps over the lazy dog
          </p>
          <p
            class="text-sm text-gray-600"
            :style="{ fontFamily: font.family }"
          >
            AaBbCcDd 123456789
          </p>
          <div class="mt-2 text-xs text-gray-500">
            Weights: {{ font.weights.join(', ') }}
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.font-option {
  transition: all 0.2s ease;
}
</style>

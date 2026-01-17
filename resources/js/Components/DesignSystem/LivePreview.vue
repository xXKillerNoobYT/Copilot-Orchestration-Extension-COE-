<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { ColorTheme, FontOption, ComponentStyle, PageSection } from '@/types/designSystem';

const props = defineProps<{
  theme: ColorTheme;
  font: FontOption;
  style: ComponentStyle;
}>();

// Track update performance
const lastUpdateTime = ref<number>(0);
const updateLatency = ref<number>(0);

// 8 page sections for preview
const pageSections = ref<PageSection[]>([
  { id: 'header', title: 'Header', content: 'Welcome to Your App', visible: true },
  { id: 'hero', title: 'Hero Section', content: 'Build amazing experiences with our design system', visible: true },
  { id: 'features', title: 'Features', content: 'Discover powerful features', visible: true },
  { id: 'pricing', title: 'Pricing', content: 'Choose the perfect plan', visible: true },
  { id: 'testimonials', title: 'Testimonials', content: 'What our customers say', visible: true },
  { id: 'team', title: 'Team', content: 'Meet the team', visible: true },
  { id: 'contact', title: 'Contact', content: 'Get in touch with us', visible: true },
  { id: 'footer', title: 'Footer', content: '', visible: true },
]);

// Computed property for footer text with dynamic year
const footerText = computed(() => `© ${new Date().getFullYear()} Your Company`);

// Compute CSS variables from theme
const cssVariables = computed(() => ({
  '--color-primary': props.theme.primary,
  '--color-secondary': props.theme.secondary,
  '--color-accent': props.theme.accent,
  '--color-background': props.theme.background,
  '--color-text': props.theme.text,
  '--color-border': props.theme.border,
  '--font-family': props.font.family,
  '--border-radius': props.style.borderRadius,
  '--padding': props.style.padding,
}));

// Compute shadow class
const shadowClass = computed(() => {
  return props.style.shadow === 'none' ? '' : `shadow-${props.style.shadow}`;
});

// Watch for changes and measure update latency (must be <500ms)
watch(
  () => [props.theme, props.font, props.style],
  async () => {
    const startTime = performance.now();
    
    // Wait for Vue to update the DOM
    await nextTick();
    
    const endTime = performance.now();
    updateLatency.value = Math.round(endTime - startTime);
    lastUpdateTime.value = Date.now();
  },
  { deep: true }
);
</script>

<template>
  <div class="live-preview">
    <div class="preview-header mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-800">Live Preview</h3>
        <p class="text-sm text-gray-600">Updates in real-time as you make changes</p>
      </div>
      <div v-if="updateLatency > 0" class="text-xs text-gray-500">
        <span :class="{ 'text-green-600 font-semibold': updateLatency < 500, 'text-red-600 font-semibold': updateLatency >= 500 }">
          {{ updateLatency }}ms
        </span>
        <span class="ml-1">update time</span>
        <span v-if="updateLatency < 500" class="ml-2 text-green-600">✓ &lt;500ms (Good)</span>
        <span v-else class="ml-2 text-red-600">⚠ ≥500ms (Slow)</span>
      </div>
    </div>

    <!-- Preview Canvas -->
    <div class="preview-canvas border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
      <div class="preview-content" :style="cssVariables">
        <!-- Scrollable preview area with all 8 sections -->
        <div class="preview-sections max-h-[600px] overflow-y-auto">
          <!-- Header Section -->
          <section
            v-if="pageSections[0].visible"
            :class="shadowClass"
            class="preview-section border-b"
            :style="{ 
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              padding: 'var(--padding)',
            }"
          >
            <h1 :style="{ fontFamily: 'var(--font-family)' }" class="text-2xl font-bold">
              {{ pageSections[0].content }}
            </h1>
          </section>

          <!-- Hero Section -->
          <section
            v-if="pageSections[1].visible"
            class="preview-section"
            :style="{ 
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text)',
              padding: 'calc(var(--padding) * 2)',
            }"
          >
            <h2 :style="{ fontFamily: 'var(--font-family)' }" class="text-3xl font-bold mb-4">
              {{ pageSections[1].title }}
            </h2>
            <p :style="{ fontFamily: 'var(--font-family)' }" class="text-lg">
              {{ pageSections[1].content }}
            </p>
            <button
              :class="shadowClass"
              class="mt-4 px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
              :style="{
                backgroundColor: 'var(--color-accent)',
                borderRadius: 'var(--border-radius)',
                fontFamily: 'var(--font-family)',
              }"
            >
              Get Started
            </button>
          </section>

          <!-- Features Section -->
          <section
            v-if="pageSections[2].visible"
            class="preview-section"
            :style="{ 
              backgroundColor: 'white',
              padding: 'calc(var(--padding) * 2)',
            }"
          >
            <h2 :style="{ fontFamily: 'var(--font-family)', color: 'var(--color-text)' }" class="text-2xl font-bold mb-4">
              {{ pageSections[2].title }}
            </h2>
            <div class="grid grid-cols-3 gap-4">
              <div
                v-for="i in 3"
                :key="`feature-${i}`"
                :class="shadowClass"
                class="feature-card p-4"
                :style="{
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 'var(--border-radius)',
                  borderColor: 'var(--color-border)',
                  borderWidth: '1px',
                }"
              >
                <div
                  class="w-12 h-12 mb-2 flex items-center justify-center text-white font-bold rounded"
                  :style="{ backgroundColor: 'var(--color-secondary)' }"
                >
                  {{ i }}
                </div>
                <h3 :style="{ fontFamily: 'var(--font-family)', color: 'var(--color-text)' }" class="font-semibold">
                  Feature {{ i }}
                </h3>
                <p :style="{ fontFamily: 'var(--font-family)', color: 'var(--color-text)' }" class="text-sm mt-1 opacity-75">
                  {{ pageSections[2].content }}
                </p>
              </div>
            </div>
          </section>

          <!-- Pricing, Testimonials, Team sections -->
          <section
            v-for="section in pageSections.slice(3, 6)"
            :key="section.id"
            v-show="section.visible"
            class="preview-section border-t"
            :style="{ 
              backgroundColor: section.id === 'pricing' ? 'var(--color-background)' : 'white',
              padding: 'calc(var(--padding) * 2)',
            }"
          >
            <h2 :style="{ fontFamily: 'var(--font-family)', color: 'var(--color-text)' }" class="text-2xl font-bold mb-4">
              {{ section.title }}
            </h2>
            <div
              :class="shadowClass"
              class="content-box p-6"
              :style="{
                backgroundColor: 'white',
                borderRadius: 'var(--border-radius)',
                borderColor: 'var(--color-border)',
                borderWidth: '1px',
              }"
            >
              <p :style="{ fontFamily: 'var(--font-family)', color: 'var(--color-text)' }">
                {{ section.content }}
              </p>
            </div>
          </section>

          <!-- Contact Section -->
          <section
            v-if="pageSections[6].visible"
            class="preview-section"
            :style="{ 
              backgroundColor: 'var(--color-background)',
              padding: 'calc(var(--padding) * 2)',
            }"
          >
            <h2 :style="{ fontFamily: 'var(--font-family)', color: 'var(--color-text)' }" class="text-2xl font-bold mb-4">
              {{ pageSections[6].title }}
            </h2>
            <form class="max-w-md">
              <label for="contact-email" class="block text-sm font-medium mb-2" :style="{ color: 'var(--color-text)', fontFamily: 'var(--font-family)' }">
                Email Address
              </label>
              <input
                id="contact-email"
                type="email"
                placeholder="Your email"
                :class="shadowClass"
                class="w-full px-4 py-2 mb-3 border"
                :style="{
                  borderRadius: 'var(--border-radius)',
                  borderColor: 'var(--color-border)',
                  fontFamily: 'var(--font-family)',
                  padding: 'var(--padding)',
                }"
              />
              <button
                type="button"
                :class="shadowClass"
                class="px-6 py-2 text-white font-semibold"
                :style="{
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: 'var(--border-radius)',
                  fontFamily: 'var(--font-family)',
                }"
              >
                {{ pageSections[6].content }}
              </button>
            </form>
          </section>

          <!-- Footer Section -->
          <section
            v-if="pageSections[7].visible"
            :class="shadowClass"
            class="preview-section border-t"
            :style="{ 
              backgroundColor: 'var(--color-text)',
              color: 'white',
              padding: 'var(--padding)',
            }"
          >
            <p :style="{ fontFamily: 'var(--font-family)' }" class="text-center text-sm">
              {{ footerText }}
            </p>
          </section>
        </div>
      </div>
    </div>

    <!-- Section visibility toggles -->
    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Page Sections ({{ pageSections.filter(s => s.visible).length }}/8 visible)</h4>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="section in pageSections"
          :key="section.id"
          class="px-3 py-1 text-xs rounded transition-colors"
          :class="{
            'bg-blue-100 text-blue-700 border border-blue-300': section.visible,
            'bg-gray-100 text-gray-500 border border-gray-300': !section.visible,
          }"
          @click="section.visible = !section.visible"
          :aria-pressed="section.visible"
          :aria-label="`${section.visible ? 'Hide' : 'Show'} ${section.title} section`"
        >
          <span aria-hidden="true">{{ section.visible ? '✓' : '○' }}</span> {{ section.title }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-canvas {
  background: #f9fafb;
}

.preview-section {
  transition: all 0.2s ease;
}

.feature-card {
  transition: transform 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
}
</style>

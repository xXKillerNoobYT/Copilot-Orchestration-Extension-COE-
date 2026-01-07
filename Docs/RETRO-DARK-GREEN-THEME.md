# Retro Dark Green Terminal Theme

**Date:** January 6, 2026  
**Theme:** Retro Computer / DOS Terminal Aesthetic  
**Inspiration:** Classic CRT monitors with green phosphor displays  

---

## 🖥️ Color Palette (Retro Dark Green)

### Base Colors
```css
--retro-bg-dark: #001a00;      /* Deep dark green background */
--retro-bg-card: #0d2b0d;      /* Card/panel background */
--retro-text-main: #00ff00;    /* Bright neon green text */
--retro-text-dim: #00cc00;     /* Dimmer green for secondary */
--retro-text-muted: #008800;   /* Muted for hints/help text */
--retro-accent: #00ff88;       /* Bright lime green highlights */
--retro-border: #00aa00;       /* Border lines */
--retro-error: #ff0033;        /* Retro red errors */
--retro-warning: #ffaa00;      /* Retro amber warnings */
--retro-success: #00ff00;      /* Green success */
--retro-info: #00ccff;         /* Cyan information */
```

### Typography
```css
font-family: 'Courier New', 'IBM Plex Mono', 'Roboto Mono', monospace;
letter-spacing: 0.05em;        /* Wide spacing for that retro feel */
text-transform: uppercase;     /* All caps for authenticity */
```

---

## 🎨 Retro Components

### Retro Button Component

```vue
<template>
  <button
    :class="[
      'retro-button',
      `retro-button-${variant}`,
      `retro-button-${size}`,
      { 'retro-button-loading': loading, 'retro-button-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <span v-if="!loading">{{ text }}</span>
    <span v-else class="retro-loading">█░█░█</span>
  </button>
</template>

<script setup lang="ts">
export interface RetroButtonProps {
  text: string
  variant?: 'primary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

withDefaults(defineProps<RetroButtonProps>(), {
  variant: 'primary',
  size: 'md',
})
</script>

<style scoped>
.retro-button {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.1em;
  background: var(--retro-bg-card);
  color: var(--retro-text-main);
  border: 2px solid var(--retro-border);
  box-shadow: 
    inset -2px -2px 0 rgba(0, 0, 0, 0.5), 
    inset 2px 2px 0 rgba(0, 255, 0, 0.3);
  transition: all 0.1s ease;
  cursor: pointer;
  padding: 0.5rem 1rem;
  text-transform: uppercase;
}

.retro-button:hover:not(:disabled) {
  background: var(--retro-bg-dark);
  box-shadow: 
    inset -2px -2px 0 rgba(0, 0, 0, 0.7),
    inset 2px 2px 0 rgba(0, 255, 0, 0.5);
  color: var(--retro-accent);
}

.retro-button:active:not(:disabled) {
  box-shadow: 
    inset 1px 1px 0 rgba(0, 0, 0, 0.8),
    inset -1px -1px 0 rgba(0, 255, 0, 0.2);
}

.retro-button-primary {
  color: var(--retro-text-main);
}

.retro-button-danger {
  color: var(--retro-error);
  border-color: var(--retro-error);
}

.retro-button-danger:hover:not(:disabled) {
  color: var(--retro-error);
  box-shadow: 
    0 0 10px rgba(255, 0, 51, 0.5),
    inset -2px -2px 0 rgba(0, 0, 0, 0.7);
}

.retro-button-success {
  color: var(--retro-success);
}

.retro-button-sm {
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
}

.retro-button-md {
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.retro-button-lg {
  font-size: 1.125rem;
  padding: 0.75rem 1.5rem;
}

.retro-button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--retro-text-muted);
}

.retro-loading {
  animation: retro-pulse 0.5s infinite;
}

@keyframes retro-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
```

### Retro Input Component

```vue
<template>
  <div class="retro-input-wrapper">
    <label v-if="label" class="retro-label">
      &gt; {{ label }}
      <span v-if="required" class="retro-required">*</span>
    </label>
    
    <div class="retro-input-container">
      <span class="retro-prompt">█</span>
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        class="retro-input"
        :class="{ 'retro-input-error': error }"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <p v-if="error" class="retro-error-text">
      ❌ {{ error }}
    </p>
    
    <p v-if="hint && !error" class="retro-hint-text">
      >> {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
export interface RetroInputProps {
  modelValue: string | number
  type?: string
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

withDefaults(defineProps<RetroInputProps>(), {
  type: 'text',
})
</script>

<style scoped>
.retro-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: 'Courier New', monospace;
}

.retro-label {
  font-size: 0.875rem;
  font-weight: bold;
  letter-spacing: 0.1em;
  color: var(--retro-text-main);
  text-transform: uppercase;
}

.retro-required {
  color: var(--retro-error);
  margin-left: 0.25rem;
}

.retro-input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--retro-bg-dark);
  border: 2px solid var(--retro-border);
  padding: 0.5rem;
}

.retro-prompt {
  display: flex;
  flex-shrink: 0;
  font-size: 1.125rem;
  font-weight: bold;
  color: var(--retro-accent);
  animation: retro-blink 1s infinite;
}

.retro-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--retro-text-main);
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  letter-spacing: 0.05em;
}

.retro-input::placeholder {
  color: var(--retro-text-muted);
}

.retro-input:disabled {
  color: var(--retro-text-muted);
  cursor: not-allowed;
}

.retro-input-error {
  color: var(--retro-error);
}

.retro-error-text {
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  color: var(--retro-error);
  margin: 0;
}

.retro-hint-text {
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  color: var(--retro-text-muted);
  margin: 0;
}

@keyframes retro-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
</style>
```

### Retro Card Component

```vue
<template>
  <div class="retro-card">
    <div v-if="title" class="retro-card-header">
      <span class="retro-corner">┌─</span>
      <span class="retro-card-title">{{ title }}</span>
      <span class="retro-corner">─┐</span>
    </div>
    
    <div class="retro-card-body">
      <slot />
    </div>

    <div class="retro-card-footer">
      <span class="retro-corner">└─────────────────────┘</span>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface RetroCardProps {
  title?: string
}

withDefaults(defineProps<RetroCardProps>(), {})
</script>

<style scoped>
.retro-card {
  background: var(--retro-bg-dark);
  border: 2px solid var(--retro-border);
  font-family: 'Courier New', monospace;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
}

.retro-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--retro-border);
  color: var(--retro-accent);
}

.retro-corner {
  font-size: 1rem;
  color: var(--retro-text-main);
}

.retro-card-title {
  flex: 1;
  font-weight: bold;
  letter-spacing: 0.1em;
  color: var(--retro-text-main);
  text-transform: uppercase;
}

.retro-card-body {
  padding: 1rem;
  color: var(--retro-text-main);
  line-height: 1.6;
}

.retro-card-footer {
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--retro-border);
  color: var(--retro-text-main);
  font-size: 0.85rem;
}
</style>
```

---

## 📝 Retro Status Badge Component

```vue
<template>
  <span :class="['retro-badge', `retro-status-${status}`]">
    <span class="retro-bracket">[</span>
    {{ statusText }}
    <span class="retro-bracket">]</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked'
}

const props = defineProps<Props>()

const statusText = computed(() => {
  const map = {
    pending: 'PENDING',
    in_progress: 'RUNNING',
    completed: 'DONE',
    failed: 'ERROR',
    blocked: 'HALTED',
  }
  return map[props.status]
})
</script>

<style scoped>
.retro-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.05em;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.retro-bracket {
  opacity: 0.7;
}

.retro-status-pending {
  color: var(--retro-text-muted);
}

.retro-status-in_progress {
  color: var(--retro-accent);
  animation: retro-glow 0.8s ease-in-out infinite;
}

.retro-status-completed {
  color: var(--retro-success);
}

.retro-status-failed {
  color: var(--retro-error);
  text-shadow: 0 0 5px rgba(255, 0, 51, 0.5);
}

.retro-status-blocked {
  color: var(--retro-error);
}

@keyframes retro-glow {
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 136, 0.3); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 136, 0.8); }
}
</style>
```

---

## 🎪 Full Page Example (Retro Dashboard)

```vue
<template>
  <div class="retro-dashboard">
    <!-- CRT Scanline Effect -->
    <div class="retro-scanlines" />

    <!-- Header -->
    <header class="retro-header">
      <h1 class="retro-title">
        ▌ TASK ORCHESTRATION SYSTEM ▌
      </h1>
      <div class="retro-info">
        >> SYSTEM ONLINE | STATUS: READY
      </div>
    </header>

    <!-- Main Content -->
    <main class="retro-main">
      <!-- Stats Cards -->
      <div class="retro-grid">
        <RetroCard title="TOTAL TASKS">
          <div class="retro-stat">{{ stats.total }}</div>
        </RetroCard>

        <RetroCard title="RUNNING">
          <div class="retro-stat retro-accent">{{ stats.running }}</div>
        </RetroCard>

        <RetroCard title="COMPLETED">
          <div class="retro-stat retro-success">{{ stats.completed }}</div>
        </RetroCard>

        <RetroCard title="ERRORS">
          <div class="retro-stat retro-error">{{ stats.errors }}</div>
        </RetroCard>
      </div>

      <!-- Task List -->
      <RetroCard title="ACTIVE TASKS">
        <div class="retro-task-list">
          <div v-for="task in tasks" :key="task.id" class="retro-task-item">
            <span class="retro-task-name">{{ task.name }}</span>
            <RetroStatusBadge :status="task.status" />
          </div>
        </div>
      </RetroCard>
    </main>

    <!-- Footer -->
    <footer class="retro-footer">
      >> READY FOR INPUT | Press &lt;ENTER&gt;
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RetroCard from '@/components/RetroCard.vue'
import RetroStatusBadge from '@/components/RetroStatusBadge.vue'

const stats = ref({
  total: 147,
  running: 23,
  completed: 98,
  errors: 5,
})

const tasks = ref([
  { id: 1, name: 'ANALYZE_PROJECT_STRUCTURE', status: 'in_progress' },
  { id: 2, name: 'GENERATE_DOCUMENTATION', status: 'in_progress' },
  { id: 3, name: 'VALIDATE_CODE_QUALITY', status: 'pending' },
  { id: 4, name: 'RUN_TEST_SUITE', status: 'failed' },
])
</script>

<style scoped>
.retro-dashboard {
  min-height: 100vh;
  background: var(--retro-bg-dark);
  color: var(--retro-text-main);
  font-family: 'Courier New', monospace;
  overflow-x: hidden;
  position: relative;
}

.retro-scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image: 
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
  z-index: 1;
}

.retro-header {
  background: var(--retro-bg-card);
  border-bottom: 2px solid var(--retro-border);
  padding: 2rem 1rem;
  text-align: center;
  position: relative;
  z-index: 2;
}

.retro-title {
  font-size: 2rem;
  font-weight: bold;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--retro-accent);
  margin: 0 0 0.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.retro-info {
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  color: var(--retro-text-dim);
}

.retro-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.retro-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.retro-stat {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.1em;
}

.retro-accent {
  color: var(--retro-accent);
}

.retro-success {
  color: var(--retro-success);
}

.retro-error {
  color: var(--retro-error);
}

.retro-task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.retro-task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-left: 2px solid var(--retro-accent);
  padding-left: 1rem;
  font-size: 0.95rem;
}

.retro-task-name {
  font-weight: bold;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.retro-footer {
  background: var(--retro-bg-card);
  border-top: 2px solid var(--retro-border);
  padding: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  position: relative;
  z-index: 2;
}
</style>
```

---

## 🎨 CSS Variables Setup

Add this to your main `app.css` or `index.css`:

```css
:root {
  /* Retro Dark Green Theme */
  --retro-bg-dark: #001a00;
  --retro-bg-card: #0d2b0d;
  --retro-text-main: #00ff00;
  --retro-text-dim: #00cc00;
  --retro-text-muted: #008800;
  --retro-accent: #00ff88;
  --retro-border: #00aa00;
  --retro-error: #ff0033;
  --retro-warning: #ffaa00;
  --retro-success: #00ff00;
  --retro-info: #00ccff;
}

/* Apply to body for full effect */
body {
  background: var(--retro-bg-dark);
  color: var(--retro-text-main);
  font-family: 'Courier New', monospace;
}
```

---

## ✨ Optional Effects

### Glow Effect for Interactive Elements

```css
.retro-interactive:hover {
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
  transition: all 0.2s ease;
}
```

### CRT Curve Effect (Advanced)

```css
.retro-monitor {
  border-radius: 40px;
  box-shadow: 
    0 0 40px rgba(0, 0, 0, 0.8),
    inset 0 0 40px rgba(0, 0, 0, 0.5);
}
```

---

## 🎯 Theme Usage in TailwindCSS Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        retro: {
          'bg-dark': '#001a00',
          'bg-card': '#0d2b0d',
          'text-main': '#00ff00',
          'text-dim': '#00cc00',
          'text-muted': '#008800',
          'accent': '#00ff88',
          'border': '#00aa00',
          'error': '#ff0033',
          'warning': '#ffaa00',
          'success': '#00ff00',
          'info': '#00ccff',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'IBM Plex Mono', 'Roboto Mono'],
      },
    },
  },
}
```

---

## 📊 Status Codes (Retro Style)

```
[ PENDING ] — Task waiting to start
[ RUNNING ] — Task in execution (glowing)
[ DONE ]    — Task completed successfully
[ ERROR ]   — Task failed (red glow)
[ HALTED ]  — Task blocked/paused
```

---

**Status:** ✅ **RETRO THEME COMPLETE**

*Classic dark green terminal aesthetic with modern Vue.js components.*

🖥️ **Welcome to the retro computing experience!**

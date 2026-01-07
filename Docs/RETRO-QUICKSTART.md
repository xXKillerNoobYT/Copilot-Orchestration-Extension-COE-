# 🖥️ Retro Dark Green Theme — Quick Start

**Status:** ✅ Ready to Use  
**Theme:** Dark Green Terminal / Retro Computer  
**Base Colors:** #001a00 (bg) → #00ff00 (text)  

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Add CSS Variables to `resources/css/app.css`

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

body.retro-theme {
  background: var(--retro-bg-dark);
  color: var(--retro-text-main);
  font-family: 'Courier New', 'IBM Plex Mono', monospace;
}
```

### Step 2: Use in Components

```vue
<button class="retro-button retro-button-primary">
  LAUNCH SYSTEM
</button>
```

### Step 3: Add Inline Styles

```css
.retro-button {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  background: var(--retro-bg-card);
  color: var(--retro-text-main);
  border: 2px solid var(--retro-border);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.5rem 1rem;
}

.retro-button:hover {
  color: var(--retro-accent);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}
```

---

## 🎨 Color Reference

| Use Case | Color | Hex | Variable |
|----------|-------|-----|----------|
| Background | Deep Green | #001a00 | `--retro-bg-dark` |
| Cards | Medium Green | #0d2b0d | `--retro-bg-card` |
| Main Text | Bright Green | #00ff00 | `--retro-text-main` |
| Secondary | Dim Green | #00cc00 | `--retro-text-dim` |
| Hint Text | Muted Green | #008800 | `--retro-text-muted` |
| Accent/Glow | Lime Green | #00ff88 | `--retro-accent` |
| Borders | Medium Green | #00aa00 | `--retro-border` |
| Errors | Red | #ff0033 | `--retro-error` |
| Warnings | Amber | #ffaa00 | `--retro-warning` |
| Success | Green | #00ff00 | `--retro-success` |
| Info | Cyan | #00ccff | `--retro-info` |

---

## 📝 Common Components

### Button (Copy-Paste Ready)

```vue
<template>
  <button class="retro-btn retro-btn-lg">
    {{ loading ? '█░█░█' : 'EXECUTE' }}
  </button>
</template>

<style scoped>
.retro-btn {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.1em;
  background: var(--retro-bg-card);
  color: var(--retro-text-main);
  border: 2px solid var(--retro-border);
  padding: 0.5rem 1rem;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.1s ease;
}

.retro-btn:hover {
  background: var(--retro-bg-dark);
  color: var(--retro-accent);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.retro-btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}
</style>
```

### Input (Copy-Paste Ready)

```vue
<template>
  <div class="retro-input-wrapper">
    <label class="retro-label">{{ label }}</label>
    <div class="retro-input-box">
      <span class="retro-prompt">█</span>
      <input 
        v-model="value" 
        class="retro-inp" 
        :placeholder="placeholder"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const value = ref('')
</script>

<style scoped>
.retro-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: 'Courier New', monospace;
}

.retro-label {
  color: var(--retro-text-main);
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.1em;
}

.retro-input-box {
  display: flex;
  align-items: center;
  background: var(--retro-bg-dark);
  border: 2px solid var(--retro-border);
  padding: 0.5rem;
  gap: 0.5rem;
}

.retro-prompt {
  color: var(--retro-accent);
  animation: blink 1s infinite;
}

.retro-inp {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--retro-text-main);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
}

.retro-inp::placeholder {
  color: var(--retro-text-muted);
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
</style>
```

### Card (Copy-Paste Ready)

```vue
<template>
  <div class="retro-card">
    <div v-if="title" class="retro-card-header">
      <span>┌─ {{ title }} ─┐</span>
    </div>
    <div class="retro-card-body">
      <slot />
    </div>
    <div class="retro-card-footer">
      <span>└────────────────┘</span>
    </div>
  </div>
</template>

<style scoped>
.retro-card {
  background: var(--retro-bg-dark);
  border: 2px solid var(--retro-border);
  font-family: 'Courier New', monospace;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
}

.retro-card-header {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--retro-border);
  color: var(--retro-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: bold;
}

.retro-card-body {
  padding: 1rem;
  color: var(--retro-text-main);
}

.retro-card-footer {
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--retro-border);
  color: var(--retro-text-main);
  font-size: 0.85rem;
}
</style>
```

### Status Badge (Copy-Paste Ready)

```vue
<template>
  <span :class="['retro-badge', `retro-${status}`]">
    [{{ statusText }}]
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const statusMap = {
  'pending': 'WAITING',
  'in_progress': 'RUNNING',
  'completed': 'DONE',
  'failed': 'ERROR',
  'blocked': 'HALTED',
}

const statusText = computed(() => statusMap[props.status] || props.status.toUpperCase())
</script>

<style scoped>
.retro-badge {
  display: inline-block;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.retro-pending {
  color: var(--retro-text-muted);
}

.retro-in_progress {
  color: var(--retro-accent);
  animation: glow 0.8s ease-in-out infinite;
}

.retro-completed {
  color: var(--retro-success);
}

.retro-failed {
  color: var(--retro-error);
}

.retro-blocked {
  color: var(--retro-error);
}

@keyframes glow {
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 136, 0.3); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 136, 0.8); }
}
</style>
```

---

## 🎯 Usage Examples

### Simple Page with Retro Theme

```vue
<template>
  <div class="retro-page">
    <header class="retro-header">
      <h1>▌ TASK DASHBOARD ▌</h1>
    </header>

    <main class="retro-content">
      <div class="retro-grid">
        <div class="retro-card">
          <div class="retro-card-header">TOTAL TASKS</div>
          <div class="retro-card-body">
            <div style="font-size: 2rem; text-align: center;">{{ totalTasks }}</div>
          </div>
        </div>

        <div class="retro-card">
          <div class="retro-card-header">RUNNING</div>
          <div class="retro-card-body" style="color: var(--retro-accent);">
            <div style="font-size: 2rem; text-align: center;">{{ running }}</div>
          </div>
        </div>
      </div>

      <div class="retro-card">
        <div class="retro-card-header">TASK LIST</div>
        <div class="retro-card-body">
          <div v-for="task in tasks" :key="task.id" class="retro-list-item">
            {{ task.name }}
            <span :class="['retro-badge', `retro-${task.status}`]">
              [{{ formatStatus(task.status) }}]
            </span>
          </div>
        </div>
      </div>
    </main>

    <footer class="retro-footer">
      >> SYSTEM ONLINE | READY
    </footer>
  </div>
</template>

<style scoped>
.retro-page {
  background: var(--retro-bg-dark);
  color: var(--retro-text-main);
  font-family: 'Courier New', monospace;
  min-height: 100vh;
}

.retro-header {
  background: var(--retro-bg-card);
  border-bottom: 2px solid var(--retro-border);
  padding: 2rem;
  text-align: center;
}

.retro-header h1 {
  font-size: 2rem;
  letter-spacing: 0.2em;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
  margin: 0;
}

.retro-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.retro-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.retro-list-item {
  padding: 0.75rem;
  border-left: 2px solid var(--retro-accent);
  padding-left: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.retro-footer {
  background: var(--retro-bg-card);
  border-top: 2px solid var(--retro-border);
  padding: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  letter-spacing: 0.1em;
}
</style>
```

---

## 🎨 Tips & Tricks

### Add Scanlines Effect
```css
.retro-scanlines {
  background-image: 
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
}
```

### Add Glow to Text
```css
.retro-glow {
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}
```

### Add Blinking Cursor
```css
@keyframes retro-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.retro-cursor {
  animation: retro-blink 1s infinite;
}
```

---

## 📋 Checklist

- [ ] Add CSS variables to app.css
- [ ] Copy button component
- [ ] Copy input component
- [ ] Copy card component
- [ ] Copy badge component
- [ ] Update fonts to monospace
- [ ] Test on all pages
- [ ] Add scanlines effect (optional)
- [ ] Adjust brightness if needed

---

## 🎊 Done!

Your retro dark green terminal theme is ready! 🖥️

Enjoy the nostalgic computing experience.

---

**Status:** ✅ **READY TO IMPLEMENT**

*Old computer aesthetic meets modern Vue.js components.*

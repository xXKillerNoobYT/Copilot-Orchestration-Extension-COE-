# Vue.js + TailwindCSS Quick Reference Card

**Last Updated:** January 6, 2026  
**Version:** 1.0  

---

## 🎨 Design System Quick Reference

### Colors

```
Primary:      #0ea5e9 (primary-500)
Success:      #22c55e (success-500)
Error:        #ef4444 (error-500)
Warning:      #f59e0b (warning-500)
Gray (text):  #111827 (gray-900)
Gray (bg):    #f9fafb (gray-50)
```

### Typography Scale

```
xs: 12px    sm: 14px    base: 16px    lg: 18px    xl: 20px
2xl: 24px   3xl: 30px   4xl: 36px
```

### Spacing

```
xs: 4px   sm: 8px   md: 12px   lg: 16px   xl: 24px   2xl: 32px
```

### Breakpoints

```
sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

---

## 📦 Components Cheat Sheet

### Button

```vue
<Button variant="primary" size="md" :loading="isLoading" @click="action">
  Click me
</Button>
```

**Props:** `variant`, `size`, `disabled`, `loading`  
**Emits:** `click`

### Input

```vue
<Input 
  v-model="value"
  label="Label"
  type="email"
  placeholder="Enter value"
  :error="errorMessage"
/>
```

**Props:** `modelValue`, `label`, `type`, `placeholder`, `error`, `required`  
**Emits:** `update:modelValue`, `blur`, `focus`

### Card

```vue
<Card title="Card Title" elevated>
  Card content here
</Card>
```

**Props:** `title`, `subtitle`, `elevated`, `interactive`

### Modal

```vue
<Modal 
  :is-open="isOpen"
  title="Dialog Title"
  @close="isOpen = false"
  @confirm="handleConfirm"
>
  Modal content
</Modal>
```

**Props:** `isOpen`, `title`, `closeable`  
**Emits:** `close`, `confirm`

---

## 🎣 Composables Quick Reference

### useAsync

```typescript
const { data, error, isLoading, execute } = useAsync(() => fetchData())
```

### useFetch

```typescript
const { data, error, isLoading, refetch } = useFetch('/api/endpoint')
```

### useForm

```typescript
const { state, errors, isSubmitting, handleSubmit, reset } = useForm(
  { field: '' },
  { onSubmit: async (data) => { /* ... */ } }
)
```

---

## 🏪 Store Pattern

### Task Store

```typescript
const taskStore = useTaskStore()
// Actions
taskStore.fetchTasks()
taskStore.createTask(data)
taskStore.updateTask(id, updates)
taskStore.deleteTask(id)
// Getters
taskStore.filteredTasks      // computed
taskStore.selectedTask       // computed
taskStore.taskStats          // computed
```

### Project Store

```typescript
const projectStore = useProjectStore()
projectStore.fetchProjects()
projectStore.createProject(data)
projectStore.selectProject(id)
```

### UI Store

```typescript
const uiStore = useUIStore()
uiStore.notifySuccess('Message')
uiStore.notifyError('Error message')
uiStore.toggleSidebar()
uiStore.setTheme('dark')
```

---

## 🎯 Common Patterns

### Data Fetching

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTaskStore } from '@/stores/taskStore'

const taskStore = useTaskStore()

onMounted(async () => {
  await taskStore.fetchTasks()
})
</script>

<template>
  <div v-if="taskStore.isLoading">
    <Loader />
  </div>
  <div v-else>
    <TaskCard v-for="task in taskStore.tasks" :key="task.id" :task="task" />
  </div>
</template>
```

### Form Submission

```vue
<script setup lang="ts">
const { state, handleSubmit, isSubmitting } = useForm(
  { name: '', email: '' },
  {
    onSubmit: async (data) => {
      await axios.post('/api/tasks', data)
    },
  }
)
</script>

<template>
  <form @submit="handleSubmit">
    <Input v-model="state.name" label="Name" />
    <Input v-model="state.email" label="Email" type="email" />
    <Button type="submit" :loading="isSubmitting">Submit</Button>
  </form>
</template>
```

### Computed Selection

```vue
<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore'
import { computed } from 'vue'

const taskStore = useTaskStore()
const completedTasks = computed(() =>
  taskStore.filteredTasks.filter(t => t.status === 'completed')
)
</script>
```

### Error Handling

```vue
<script setup lang="ts">
const handleAction = async () => {
  try {
    await taskStore.createTask(data)
    uiStore.notifySuccess('Task created')
  } catch (error) {
    uiStore.notifyError(error.message)
  }
}
</script>
```

---

## 🎨 TailwindCSS Utility Classes

### Layout

```css
/* Flexbox */
flex flex-row flex-col justify-center items-center gap-4

/* Grid */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

/* Spacing */
p-4 px-4 py-2 mt-4 mb-2 space-y-4

/* Display */
hidden md:block flex absolute fixed
```

### Styling

```css
/* Colors */
bg-primary-500 text-gray-900 border border-gray-300

/* Sizing */
w-full h-12 min-h-screen

/* Borders */
rounded-lg rounded-md border-2 shadow-md

/* Transitions */
transition-all duration-200 ease-in-out hover:bg-primary-600
```

### Responsive

```css
/* Mobile-first */
text-sm md:text-base lg:text-lg
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
hidden md:block
```

---

## 🔍 State Management Decision

| Use Case | Solution | Example |
|----------|----------|---------|
| Local form state | `ref()` | Toggle, form field |
| Related component state | `reactive()` | Form object |
| Derived state | `computed()` | Filtered list |
| Reusable logic | Composable | Data fetching |
| Global app state | Pinia store | Tasks, projects |

---

## 📱 Responsive Grid

```vue
<!-- 1 col on mobile, 2 on tablet, 3 on desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Items -->
</div>
```

---

## ♿ Accessibility Essentials

```vue
<!-- Semantic HTML -->
<button aria-label="Close dialog">✕</button>

<!-- Form associations -->
<label for="email">Email</label>
<input id="email" type="email" />

<!-- ARIA for dynamic content -->
<div role="status" aria-live="polite">Loading...</div>

<!-- Focus management -->
<div tabindex="0" @keydown.enter="handleAction">Click or press Enter</div>
```

---

## 🚀 Development Commands

```bash
# Development
npm run dev              # Start Vite dev server
php artisan serve       # Start Laravel server

# Building
npm run build           # Production build
npm run build:ssr      # SSR build

# Testing
npm run test           # Run tests
npm run test:ui        # Test UI

# Linting
npm run lint           # Run ESLint
npm run format         # Format with Prettier
```

---

## 🔗 File Locations

| Type | Location |
|------|----------|
| Components | `resources/js/Components/` |
| Pages | `resources/js/Pages/` |
| Stores | `resources/js/stores/` |
| Composables | `resources/js/composables/` |
| Layouts | `resources/js/Layouts/` |
| Types | `resources/js/types/` |
| Styles | `resources/css/` |

---

## 💡 Pro Tips

1. **Always use TypeScript** — Define proper types for props and stores
2. **Component composition** — Build components from smaller components
3. **Use computed** — Cache expensive calculations
4. **Lazy load** — Use `defineAsyncComponent` for code splitting
5. **Test as you go** — Write tests alongside components
6. **Follow atomic design** — Atoms → Molecules → Organisms
7. **Keep stores lean** — Business logic in services
8. **Document patterns** — Every component should have clear props/emits

---

## ❌ Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Mutating props | Use `v-model` or composables |
| Shared mutable state | Use Pinia store or composable |
| Not typing props | Always use TypeScript interfaces |
| Forgetting keys in loops | Always use `:key` |
| Heavy computations | Memoize with `computed` |
| Blocking network calls | Use `async`/`await` with loading state |

---

## 📚 Quick Links

- **Design System:** `Docs/UI-UX-DESIGN-SYSTEM.md`
- **Components:** `Docs/COMPONENT-ARCHITECTURE.md`
- **State Management:** `Docs/STATE-MANAGEMENT.md`
- **Implementation Guide:** `Docs/UI-UX-IMPLEMENTATION-GUIDE.md`

---

**Print this page or bookmark for quick reference during development!**

**Status:** ✅ Ready for Development

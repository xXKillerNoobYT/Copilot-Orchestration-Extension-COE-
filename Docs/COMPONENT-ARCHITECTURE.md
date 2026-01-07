# Vue.js Component Architecture & Design Patterns

**Date:** January 6, 2026  
**Status:** ✅ Complete  
**Framework:** Vue 3 + Composition API + TypeScript  

---

## 📐 Component Hierarchy

### Atomic Design Pattern

```
Atoms (Basic building blocks)
├── Button
├── Input
├── Label
├── Badge
├── Avatar
├── Icon
└── Loader

Molecules (Simple component groups)
├── FormField (Label + Input + Error)
├── SearchInput (Input + Icon)
├── Card (Container)
├── Modal (Overlay + Card)
├── Dropdown (Trigger + List)
└── Alert (Icon + Text + Close)

Organisms (Complex features)
├── TaskForm
├── TaskList
├── ProjectCard
├── Header
├── Sidebar
└── Navigation

Templates (Page layouts)
├── AppLayout
├── DashboardLayout
├── FormLayout
└── BlankLayout

Pages (Actual pages)
├── Dashboard
├── Projects
├── Tasks
├── Agents
└── Settings
```

---

## 🧩 Common Components

### 1. Button Component (Atom)

```vue
<!-- components/Common/Button.vue -->
<template>
  <button
    :class="[
      'button',
      `button-${variant}`,
      `button-${size}`,
      { 'button-loading': loading, 'button-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <Loader v-if="loading" class="button-loader" />
    <slot />
  </button>
</template>

<script setup lang="ts">
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
})
</script>

<style scoped>
.button {
  @apply inline-flex items-center justify-center font-medium rounded-md transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.button-primary {
  @apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500;
}

.button-secondary {
  @apply bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400;
}

.button-danger {
  @apply bg-error-500 text-white hover:bg-error-600 focus:ring-error-500;
}

.button-ghost {
  @apply text-gray-600 hover:bg-gray-100 focus:ring-gray-300;
}

.button-xs {
  @apply px-2 py-1 text-xs;
}

.button-sm {
  @apply px-3 py-1.5 text-sm;
}

.button-md {
  @apply px-4 py-2 text-base;
}

.button-lg {
  @apply px-6 py-3 text-lg;
}

.button-loading {
  @apply relative text-transparent;
}

.button-loader {
  @apply absolute inset-0 flex items-center justify-center;
}
</style>
```

### 2. Input Component (Atom)

```vue
<!-- components/Common/Input.vue -->
<template>
  <div class="input-wrapper">
    <label
      v-if="label"
      :for="inputId"
      class="input-label"
    >
      {{ label }}
      <span v-if="required" class="text-error-500">*</span>
    </label>

    <div class="input-container">
      <input
        :id="inputId"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        :aria-invalid="!!error"
        class="input"
        :class="{ 'input-error': error }"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')"
        @focus="$emit('focus')"
      />
      <span v-if="suffix" class="input-suffix">{{ suffix }}</span>
    </div>

    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="input-error-message"
    >
      {{ error }}
    </p>

    <p v-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface InputProps {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url'
  label?: string
  placeholder?: string
  hint?: string
  suffix?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

withDefaults(defineProps<InputProps>(), {
  type: 'text',
})

defineEmits<{
  'update:modelValue': [value: string | number]
  blur: []
  focus: []
}>()

const inputId = computed(() => 
  `input-${Math.random().toString(36).substring(7)}`
)
</script>

<style scoped>
.input-wrapper {
  @apply flex flex-col;
}

.input-label {
  @apply mb-2 text-sm font-medium text-gray-700;
}

.input-container {
  @apply relative flex items-center;
}

.input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md text-base;
  @apply placeholder-gray-400 transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}

.input-error {
  @apply border-error-500 focus:ring-error-500;
}

.input-suffix {
  @apply absolute right-3 text-gray-500 text-sm pointer-events-none;
}

.input-error-message {
  @apply mt-1 text-sm text-error-600;
}

.input-hint {
  @apply mt-1 text-xs text-gray-500;
}
</style>
```

### 3. FormField Component (Molecule)

```vue
<!-- components/Forms/FormField.vue -->
<template>
  <div class="form-field">
    <label
      v-if="label"
      :for="fieldId"
      class="form-label"
      :class="{ 'required': required }"
    >
      {{ label }}
      <span v-if="required" class="text-error-500">*</span>
    </label>

    <div class="form-control">
      <slot />
    </div>

    <Transition name="error-slide">
      <p
        v-if="error"
        :id="`${fieldId}-error`"
        class="form-error"
      >
        {{ error }}
      </p>
    </Transition>

    <p v-if="hint && !error" class="form-hint">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

withDefaults(defineProps<FormFieldProps>(), {})

const fieldId = computed(() => 
  `field-${Math.random().toString(36).substring(7)}`
)
</script>

<style scoped>
.form-field {
  @apply flex flex-col gap-2;
}

.form-label {
  @apply text-sm font-medium text-gray-700;
}

.form-label.required::after {
  content: '*';
  @apply ml-1 text-error-500;
}

.form-control {
  @apply flex flex-col;
}

.form-error {
  @apply text-sm text-error-600 font-medium;
}

.form-hint {
  @apply text-xs text-gray-500;
}

.error-slide-enter-active,
.error-slide-leave-active {
  transition: all 0.2s ease;
}

.error-slide-enter-from,
.error-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
```

### 4. Card Component (Molecule)

```vue
<!-- components/Common/Card.vue -->
<template>
  <div
    class="card"
    :class="{
      'card-elevated': elevated,
      'card-interactive': interactive && !disabled,
      'card-disabled': disabled
    }"
    v-bind="interactive ? { role: 'button', tabindex: 0 } : {}"
    @keydown.enter="interactive ? $emit('click') : null"
    @click="interactive ? $emit('click') : null"
  >
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>

    <div v-if="title || subtitle" class="card-title-section">
      <h3 v-if="title" class="card-title">{{ title }}</h3>
      <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
    </div>

    <div class="card-body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface CardProps {
  title?: string
  subtitle?: string
  elevated?: boolean
  interactive?: boolean
  disabled?: boolean
}

withDefaults(defineProps<CardProps>(), {
  elevated: false,
  interactive: false,
  disabled: false,
})

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.card {
  @apply rounded-lg border border-gray-200 bg-white overflow-hidden transition-all duration-200;
  @apply hover:border-gray-300;
}

.card-elevated {
  @apply shadow-md hover:shadow-lg;
}

.card-interactive {
  @apply cursor-pointer hover:bg-gray-50;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
}

.card-disabled {
  @apply opacity-50 cursor-not-allowed;
}

.card-header {
  @apply border-b border-gray-200 px-6 py-4;
}

.card-title-section {
  @apply border-b border-gray-200 px-6 py-4;
}

.card-title {
  @apply text-lg font-semibold text-gray-900;
}

.card-subtitle {
  @apply mt-1 text-sm text-gray-600;
}

.card-body {
  @apply px-6 py-4;
}

.card-footer {
  @apply border-t border-gray-200 px-6 py-4 bg-gray-50;
}
</style>
```

### 5. Modal Component (Organism)

```vue
<!-- components/Common/Modal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div
        v-if="isOpen"
        class="modal-backdrop"
        @click="closeOnBackdropClick && close()"
      >
        <div
          class="modal-content"
          role="dialog"
          :aria-labelledby="titleId"
          :aria-modal="true"
          @click.stop
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="modal-header">
            <div v-if="title">
              <h2 :id="titleId" class="modal-title">{{ title }}</h2>
            </div>
            <slot v-else name="header" />

            <button
              v-if="closeable"
              class="modal-close-button"
              :aria-label="closeLabel"
              @click="close"
            >
              <Icon name="close" class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'

export interface ModalProps {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeable?: boolean
  closeOnBackdropClick?: boolean
  closeLabel?: string
}

withDefaults(defineProps<ModalProps>(), {
  size: 'md',
  closeable: true,
  closeOnBackdropClick: true,
  closeLabel: 'Close dialog',
})

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const close = () => emit('close')

const titleId = computed(() => 
  `modal-title-${Math.random().toString(36).substring(7)}`
)
</script>

<style scoped>
.modal-backdrop {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/50;
}

.modal-content {
  @apply w-full rounded-lg bg-white shadow-xl;
  @apply max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl;
  @apply max-h-[90vh] overflow-y-auto;
}

.modal-header {
  @apply flex items-start justify-between border-b border-gray-200 p-6;
}

.modal-title {
  @apply text-xl font-semibold text-gray-900;
}

.modal-close-button {
  @apply text-gray-400 hover:text-gray-600 transition-colors;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 rounded;
}

.modal-body {
  @apply p-6;
}

.modal-footer {
  @apply flex gap-3 border-t border-gray-200 p-6 bg-gray-50;
}

.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity 0.3s ease;
}

.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}

.modal-content {
  animation: modalSlide 0.3s ease;
}

.modal-backdrop-leave-active .modal-content {
  animation: modalSlide 0.3s ease reverse;
}

@keyframes modalSlide {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
```

---

## 🎯 Composition API Patterns

### useAsync Hook

```typescript
// composables/useAsync.ts
import { ref, computed } from 'vue'

interface UseAsyncOptions<T> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const isLoading = ref(false)

  const isError = computed(() => error.value !== null)
  const isSuccess = computed(() => data.value !== null && !isError.value)

  const execute = async () => {
    isLoading.value = true
    error.value = null

    try {
      const result = await asyncFn()
      data.value = result
      options.onSuccess?.(result)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      options.onError?.(error.value)
    } finally {
      isLoading.value = false
    }
  }

  if (options.immediate !== false) {
    execute()
  }

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    isLoading: computed(() => isLoading.value),
    isError,
    isSuccess,
    execute,
  }
}
```

### useFetch Hook

```typescript
// composables/useFetch.ts
import { ref, computed } from 'vue'
import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export function useFetch<T = any>(
  url: string,
  config?: AxiosRequestConfig
) {
  const data = ref<T | null>(null)
  const error = ref<AxiosError | null>(null)
  const isLoading = ref(true)

  const fetch = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.get<T>(url, config)
      data.value = response.data
    } catch (err) {
      error.value = err as AxiosError
    } finally {
      isLoading.value = false
    }
  }

  fetch()

  const refetch = () => fetch()

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    isLoading: computed(() => isLoading.value),
    refetch,
  }
}
```

### useForm Hook

```typescript
// composables/useForm.ts
import { reactive, ref, computed } from 'vue'

export interface UseFormOptions<T> {
  onSubmit: (data: T) => Promise<void>
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  options: UseFormOptions<T>
) {
  const values = reactive<T>({ ...initialValues })
  const errors = reactive<Partial<Record<keyof T, string>>>({})
  const touched = reactive<Partial<Record<keyof T, boolean>>>({})
  const isSubmitting = ref(false)

  const isDirty = computed(() => 
    JSON.stringify(values) !== JSON.stringify(initialValues)
  )

  const setFieldValue = (field: keyof T, value: any) => {
    values[field] = value
  }

  const setFieldError = (field: keyof T, error: string) => {
    errors[field] = error
  }

  const setFieldTouched = (field: keyof T, touched = true) => {
    touched[field] = touched
  }

  const reset = () => {
    Object.assign(values, initialValues)
    Object.keys(errors).forEach(key => delete errors[key as keyof T])
    Object.keys(touched).forEach(key => delete touched[key as keyof T])
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    isSubmitting.value = true

    try {
      await options.onSubmit(values)
      options.onSuccess?.(values)
    } catch (error) {
      options.onError?.(error as Error)
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    reset,
    handleSubmit,
  }
}
```

---

## 🗂️ File Organization Best Practices

### Component Folder Structure

```
resources/js/Components/
├── Common/                    # Reusable atoms & molecules
│   ├── Button.vue
│   ├── Input.vue
│   ├── Select.vue
│   ├── Card.vue
│   ├── Modal.vue
│   ├── Badge.vue
│   ├── Avatar.vue
│   ├── Loader.vue
│   ├── Alert.vue
│   ├── Tooltip.vue
│   ├── Dropdown.vue
│   └── Icon.vue
│
├── Forms/                     # Form-related components
│   ├── TaskForm.vue
│   ├── ProjectForm.vue
│   ├── AgentForm.vue
│   ├── FormSection.vue
│   └── FormActions.vue
│
├── Tasks/                     # Task-specific components
│   ├── TaskCard.vue
│   ├── TaskList.vue
│   ├── TaskDetail.vue
│   ├── TaskStatus.vue
│   ├── TaskPriority.vue
│   └── TaskMetadata.vue
│
├── Projects/                  # Project-specific components
│   ├── ProjectCard.vue
│   ├── ProjectList.vue
│   ├── ProjectHeader.vue
│   └── ProjectStats.vue
│
├── Agents/                    # Agent management
│   ├── AgentCard.vue
│   ├── AgentList.vue
│   ├── AgentStatus.vue
│   └── AgentConfig.vue
│
├── Layout/                    # Layout components
│   ├── AppLayout.vue
│   ├── Header.vue
│   ├── Sidebar.vue
│   ├── Navigation.vue
│   ├── Footer.vue
│   └── Breadcrumb.vue
│
└── Shared/                    # Shared/misc components
    ├── LoadingState.vue
    ├── EmptyState.vue
    └── ErrorBoundary.vue
```

### Composables Folder Structure

```
resources/js/composables/
├── useAsync.ts               # Async operation handling
├── useFetch.ts               # API calls
├── useForm.ts                # Form state management
├── useNotification.ts         # Toast/notification system
├── useDebounce.ts            # Debounce utilities
├── useThrottle.ts            # Throttle utilities
├── usePagination.ts          # Pagination logic
├── useSort.ts                # Sorting utilities
├── useFilter.ts              # Filtering utilities
├── useClipboard.ts           # Clipboard operations
├── useLocalStorage.ts        # Local storage
├── useMounted.ts             # Mounted state
├── useBreakpoint.ts          # Responsive breakpoints
└── useKeyboard.ts            # Keyboard event handling
```

---

## 📦 Props & Emit Best Practices

### Typed Props

```typescript
// ✅ Good: Explicit types
interface TaskCardProps {
  task: Task
  editable?: boolean
  onEdit?: (task: Task) => void
}

export const TaskCard = defineComponent({
  props: {
    task: {
      type: Object as PropType<Task>,
      required: true,
    },
    editable: {
      type: Boolean,
      default: false,
    },
  },
})

// ✅ Better: Script setup with types
const props = withDefaults(defineProps<TaskCardProps>(), {
  editable: false,
})
```

### Typed Emits

```typescript
// ✅ Good: Typed emits
const emit = defineEmits<{
  edit: [task: Task]
  delete: [taskId: string]
  update: [task: Task]
}>()
```

---

## 🎨 Styling Best Practices

### Scoped Styles with TailwindCSS

```vue
<style scoped>
/* Use @apply for complex patterns */
.button-group {
  @apply flex gap-2;
}

/* Use :deep() for nested component styling */
.form-container :deep(.input) {
  @apply bg-gray-50;
}

/* Use transitions for interactions */
.card {
  @apply transition-all duration-200;
}

.card:hover {
  @apply shadow-lg;
}
</style>
```

---

## ✅ Component Testing

### Testing Button Component

```typescript
// Button.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '@/components/Common/Button.vue'

describe('Button Component', () => {
  it('renders slot content', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })
    expect(wrapper.text()).toContain('Click me')
  })

  it('emits click event', async () => {
    const wrapper = mount(Button)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('shows loading state', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
      },
    })
    expect(wrapper.find('.button-loading').exists()).toBe(true)
  })

  it('disables when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
```

---

## 📚 Summary

**Component Architecture Ready:**
- ✅ Atomic design pattern
- ✅ Reusable component library
- ✅ Composition API patterns
- ✅ TypeScript support
- ✅ Proper file organization
- ✅ Best practices
- ✅ Testing strategies
- ✅ Styling patterns

**Next Steps:** Implement pages and layouts using these components.

---

**Status:** ✅ **COMPLETE**

*Professional component architecture ready for production development.*

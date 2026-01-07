# Vue.js Authentication Components

---

## 🔐 Register Component

**File:** `resources/js/Pages/Auth/Register.vue`

```vue
<template>
  <AuthLayout title="Register">
    <form @submit.prevent="submit" class="space-y-4">
      <!-- Name Field -->
      <div>
        <label for="name" class="block text-sm font-medium mb-1">
          Full Name
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.name }"
          required
        />
        <p v-if="errors.name" class="text-red-500 text-sm mt-1">
          {{ errors.name[0] }}
        </p>
      </div>

      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium mb-1">
          Email Address
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.email }"
          required
        />
        <p v-if="errors.email" class="text-red-500 text-sm mt-1">
          {{ errors.email[0] }}
        </p>
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.password }"
          required
        />
        <p v-if="errors.password" class="text-red-500 text-sm mt-1">
          {{ errors.password[0] }}
        </p>
        <p class="text-gray-500 text-xs mt-1">
          Must be at least 8 characters with uppercase, lowercase, and number
        </p>
      </div>

      <!-- Password Confirmation Field -->
      <div>
        <label for="password_confirmation" class="block text-sm font-medium mb-1">
          Confirm Password
        </label>
        <input
          id="password_confirmation"
          v-model="form.password_confirmation"
          type="password"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="form.processing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
      >
        {{ form.processing ? 'Creating Account...' : 'Create Account' }}
      </button>

      <!-- Login Link -->
      <p class="text-center text-sm">
        Already have an account?
        <Link href="/login" class="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import AuthLayout from '@/Layouts/AuthLayout.vue';

const form = useForm({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
});

const errors = form.errors;

const submit = () => {
  form.post('/register');
};
</script>
```

---

## 🔑 Login Component

**File:** `resources/js/Pages/Auth/Login.vue`

```vue
<template>
  <AuthLayout title="Login">
    <form @submit.prevent="submit" class="space-y-4">
      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium mb-1">
          Email Address
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.email }"
          autofocus
          required
        />
        <p v-if="errors.email" class="text-red-500 text-sm mt-1">
          {{ errors.email[0] }}
        </p>
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.password }"
          required
        />
        <p v-if="errors.password" class="text-red-500 text-sm mt-1">
          {{ errors.password[0] }}
        </p>
      </div>

      <!-- Remember Me -->
      <div class="flex items-center">
        <input
          id="remember"
          v-model="form.remember"
          type="checkbox"
          class="rounded border-gray-300"
        />
        <label for="remember" class="ml-2 text-sm">
          Remember me
        </label>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="form.processing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
      >
        {{ form.processing ? 'Signing in...' : 'Sign In' }}
      </button>

      <!-- Links -->
      <div class="flex justify-between text-sm">
        <Link
          href="/forgot-password"
          class="text-blue-600 hover:underline"
        >
          Forgot Password?
        </Link>
        <Link
          href="/register"
          class="text-blue-600 hover:underline"
        >
          Create Account
        </Link>
      </div>
    </form>
  </AuthLayout>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import AuthLayout from '@/Layouts/AuthLayout.vue';

const form = useForm({
  email: '',
  password: '',
  remember: false,
});

const errors = form.errors;

const submit = () => {
  form.post('/login');
};
</script>
```

---

## 🔄 Forgot Password Component

**File:** `resources/js/Pages/Auth/ForgotPassword.vue`

```vue
<template>
  <AuthLayout title="Reset Password">
    <div v-if="$page.props.auth.status" class="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
      {{ $page.props.auth.status }}
    </div>

    <form @submit.prevent="submit" class="space-y-4">
      <p class="text-sm text-gray-600 mb-4">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium mb-1">
          Email Address
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.email }"
          required
          autofocus
        />
        <p v-if="errors.email" class="text-red-500 text-sm mt-1">
          {{ errors.email[0] }}
        </p>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="form.processing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
      >
        {{ form.processing ? 'Sending...' : 'Send Reset Link' }}
      </button>

      <!-- Back Link -->
      <p class="text-center text-sm">
        <Link href="/login" class="text-blue-600 hover:underline">
          Back to Login
        </Link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import AuthLayout from '@/Layouts/AuthLayout.vue';

const form = useForm({
  email: '',
});

const errors = form.errors;

const submit = () => {
  form.post('/forgot-password');
};
</script>
```

---

## 🔑 Reset Password Component

**File:** `resources/js/Pages/Auth/ResetPassword.vue`

```vue
<template>
  <AuthLayout title="Reset Password">
    <form @submit.prevent="submit" class="space-y-4">
      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium mb-1">
          Email Address
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.email }"
          required
        />
        <p v-if="errors.email" class="text-red-500 text-sm mt-1">
          {{ errors.email[0] }}
        </p>
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="block text-sm font-medium mb-1">
          New Password
        </label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.password }"
          required
        />
        <p v-if="errors.password" class="text-red-500 text-sm mt-1">
          {{ errors.password[0] }}
        </p>
      </div>

      <!-- Password Confirmation -->
      <div>
        <label for="password_confirmation" class="block text-sm font-medium mb-1">
          Confirm Password
        </label>
        <input
          id="password_confirmation"
          v-model="form.password_confirmation"
          type="password"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="form.processing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
      >
        {{ form.processing ? 'Resetting...' : 'Reset Password' }}
      </button>

      <!-- Back Link -->
      <p class="text-center text-sm">
        <Link href="/login" class="text-blue-600 hover:underline">
          Back to Login
        </Link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import AuthLayout from '@/Layouts/AuthLayout.vue';

const props = defineProps({
  token: String,
});

const form = useForm({
  token: props.token,
  email: '',
  password: '',
  password_confirmation: '',
});

const errors = form.errors;

const submit = () => {
  form.post('/reset-password');
};
</script>
```

---

## ✉️ Verify Email Component

**File:** `resources/js/Pages/Auth/VerifyEmail.vue`

```vue
<template>
  <AuthLayout title="Verify Email">
    <div v-if="$page.props.auth.status" class="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
      {{ $page.props.auth.status }}
    </div>

    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Thank you for registering! Before getting started, we need you to verify
        your email address. A verification link has been sent to your inbox.
      </p>

      <p class="text-sm text-gray-600">
        If you didn't receive the email, we'll be happy to send you another.
      </p>

      <button
        @click="resend"
        :disabled="form.processing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
      >
        {{ form.processing ? 'Resending...' : 'Resend Verification Email' }}
      </button>

      <form @submit.prevent="logout" class="mt-4">
        <button
          type="submit"
          class="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
        >
          Logout
        </button>
      </form>
    </div>
  </AuthLayout>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';
import AuthLayout from '@/Layouts/AuthLayout.vue';

const form = useForm({});

const resend = () => {
  form.post('/email/resend');
};

const logout = () => {
  form.post('/logout');
};
</script>
```

---

## 👤 Profile Edit Component

**File:** `resources/js/Pages/Auth/Profile/Edit.vue`

```vue
<template>
  <div class="space-y-6">
    <!-- Profile Information -->
    <card>
      <template #header>
        <h3 class="text-lg font-medium">Profile Information</h3>
      </template>

      <form @submit.prevent="submitProfile" class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium mb-1">Name</label>
          <input
            v-model="profileForm.name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg"
            :class="{ 'border-red-500': profileForm.errors.name }"
          />
          <p v-if="profileForm.errors.name" class="text-red-500 text-sm mt-1">
            {{ profileForm.errors.name[0] }}
          </p>
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input
            v-model="profileForm.email"
            type="email"
            class="w-full px-4 py-2 border rounded-lg"
            :class="{ 'border-red-500': profileForm.errors.email }"
          />
          <p v-if="profileForm.errors.email" class="text-red-500 text-sm mt-1">
            {{ profileForm.errors.email[0] }}
          </p>
        </div>

        <!-- Phone -->
        <div>
          <label class="block text-sm font-medium mb-1">Phone</label>
          <input
            v-model="profileForm.phone"
            type="tel"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="profileForm.processing"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {{ profileForm.processing ? 'Saving...' : 'Save Changes' }}
        </button>
      </form>
    </card>

    <!-- Change Password -->
    <card>
      <template #header>
        <h3 class="text-lg font-medium">Change Password</h3>
      </template>

      <form @submit.prevent="submitPassword" class="space-y-4">
        <!-- Current Password -->
        <div>
          <label class="block text-sm font-medium mb-1">Current Password</label>
          <input
            v-model="passwordForm.current_password"
            type="password"
            class="w-full px-4 py-2 border rounded-lg"
            :class="{ 'border-red-500': passwordForm.errors.current_password }"
          />
          <p v-if="passwordForm.errors.current_password" class="text-red-500 text-sm mt-1">
            {{ passwordForm.errors.current_password[0] }}
          </p>
        </div>

        <!-- New Password -->
        <div>
          <label class="block text-sm font-medium mb-1">New Password</label>
          <input
            v-model="passwordForm.password"
            type="password"
            class="w-full px-4 py-2 border rounded-lg"
            :class="{ 'border-red-500': passwordForm.errors.password }"
          />
          <p v-if="passwordForm.errors.password" class="text-red-500 text-sm mt-1">
            {{ passwordForm.errors.password[0] }}
          </p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            v-model="passwordForm.password_confirmation"
            type="password"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="passwordForm.processing"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {{ passwordForm.processing ? 'Updating...' : 'Update Password' }}
        </button>
      </form>
    </card>

    <!-- Delete Account -->
    <card class="border-red-200 bg-red-50">
      <template #header>
        <h3 class="text-lg font-medium text-red-600">Delete Account</h3>
      </template>

      <p class="text-sm text-gray-600 mb-4">
        Permanently delete your account and all associated data.
      </p>

      <button
        @click="confirmDelete"
        class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
      >
        Delete Account
      </button>
    </card>
  </div>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';
import Card from '@/Components/Card.vue';

const props = defineProps({
  user: Object,
});

const profileForm = useForm({
  name: props.user.name,
  email: props.user.email,
  phone: props.user.phone || '',
});

const passwordForm = useForm({
  current_password: '',
  password: '',
  password_confirmation: '',
});

const submitProfile = () => {
  profileForm.put('/profile');
};

const submitPassword = () => {
  passwordForm.put('/password');
};

const confirmDelete = () => {
  if (confirm('Are you sure? This action cannot be undone.')) {
    useForm({}).delete('/profile');
  }
};
</script>
```

---

## 🎯 Auth Layout Component

**File:** `resources/js/Layouts/AuthLayout.vue`

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
    <div class="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <!-- Logo & Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">{{ title }}</h1>
        <p class="text-gray-600 text-sm mt-1">
          Copilot Orchestration Extension
        </p>
      </div>

      <!-- Content -->
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
});
</script>
```

---

## ✅ Summary

**Vue.js Components Created:**
- ✅ Register.vue (Registration form)
- ✅ Login.vue (Login form with remember me)
- ✅ ForgotPassword.vue (Password reset request)
- ✅ ResetPassword.vue (Password reset form)
- ✅ VerifyEmail.vue (Email verification)
- ✅ Profile/Edit.vue (Profile management & password change)
- ✅ AuthLayout.vue (Reusable auth layout)

**Status:** ✅ **COMPLETE**

*All components use Inertia.js + Vue 3 Composition API.*

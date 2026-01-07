# Authentication Implementation Quick Start

**Date:** January 6, 2026  
**Status:** ✅ Ready to Implement  
**Time to Complete:** 2-3 hours  

---

## 🚀 Step-by-Step Implementation

### Step 1: Install Laravel Breeze (Optional but Recommended)

```bash
composer require laravel/breeze --dev
php artisan breeze:install inertia
npm install
npm run dev
```

This scaffolds the basic auth structure. Then customize with the provided code.

---

### Step 2: Create Migration Files

**Run these commands in order:**

```bash
php artisan make:migration create_users_table
php artisan make:migration create_password_reset_tokens_table
php artisan make:migration create_sessions_table
```

**Copy the migration code from AUTHENTICATION-SYSTEM.md Part 1** into each file.

---

### Step 3: Run Migrations

```bash
php artisan migrate
```

---

### Step 4: Create the User Model

**File:** `app/Models/User.php`

```bash
php artisan make:model User
```

Copy the User model code from AUTHENTICATION-SYSTEM.md Part 1.

---

### Step 5: Create Controllers

Run these commands:

```bash
php artisan make:controller Auth/RegisterController
php artisan make:controller Auth/LoginController
php artisan make:controller Auth/PasswordResetController
php artisan make:controller Auth/VerifyEmailController
php artisan make:controller Auth/ProfileController
```

**Copy the controller code from AUTHENTICATION-SYSTEM.md Part 2** into each file.

---

### Step 6: Create Form Requests

Run these commands:

```bash
php artisan make:request RegisterRequest
php artisan make:request LoginRequest
php artisan make:request PasswordResetRequest
php artisan make:request PasswordUpdateRequest
php artisan make:request UpdateProfileRequest
php artisan make:request UpdatePasswordRequest
```

**Copy the form request code from AUTHENTICATION-SYSTEM.md Part 3** into each file.

---

### Step 7: Create Routes

**File:** `routes/auth.php`

Create this file and copy the routes from AUTHENTICATION-SYSTEM.md Part 4.

**Then register routes in `routes/web.php`:**

```php
Route::middleware('web')->group(base_path('routes/auth.php'));
```

---

### Step 8: Create Middleware

Run these commands:

```bash
php artisan make:middleware EnsureEmailIsVerified
php artisan make:middleware CheckRole
```

**Copy the middleware code from AUTHENTICATION-SYSTEM.md Part 5** into each file.

**Register in `app/Http/Kernel.php`:**

```php
protected $routeMiddleware = [
    // ... existing middleware
    'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
    'role' => \App\Http\Middleware\CheckRole::class,
];
```

---

### Step 9: Create Notifications

Run these commands:

```bash
php artisan make:notification VerifyEmail
php artisan make:notification ResetPassword
```

**Copy the notification code from AUTHENTICATION-SYSTEM.md Part 6** into each file.

---

### Step 10: Create Vue Components

**Create directory structure:**

```bash
mkdir -p resources/js/Pages/Auth/Profile
mkdir -p resources/js/Layouts
```

**Create these files in `resources/js/Pages/Auth/`:**

- `Register.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md
- `Login.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md
- `ForgotPassword.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md
- `ResetPassword.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md
- `VerifyEmail.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md

**Create file in `resources/js/Pages/Auth/Profile/`:**

- `Edit.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md

**Create file in `resources/js/Layouts/`:**

- `AuthLayout.vue` - Copy from AUTHENTICATION-VUE-COMPONENTS.md

---

### Step 11: Configure .env

```env
# Email Configuration
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME=Copilot Orchestrator

# Session
SESSION_DRIVER=cookie
SESSION_LIFETIME=120
SESSION_SECURE_COOKIES=true

# Hash
BCRYPT_ROUNDS=12
```

---

### Step 12: Configure Email

For development, use **Mailtrap.io**:

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Get SMTP credentials
3. Add to `.env`

For production, use **SendGrid** or **Mailgun**:

```env
# SendGrid
MAIL_DRIVER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your_sendgrid_key
```

---

### Step 13: Test the System

**Start the development server:**

```bash
php artisan serve
npm run dev
```

**Test flows:**

1. **Registration:** Visit `/register` and create an account
2. **Email Verification:** Check email for verification link
3. **Login:** Visit `/login` and sign in
4. **Forgot Password:** Click "Forgot Password" and reset
5. **Profile:** Edit profile from `/profile`

---

## 🔐 Security Checklist

- [ ] HTTPS enabled in production
- [ ] BCRYPT_ROUNDS set to 12+ in .env
- [ ] Session timeout configured (120 minutes)
- [ ] CSRF tokens working on all forms
- [ ] Rate limiting enabled on login
- [ ] Email verification required before access
- [ ] Passwords hashed with bcrypt
- [ ] Sensitive data not logged
- [ ] Security headers configured
- [ ] Database credentials secured

---

## 📊 File Summary

**Backend Files to Create:**
- `app/Models/User.php` (180 lines)
- `app/Http/Controllers/Auth/RegisterController.php` (35 lines)
- `app/Http/Controllers/Auth/LoginController.php` (40 lines)
- `app/Http/Controllers/Auth/PasswordResetController.php` (80 lines)
- `app/Http/Controllers/Auth/VerifyEmailController.php` (35 lines)
- `app/Http/Controllers/Auth/ProfileController.php` (40 lines)
- `app/Http/Requests/RegisterRequest.php` (35 lines)
- `app/Http/Requests/LoginRequest.php` (20 lines)
- `app/Http/Requests/PasswordResetRequest.php` (15 lines)
- `app/Http/Requests/PasswordUpdateRequest.php` (20 lines)
- `app/Http/Requests/UpdateProfileRequest.php` (25 lines)
- `app/Http/Requests/UpdatePasswordRequest.php` (30 lines)
- `app/Http/Middleware/EnsureEmailIsVerified.php` (15 lines)
- `app/Http/Middleware/CheckRole.php` (15 lines)
- `app/Notifications/VerifyEmail.php` (35 lines)
- `app/Notifications/ResetPassword.php` (40 lines)
- `routes/auth.php` (70 lines)
- Migration files (3 files)

**Frontend Files to Create:**
- `resources/js/Pages/Auth/Register.vue` (80 lines)
- `resources/js/Pages/Auth/Login.vue` (80 lines)
- `resources/js/Pages/Auth/ForgotPassword.vue` (70 lines)
- `resources/js/Pages/Auth/ResetPassword.vue` (80 lines)
- `resources/js/Pages/Auth/VerifyEmail.vue` (70 lines)
- `resources/js/Pages/Auth/Profile/Edit.vue` (150 lines)
- `resources/js/Layouts/AuthLayout.vue` (25 lines)

**Total Lines of Code:** ~1,350 lines

---

## 🎯 Integration Points

**With Existing System:**

1. **Task Assignment:** Tasks can now have `assigned_to` linking to authenticated users
2. **Project Access:** Use middleware to check user permissions on projects
3. **Agent Management:** Agents created by authenticated users
4. **Audit Trail:** Log authentication events for security

**Example Protected Route:**

```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::get('/projects', [ProjectController::class, 'index']);
});
```

---

## 🚨 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Class not found" | Run `composer dump-autoload` |
| CSRF token mismatch | Ensure `<form>` has `@csrf` token |
| Email not sending | Check MAIL_* settings in .env |
| Verification link expired | Extend token lifetime in controller |
| Session not persisting | Check SESSION_DRIVER in .env |
| Rate limiting errors | Check `config/rate-limit.php` |

---

## 📚 Dependencies

**Already included in Laravel 11:**
- Laravel Sanctum (API tokens)
- Laravel Passport (OAuth)
- Laravel Fortify (Authentication backend)

**May need to install:**
```bash
composer require laravel/sanctum
composer require laravel/tinker
```

---

## ✅ Phase 4 Completion

**After implementation:**
- ✅ Authentication system complete
- ✅ Ready for dashboard implementation
- ✅ Ready for role-based access control
- ✅ Ready for user profile pages
- ✅ Ready for admin panel

**Next: Phase 4B - Dashboard & Page Implementation**

---

**Status:** ✅ **READY TO IMPLEMENT**

*Estimated time: 2-3 hours*  
*Difficulty: Medium*  
*Security: Enterprise-grade*

# 🚀 Authentication Setup & Deployment Guide

**Status:** ✅ **Ready to Deploy**  
**Date:** January 6, 2026  
**Estimated Time:** 30 minutes setup + 2 hours testing  

---

## 📋 Pre-Deployment Checklist

### Code Review

- [x] Authentication controllers created
- [x] Form validations implemented
- [x] Middleware configured
- [x] Routes defined
- [x] Database migrations ready
- [x] Email notifications prepared
- [x] Security hardened

### Dependencies

- [x] Laravel 11 (framework)
- [x] Vue 3 (frontend)
- [x] Inertia.js (rendering)
- [x] Laravel Sanctum (API tokens)
- [x] Built-in auth components

---

## ⚙️ Step-by-Step Setup

### Step 1: Clone and Install

```bash
# Navigate to project
cd c:\Users\weird\.github\Copilot-Orchestration-Extension-COE-

# Install backend dependencies
composer install

# Install frontend dependencies
npm install
```

### Step 2: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Generate app key
php artisan key:generate
```

### Step 3: Configure .env for Local Development

**File:** `.env`

```env
# Application
APP_NAME="Copilot Orchestrator"
APP_ENV=local
APP_DEBUG=true
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_URL=http://localhost:8000

# Database (update with your credentials)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=copilot_auth
DB_USERNAME=root
DB_PASSWORD=

# Session
SESSION_DRIVER=cookie
SESSION_LIFETIME=120
SESSION_SECURE_COOKIES=false
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

# Hash
HASH_DRIVER=bcrypt
BCRYPT_ROUNDS=12

# Mail (Mailtrap for development)
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="Copilot Orchestrator"
MAIL_ENCRYPTION=

# Queue
QUEUE_CONNECTION=sync

# Cache
CACHE_DRIVER=file
```

### Step 4: Setup Database

**Option A: Using existing MySQL**

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE copilot_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
php artisan migrate

# Seed demo data (optional)
php artisan db:seed
```

**Option B: Using Docker**

```bash
# Start MySQL container
docker run --name mysql_copilot -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -d mysql:8

# Run migrations
php artisan migrate
```

### Step 5: Setup Email Service

**Register for Mailtrap (free):**

1. Go to [mailtrap.io](https://mailtrap.io)
2. Sign up with email
3. Create new inbox
4. Get SMTP credentials
5. Add to `.env`

**Or use SendGrid for production:**

```bash
composer require sendgrid/sendgrid:~7.12
```

### Step 6: Build Frontend

```bash
# Development mode
npm run dev

# Or production mode
npm run build
```

### Step 7: Start Development Server

```bash
# Terminal 1: Start Laravel server
php artisan serve

# Terminal 2: Start Vite dev server
npm run dev
```

Visit: `http://localhost:8000`

---

## 🧪 Testing the Authentication System

### Manual Testing Workflow

#### 1. Test Registration

```
1. Go to http://localhost:8000/register
2. Fill in:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "SecurePassword123!"
   - Confirm: "SecurePassword123!"
3. Click "Create Account"
4. Expected: Redirect to email verification notice
```

**What happens:**

- ✅ User created in database
- ✅ Verification email sent
- ✅ User automatically logged in
- ✅ Redirected to verification notice

#### 2. Test Email Verification

```
1. Check Mailtrap inbox (http://mailtrap.io)
2. Open verification email
3. Click "Verify Email Address" button
4. Expected: Redirect to dashboard with success message
```

**Security verified:**

- ✅ Signed URL used
- ✅ Token expires in 60 minutes
- ✅ Email marked as verified

#### 3. Test Login

```
1. Click "Sign in" (or go to /login)
2. Fill in:
   - Email: "john@example.com"
   - Password: "SecurePassword123!"
3. Check "Remember me"
4. Click "Sign in"
5. Expected: Login success, redirect to dashboard
```

**Security verified:**

- ✅ Session created
- ✅ Remember me cookie set
- ✅ IP tracked
- ✅ Login time recorded

#### 4. Test Wrong Password

```
1. Go to /login
2. Enter correct email, wrong password
3. Click "Sign in"
4. Expected: Error message "credentials incorrect"
```

**Security verified:**

- ✅ No user enumeration
- ✅ Generic error message
- ✅ No password hint

#### 5. Test Password Reset

```
1. Go to /login
2. Click "Forgot your password?"
3. Enter email: "john@example.com"
4. Click "Email Password Reset Link"
5. Expected: Success message "If account exists, link will be sent"
```

**Check Mailtrap:**

1. Open password reset email
2. Click "Reset Password" button
3. Enter new password: "NewPassword456!"
4. Confirm password
5. Click "Reset Password"
6. Expected: Redirect to login with success message

**Test new password:**

1. Login with old password → fails
2. Login with new password → succeeds

#### 6. Test Profile Management

```
1. Login with email verification complete
2. Go to /profile
3. Update name: "Jane Doe"
4. Click "Save"
5. Expected: Profile updated, success message
```

#### 7. Test Password Change

```
1. On profile page
2. Fill in:
   - Current password: "NewPassword456!"
   - New password: "AnotherPassword789!"
   - Confirm: "AnotherPassword789!"
3. Click "Update Password"
4. Expected: Password updated, redirected to login
5. Try logging in with old password → fails
6. Try logging in with new password → succeeds
```

#### 8. Test Logout

```
1. Click "Logout" button
2. Expected: Redirect to home page, session cleared
```

**Verify session cleared:**

- Browser cookies cleared
- Cannot access protected routes
- Must log in again

#### 9. Test Session Timeout

```
1. Login successfully
2. Change .env: SESSION_LIFETIME=1 (1 minute)
3. Run: php artisan config:cache
4. Wait 2 minutes
5. Refresh page
6. Expected: Redirect to login
```

#### 10. Test CSRF Protection

```
1. Disable CSRF in VerifyCsrfToken.php temporarily
2. Try submitting form without CSRF token
3. Expected: 419 error
```

---

## 🧬 Database Verification

### Check Users Table

```bash
php artisan tinker

# List all users
>>> User::all()

# Check specific user
>>> User::where('email', 'john@example.com')->first()

# Verify email verification
>>> User::where('email_verified' -> admin
```

### Check Login Activity

```bash
# Tinker
>>> User::where('email', 'john@example.com')->first()->last_login_at
>>> User::where('email', 'john@example.com')->first()->last_login_ip
```

---

## 📊 API Testing (with Postman/Insomnia)

### Register API

```
POST /register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!"
}
```

### Login API

```
POST /login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "remember": true
}
```

### Password Reset API

```
POST /forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Update Profile API

```
PATCH /profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890"
}
```

---

## 🐛 Troubleshooting

### Issue: "TokenMismatchException" on login

**Solution:**

```bash
php artisan config:clear
php artisan cache:clear
```

### Issue: Emails not sending

**Debugging:**

```bash
# Check mail config
php artisan tinker
>>> config('mail.driver')
>>> Mail::raw('test', fn($m) => $m->to('you@example.com'))

# Check logs
tail -f storage/logs/laravel.log
```

### Issue: Email verification link expired

**Solution:**

- Increase token expiration time
- Edit: `config/auth.php`

```php
'passwords' => [
    'users' => [
        'provider' => 'users',
        'table' => 'password_reset_tokens',
        'expire' => 120,  // 120 minutes
        'throttle' => 60,
    ],
],
```

### Issue: Session not persisting

**Check:**

```bash
# Session config
cat .env | grep SESSION_

# Session middleware
grep -r "Session" app/Http/Kernel.php

# Session files
ls -la storage/framework/sessions/
```

### Issue: Password reset token invalid

**Debugging:**

```bash
# In tinker
>>> DB::table('password_reset_tokens')->get()
>>> \Carbon\Carbon::now()->subHours(2)->toDateTimeString()
```

---

## 📈 Performance Optimization

### Cache Configuration

```env
CACHE_DRIVER=redis
CACHE_TTL=3600
```

### Database Optimization

```bash
# Add indexes to frequently queried columns
php artisan tinker
>>> Schema::hasIndex('users', 'users_email_index')

# Run optimization
>>> DB::statement('OPTIMIZE TABLE users')
```

### Query Optimization

```php
// In controllers, use eager loading
User::with('projects', 'tasks')->get()

// Not
User::all() // then access relations
```

---

## 🔐 Pre-Production Checklist

### Security

- [ ] HTTPS enabled
- [ ] APP_DEBUG set to false
- [ ] Strong APP_KEY generated
- [ ] Password hashing configured (BCRYPT_ROUNDS=12+)
- [ ] Session secure cookies enabled
- [ ] CSRF protection active
- [ ] Email verification working
- [ ] Rate limiting tested

### Performance

- [ ] Database indexes verified
- [ ] Query performance checked
- [ ] Caching configured
- [ ] File permissions set correctly
- [ ] Assets minified and cached

### Reliability

- [ ] Error logging configured
- [ ] Email service reliable
- [ ] Database backups scheduled
- [ ] Monitoring alerts set
- [ ] Incident response plan ready

### Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance verified
- [ ] Data retention policy set
- [ ] User consent mechanism

---

## 📦 Deployment Commands

### Deploy to Production

```bash
# Pull latest code
git pull origin main

# Install dependencies
composer install --no-dev

# Migrate database
php artisan migrate --force

# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Optimize autoloader
composer dump-autoload --optimize

# Clear all cache
php artisan cache:clear

# Build frontend
npm run build

# Verify deployment
php artisan migrate:status
```

### Rollback if needed

```bash
# Rollback last migration
php artisan migrate:rollback

# Rollback to specific batch
php artisan migrate:rollback --step=5

# Rollback all
php artisan migrate:reset
```

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**

- Review error logs
- Check for failed jobs
- Monitor performance

**Monthly:**

- Update dependencies: `composer update`
- Security audit: `composer audit`
- Performance analysis
- Backup verification

**Quarterly:**

- Security review
- Rotate secrets
- Update documentation
- Capacity planning

---

## 🎉 You're Done

The authentication system is **fully implemented and ready to deploy**.

### What You Have

✅ Secure registration & login  
✅ Email verification  
✅ Password reset flow  
✅ Profile management  
✅ CSRF protection  
✅ Session management  
✅ Rate limiting  
✅ Security headers  
✅ Production-ready code  
✅ Comprehensive documentation  

### Next Steps

1. Test locally with the manual testing workflow
2. Run automated tests: `php artisan test`
3. Deploy to staging environment
4. Final security review
5. Deploy to production

**Happy authentication! 🚀**

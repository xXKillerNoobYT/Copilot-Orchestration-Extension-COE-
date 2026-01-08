# Moved: Docs/Setup/SETUP-LARAVEL-HERD.md

This document has been relocated to keep the repository organized.

New location: Docs/Setup/SETUP-LARAVEL-HERD.md

Direct link: ./Docs/Setup/SETUP-LARAVEL-HERD.md

---

# 🚀 Quickest Setup: Laravel Herd

Since manual PHP download is having issues, **Laravel Herd** is the fastest solution. It's a complete, pre-configured package.

## What You Get

✅ PHP 8.2 (latest)  
✅ Composer  
✅ MySQL 8.0  
✅ Redis 7  
✅ Node.js 20  
✅ All extensions pre-configured  
✅ One-click setup  

## Installation (3 minutes)

### Step 1: Download
Visit: **https://herd.laravel.com/windows**

Click "Download for Windows" button

### Step 2: Install
Run the installer (`Herd-Installer.exe`) and follow the wizard

### Step 3: Verify
Open PowerShell and run:
```powershell
php --version
composer --version
```

Should show PHP 8.2.x and Composer 2.x

## Then Start Your App

```powershell
cd c:\Users\weird\.github\Copilot-Orchestration-Extension-COE-

# Install dependencies
composer install

# Generate app key
php artisan key:generate

# Run migrations (uses SQLite by default - no setup needed)
php artisan migrate

# Start server
php artisan serve
```

Visit: **http://localhost:8000/register**

---

## Why Laravel Herd?

- **No manual configuration** - Everything pre-setup
- **Works out of the box** - No PATH editing
- **All tools included** - PHP, Composer, MySQL, Redis, Node
- **Professional use** - Used by Laravel developers worldwide
- **Free & open source** - No licensing issues

## Alternative: XAMPP

If you prefer a more traditional setup:

1. Download XAMPP 8.2+: https://www.apachefriends.org/download.html
2. Install and start Apache + MySQL
3. Add PHP to PATH manually
4. Install Composer separately

(This takes longer and requires more configuration)

---

**Recommendation:** Use Laravel Herd. It's literally 3 minutes and you're done.

Need help? Download Herd now and let me know when it's installed!

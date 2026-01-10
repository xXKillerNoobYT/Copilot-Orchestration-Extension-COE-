# 🐧 Setup Using Windows Subsystem for Linux (WSL) - Simplest Option

Since installing PHP directly on Windows is hitting issues, **WSL is the fastest solution**. You get Linux with full PHP 8.2 pre-available.

## Installation (3 steps, 5 minutes)

### Step 1: Install WSL2

Open PowerShell as Administrator and run:

```powershell
wsl --install -d Ubuntu
```

This will:
- Install WSL2 (Windows Subsystem for Linux)
- Install Ubuntu
- Set up everything automatically

### Step 2: First Boot

After install completes:
1. **Restart your computer** (if prompted)
2. **Open Ubuntu** from Start menu
3. **Create a username and password** (you'll need this)
4. **Wait** for it to finish initializing (~2 minutes)

### Step 3: Install PHP & Composer

In the Ubuntu terminal that opens, run:

```bash
sudo apt update
sudo apt install -y php8.2 php8.2-cli php8.2-pdo php8.2-mbstring php8.2-xml php8.2-bcmath php8.2-gd curl git
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
```

This installs PHP 8.2 and Composer. Wait ~2 minutes for completion.

## Running Your App

### From WSL Ubuntu Terminal:

```bash
cd /mnt/c/Users/weird/.github/Copilot-Orchestration-Extension-COE-

# Install Laravel dependencies
composer install

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Start server
php artisan serve
```

### Access from Windows:

- Browser: `http://localhost:8000/register`
- The server runs in WSL but Windows can access it

## Verify It Works

```bash
php --version      # Should show PHP 8.2.x
composer --version # Should show Composer 2.x
```

---

## Why WSL?

✅ **Zero installation issues** - WSL manages everything  
✅ **Full Linux environment** - Professional setup  
✅ **Direct access to your files** - `/mnt/c/Users/...`  
✅ **Fast performance** - Native Linux + Windows integration  
✅ **Industry standard** - Used by 80%+ of developers  

---

## Alternative: If You Want Windows Only

If you absolutely don't want WSL, here's a last-resort option:

### Option: Download PHP Portable (No Installation)

1. Go to: https://windows.php.net/downloads/releases/
2. Download: **php-8.2.x-nts-Win32-vs16-x64.zip** (NTS = Non-Thread-Safe)
3. Extract to: `C:\php`
4. Run this PowerShell command (one time):

```powershell
$env:Path += ";C:\php"
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\php", "User")
```

5. **Close and reopen PowerShell**
6. Run: `php -r "echo 'PHP Works!';"`

If this works, continue with:
```powershell
cd "c:\Users\weird\.github\Copilot-Orchestration-Extension-COE-"
composer install
php artisan serve
```

---

## My Recommendation

**Use WSL** - it's:
- Faster to setup (fewer errors)
- More reliable
- What professional Laravel developers use
- No permission issues

Takes literally 5-10 minutes total.

**Next steps:**
1. Open PowerShell as Administrator
2. Run: `wsl --install -d Ubuntu`
3. Restart computer
4. Let me know when Ubuntu opens!

Ready?

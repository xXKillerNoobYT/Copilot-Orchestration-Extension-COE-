# Development Environment Setup Guide

**Last Updated**: 2026-01-10  
**Status**: ACTIVE  
**For**: Copilot Orchestration Extension COE

---

## 🚀 Quick Setup (5 minutes)

If you already have PHP, Node.js, and a database installed:

```bash
# Clone and enter project
cd /path/to/COE

# Install dependencies
composer install
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Database setup
php artisan migrate
php artisan db:seed

# Start development servers
php artisan serve          # Terminal 1 (Port 8000)
npm run dev               # Terminal 2 (Port 5173)
```

✅ **Done!** Visit http://localhost:5173

---

## 📋 Detailed Setup Instructions

### Prerequisites

#### Required Software
- **PHP**: 8.1, 8.2, or 8.3
- **Composer**: Latest version
- **Node.js**: 16+ or 18+
- **Database**: PostgreSQL 13+ or MySQL 8+

#### Recommended
- **VS Code**: With Laravel & Vue extensions
- **Docker**: For consistent environments (optional)

---

## 🔧 Installation by Operating System

### Windows

#### Option 1: Using Herd (Recommended)
```bash
# 1. Download Herd from https://herd.laravel.com
# 2. Install (includes PHP, database, Composer)
# 3. Clone project into ~/Herd folder
# 4. cd to project folder

# Continue with "Common Setup" below
```

**Herd Advantages**:
- ✅ One-click setup
- ✅ Includes PHP, database, Composer
- ✅ Better file watching
- ✅ Faster than manual setup

**Setup Reference**: See `Docs/Setup/SETUP-LARAVEL-HERD.md`

#### Option 2: Manual Setup
```bash
# 1. Install PHP
#    Download from https://www.php.net/downloads
#    or use: choco install php

# 2. Install Composer
#    Download from https://getcomposer.org

# 3. Install Node.js
#    Download from https://nodejs.org
#    Choose LTS version

# 4. Install database (choose one)
#    PostgreSQL: https://www.postgresql.org/download/windows/
#    MySQL: https://dev.mysql.com/downloads/mysql/

# Continue with "Common Setup" below
```

#### Option 3: WSL2 + Ubuntu
For better Linux-style development:

```bash
# 1. Enable WSL2 on Windows
# 2. Install Ubuntu from Microsoft Store
# 3. Follow "Linux/macOS" instructions below
```

**Setup Reference**: See `Docs/Setup/SETUP-WSL-UBUNTU.md`

---

### Linux / macOS

#### Using Homebrew (Recommended for macOS)
```bash
# Install PHP
brew install php@8.2
brew install composer

# Install Node.js
brew install node

# Install database
brew install postgresql  # or mysql
brew services start postgresql
```

#### Using Package Manager (Linux)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install php8.2 php8.2-cli php8.2-mbstring php8.2-xml php8.2-pgsql
sudo apt install composer node npm
sudo apt install postgresql postgresql-contrib

# Start database
sudo systemctl start postgresql
```

---

## 🛠️ Common Setup (All Platforms)

Once you have PHP, Node.js, Composer, and database installed:

```bash
# 1. Navigate to project
cd /path/to/copilot-orchestration-extension

# 2. Install PHP dependencies
composer install

# 3. Install Node dependencies
npm install

# 4. Create environment file
cp .env.example .env

# 5. Generate app key
php artisan key:generate

# 6. Create database
#    For PostgreSQL:
createdb copilot_orchestration
#    For MySQL:
mysql -u root -p -e "CREATE DATABASE copilot_orchestration;"

# 7. Configure database in .env
#    Edit .env and update:
#    DB_CONNECTION=pgsql (or mysql)
#    DB_DATABASE=copilot_orchestration
#    DB_USERNAME=postgres (or root)
#    DB_PASSWORD=your_password

# 8. Run migrations
php artisan migrate

# 9. Seed database (optional)
php artisan db:seed
```

---

## ▶️ Running the Application

### Start Both Servers (Recommended)

**Terminal 1: Start Laravel API Server**
```bash
php artisan serve

# Output should show:
# Local:  http://127.0.0.1:8000
```

**Terminal 2: Start Vite Dev Server**
```bash
npm run dev

# Output should show:
# ➜  Local:   http://localhost:5173/
```

**Then visit**: http://localhost:5173 in your browser

### Alternative: Run with Docker

```bash
# Build and start containers
docker-compose up -d

# Run migrations
docker-compose exec app php artisan migrate

# Visit: http://localhost
```

---

## 🗂️ Project Structure Overview

```
copilot-orchestration-extension/
├── app/                      # Laravel application code
│   ├── Http/Controllers/      # Request handlers
│   ├── Models/                # Database models
│   ├── Services/              # Business logic
│   └── Repositories/          # Data access layer
│
├── database/
│   ├── migrations/            # Database schemas
│   ├── seeders/               # Seed data
│   └── factories/             # Test data factories
│
├── resources/
│   ├── js/
│   │   ├── App.vue            # Root Vue component
│   │   ├── components/        # Vue components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── stores/            # Pinia stores (state)
│   └── css/
│       └── app.css            # Tailwind imports
│
├── routes/
│   ├── web.php                # Web routes
│   └── api.php                # API routes
│
├── tests/
│   ├── Feature/               # Integration tests
│   └── Unit/                  # Unit tests
│
├── vscode-extension/          # VS Code extension code
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind config
├── phpunit.xml                # PHPUnit config
├── composer.json              # PHP dependencies
├── package.json               # Node dependencies
└── .env.example               # Environment template
```

---

## 🔑 Environment Configuration (.env)

### Essential Settings

```env
APP_NAME="Copilot Orchestration"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=pgsql          # or mysql
DB_HOST=127.0.0.1
DB_PORT=5432                 # or 3306 for MySQL
DB_DATABASE=copilot_orchestration
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Queue
QUEUE_CONNECTION=sync        # Use 'sync' for development

# Cache
CACHE_DRIVER=file

# Session
SESSION_DRIVER=file
```

### Optional: Email Testing
```env
MAIL_MAILER=log              # Log emails to console in dev
# or use Mailtrap for real testing
```

---

## 📊 Database Setup

### PostgreSQL Setup

```bash
# Create user
sudo -u postgres createuser --createdb --pwprompt YOUR_USERNAME

# Create database
createdb -U YOUR_USERNAME copilot_orchestration

# Connect and verify
psql -U YOUR_USERNAME -d copilot_orchestration -c "\dt"
```

### MySQL Setup

```bash
# Connect to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE copilot_orchestration;
CREATE USER 'copilot'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON copilot_orchestration.* TO 'copilot'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Run Migrations

```bash
# Create tables from migrations
php artisan migrate

# Populate with seed data (optional)
php artisan db:seed

# Check migrations status
php artisan migrate:status
```

---

## 🧪 Testing Setup

### Run Tests

```bash
# All tests
./vendor/bin/phpunit

# Specific test file
./vendor/bin/phpunit tests/Feature/DesignColorTest.php

# With coverage report
./vendor/bin/phpunit --coverage-html coverage/

# Watch for changes
./vendor/bin/phpunit --watch
```

### Vue Component Tests

```bash
# Install testing dependencies (if not already)
npm install --save-dev vitest @vitest/ui @vue/test-utils

# Run tests
npm run test

# With coverage
npm run test -- --coverage
```

---

## 🔍 Verification Checklist

After setup, verify everything works:

- [ ] `php artisan serve` runs without errors
- [ ] `npm run dev` compiles without errors
- [ ] Visit http://localhost:5173 → app loads
- [ ] Migrations completed: `php artisan migrate:status`
- [ ] Database has tables: `php artisan tinker` then `App\Models\Task::all()`
- [ ] API responds: `curl http://localhost:8000/api/health`

### If Something Fails

```bash
# Clear cache
php artisan cache:clear
php artisan config:clear

# Regenerate
php artisan config:cache
composer dump-autoload

# Check PHP/Node versions
php --version
node --version

# Reinstall dependencies
rm composer.lock && composer install
rm package-lock.json && npm install
```

---

## 🆚 Comparing Setup Options

| Option | Difficulty | Setup Time | Performance | Best For |
|--------|------------|-----------|-------------|----------|
| Herd (Windows) | ⭐ Easy | 5 min | ⭐⭐⭐⭐⭐ | Windows developers |
| Manual (Windows) | ⭐⭐⭐ Medium | 30 min | ⭐⭐⭐⭐ | Custom setup |
| WSL2 + Ubuntu | ⭐⭐ Easy | 15 min | ⭐⭐⭐⭐⭐ | Linux-like environment |
| Homebrew (Mac) | ⭐⭐ Easy | 15 min | ⭐⭐⭐⭐⭐ | Mac developers |
| Docker | ⭐⭐ Easy | 10 min | ⭐⭐⭐ | Consistent environments |

---

## 🚨 Common Issues & Fixes

### "PHP not found"
```bash
# Add PHP to PATH (Windows)
# Or use full path: /usr/local/opt/php@8.2/bin/php

# Check PHP location
which php      # macOS/Linux
where php      # Windows
```

### "Composer not found"
```bash
# Install or add to PATH
# Verify: composer --version
```

### "npm ERR! peer dep missing"
```bash
npm install --legacy-peer-deps
```

### "SQLSTATE[HY000]: General error"
```bash
# Database not running or wrong credentials in .env
# Check DB connection:
php artisan tinker
\DB::connection()->getPdo();
```

### "Port 8000 already in use"
```bash
# Use different port
php artisan serve --port=8001
```

### "Vite can't resolve module"
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## 📚 Additional Setup Guides

For specific setup scenarios, see:

- **Herd Setup**: `Docs/Setup/SETUP-LARAVEL-HERD.md`
- **WSL2/Ubuntu Setup**: `Docs/Setup/SETUP-WSL-UBUNTU.md`
- **Docker Setup**: `Docs/Setup/DOCKER-SETUP.md`
- **PHP Issues**: `Docs/Setup/PHP-SETUP-SOLUTIONS.md`
- **Database Schema**: `Docs/Database/schema-guide.md`

---

## 🎯 Next Steps After Setup

1. ✅ Complete this setup
2. 📖 Read `Docs/Plan/detailed project description`
3. 📋 Review `Docs/Plan/feature list`
4. 🚀 Check current tasks in `Docs/Plan/todo`
5. 💻 Start with first development task

---

## 💬 Getting Help

- **Questions about setup?** Check the "Common Issues" section above
- **Database problems?** See setup guides for your platform
- **Node/npm issues?** Try: `npm cache clean --force && npm install`
- **Still stuck?** Check `Docs/` folder for additional guides

---

**Status**: Setup guide complete  
**Last Updated**: 2026-01-10  
**Ready to develop!** ✨

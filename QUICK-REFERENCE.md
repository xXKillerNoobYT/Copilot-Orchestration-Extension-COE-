# 🚀 Quick Reference Card - Copilot Orchestration Extension

**Print This** | **Bookmark This** | **Share This**

---

## 📍 Start Anywhere

### New to the Project?
```
1. Read:   MASTER-INDEX.md
2. Read:   Docs/Plan/detailed project description
3. Setup:  Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md
4. Build:  Docs/Implementation/VISUAL-DESIGN-SYSTEM-EDITOR.md
```

### Need to Get Started Now?
```bash
cd /project/path
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve          # Terminal 1
npm run dev               # Terminal 2
# Visit: http://localhost:5173
```

### Want to Understand the System?
```
Read:    Docs/Plan/detailed project description (15 min)
Check:   Docs/Plan/feature list (10 min)
Review:  .github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md (20 min)
```

---

## 🎯 Key Documents (One-Liners)

| Document | Purpose |
|----------|---------|
| **MASTER-INDEX.md** | This → Central navigation hub |
| **Docs/Plan/detailed project description** | Why we're building this |
| **Docs/Plan/feature list** | What we're building |
| **Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md** | How to setup locally |
| **Docs/Implementation/VISUAL-DESIGN-SYSTEM-EDITOR.md** | What to build next (73 tasks) |
| **.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md** | How agents work |
| **Docs/Plan/todo** | Current task queue |
| **Docs/Sessions/** | What we completed |

---

## 💻 Essential Commands

### Laravel Backend
```bash
php artisan serve              # Start server (port 8000)
php artisan migrate            # Run migrations
php artisan tinker             # Interactive shell
./vendor/bin/phpunit           # Run tests
php artisan cache:clear        # Clear cache
php artisan make:model Name    # Create model
php artisan make:controller Api/NameController
php artisan make:migration create_table_name
```

### Vue/Vite Frontend
```bash
npm run dev                    # Start dev server (port 5173)
npm run build                  # Build for production
npm run lint                   # Check code style
npm install                    # Install dependencies
npm install --legacy-peer-deps # If peer deps fail
```

### Testing
```bash
./vendor/bin/phpunit                    # All tests
./vendor/bin/phpunit tests/Feature/     # Feature tests
./vendor/bin/phpunit tests/Unit/        # Unit tests
./vendor/bin/phpunit --coverage-html coverage/
npm run test                            # Vue tests
```

### Database
```bash
php artisan migrate            # Run all migrations
php artisan migrate:reset      # Clear & rebuild
php artisan migrate:status     # Check status
php artisan db:seed            # Seed test data
php artisan tinker             # Interactive DB access
```

---

## 🔑 Key File Locations

### Configuration
```
.env                          Environment settings
.env.example                  Environment template
composer.json                 PHP dependencies
package.json                  JS dependencies
vite.config.js                Build config
tailwind.config.js            CSS config
phpunit.xml                   Test config
```

### Code Structure
```
app/Models/                   Database models
app/Http/Controllers/         Request handlers
app/Services/                 Business logic
app/Repositories/             Data access
resources/js/components/      Vue components
resources/js/pages/           Page components
routes/api.php                API endpoints
routes/web.php                Web routes
tests/Feature/                Integration tests
tests/Unit/                   Unit tests
```

### Project Management
```
_ZENTASKS/                    Task storage (source of truth)
Docs/Plan/                    Planning documents
Docs/Implementation/          Technical guides
Docs/Setup/                   Setup guides
Docs/Sessions/                Session records
```

---

## 🎨 Current Feature: Visual Design System Editor

### What's Being Built
- ✅ Color management (picker, palette, contrast)
- ✅ Typography system (fonts, sizes, weights)
- ✅ Spacing system (scale, grid, sizing)
- ✅ Component library (editor, variants, preview)
- ✅ Design tokens export (CSS, JSON, SCSS, JS, Tailwind)

### How Many Tasks
**73 microtasks** across **8 task groups**  
**Estimated**: 20-25 hours of development

### Task Groups
1. Foundation & Setup (4 tasks, 2-3 hrs)
2. Color Management (5 tasks, 3-4 hrs)
3. Typography (3 tasks, 2-3 hrs)
4. Spacing (3 tasks, 1-2 hrs)
5. Components (5 tasks, 4-5 hrs)
6. Export (6 tasks, 2-3 hrs)
7. UI & Polish (4 tasks, 2-3 hrs)
8. Testing & Docs (4 tasks, 2-3 hrs)

### First Task to Do
**TASK-001**: Create database migrations (30-45 min)
- Create 7 migration files
- Run migrations
- Verify tables exist

---

## 🤖 Agent Workflows

### Auto Zen (Autonomous Executor)
```
1. Read context → understand plan
2. Get next task → from queue
3. Mark in_progress
4. Implement + Test
5. Mark done
6. Observe issues → create follow-ups
7. Repeat
```

### Zen Planner (Task Architect)
```
1. Get requirements
2. Break into microtasks (15-45 min each)
3. Map dependencies
4. Set priorities
5. Create tasks
```

### Testing Agent (QA)
```
1. Get completed code
2. Write comprehensive tests
3. Check coverage (85%+ target)
4. Create test tasks for gaps
5. Report results
```

---

## ✅ Definition of Done

A task is done when:
- [ ] Code written and working
- [ ] Tests passing (85%+ coverage)
- [ ] No lint/type errors
- [ ] Documentation updated
- [ ] Changes committed
- [ ] Session file created in `Docs/Sessions/`

---

## 🔗 Critical Cross-References

```
Project Vision      → Docs/Plan/detailed project description
Feature Status      → Docs/Plan/feature list
Setup Help          → Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md
Development Plan    → Docs/Implementation/VISUAL-DESIGN-SYSTEM-EDITOR.md
Agent Behavior      → .github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md
Current Tasks       → Docs/Plan/todo or _ZENTASKS/tasks.json
Completed Work      → Docs/Sessions/
Navigation Guide    → MASTER-INDEX.md (this folder) or Docs/README.md
```

---

## 🚨 Quick Troubleshooting

### "Port 8000 in use"
```bash
php artisan serve --port=8001
```

### "Database connection error"
```bash
# Check .env settings match your database
# Verify database exists
# Verify MySQL/PostgreSQL is running
php artisan migrate:reset && php artisan migrate
```

### "npm install fails"
```bash
npm install --legacy-peer-deps
```

### "PHP not found"
```bash
# Add to PATH or use full path
# Check: which php (Mac/Linux) or where php (Windows)
```

### "Vite won't build"
```bash
rm -rf node_modules/.vite
npm run dev
```

### "Tests failing"
```bash
./vendor/bin/phpunit --verbose
# Check test error messages
# Review changes that broke tests
```

---

## 📊 Metrics to Track

**Code Quality**:
- Test coverage: 85%+ (target)
- No lint errors: ✅ Required
- No type errors: ✅ Required

**Delivery**:
- Tests passing: ✅ Required
- Documentation complete: ✅ Required
- Session recorded: ✅ Required

**Progress**:
- Tasks completed: Track in todo
- Files changed: Document in sessions
- Issues discovered: Create follow-up tasks

---

## 🎯 Daily Workflow

### Morning (Start of Day)
1. ☕ Read MASTER-INDEX.md (5 min)
2. 📋 Check `Docs/Plan/todo` for assigned tasks (5 min)
3. 📖 Read task implementation guide (10 min)
4. 💻 Setup environment (if needed) (15 min)

### During Day (Development)
1. 🚀 Execute first task: implement + test
2. 📝 Create session file as you go
3. 🧪 Run tests after each change
4. 📊 Track what you change
5. 🔍 Observe for issues → create follow-up tasks

### End of Day (Close Out)
1. ✅ Mark task completed
2. 📋 Update session file
3. 💾 Commit changes with message
4. 🎯 Document next task to pick

---

## 📱 Quick Links (Bookmarks)

```
Home             → MASTER-INDEX.md
Plan             → Docs/Plan/detailed project description
Features         → Docs/Plan/feature list
Setup            → Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md
Development      → Docs/Implementation/VISUAL-DESIGN-SYSTEM-EDITOR.md
Agents           → .github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md
Tasks            → Docs/Plan/todo
Sessions         → Docs/Sessions/
Navigation       → Docs/README.md
Troubleshooting  → Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md#common-issues
```

---

## 🎓 Tech Stack at a Glance

| Layer | Technology | Config |
|-------|-----------|--------|
| **Frontend** | Vue 3 + Vite | `vite.config.js` |
| **Styling** | Tailwind CSS | `tailwind.config.js` |
| **Backend** | Laravel 10 + PHP 8.1+ | `composer.json` |
| **Database** | PostgreSQL or MySQL | `.env` |
| **Testing** | PHPUnit + Vue Test Utils | `phpunit.xml` |
| **Type Safety** | TypeScript | `tsconfig.json` |

---

## 🚀 Fastest Way to Get Started

```bash
# 1. Clone/enter project
cd /path/to/project

# 2. Copy env & generate key
cp .env.example .env
php artisan key:generate

# 3. Install & setup database
composer install
npm install
php artisan migrate

# 4. Start servers
php artisan serve &          # Background
npm run dev                  # Foreground

# 5. Open browser
# Visit: http://localhost:5173
```

**Time**: ~10 minutes (if dependencies pre-installed)

---

## ☑️ Pre-Task Checklist

Before starting any task:
- [ ] Read `Docs/Plan/detailed project description`
- [ ] Read task details in implementation guide
- [ ] Read previous related task completions (if any)
- [ ] Check dependencies are complete
- [ ] Setup local environment
- [ ] Understand acceptance criteria
- [ ] Plan testing approach

---

## ☑️ Post-Task Checklist

After completing any task:
- [ ] Code written and tested
- [ ] All tests passing
- [ ] No lint/type errors
- [ ] Documentation updated
- [ ] Changes committed
- [ ] Session file created/updated
- [ ] Follow-up tasks created (if discovered issues)

---

## 📞 Emergency Contacts (Docs)

**Can't find something?**  
→ Check `MASTER-INDEX.md` or `Docs/README.md`

**Setup broken?**  
→ See `Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md` → Common Issues

**Don't know what to build?**  
→ Read `Docs/Implementation/VISUAL-DESIGN-SYSTEM-EDITOR.md`

**Lost on where things go?**  
→ Review project structure in `Docs/Setup/DEVELOPMENT-ENVIRONMENT-SETUP.md`

**Unsure how to work?**  
→ Read `.github/COPILOT-INSTRUCTIONS-CONSOLIDATED.md`

---

**Status**: ✅ Ready to Build  
**Version**: 2026-01-10  
**Print Frequency**: Keep at desk  
**Update Frequency**: Monthly or as needed

**Happy building!** 🚀✨

# Copilot Orchestration Extension (COE)

[![CI - Tests & Quality Gates](https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/actions/workflows/ci.yml/badge.svg)](https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/actions/workflows/ci.yml)
[![CodeQL](https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/actions/workflows/codeql.yml/badge.svg)](https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-/actions/workflows/codeql.yml)
[![PRD Validated](https://img.shields.io/badge/PRD-validated-brightgreen)](./PRD.md)
[![Coverage](https://img.shields.io/badge/coverage-96.8%25-brightgreen)](./coverage)

**Version**: 2.0.0 | **Status**: Beta (52% Complete) | **Launch**: Feb 15, 2026

AI-powered project planning and task management VS Code extension with multi-agent orchestration.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **PHP** 8.2+
- **Composer** 2.x
- **VS Code** 1.80+

### Installation

```bash
# 1. Clone repository
git clone https://github.com/xXKillerNoobYT/Copilot-Orchestration-Extension-COE-.git
cd Copilot-Orchestration-Extension-COE-

# 2. Install dependencies
composer install
npm install
cd vscode-extension && npm install
cd ../context-manager && npm install
cd ..

# 3. Setup environment
cp .env.example .env
php artisan key:generate

# 4. Build
npm run build
cd vscode-extension && npm run compile
```

### Run Development Server

```bash
# Laravel API
php artisan serve  # http://localhost:8000

# Vite dev server (frontend)
npm run dev  # http://localhost:5173

# VS Code Extension: Press F5 in VS Code to launch Extension Development Host
```

### Run Tests

```bash
# Laravel tests
php artisan test

# Jest tests (root)
npm test

# Context-manager tests
cd context-manager && npm test

# VS Code extension tests
cd vscode-extension && npm run test:jest
```

---

## 📖 What is COE?

COE transforms software project planning through:

1. **Interactive 10-Question Design Workflow** - Capture requirements visually
2. **AI-Powered Task Decomposition** - Automatically break down complex tasks
3. **Multi-Agent Orchestration** - 4 specialized teams (Planning, Answer, Decomposition, Verification)
4. **Visual Verification System** - Interactive UI testing with design system integration
5. **GitHub Issues Bi-Directional Sync** - Single source of truth

### Key Features (56 total)

- ✅ **Planning** (F001-F007): Interactive plan builder, dependency graphs, templates
- ✅ **Task Management** (F008-F015): Lifecycle automation, priority queue, context bundling
- 🔄 **Agent Teams** (F016-F021): Multi-agent coordination with MCP protocol
- 🔄 **Execution** (F022-F027): MCP server, visual verification, real-time events
- ✅ **Integration** (F028-F031): GitHub sync, exports, CI/CD hooks
- 🔄 **Collaboration** (F032-F033): Human-in-loop, PR review responses
- 🔄 **UX** (F034-F035): VS Code extension UI, plugin architecture
- 📅 **AI Teams Stage 1** (F036-F038): Boss AI, context limiting, basic routing
- 📅 **AI Teams Stage 2** (F039-F047): LangGraph, AutoGen, agent evolution
- 📅 **AI Teams Stage 3** (F048-F056): Custom limits, RL rewards, drift detection

**Legend**: ✅ Complete | 🔄 In Progress | 📅 Planned

---

## 📚 Documentation

- **[PRD.md](PRD.md)** - Product Requirements Document (human-readable)
- **[PRD.json](PRD.json)** - Machine-readable specifications (56 features)
- **[Docs/Plans/CONSOLIDATED-MASTER-PLAN.md](Docs/Plans/CONSOLIDATED-MASTER-PLAN.md)** - Complete project plan
- **[Docs/PROJECT-RUNBOOK.md](Docs/PROJECT-RUNBOOK.md)** - Operational procedures
- **[Docs/GITHUB-ISSUES-PLAN.md](Docs/GITHUB-ISSUES-PLAN.md)** - Current sprint tasks
- **[QUICK_START.md](QUICK_START.md)** - Build session guide

### Architecture Deep Dive

- **[Docs/Plans/COE-Master-Plan/01-Architecture-Document.md](Docs/Plans/COE-Master-Plan/01-Architecture-Document.md)** - System architecture
- **[Docs/Plans/COE-Master-Plan/02-Agent-Role-Definitions.md](Docs/Plans/COE-Master-Plan/02-Agent-Role-Definitions.md)** - Agent specifications
- **[Docs/Plans/COE-Master-Plan/05-MCP-API-Reference.md](Docs/Plans/COE-Master-Plan/05-MCP-API-Reference.md)** - MCP API contracts

---

## 🏗️ Project Structure

```
├── app/                        # Laravel backend
│   ├── Http/Controllers/Api/   # API endpoints (v1)
│   ├── Models/                 # Eloquent models
│   └── Services/               # Business logic
├── vscode-extension/           # VS Code extension
│   ├── src/
│   │   ├── panels/             # UI panels (Settings, Verification, etc.)
│   │   ├── orchestration/      # Multi-agent coordination
│   │   ├── routing/            # Task routing logic
│   │   └── mcp-server/         # MCP server implementation
│   └── tests/
├── context-manager/            # Context bundling library
│   ├── src/
│   │   ├── context-limiter.ts  # Token limiting (F037)
│   │   └── tokenizer.ts        # Token estimation
│   └── tests/
├── resources/js/               # Vue 3 frontend
│   └── Components/
├── Docs/                       # Documentation
│   ├── Plans/                  # Master plans
│   └── Current-Status/         # Live status files
└── tests/                      # Laravel tests
```

---

## 🎯 Current Sprint (Week 1-2)

**Target**: Issue #1-3 completion by Jan 21, 2026

- ✅ **Issue #1**: Fix critical blockers (COMPLETED)
- 🔄 **Issue #2**: Live preview system (IN PROGRESS)
- 📅 **Issue #3**: Plan decomposition engine (QUEUED)

**Progress**: 52% complete | **Days to Launch**: 25

---

## 🧪 Testing

**Coverage**: 96.8% (392/405 tests passing)

```bash
# Run all test suites
npm run test:all

# Individual suites
php artisan test                      # Laravel (PHP)
npm test                              # Root Jest
cd context-manager && npm test        # Context manager
cd vscode-extension && npm run test:jest  # Extension
```

**Test Philosophy**:
- ✅ Passing tests are expected
- ❌ Failing tests are PROBLEMS (must fix)
- ⏭️ Skipped tests are PROBLEMS (must document with timeline)
- 🎯 Target: >80% coverage for new code

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Branch Strategy**: See [Docs/BranchingStrategy.md](Docs/BranchingStrategy.md)

---

## 📊 Success Metrics

- **User Adoption**: 80% within 3 months
- **Planning Time Reduction**: 50%
- **First-Time Task Completion**: 85%
- **AI Autonomous Execution**: 70%
- **GitHub Sync Accuracy**: 99%

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **GitHub Copilot** - AI assistance framework
- **Laravel** - Backend framework
- **Vue 3** - Frontend framework
- **VS Code Extension API** - Extension platform

---

**For detailed implementation instructions, see [PRD.md](PRD.md) and [Docs/Plans/](Docs/Plans/)**

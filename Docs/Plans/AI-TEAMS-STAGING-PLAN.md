# AI Teams Implementation - Staged Rollout Plan
**Version**: 3.6 Integration  
**Date**: January 20, 2026  
**Status**: Staged for Development  
**Source**: AI Teams Documentation v2.2-3.6

---

## 📋 Overview

This document outlines the staged implementation of the comprehensive AI Teams system, broken into 3 progressive stages based on priority and dependencies. Each stage builds on the previous, moving from core functionality needed to get the extension working to advanced features and fine-tuning.

---

## 🎯 Stage 1: Core Functionality (Get Extension Working)
**Timeline**: Weeks 1-3 (Jan 20 - Feb 10, 2026)  
**Priority**: CRITICAL - Required for MVP  
**Goal**: Establish basic multi-agent orchestration with essential coordination

### Features (Stage 1)

#### 1.1 Boss AI Team - Basic Coordination (F036)
- **Description**: Top-level supervisor for agent coordination
- **Core Capabilities**:
  - Task routing to appropriate teams
  - Basic metrics aggregation (tasks routed, completion rate)
  - Simple conflict detection (plan vs. execution drift)
  - Team status monitoring
- **Implementation**:
  - Location: `vscode-extension/src/agents/BossAgent.ts`
  - Tools: `getSystemStatus`, `routeTask`, `resolveBasicConflict`
  - Config: `boss-team.yaml` (basic settings only)
- **Dependencies**: None (foundation layer)
- **Estimated Effort**: 2-3 weeks

#### 1.2 Multi-Agent Orchestration - 4 Core Teams (Enhanced F016)
- **Description**: Extend existing 4 teams with proper coordination
- **Teams**:
  - **Programming Orchestrator**: Routes tasks, monitors health, aggregates metrics
  - **Planning Team**: Generates plans, estimates effort
  - **Answer Team**: Context-aware Q&A with plan/code
  - **Verification Team**: Automated tests + visual verification
- **Enhancements**:
  - Strict team boundaries (no cross-role execution)
  - AutoGen-based communication for handoffs
  - Basic LangGraph workflow (linear: Planning → Coding → Verification)
- **Implementation**:
  - Extend existing agent files in `vscode-extension/src/agents/`
  - Add AutoGen message passing
  - Simple LangGraph state machine
- **Dependencies**: F016 (existing), Boss AI (F036)
- **Estimated Effort**: 2 weeks

#### 1.3 Context Limiting - Basic Overflow Prevention (F037)
- **Description**: Prevent token overflows with simple limits
- **Core Capabilities**:
  - Global context limit (default: 5,000 tokens)
  - Minimum floor (3,500 tokens) enforced
  - Basic summarization when nearing limit (>80%)
  - Auto-recovery on overflow (fresh start with handover summary)
- **Implementation**:
  - `src/utils/contextLimiter.ts`
  - Simple token estimation (char length / 4)
  - Basic summarize strategy only
- **Dependencies**: Context Bundle Builder (F010)
- **Estimated Effort**: 1 week

#### 1.4 MCP Tools Integration (Enhanced F022)
- **Description**: Ensure all 6 tools work with Boss AI
- **Enhancements**:
  - Boss-aware routing for all tool calls
  - Event streaming to Boss for oversight
  - Enhanced error handling with Boss escalation
- **Implementation**:
  - Update existing MCP server tools
  - Add Boss notification hooks
- **Dependencies**: Boss AI (F036), MCP Server (F022)
- **Estimated Effort**: 1 week

#### 1.5 Basic Task Routing Algorithm (F038)
- **Description**: Simple rules-based routing
- **Algorithm**:
  - `if estimatedHours > 1` → Task Decomposition
  - `if status = 'done'` → Verification
  - `if hasQuestion` → Answer Team
  - Default → Planning Team
- **Implementation**:
  - `src/agents/BossAgent.ts` (routing logic)
- **Dependencies**: Boss AI (F036)
- **Estimated Effort**: 3 days

### Stage 1 Deliverables
- ✅ Boss AI coordinating all 4 teams
- ✅ Basic multi-agent workflow (linear)
- ✅ Context overflow prevention working
- ✅ MCP tools integrated with Boss
- ✅ Simple task routing functional
- ✅ Test coverage: 80%+ for new code
- ✅ Ready for Stage 2 features

### Stage 1 Acceptance Criteria
- [ ] Boss AI successfully routes 100% of test tasks
- [ ] All 4 teams receive tasks and report status
- [ ] Context limiting prevents overflows in 95% of cases
- [ ] MCP tools report to Boss without errors
- [ ] Task routing follows algorithm correctly
- [ ] No TypeScript compilation errors
- [ ] 80%+ test coverage for Stage 1 code

---

## 🚀 Stage 2: Advanced Features (Everything Else)
**Timeline**: Weeks 4-6 (Feb 11 - Mar 3, 2026)  
**Priority**: HIGH - Enhanced capabilities  
**Goal**: Add advanced orchestration, evolution, and intelligence

### Features (Stage 2)

#### 2.1 LangGraph Integration - Advanced Workflows (F039)
- **Description**: Graph-based orchestration for complex flows
- **Core Capabilities**:
  - Conditional edges (e.g., drift > 0.2 → Verification)
  - Loops for retries/reviews
  - State persistence (checkpoints)
  - Supervisor pattern (Boss oversees sub-graphs)
- **Implementation**:
  - `src/agents/langGraph/` folder
  - Graph definitions for each team
  - State management layer
- **Dependencies**: Stage 1 Boss AI
- **Estimated Effort**: 2 weeks

#### 2.2 AutoGen Framework - Agent Communication (F040)
- **Description**: Conversational multi-agent system
- **Core Capabilities**:
  - Group chats for team collaboration
  - Human-in-loop for escalations
  - Message compression for 14B models
  - Tool chaining (agents call MCP tools)
- **Implementation**:
  - `src/agents/autoGen/` folder
  - Chat managers for each team
  - Integration with LangGraph nodes
- **Dependencies**: Stage 1 multi-agent orchestration
- **Estimated Effort**: 2 weeks

#### 2.3 Loop Detection & Recovery (F041)
- **Description**: Prevent infinite loops or stalled issues
- **Detection Methods**:
  - LangGraph cycle detection (>3 repeats)
  - AutoGen chat pattern matching (similarity >0.8)
  - Metrics-based (no progress in 5 cycles)
- **Resolution**:
  - Auto-break loop (escalate to Researcher/Boss)
  - Sidebar alert ("Loop detected—researching fix")
  - RL training on loop-free paths
- **Implementation**:
  - `src/agents/loopDetector.ts`
  - Integration with Boss AI
- **Dependencies**: LangGraph, AutoGen
- **Estimated Effort**: 1 week

#### 2.4 Agent Evolution - UV Tasks & Updating Tool (F042)
- **Description**: Self-improving agents via template updates
- **Core Capabilities**:
  - Critic detects patterns (e.g., "Linting misses >3")
  - UV (Update Verification) tasks generated
  - Updating Tool (`updateTemplate` MCP tool)
  - YAML-only changes (no code breaking)
- **Implementation**:
  - `src/agents/UpdateVerificationTask.ts`
  - `src/mcpTools/updateTemplate.ts`
  - Template versioning system
- **Dependencies**: Critic Team (F044)
- **Estimated Effort**: 2 weeks

#### 2.5 Advanced Context Breaking Strategies (F043)
- **Description**: Multiple strategies for context management
- **Strategies**:
  - Summarize Old (temporal compression)
  - Prioritize Recent (relevance pruning)
  - Content-Type Chunking (code vs. text)
  - Discard Low-Relevance (aggressive pruning)
  - Hybrid (chain strategies)
- **Implementation**:
  - `src/utils/contextBreaker/` folder
  - Strategy classes for each method
  - Orchestrator to chain strategies
- **Dependencies**: Stage 1 context limiting
- **Estimated Effort**: 2 weeks

#### 2.6 Researcher Team Agent (F044)
- **Description**: Problem-solver via documentation scraping
- **Core Capabilities**:
  - Triggered by ambiguities/issues/loops
  - Web search + browse_page for docs
  - Feeds solutions to Coding AI prompts
- **Triggers**:
  - Answer Team asks
  - Planning Team detects gaps
  - User manual request
  - Auto (loops >3)
- **Implementation**:
  - `src/agents/ResearcherAgent.ts`
  - Integration with AutoGen chats
- **Dependencies**: AutoGen, Loop Detection
- **Estimated Effort**: 1.5 weeks

#### 2.7 Critic Team Agent (F045)
- **Description**: Improvement & rating specialist
- **Core Capabilities**:
  - Reviews all outputs (plans, code, docs)
  - Rates other agents (1-10 scale)
  - Suggests improvements
  - Feeds RL training
- **Implementation**:
  - `src/agents/CriticAgent.ts`
  - Rating system with metrics logging
- **Dependencies**: Stage 1 agents operational
- **Estimated Effort**: 1 week

#### 2.8 Scraper Team Agent (F046)
- **Description**: Document & communication verifier
- **Core Capabilities**:
  - Scrapes Coding AI outputs
  - Verifies on-task status
  - Checks proper communication
- **Implementation**:
  - `src/agents/ScraperAgent.ts`
  - File Tree integration
- **Dependencies**: Verification Team
- **Estimated Effort**: 1 week

#### 2.9 Updater Agent (F047)
- **Description**: Cleanup and organization
- **Core Capabilities**:
  - Deletes junk files (post-use)
  - Organizes docs into folders
  - Resolves conflicts (merges duplicates)
- **Implementation**:
  - `src/agents/UpdaterAgent.ts` (sub-agent under Boss)
  - File Tree hooks
- **Dependencies**: Boss AI
- **Estimated Effort**: 1 week

### Stage 2 Deliverables
- ✅ LangGraph workflows for all teams
- ✅ AutoGen communication layer active
- ✅ Loop detection preventing stalls
- ✅ Agent evolution via UV tasks
- ✅ Advanced context breaking strategies
- ✅ Researcher, Critic, Scraper, Updater teams operational
- ✅ Test coverage: 80%+ for new code
- ✅ Ready for Stage 3 fine-tuning

### Stage 2 Acceptance Criteria
- [ ] LangGraph handles complex workflows (conditional branches, loops)
- [ ] AutoGen group chats enable team collaboration
- [ ] Loop detection breaks infinite cycles
- [ ] Agents evolve via template updates (3+ examples)
- [ ] Context breaking reduces overflows to <5%
- [ ] All 8 agent teams operational and coordinated
- [ ] No TypeScript compilation errors
- [ ] 80%+ test coverage for Stage 2 code

---

## 🔬 Stage 3: Fine Details & Optimization
**Timeline**: Weeks 7-8 (Mar 4 - Mar 17, 2026)  
**Priority**: MEDIUM - Polish & performance  
**Goal**: Optimize, fine-tune, and perfect the system

### Features (Stage 3)

#### 3.1 Customizable Context Limiting per LLM (F048)
- **Description**: Per-LLM and per-agent limits with user settings
- **Core Capabilities**:
  - Configurable limits (e.g., local 14B: 3,500; cloud Grok: 8,000)
  - User-specified minimum (e.g., 3,500 floor)
  - "Follow Default" checkbox for each LLM type
  - Per-agent overrides (e.g., Verification: 4,000)
- **Implementation**:
  - UI: Sidebar settings panel
  - Config: `context_config.yaml` per agent
  - LLM detection via API metadata
- **Dependencies**: Stage 1 context limiting
- **Estimated Effort**: 1 week

#### 3.2 Token Estimator with Tiktoken (F049)
- **Description**: Accurate token counting for all strategies
- **Core Capabilities**:
  - Tiktoken JS integration (for GPT-like models)
  - Fallback: HuggingFace tokenizers (for custom 14B)
  - Batch optimization (cache encodings)
- **Implementation**:
  - `src/utils/tokenEstimator.ts`
  - Replace placeholder `estimateTokens` in all strategies
- **Dependencies**: Stage 2 context breaking
- **Estimated Effort**: 1 week

#### 3.3 Embedding Service for Relevance Scoring (F050)
- **Description**: Semantic similarity for context pruning
- **Core Capabilities**:
  - MiniLM (sentence-transformers) for fast embeddings
  - Cosine similarity for relevance scores
  - Batch embeddings (optimize for large contexts)
  - Fallback: GloVe (static vectors if MiniLM slow)
- **Implementation**:
  - `src/utils/embeddingService.ts`
  - Integration into Prioritize Recent strategy
- **Dependencies**: Stage 2 context breaking
- **Estimated Effort**: 1.5 weeks

#### 3.4 RL Reward System for Breaking Outcomes (F051)
- **Description**: Reinforcement learning for strategy optimization
- **Core Capabilities**:
  - Reward function (positive for success, negative for recovery)
  - Dataset generation (JSONL for fine-tuning)
  - Metrics: coherence delta, tokens reduced, priority preserved
- **Implementation**:
  - `src/agents/rlRewardLogger.ts`
  - Integration with Boss AI for training data
- **Dependencies**: Stage 2 context breaking
- **Estimated Effort**: 1 week

#### 3.5 User-Defined Prioritization (F052)
- **Description**: Custom priorities for modular projects
- **Core Capabilities**:
  - Priority assignment during planning (P1-3)
  - Examples: To Do List (P1) vs. Calendar (P3)
  - Auto-sequencing (P1 tasks first)
  - Breaking strategies respect priorities
- **Implementation**:
  - UI: Planning Wizard priority dropdowns
  - Integration: Task queue sorting by priority
- **Dependencies**: Stage 1 task routing
- **Estimated Effort**: 1 week

#### 3.6 Plan Drift Detection & Enforcement (F053)
- **Description**: Real-time monitoring with user decisions
- **Core Capabilities**:
  - Detect deviations (code diffs vs. plan)
  - Boss evaluates impact
  - User modal: "Keep change or eradicate?"
  - Auto-log enforcements
- **Implementation**:
  - `src/agents/planDriftDetector.ts`
  - File Tree integration
  - Boss AI decision flow
- **Dependencies**: Boss AI, File Tree Tracker
- **Estimated Effort**: 1.5 weeks

#### 3.7 PRD Auto-Generation (F054)
- **Description**: Boss AI generates/updates PRD automatically
- **Core Capabilities**:
  - Syncs PRD on plan changes
  - RL-fine-tuned for accuracy
  - Markdown/JSON formats
  - Version bump on drift
- **Implementation**:
  - `src/agents/prdGenerator.ts`
  - Integration with Boss AI
  - Template: `PRD.ipynb` logic
- **Dependencies**: Boss AI
- **Estimated Effort**: 1 week

#### 3.8 Comprehensive Test Suite for Overflow Sims (F055)
- **Description**: End-to-end testing for context management
- **Core Capabilities**:
  - Generate 10k+ token contexts
  - Apply strategy chains
  - Verify coherence (>0.85 similarity)
  - Performance benchmarks (<2s for 50 units)
- **Implementation**:
  - `tests/context/` folder
  - Jest test suites
  - Sim generators with faker.js
- **Dependencies**: All context features
- **Estimated Effort**: 1 week

#### 3.9 Sidebar UI Feedback for Context Breaking (F056)
- **Description**: Real-time progress during breaking
- **Core Capabilities**:
  - Progress bar (blue/green/orange/red)
  - Status messages (e.g., "Summarizing old context...")
  - Priority badge (P1: To Do List)
  - Details collapsible (token counts, strategies used)
- **Implementation**:
  - Webview: `src/panels/ContextStatusPanel.vue`
  - WebSocket updates from breaker
- **Dependencies**: Stage 2 context breaking
- **Estimated Effort**: 1 week

### Stage 3 Deliverables
- ✅ Per-LLM context limits user-configurable
- ✅ Accurate token counting with tiktoken
- ✅ Semantic relevance scoring with embeddings
- ✅ RL reward system training agents
- ✅ User-defined priorities functional
- ✅ Plan drift detection preventing deviations
- ✅ PRD auto-generation on changes
- ✅ Comprehensive test suite (90%+ coverage)
- ✅ Polished UI for context feedback
- ✅ System ready for production

### Stage 3 Acceptance Criteria
- [ ] Context limits customizable per LLM (5+ types supported)
- [ ] Token estimation within 5% accuracy
- [ ] Embedding relevance scores improve coherence by 15%+
- [ ] RL rewards feed training datasets (100+ samples)
- [ ] User-defined priorities correctly sequence tasks
- [ ] Plan drift caught in 95%+ of cases
- [ ] PRD auto-updates on all plan changes
- [ ] Test suite covers 90%+ of context code
- [ ] UI feedback displays in <500ms
- [ ] No TypeScript compilation errors

---

## 📊 Feature Summary by Stage

| Stage | Features | Estimated Effort | Priority | Dependencies |
|-------|----------|------------------|----------|---------------|
| **Stage 1** | 5 features (F036-F038) | 6-8 weeks | CRITICAL | None (foundation) |
| **Stage 2** | 9 features (F039-F047) | 10-12 weeks | HIGH | Stage 1 complete |
| **Stage 3** | 9 features (F048-F056) | 8-10 weeks | MEDIUM | Stages 1-2 complete |
| **Total** | **23 features** | **24-30 weeks** | - | Sequential |

---

## 🗓️ Timeline & Milestones

### Overall Timeline
- **Start**: January 20, 2026
- **Stage 1 Complete**: February 10, 2026 (3 weeks)
- **Stage 2 Complete**: March 3, 2026 (6 weeks)
- **Stage 3 Complete**: March 17, 2026 (8 weeks)
- **Total**: ~8 weeks for all stages

### Key Milestones
- **Week 3**: Stage 1 MVP - Basic multi-agent system working
- **Week 6**: Stage 2 MVP - Advanced features operational
- **Week 8**: Production-ready - All fine-tuning complete

---

## ✅ Quality Gates (All Stages)

### Code Quality
- [ ] TypeScript compilation: 0 errors
- [ ] Test coverage: 80%+ per stage (90%+ Stage 3)
- [ ] Lint/format: ESLint + Prettier passing
- [ ] No console errors/warnings in production

### Documentation
- [ ] All features documented in master plan
- [ ] PRD updated with new features
- [ ] Agent YAML profiles versioned
- [ ] User guides for each stage

### Testing
- [ ] Unit tests: 80%+ coverage
- [ ] Integration tests: All critical paths
- [ ] E2E tests: Full workflows
- [ ] Performance benchmarks: <500ms latency

### User Experience
- [ ] Sidebar UI responsive (<500ms)
- [ ] Context breaking transparent to user
- [ ] Error messages actionable
- [ ] Help documentation available

---

## 🚧 Risk Mitigation

### Stage 1 Risks
- **Risk**: Boss AI routing fails
  - **Mitigation**: Comprehensive routing tests (20+ scenarios)
- **Risk**: Context limits too restrictive
  - **Mitigation**: Start with generous limits (5,000), tune down

### Stage 2 Risks
- **Risk**: LangGraph/AutoGen integration complex
  - **Mitigation**: Prototype with simple workflows first
- **Risk**: Loop detection false positives
  - **Mitigation**: Configurable thresholds (default: 3 repeats)

### Stage 3 Risks
- **Risk**: Token estimator inaccurate for custom models
  - **Mitigation**: Fallback to simple char-based (length/4)
- **Risk**: Embedding service latency high
  - **Mitigation**: Batch embeddings, use GloVe fallback

---

## 📝 Notes for Implementation

1. **Sequential Staging**: Each stage depends on the previous. Do not start Stage 2 before Stage 1 is complete and tested.

2. **Test-Driven**: Write tests for each feature before implementation. Target 80%+ coverage per stage.

3. **PRD Sync**: Update PRD.json after each stage completes. Regenerate PRD.md for human review.

4. **User Feedback**: Conduct user testing after Stage 1 and Stage 2. Incorporate feedback before proceeding.

5. **Performance Benchmarks**: Measure latency after each stage. Context breaking must stay <500ms; UI updates <300ms.

6. **Agent Evolution**: Start collecting UV task data in Stage 2. Use for RL training in Stage 3.

7. **Documentation First**: Update master plan and copilot instructions before coding each feature.

---

**End of AI Teams Staging Plan**

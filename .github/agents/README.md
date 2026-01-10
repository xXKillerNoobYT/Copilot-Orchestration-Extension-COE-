# Agent Profiles Directory

## Welcome to the Copilot Orchestration Extension Multi-Agent System

This directory contains the complete configuration for the 6-agent orchestration system that coordinates all aspects of the COE development lifecycle.

---

## 📋 Agent Files

### 1. **Auto Zen** — Autonomous Code Executor
📄 `Auto Zen.agent.md`

**Role**: Implements tasks in continuous autonomous loop  
**Specialty**: Code implementation, testing, follow-up task creation  
**Use When**: Ready to execute tasks, need autonomous work loop  

**Invocation**: `@Auto Zen start` or `@Auto Zen continue`

---

### 2. **Zen Planner** — Strategic Architect
📄 `Zen Planner.agent.md`

**Role**: Breaks requirements into structured task hierarchies  
**Specialty**: Requirement analysis, dependency mapping, priority assignment  
**Use When**: Have requirements, need task breakdown, planning work  

**Invocation**: `@Zen Planner analyze [requirements]`

---

### 3. **Plan Agent** — System Designer
📄 `Plan Agent.agent.md`

**Role**: Designs system structures and enforces architectural patterns  
**Specialty**: Architecture design, pattern enforcement, constraint validation  
**Use When**: Need architectural decisions, validating design, enforcing constraints  

**Invocation**: `@Plan Agent design [system aspect]`

---

### 4. **Testing Agent** — Quality Assurance Specialist
📄 `Testing Agent.agent.md`

**Role**: Generates tests, validates coverage, enforces quality gates  
**Specialty**: Test generation, coverage analysis, quality validation  
**Use When**: Need comprehensive testing, coverage verification, quality gates  

**Invocation**: `@Testing Agent generate tests for [component]`

---

### 5. **Dependency Agent** — Package Manager
📄 `Dependency Agent.agent.md`

**Role**: Monitors versions, detects security vulnerabilities, manages updates  
**Specialty**: Dependency tracking, vulnerability scanning, version management  
**Use When**: Need dependency updates, security scanning, drift detection  

**Invocation**: `@Dependency Agent scan`

---

### 6. **Issue Handler** — GitHub Coordinator
📄 `Issue Handler.agent.md`

**Role**: Syncs GitHub issues with internal tasks, manages issue lifecycle  
**Specialty**: GitHub integration, issue-to-task conversion, status synchronization  
**Use When**: Processing GitHub issues, converting to tasks, syncing status  

**Invocation**: `@Issue Handler check issues`

---

## 📚 Orchestration Guides

Located in `.github/` directory:

### **AGENT-ORCHESTRATION-GUIDE.md**
Comprehensive guide to how all 6 agents work together:
- Complete 6-phase workflow
- Detailed collaboration patterns
- Handoff protocols with examples
- Cross-repo issue handling
- Error recovery procedures

**Start here to understand**: How agents coordinate with each other

---

### **AGENT-CONFIGURATION-INDEX.md**
Quick reference for all agents:
- Agent-by-agent profiles
- When to use each agent
- Tool availability matrix
- Invocation cheat sheet
- Decision matrix for choosing agents
- Metrics and monitoring

**Start here for**: Quick lookup and quick reference

---

## 🚀 Quick Start

### For New Users
1. **Read**: `.github/AGENT-CONFIGURATION-INDEX.md` (5 minutes)
2. **Understand**: Which agent for your task
3. **Invoke**: Use `@AgentName` command with right parameters

### For Understanding the System
1. **Read**: `.github/AGENT-ORCHESTRATION-GUIDE.md` (10 minutes)
2. **Review**: Master workflow and collaboration patterns
3. **Follow**: Handoff protocols when implementing

### For Deep Dive
1. **Read**: Individual agent `.agent.md` files
2. **Review**: Each agent's capabilities and responsibilities
3. **Study**: Collaboration patterns with other agents

---

## 📊 Agent Capability Matrix

| Capability               | Zen Planner | Plan Agent | Auto Zen | Testing Agent | Dependency Agent | Issue Handler |
|--------------------------|:-----------:|:----------:|:--------:|:-------------:|:----------------:|:-------------:|
| Break requirements       | ✅          | -          | -        | -             | -                | -             |
| Design architecture      | -          | ✅         | -        | -             | -                | -             |
| Write code               | -          | -          | ✅       | -             | -                | -             |
| Generate tests           | -          | -          | -        | ✅            | -                | -             |
| Update dependencies      | -          | -          | -        | -             | ✅                | -             |
| Sync GitHub              | -          | -          | -        | -             | -                | ✅             |
| Validate quality         | -          | -          | -        | ✅            | -                | -             |
| Enforce constraints      | -          | ✅         | -        | -             | -                | -             |
| Create follow-ups        | ✅        | ✅         | ✅       | ✅            | ✅                | ✅             |
---

## 🔄 Common Workflows

### "I have requirements"
```
You → Zen Planner (analyze requirements)
→ Plan Agent (architecture review)
→ Zen Planner (create task tree)
→ Task list ready in _ZENTASKS/
```

### "I want implementation"
```
Zen Planner → Auto Zen (execute tasks)
→ Testing Agent (validate coverage)
→ Auto Zen (fix any issues)
→ Task marked complete
```

### "GitHub issue needs work"
```
Issue Handler (process issue)
→ Zen Planner (create tasks)
→ Auto Zen (implement)
→ Testing Agent (validate)
→ Issue Handler (close issue)
```

### "Need to update dependencies"
```
Dependency Agent (scan)
→ Reports vulnerabilities/updates
→ Auto Zen (apply updates)
→ Testing Agent (validate)
→ Dependency Agent (verify)
```

---

## 📞 Agent Invocation Quick Reference

```
# Planning & Orchestration
@Zen Planner analyze [raw requirements]
@Zen Planner breakdown [task-id]
@Zen Planner roadmap

# Architecture & Design
@Plan Agent design [system aspect]
@Plan Agent validate
@Plan Agent decision [challenge]

# Implementation & Execution
@Auto Zen start
@Auto Zen continue
@Auto Zen execute [task-id]

# Testing & Quality
@Testing Agent generate tests for [component]
@Testing Agent run tests
@Testing Agent coverage report
@Testing Agent fix failing test

# Dependencies & Security
@Dependency Agent scan
@Dependency Agent security
@Dependency Agent update [package]
@Dependency Agent tree

# GitHub & Issues
@Issue Handler check issues
@Issue Handler sync [issue-number]
@Issue Handler status [issue-number]
@Issue Handler close [issue-number]
```

---

## 📈 Monitoring & Status

Each agent provides status in format:
```
Agent: [Name]
Status: [Brief status]
Active: [Count] tasks
Completed: [Count] tasks
Blocked: [Count] issues
Next: [Upcoming work]
```

Check agent status in:
- `_ZENTASKS/tasks.json` - Task database
- Agent-specific reports and metrics
- GitHub issues linked to tasks

---

## 🔧 Configuration

### Enable/Disable Agents
All agents enabled by default. To adjust:
```
@Zen Planner plan only (don't execute)
@Plan Agent validate but don't refactor
@Auto Zen pause (human review needed)
@Testing Agent report only (no auto-fixes)
```

### Agent Tool Access
All agents have access to:
- Zen Tasks (manage tasks)
- GitHub API (issues, PRs)
- Memory (persistent state)
- Mermaid (diagramming)
- Web search

Plus specialized tools for their domain.

---

## 📚 Full Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Agent profiles | Individual agent configuration | This directory |
| Orchestration guide | How agents collaborate | `.github/` |
| Configuration index | Quick reference | `.github/` |
| Completion report | Phase 2 summary | Root directory |

---

## ❓ FAQs

**Q: Which agent should I use?**
A: Read `.github/AGENT-CONFIGURATION-INDEX.md` for decision matrix

**Q: How do agents communicate?**
A: Read `.github/AGENT-ORCHESTRATION-GUIDE.md` for handoff protocols

**Q: What if an agent fails?**
A: Mark task as blocked, create investigation task, escalate if needed

**Q: Can I customize agent behavior?**
A: Future versions will support configuration. Currently fixed behavior.

**Q: How do I track progress?**
A: Check `_ZENTASKS/tasks.json` and agent status reports

---

## 🎯 System Principles

1. **Specialization**: Each agent excels at its role
2. **Collaboration**: Agents work seamlessly together
3. **Quality**: Enforced throughout with gates and validation
4. **Observation**: Continuous improvement through follow-up tasks
5. **Automation**: Agents operate autonomously within their scope
6. **Traceability**: All work linked to source issues and tasks
7. **Documentation**: Comprehensive guides and references
8. **Continuity**: Handoff protocols ensure smooth transitions

---

## 🚀 Next Steps

1. **For immediate use**: `@Zen Planner analyze [your requirements]`
2. **For understanding**: Read `.github/AGENT-ORCHESTRATION-GUIDE.md`
3. **For reference**: Keep `.github/AGENT-CONFIGURATION-INDEX.md` handy
4. **For deep dive**: Review individual agent `.agent.md` files

---

## 📖 Additional Resources

- **Architecture**: See `Docs/Plan/detailed project description`
- **Features**: See `Docs/Plan/feature list` (35 features)
- **Code**: See `Docs/Plan/code master.ipynb` (Section 11 for MCP)
- **Instructions**: See `.github/copilot-instructions.md`

---

**Last Updated**: January 2026  
**System Status**: ✅ Production Ready  
**Next Phase**: Phase 3 (MCP Server Implementation)

---

*"Six specialized agents, seamlessly coordinated, delivering exceptional software through clear collaboration, continuous validation, and relentless improvement."*

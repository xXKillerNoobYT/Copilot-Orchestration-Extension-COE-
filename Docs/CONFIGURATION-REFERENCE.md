# Configuration Reference
**Complete guide to `copilot-orchestrator.*` settings**  
**Version:** 1.0  
**Last Updated:** January 16, 2026

---

## Overview

All COE configuration settings are namespaced under `copilot-orchestrator`. Settings can be configured in three scopes (listed by precedence):

1. **Workspace** (`.vscode/settings.json` in project root) - highest priority
2. **User** (`~/Library/Application Support/Code/User/settings.json` or equivalent)
3. **Application** (extension defaults)

Environment variables can override any setting by prefixing with `COPILOT_`.

---

## LLM Configuration

### copilot-orchestrator.llm.baseUrl
| Property | Value |
|----------|-------|
| **Type** | string (URL) |
| **Default** | `http://localhost:1234/v1` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_LLM_BASE_URL` |
| **Valid Examples** | `http://localhost:1234/v1`, `http://192.168.1.100:1234/v1`, `https://api.openai.com/v1` |
| **Invalid Examples** | `192.168.1.100:1234` (missing protocol), `https://localhost:1234` (HTTPS for local), `http://169.254.1.1:1234` (APIPA) |

**Purpose:** Base URL for LLM provider API (typically LM Studio, Ollama, or OpenAI)

**Accepted Formats:**
- `http://` for local/private servers (LM Studio, Ollama)
- `https://` for remote/public servers (OpenAI, other cloud providers)
- Port required (no default inference)

**Validation Rules:**
- Must start with `http://` or `https://`
- Port must be numeric (1024-65535)
- Cannot use APIPA range (169.254.x.x)
- HTTP not recommended for public IPs (use HTTPS)
- HTTPS not recommended for localhost (unnecessary overhead)

**Configuration Examples:**

**Example 1: Local LM Studio**
```json
{
  "copilot-orchestrator.llm.baseUrl": "http://localhost:1234/v1"
}
```

**Example 2: LM Studio on Different Machine**
```json
{
  "copilot-orchestrator.llm.baseUrl": "http://192.168.1.105:1234/v1"
}
```

**Example 3: OpenAI API**
```json
{
  "copilot-orchestrator.llm.baseUrl": "https://api.openai.com/v1"
}
```

**Troubleshooting:**
- ❌ **"LLM service unreachable"** → Check if IP is accessible from your network
- ❌ **"Protocol mismatch"** → Ensure HTTPS for remote, HTTP for local
- ❌ **"APIPA address detected"** → Address shows 169.254.x.x (DHCP failure); use static IP

---

### copilot-orchestrator.llm.apiKey
| Property | Value |
|----------|-------|
| **Type** | string (secret) |
| **Default** | (none - required if using OpenAI/cloud providers) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_LLM_API_KEY` |
| **Required For** | OpenAI, Azure OpenAI, other cloud LLM providers |

**Purpose:** API key for authentication with LLM provider (if needed)

**Security Note:**
- ⚠️ **Never commit API keys to git**
- Store in User scope (not Workspace scope)
- Or use environment variable: `export COPILOT_LLM_API_KEY=sk-...`
- Or use `.env` file with `dotenv` loader

**Configuration:**
```json
{
  "copilot-orchestrator.llm.apiKey": "sk-proj-..."
}
```

---

### copilot-orchestrator.llm.model
| Property | Value |
|----------|-------|
| **Type** | string |
| **Default** | `(auto-detect from /v1/models)` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_LLM_MODEL` |
| **Valid Examples** | `llama2`, `mistral`, `neural-chat`, `gpt-3.5-turbo`, `gpt-4` |

**Purpose:** Specific model to use for LLM inference

**Auto-Detection:** If not specified, COE fetches available models from `/v1/models` endpoint

**Configuration:**
```json
{
  "copilot-orchestrator.llm.model": "mistral"
}
```

---

### copilot-orchestrator.llm.temperature
| Property | Value |
|----------|-------|
| **Type** | number (0.0-2.0) |
| **Default** | `0.7` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_LLM_TEMPERATURE` |

**Purpose:** Controls randomness of responses (lower = more deterministic, higher = more creative)

**Valid Range:** 0.0 (deterministic) to 2.0 (very random)

**Recommended Values:**
- `0.0 - 0.3`: Coding tasks (deterministic, structured output)
- `0.5 - 0.8`: Planning & analysis
- `0.8 - 1.2`: Creative/exploratory tasks

**Configuration:**
```json
{
  "copilot-orchestrator.llm.temperature": 0.3
}
```

---

## MCP Configuration

### copilot-orchestrator.mcp.baseUrl
| Property | Value |
|----------|-------|
| **Type** | string (URL) |
| **Default** | `http://localhost:8000` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_MCP_BASE_URL` |
| **Valid Examples** | `http://localhost:8000`, `http://192.168.1.50:8000`, `https://mcp.example.com` |

**Purpose:** Base URL for Model Context Protocol (MCP) server

**Validation:**
- Must include protocol (`http://` or `https://`)
- Port required (default 8000 for MCP)
- Same IP rules as LLM (avoid APIPA, use HTTP for local)

**Configuration:**
```json
{
  "copilot-orchestrator.mcp.baseUrl": "http://localhost:8000"
}
```

---

### copilot-orchestrator.mcp.authToken
| Property | Value |
|----------|-------|
| **Type** | string (secret) |
| **Default** | (none) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_MCP_AUTH_TOKEN` |
| **Required For** | Secured MCP instances |

**Purpose:** Authentication token for MCP server (if required)

**Configuration:**
```json
{
  "copilot-orchestrator.mcp.authToken": "bearer_token_here"
}
```

---

### copilot-orchestrator.mcp.timeout
| Property | Value |
|----------|-------|
| **Type** | number (milliseconds) |
| **Default** | `30000` (30 seconds) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_MCP_TIMEOUT` |

**Purpose:** HTTP request timeout for MCP calls

**Valid Range:** 5000-300000 (5 seconds to 5 minutes)

**When to Adjust:**
- Increase if MCP server is slow or overloaded
- Decrease if network is fast and you want quick failure detection

**Configuration:**
```json
{
  "copilot-orchestrator.mcp.timeout": 45000
}
```

---

## Agent Configuration

### copilot-orchestrator.agent.mode
| Property | Value |
|----------|-------|
| **Type** | `"classic"` \| `"autonomous"` |
| **Default** | `"classic"` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_AGENT_MODE` |

**Purpose:** Agent execution mode

**Modes:**
- **`classic`**: Single agent, request-per-interaction (default, stable)
- **`autonomous`**: Multi-agent coordination (Planner, Coder, Tester) - experimental

**Configuration:**
```json
{
  "copilot-orchestrator.agent.mode": "classic"
}
```

---

### copilot-orchestrator.agent.maxConcurrent
| Property | Value |
|----------|-------|
| **Type** | number (1-10) |
| **Default** | `3` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_AGENT_MAX_CONCURRENT` |

**Purpose:** Maximum concurrent agents in autonomous mode

**Affects:** Planner, Coder, Tester can run in parallel up to this limit

**Configuration:**
```json
{
  "copilot-orchestrator.agent.maxConcurrent": 3
}
```

---

### copilot-orchestrator.agent.timeout
| Property | Value |
|----------|-------|
| **Type** | number (seconds) |
| **Default** | `300` (5 minutes) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_AGENT_TIMEOUT` |

**Purpose:** Agent execution timeout before auto-termination

**Configuration:**
```json
{
  "copilot-orchestrator.agent.timeout": 600
}
```

---

## GitHub Configuration

### copilot-orchestrator.github.token
| Property | Value |
|----------|-------|
| **Type** | string (secret) |
| **Default** | (none - required for GitHub integration) |
| **Scope** | user, application |
| **Env Override** | `COPILOT_GITHUB_TOKEN` |

**Purpose:** GitHub Personal Access Token for issue/PR management

**Token Scope Required:** `repo`, `workflow`, `read:org`

**Security:**
- ⚠️ **Never store in workspace scope**
- Store in User scope or environment variable
- Use fine-grained token (limit permissions)

**Configuration:**
```json
{
  "copilot-orchestrator.github.token": "ghp_..."
}
```

---

### copilot-orchestrator.github.owner
| Property | Value |
|----------|-------|
| **Type** | string |
| **Default** | (inferred from git remote) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_GITHUB_OWNER` |

**Purpose:** GitHub repository owner (username or organization)

**Configuration:**
```json
{
  "copilot-orchestrator.github.owner": "xXKillerNoobYT"
}
```

---

### copilot-orchestrator.github.repo
| Property | Value |
|----------|-------|
| **Type** | string |
| **Default** | (inferred from git remote) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_GITHUB_REPO` |

**Purpose:** GitHub repository name

**Configuration:**
```json
{
  "copilot-orchestrator.github.repo": "Copilot-Orchestration-Extension-COE-"
}
```

---

## Logging & Debug

### copilot-orchestrator.logging.level
| Property | Value |
|----------|-------|
| **Type** | `"ERROR"` \| `"WARN"` \| `"INFO"` \| `"DEBUG"` |
| **Default** | `"INFO"` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_LOGGING_LEVEL` |

**Purpose:** Log verbosity level

**Levels:**
- `ERROR`: Only errors
- `WARN`: Errors + warnings
- `INFO`: Errors + warnings + info (default)
- `DEBUG`: All + detailed debug info

**Configuration:**
```json
{
  "copilot-orchestrator.logging.level": "DEBUG"
}
```

---

### copilot-orchestrator.logging.file
| Property | Value |
|----------|-------|
| **Type** | string (file path) |
| **Default** | (none - logs to console only) |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_LOGGING_FILE` |

**Purpose:** Write logs to file (in addition to console)

**Configuration:**
```json
{
  "copilot-orchestrator.logging.file": "${workspaceFolder}/.logs/coe.log"
}
```

---

## Context & Memory

### copilot-orchestrator.context.maxFiles
| Property | Value |
|----------|-------|
| **Type** | number |
| **Default** | `100` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_CONTEXT_MAX_FILES` |

**Purpose:** Maximum files per context bundle

**Configuration:**
```json
{
  "copilot-orchestrator.context.maxFiles": 50
}
```

---

### copilot-orchestrator.memory.limit
| Property | Value |
|----------|-------|
| **Type** | number (entries) |
| **Default** | `1000` |
| **Scope** | workspace, user |
| **Env Override** | `COPILOT_MEMORY_LIMIT` |

**Purpose:** Maximum agent memory entries before pruning

**Configuration:**
```json
{
  "copilot-orchestrator.memory.limit": 500
}
```

---

## Complete Configuration Example

```json
{
  // LLM Configuration
  "copilot-orchestrator.llm.baseUrl": "http://localhost:1234/v1",
  "copilot-orchestrator.llm.apiKey": "sk-...",
  "copilot-orchestrator.llm.model": "mistral",
  "copilot-orchestrator.llm.temperature": 0.7,

  // MCP Configuration
  "copilot-orchestrator.mcp.baseUrl": "http://localhost:8000",
  "copilot-orchestrator.mcp.authToken": "token_if_needed",
  "copilot-orchestrator.mcp.timeout": 30000,

  // Agent Configuration
  "copilot-orchestrator.agent.mode": "classic",
  "copilot-orchestrator.agent.maxConcurrent": 3,
  "copilot-orchestrator.agent.timeout": 300,

  // GitHub Integration (User scope recommended)
  "copilot-orchestrator.github.token": "ghp_...",
  "copilot-orchestrator.github.owner": "xXKillerNoobYT",
  "copilot-orchestrator.github.repo": "Copilot-Orchestration-Extension-COE-",

  // Logging
  "copilot-orchestrator.logging.level": "INFO",
  "copilot-orchestrator.logging.file": "${workspaceFolder}/.logs/coe.log",

  // Context & Memory
  "copilot-orchestrator.context.maxFiles": 100,
  "copilot-orchestrator.memory.limit": 1000
}
```

---

## Environment Variable Overrides

All settings can be overridden with environment variables. Set before launching VS Code:

```bash
# macOS/Linux
export COPILOT_LLM_BASE_URL=http://192.168.1.100:1234/v1
export COPILOT_MCP_BASE_URL=http://192.168.1.100:8000
export COPILOT_AGENT_MODE=autonomous
export COPILOT_LOGGING_LEVEL=DEBUG

# Windows PowerShell
$env:COPILOT_LLM_BASE_URL="http://192.168.1.100:1234/v1"
$env:COPILOT_MCP_BASE_URL="http://192.168.1.100:8000"
$env:COPILOT_AGENT_MODE="autonomous"
$env:COPILOT_LOGGING_LEVEL="DEBUG"

# Then launch VS Code
code .
```

---

## Troubleshooting Configuration

### Settings Not Taking Effect

**Symptom:** Changed setting, but no change in behavior

**Solutions:**
1. Reload VS Code: `Cmd/Ctrl+Shift+P` → "Reload Window"
2. Check setting scope: Is it in correct workspace/user location?
3. Check for environment variable override: `echo $COPILOT_...`
4. Check for typo in setting key name

### Conflicting Settings Across Scopes

**Priority Order (highest → lowest):**
1. Environment variables
2. Workspace settings (`.vscode/settings.json`)
3. User settings
4. Application defaults

**Example:** If User has `llm.baseUrl = http://localhost:1234`, but Workspace has `http://192.168.1.100:1234`, Workspace wins.

### Reset to Defaults

```json
// Remove these lines from settings.json to use defaults:
// "copilot-orchestrator.llm.baseUrl": "...",
// "copilot-orchestrator.mcp.baseUrl": "...",
```

---

## Related Documentation

- **Audit & Diagnostics:** `Docs/AUDIT-CONNECTIVITY-CHECKLIST.md`
- **Error Messages:** `Docs/ERROR-CATALOG.md`
- **MCP API Details:** `Docs/MCP-API-CONTRACTS.md`

---

**End of Configuration Reference**

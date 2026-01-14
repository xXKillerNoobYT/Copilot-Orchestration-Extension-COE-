# _ZENTASKS Migration Roadmap

**Visual representation of the migration strategy**

---

## Agent Migration Status

```mermaid
graph TD
    A[7 Total Agents] --> B{Migration Status}
    B -->|Migrated| C[Auto Zen<br/>Cloud Agent]
    B -->|Not Migrated| D[5 Agents<br/>with zen-tasks tools]
    
    D --> E[Zen Planner<br/>7 tools]
    D --> F[Testing Agent<br/>7 tools]
    D --> G[Plan Agent<br/>7 tools]
    D --> H[Issue Handler<br/>7 tools]
    D --> I[Dependency Agent<br/>7 tools]
    
    style C fill:#90EE90
    style D fill:#FFB6C1
    style E fill:#FF6B6B
    style F fill:#FF6B6B
    style G fill:#FF6B6B
    style H fill:#FF6B6B
    style I fill:#FF6B6B
```

---

## Migration Dependency Chain

```mermaid
graph LR
    A[Migration Utilities] --> B[Auto Zen<br/>Legacy Prompt Fix]
    B --> C[Zen Planner<br/>CRITICAL]
    C --> D[Testing Agent]
    C --> E[Plan Agent]
    D --> F[Dependency Agent]
    E --> F
    F --> G[Issue Handler<br/>LAST]
    G --> H[Archive _ZENTASKS]
    
    style A fill:#87CEEB
    style B fill:#90EE90
    style C fill:#FF6B6B
    style D fill:#FFD700
    style E fill:#FFD700
    style F fill:#FFD700
    style G fill:#FFA500
    style H fill:#90EE90
```

---

## Tool Migration Mapping

```mermaid
graph LR
    subgraph "zen-tasks Tools (Legacy)"
        A1[listTasks]
        A2[getTask]
        A3[nextTask]
        A4[addTask]
        A5[updateTask]
        A6[setStatus]
        A7[parseRequirements]
    end
    
    subgraph "GitHub MCP Tools (Target)"
        B1[search_issues]
        B2[issue_read]
        B3[search + deps check]
        B4[GitHub API<br/>Create Issue]
        B5[GitHub API<br/>Update Issue]
        B6[Update Labels<br/>Close Issue]
        B7[Parse + Bulk Create]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
    A6 --> B6
    A7 --> B7
    
    style A7 fill:#FF6B6B
    style B7 fill:#FF6B6B
```

---

## 5-Week Migration Timeline

```mermaid
gantt
    title _ZENTASKS to GitHub Issues Migration
    dateFormat  YYYY-MM-DD
    section Week 1: Foundation
    Create Migration Utilities     :w1a, 2026-01-13, 3d
    Fix Auto Zen Legacy Prompt     :w1b, 2026-01-13, 1d
    Test GitHub Integration        :w1c, after w1a, 2d
    
    section Week 2: Planning
    Migrate Zen Planner           :crit, w2a, after w1c, 3d
    Update Workflow Docs          :w2b, after w2a, 2d
    Test Requirements Flow        :w2c, after w2a, 2d
    
    section Week 3: Support Agents
    Migrate Testing Agent         :w3a, after w2c, 2d
    Migrate Plan Agent            :w3b, after w2c, 2d
    Test Quality Workflows        :w3c, after w3a w3b, 1d
    
    section Week 4: Integration
    Migrate Dependency Agent      :w4a, after w3c, 2d
    Migrate Issue Handler         :crit, w4b, after w4a, 3d
    Test Full Integration         :w4c, after w4b, 2d
    
    section Week 5: Cleanup
    Archive _ZENTASKS             :w5a, after w4c, 1d
    Update Documentation          :w5b, after w5a, 2d
    Full System Validation        :w5c, after w5b, 2d
```

---

## Critical Path Analysis

```mermaid
graph TD
    START[Start Migration] --> U[Create Utilities]
    U --> ZP[Migrate Zen Planner<br/>CRITICAL PATH]
    ZP --> TA[Migrate Testing Agent]
    ZP --> PA[Migrate Plan Agent]
    TA --> DA[Migrate Dependency Agent]
    PA --> DA
    DA --> IH[Migrate Issue Handler<br/>CRITICAL PATH]
    IH --> END[Archive & Validate]
    
    style ZP fill:#FF0000,color:#FFFFFF
    style IH fill:#FF0000,color:#FFFFFF
    style U fill:#87CEEB
    style END fill:#90EE90
```

---

## Risk Heatmap

```mermaid
quadrantChart
    title Migration Risk vs Complexity
    x-axis Low Complexity --> High Complexity
    y-axis Low Risk --> High Risk
    quadrant-1 High Risk, High Complexity
    quadrant-2 High Risk, Low Complexity
    quadrant-3 Low Risk, Low Complexity
    quadrant-4 Low Risk, High Complexity
    
    Zen Planner: [0.8, 0.9]
    Issue Handler: [0.9, 0.9]
    Testing Agent: [0.5, 0.6]
    Plan Agent: [0.5, 0.6]
    Dependency Agent: [0.5, 0.5]
    Auto Zen Fix: [0.2, 0.3]
    Documentation: [0.3, 0.2]
```

---

## Data Flow: Before vs After

### Before (Legacy System)
```mermaid
graph LR
    A[Agent] -->|zen-tasks_add_task| B[tasks.json]
    B -->|zen-tasks_list_tasks| A
    B -->|sync| C[GitHub Issues]
    C -->|webhook| D[Issue Handler]
    D -->|zen-tasks_update_task| B
    
    style B fill:#FFB6C1
    style D fill:#FFD700
```

### After (Target System)
```mermaid
graph LR
    A[Agent] -->|GitHub API<br/>Create Issue| B[GitHub Issues]
    B -->|github-mcp-server<br/>search_issues| A
    B -.->|archived| C[_ZENTASKS_ARCHIVE]
    
    style B fill:#90EE90
    style C fill:#D3D3D3
```

---

## Success Metrics Dashboard

```mermaid
pie title Migration Progress
    "Migrated Agents" : 2
    "Pending Migration" : 5
```

```mermaid
pie title Tool References
    "GitHub MCP Tools" : 20
    "zen-tasks Tools" : 35
```

---

## Reference Counts by Category

```mermaid
graph TD
    A[232 Total References] --> B[Agent Tools: 35]
    A --> C[Documentation: 100+]
    A --> D[Code Files: 50+]
    A --> E[Legacy Tasks: 77]
    
    B --> B1[5 Agents × 7 Tools]
    C --> C1[50+ Doc Files]
    D --> D1[TypeScript/PHP]
    E --> E1[_ZENTASKS/*.md]
    
    style A fill:#FF6B6B
    style B fill:#FFA500
    style C fill:#FFD700
    style D fill:#FFD700
    style E fill:#D3D3D3
```

---

## Agent Tool Usage Matrix

| Agent | Tools Count | Status | Priority |
|-------|-------------|--------|----------|
| Auto Zen | 0 | 🟡 Partial | HIGH |
| Cloud Agent | 0 | ✅ Complete | - |
| Zen Planner | 7 | 🔴 Blocked | CRITICAL |
| Testing Agent | 7 | 🔴 Blocked | HIGH |
| Plan Agent | 7 | 🔴 Blocked | MEDIUM |
| Issue Handler | 7 | 🔴 Blocked | MEDIUM |
| Dependency Agent | 7 | 🔴 Blocked | MEDIUM |

**Legend**:
- ✅ Complete: Fully migrated to GitHub Issues
- 🟡 Partial: Mostly migrated, minor cleanup needed
- 🔴 Blocked: Not migrated, requires work

---

## Next Steps Flow

```mermaid
flowchart TD
    A[Audit Complete] --> B{Review Report}
    B -->|Approved| C[Create Migration Issues]
    B -->|Changes Needed| A
    C --> D[Build Utilities]
    D --> E[Fix Auto Zen Prompt]
    E --> F[Migrate Zen Planner]
    F --> G{All Tests Pass?}
    G -->|Yes| H[Continue to Next Agent]
    G -->|No| I[Debug & Fix]
    I --> F
    H --> J[Repeat for Each Agent]
    J --> K[Final Validation]
    K --> L[Archive _ZENTASKS]
    
    style A fill:#90EE90
    style F fill:#FF6B6B
    style K fill:#87CEEB
    style L fill:#90EE90
```

---

**Generated**: 2026-01-12  
**See**: `audit-report.md` for detailed analysis  
**See**: `QUICK-REFERENCE.md` for summary

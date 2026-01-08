```mermaid
graph TB
    subgraph "Task Files"
        TF1[TASK-001.md<br/>YAML Frontmatter]
        TF2[TASK-002.md<br/>YAML Frontmatter]
        TF3[TASK-003.md<br/>YAML Frontmatter]
    end

    subgraph "Task Parser Module"
        TP[taskParser.ts]
        TPF[parseTasksFromDirectory]
        TPM[parseTaskMarkdown]
        TPV[validateTask]
    end

    subgraph "Task Graph Generator Module"
        TGG[taskGraphGenerator.ts]
        
        subgraph "Core Functions"
            GEN[generateTaskGraph]
            EXEC[getExecutionOrder]
            CYC[detectCycles]
            READY[getReadyTasks]
        end
        
        subgraph "Advanced Analysis"
            CRIT[getCriticalPath]
            IMP[getImpactedTasks]
            STATS[getStats]
            VAL[validateDependencies]
        end
        
        subgraph "Visualization"
            DOT[exportToDot]
            MERM[exportToMermaid]
        end
    end

    subgraph "VS Code Extension"
        EXT[extension.ts]
        TV[Tree View]
        CMD1[Show Graph Command]
        CMD2[Show Dependencies Command]
    end

    subgraph "Output"
        GRAPH[Task Graph<br/>Directed Acyclic Graph]
        ORDER[Execution Order<br/>Topological Sort]
        VIZ1[GraphViz DOT]
        VIZ2[Mermaid Diagram]
        UI[VS Code UI]
    end

    TF1 --> TPF
    TF2 --> TPF
    TF3 --> TPF
    
    TPF --> TPM
    TPM --> TPV
    TPV --> TP
    
    TP --> GEN
    TP --> EXEC
    TP --> CYC
    TP --> READY
    
    GEN --> GRAPH
    EXEC --> ORDER
    CYC --> VAL
    
    GRAPH --> CRIT
    GRAPH --> IMP
    GRAPH --> STATS
    GRAPH --> DOT
    GRAPH --> MERM
    
    DOT --> VIZ1
    MERM --> VIZ2
    
    READY --> EXT
    GRAPH --> EXT
    ORDER --> EXT
    
    EXT --> TV
    EXT --> CMD1
    EXT --> CMD2
    
    CMD1 --> VIZ2
    CMD2 --> ORDER
    TV --> UI
    VIZ2 --> UI

    classDef inputClass fill:#e1f5ff,stroke:#333,stroke-width:2px
    classDef parserClass fill:#fff4e6,stroke:#333,stroke-width:2px
    classDef generatorClass fill:#f3e5f5,stroke:#333,stroke-width:2px
    classDef extensionClass fill:#e8f5e9,stroke:#333,stroke-width:2px
    classDef outputClass fill:#fce4ec,stroke:#333,stroke-width:2px
    
    class TF1,TF2,TF3 inputClass
    class TP,TPF,TPM,TPV parserClass
    class TGG,GEN,EXEC,CYC,READY,CRIT,IMP,STATS,VAL,DOT,MERM generatorClass
    class EXT,TV,CMD1,CMD2 extensionClass
    class GRAPH,ORDER,VIZ1,VIZ2,UI outputClass
```

# Task Graph Generator - Architecture Diagram

This diagram shows the complete flow of the Task Parser and Task Graph Generator:

## Flow Explanation

### 1. Input Layer (Blue)
- Task files in Markdown format with YAML frontmatter
- Located in `_ZENTASKS/` or `sample-tasks/` directories
- Contains task metadata (id, title, dependencies, status, etc.)

### 2. Parser Layer (Orange)
- **taskParser.ts** reads and validates task files
- **parseTasksFromDirectory** scans directory for .md files
- **parseTaskMarkdown** extracts YAML frontmatter and body
- **validateTask** ensures data integrity and type safety

### 3. Generator Layer (Purple)
The core graph generation and analysis engine:

#### Core Functions
- **generateTaskGraph**: Creates DAG from task dependencies
- **getExecutionOrder**: Topological sort for execution sequence
- **detectCycles**: Finds circular dependencies
- **getReadyTasks**: Identifies tasks ready to execute

#### Advanced Analysis
- **getCriticalPath**: Longest dependency chain
- **getImpactedTasks**: Tasks blocked if one fails
- **getStats**: Graph metrics and statistics
- **validateDependencies**: Comprehensive validation

#### Visualization
- **exportToDot**: GraphViz format for professional diagrams
- **exportToMermaid**: Mermaid format for markdown integration

### 4. Extension Layer (Green)
- **extension.ts** integrates with VS Code
- **Tree View** displays tasks in Activity Bar
- **Show Graph Command** generates Mermaid visualization
- **Show Dependencies Command** shows execution order

### 5. Output Layer (Pink)
- **Task Graph**: Complete DAG structure
- **Execution Order**: Tasks grouped by parallel execution levels
- **GraphViz DOT**: Professional diagram format
- **Mermaid Diagram**: Markdown-friendly visualization
- **VS Code UI**: Interactive user interface

## Key Features

### Dependency Resolution
Tasks are connected based on their `dependencies` field, creating a directed graph where edges represent "depends on" relationships.

### Cycle Detection
Using Tarjan's algorithm, the system identifies strongly connected components (cycles) that would prevent valid execution order.

### Execution Levels
Tasks are grouped into levels where:
- Level 0: No dependencies (can start immediately)
- Level N: Depends on Level N-1 tasks
- Tasks in same level can execute in parallel

### Validation
Multiple validation passes ensure:
- No self-dependencies
- No circular dependencies
- All dependencies exist
- Valid task types and statuses

### Visualization
Export to industry-standard formats:
- **DOT**: For GraphViz rendering (PNG, SVG, PDF)
- **Mermaid**: For GitHub, VS Code, and documentation

## Usage Pattern

```typescript
// 1. Parse tasks
const tasks = await parseTasksFromDirectory('_ZENTASKS');

// 2. Generate graph
const graph = generateTaskGraph(tasks);

// 3. Analyze
const ready = getReadyTasks(tasks);
const order = getExecutionOrder(tasks);
const cycles = detectCycles(tasks);

// 4. Visualize
const mermaid = exportToMermaid(graph);

// 5. Display in VS Code
vscode.workspace.openTextDocument({ content: mermaid });
```

## Data Flow

```
Task Files → Parser → Validation → Graph Generator → Analysis
                                         ↓
                                   Visualization → VS Code UI
```

## Performance Characteristics

- **Time Complexity**: O(V + E) for all major operations
  - V = number of tasks (vertices)
  - E = number of dependencies (edges)

- **Space Complexity**: O(V + E)
  - Stores nodes and edges efficiently using Map structures

- **Scalability**: Handles 1000+ tasks without performance degradation

## Integration Points

1. **VS Code Extension**: Commands and UI
2. **Backend API**: Can sync with Laravel backend
3. **GitHub**: Issue and PR integration
4. **CI/CD**: Automated task validation

## Benefits

✅ **Dependency Management**: Never miss required prerequisites  
✅ **Parallel Execution**: Maximize throughput  
✅ **Cycle Prevention**: Catch circular dependencies early  
✅ **Visual Clarity**: See entire project structure  
✅ **Impact Analysis**: Understand change ripple effects  
✅ **Progress Tracking**: Monitor completion rates  

---

**See full documentation in [vscode-extension/TASK-GRAPH-GENERATOR.md](vscode-extension/TASK-GRAPH-GENERATOR.md)**
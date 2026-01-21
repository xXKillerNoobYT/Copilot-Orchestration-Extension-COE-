# Context Breaking & Token Management Strategies

**Version**: 3.6 (Complete Implementation Plans)  
**Date**: January 20, 2026  
**Status**: Production-Ready Specifications  
**Source**: AI Teams Documentation v3.2-3.6  
**Synced with**: PRD.json, COE-Master-Plan, 02-Agent-Role-Definitions.md

---

## Overview

This document provides comprehensive specifications for context token management in 14B model agents, including customizable limiting strategies, breaking algorithms (5 strategies), pseudocode implementations, sidebar UI feedback, and detailed implementation roadmaps.

---

## I. Customizable Context Limiting & Auto-Recovery

### Core Features
- **Customizable Limits**: Per-agent/team, per-LLM type (local 14B, cloud APIs)
- **Minimum Floor**: System-wide floor (e.g., 3,500 tokens) to prevent incoherence
- **Breaking System**: Auto-chunk when >80% limit (warning threshold)
- **Auto-Recovery**: Fresh conversation startups on overflow ("weird" cases like token miscount)
- **Priority-Aware**: P1 agents get higher limits/tighter monitoring
- **Per-LLM Handling**: Detect LLM type, apply specific limits with "Follow Default" checkbox
- **14B Optimizations**: Efficient chunking (embedding-based relevance), RL trains on overflow avoidance

### Configuration Structure

```yaml
context_config:
  # Global minimum (user-specified floor, enforced)
  min_limit: 3500  
  
  # Per-agent defaults (user-customizable)
  default_limit: 5000  
  warning_threshold: 0.8  # % to start breaking (80%)
  
  # Per-LLM configuration
  per_llm:
    - type: "local_14b"  # e.g., Qwen3-14B
      limit: 3500
      follow_default: true  # Checkbox toggle
    - type: "cloud_grok"
      limit: 8000
      follow_default: false
      
  # Breaking strategy configuration (v3.3 expanded)
  breaking_strategy:
    chain_order: ["summarize_old", "prioritize_recent", "content_type_chunking", "discard_low_rel"]
    summarize_old:
      old_threshold: 0.6
      summary_length: 300
    prioritize_recent:
      rel_threshold: 0.5
      recent_bias: 0.2
      priority_boost: 1.5  # For P1 units
    content_type_chunking:
      types: ["code", "text", "plan_ref", "log"]
      compress_ratio: {"code": 0.7, "log": 0.5}
    discard_low_rel:
      discard_percent: 0.3
      placeholder_detail: "brief"
      
  # Recovery settings
  recovery_mode: "fresh_start"  # Options: fresh_start, truncate, error
  
  # Retry policies (v4.1)
  retry_policies:
    default:
      max_attempts: 3
      backoff_base_seconds: 5
      max_delay_seconds: 60
    per_llm_overrides:
      local_14b:
        max_attempts: 4
        backoff_base_seconds: 10
```

### UI in VS Code Sidebar

- **Agent Settings Tab**: Dropdown/sliders for limits per agent/LLM
- **Checkbox**: "Follow Default" (links to global editable default)
- **Preview**: "Simulate Context: Current ~2,800 / 5,000 tokens"
- **Apply**: Triggers UV Task (v3.0) for validation

---

## II. Breaking System (5 Strategies)

### Strategy 1: Summarize Old Context (Default – Temporal Compression)

**When to Use**: General overage; preserves narrative flow  
**Process**:
1. Split context into old (first 60%) / recent (last 40%)
2. Summarize old via 14B LM (prompt-limited to 500 tokens)
3. Reassemble: Summary + recent

**Props**:
- `old_threshold`: 0.6 (% considered "old")
- `summary_length`: 300 tokens

**Example**: Chat 4,500/5,000 → Summarize 2,700 to 300 → New: 3,000

**Weird Case Handling**: If summary incoherent (embedding similarity <0.7), fallback to truncate

### Strategy 2: Prioritize Recent & Key Units (Relevance-Focused Pruning)

**When to Use**: Fragmented contexts; ensures P1 priorities retained  
**Process**:
1. Embed units & score vs. current task
2. Retain: Top 50% scores + last 20% chronologically + all P1-tagged
3. Discard low-relevance (<0.5 threshold) with placeholders

**Props**:
- `rel_threshold`: 0.5
- `recent_bias`: 0.2
- `priority_boost`: 1.5 (for P1)

**Example**: 4,800/5,000 → Retain P1 + recent 960 → Discard 1,200 low-rel → New: 3,600

**Weird Case**: If all high-rel, trigger fresh start with priority handover

### Strategy 3: Content-Type Specific Chunking (Modular Segmentation)

**When to Use**: Diverse content; preserves structure  
**Process**:
1. Classify units: Code, Text, Refs, Logs
2. Compress type-specific (minify code, summarize text)
3. Reassemble with delimiters

**Props**:
- `types`: ["code", "text", "plan_ref", "log"]
- `compress_ratio`: {"code": 0.7, "log": 0.5}

**Example**: 2,000 code + 2,500 text → Minify code to 1,400 + summarize text to 1,000 → New: 2,400

### Strategy 4: Discard Low-Relevance with Placeholders (Aggressive Pruning)

**When to Use**: Severe overage; quick recovery  
**Process**:
1. Score all units vs. task
2. Discard bottom X% with placeholders linked to archives
3. Ensure min coherent units retained

**Props**:
- `discard_percent`: 0.3
- `placeholder_detail`: "brief" or "linked"

**Example**: 6,000/5,000 → Discard 30% low-rel (1,800) → New: 4,200

### Strategy 5: Hybrid Compression (Combined Strategies)

**When to Use**: Complex contexts; default for most agents  
**Process**: Sequential execution (e.g., Summarize old → Prioritize → Discard if needed)

**Props**:
- `strategy_chain`: ["summarize_old", "prioritize_recent", "discard_low_rel"]
- `max_iterations`: 3

**Example**: Start 5,500/5,000 → Summarize (4,800) → Prioritize (4,200) → Done

---

## III. Pseudocode Implementations

### Shared Types & Helpers

```typescript
interface ContextUnit {
  id: string;
  type: "message" | "code" | "plan_ref" | "log" | "other";
  content: string;
  timestamp: number;
  priorityTag?: 1 | 2 | 3;
  relevanceScore?: number;
  tokenCount?: number;
}

interface ContextState {
  units: ContextUnit[];
  currentTokens: number;
  limit: number;
  minLimit: number;
  warningThreshold: number;
  priorityAreas: string[];
}

function estimateTokens(text: string, tokenizerType = 'gpt-4'): number {
  // Use tiktoken or fallback
  const encoding = get_encoding(tokenizerType);
  return encoding.encode(text).length;
}

function computeRelevance(unit: ContextUnit, query: string): number {
  // Use MiniLM embedding + cosine similarity
  const unitEmb = await embedder.embed(unit.content);
  const queryEmb = await embedder.embed(query);
  return cos_sim(unitEmb, queryEmb);  // 0-1
}
```

### Strategy 1: Summarize Old

```typescript
function summarizeOldStrategy(state: ContextState): ContextState | null {
  const oldThreshold = 0.6;
  const summaryLength = 300;

  const splitIndex = Math.floor(state.units.length * oldThreshold);
  const oldUnits = state.units.slice(0, splitIndex);
  const recentUnits = state.units.slice(splitIndex);

  if (oldUnits.length === 0) return state;

  const oldText = oldUnits.map(u => u.content).join("\n");
  const summary = await summarizeText(oldText, summaryLength);

  const summaryUnit: ContextUnit = {
    id: "summary-old",
    type: "summary",
    content: summary,
    timestamp: oldUnits[oldUnits.length - 1].timestamp,
    priorityTag: Math.max(...oldUnits.map(u => u.priorityTag ?? 0)),
  };

  const newState: ContextState = {
    ...state,
    units: [summaryUnit, ...recentUnits],
    currentTokens: estimateTokens(summary) + 
                   recentUnits.reduce((sum, u) => sum + (u.tokenCount || estimateTokens(u.content)), 0),
  };

  return newState.currentTokens <= state.limit ? newState : null;
}
```

### Strategy 2: Prioritize Recent

```typescript
async function prioritizeRecentStrategy(state: ContextState): Promise<ContextState | null> {
  const relThreshold = 0.5;
  const recentBias = 0.2;
  const priorityBoost = 1.5;

  const scoredUnits = await Promise.all(state.units.map(async unit => ({
    ...unit,
    relevanceScore: await computeRelevance(unit, "current task context"),
  })));

  scoredUnits.forEach(u => {
    if (u.priorityTag === 1) u.relevanceScore! *= priorityBoost;
  });

  const sorted = [...scoredUnits].sort((a, b) => b.relevanceScore! - a.relevanceScore!);
  const recentCount = Math.ceil(state.units.length * recentBias);
  const mustKeep = scoredUnits.slice(-recentCount);
  const keepSet = new Set([...mustKeep, ...sorted.filter(u => u.relevanceScore! >= relThreshold)]);

  const keptUnits = state.units.filter(u => keepSet.has(u));
  const newTokens = keptUnits.reduce((sum, u) => sum + (u.tokenCount || estimateTokens(u.content)), 0);

  const newState: ContextState = { ...state, units: keptUnits, currentTokens: newTokens };
  return newTokens <= state.limit ? newState : null;
}
```

### Main Orchestrator: Chain Strategies

```typescript
async function breakContext(state: ContextState): Promise<ContextState | "recovery"> {
  let current = { ...state };

  const chain = state.breaking_strategy?.chain_order ?? [
    "summarize_old",
    "prioritize_recent",
    "content_type_chunking",
    "discard_low_rel",
  ];

  for (const strategy of chain) {
    let result: ContextState | null = null;

    switch (strategy) {
      case "summarize_old":
        result = await summarizeOldStrategy(current);
        break;
      case "prioritize_recent":
        result = await prioritizeRecentStrategy(current);
        break;
      // ... other strategies
    }

    if (result) {
      current = result;
      if (current.currentTokens <= current.limit) {
        return current;
      }
    }
  }

  // All strategies failed → recovery
  return "recovery";
}

function handleContextOverflow(state: ContextState): ContextState {
  const broken = await breakContext(state);
  if (broken !== "recovery") return broken;

  // Fresh start with handover
  const handoverSummary = await summarizeText(
    state.units.map(u => u.content).join("\n"),
    500
  );

  const freshState: ContextState = {
    units: [{
      id: "handover-fresh",
      type: "summary",
      content: `Resuming from overflow: ${handoverSummary}`,
      timestamp: Date.now(),
      priorityTag: 1,  // Force P1 protection
    }],
    currentTokens: estimateTokens(handoverSummary) + 200,
    limit: state.limit,
    minLimit: state.minLimit,
  };

  console.log("Context overflow recovery: fresh start triggered");
  return freshState;
}
```

---

## IV. Sidebar UI Feedback for Context Breaking

### Visual Components

1. **Progress Bar**
   - Color: Blue (normal), Green (P1), Orange (warning), Red (recovery)
   - Animation: Smooth fill during phases; pulsing when summarizing
   - Width: Full sidebar

2. **Status Message** (Dynamic single-line)
   - Detection: "Checking context length…"
   - Summarize: "Summarizing old context… (est. 2.1k → 300 tokens)"
   - Prioritize: "Prioritizing P1 units & recent messages…"
   - Success: "Context reduced to 3,420 / 5,000 tokens"
   - Recovery: "Overflow detected – starting fresh conversation"

3. **Priority-Aware Badge**
   - Shows highest priority being protected
   - Example: "P1: To Do List" (green)

4. **Details Collapsible** (Optional)
   - Before/after tokens
   - Strategies applied
   - Discarded units count
   - Handover preview if recovery

---

## V. Implementation Roadmaps (v3.6)

### 1. Token Estimator Implementation (15-23 hours)
- Install tiktoken JS library
- Integrate HuggingFace tokenizers for custom models
- Add to `context_config.yaml`: tokenizer_type config
- Cache encodings; batch count ops
- Unit tests: 20+ cases
- Timeline: Week 3 (Jan 28) – aligns with UI polish

### 2. Embedding Service Implementation (19-29 hours)
- Install @xenova/transformers (MiniLM: 384 dims, ~22MB)
- Lazy load model on demand
- Integrate relevance scoring into prioritize_recent
- Batch embeddings in orchestrator
- Unit tests: 30+ cases
- Timeline: Week 4 (Feb 4)

### 3. Test Suite for Overflow Sims (18-26 hours)
- Jest + faker.js for sim generation
- 15+ test cases (all strategies, priorities, edge cases)
- Coherence verifier (post-break similarity >0.7)
- Performance benchmarks (<2s for 50 units)
- Coverage goal: 90%
- Timeline: Week 4 (Feb 4)

### 4. Critic Evolution of Strategies (17-25 hours)
- Extend Critic template with error pattern detection
- Metrics: overflow_freq, coherence_delta
- Auto-propose UV tasks for re-ordering/new strategies
- RL tie-in: logs success/failure for fine-tuning
- Timeline: Week 5 (Feb 11)

### 5. RL Reward Function (15-23 hours)
- Define reward: success (no recovery) +1, recovery -0.7
- Include coherence (delta * 0.5) + efficiency (tokens_reduced / time)
- P1 bonus (+0.2)
- Clamp (-2 to 2)
- JSONL dataset for fine-tuning
- Timeline: Week 5 (Feb 11)

---

## VI. Integration Points

### With Other Features
- **Priorities (v2.9)**: Breaking prioritizes P1 units; P1 get higher limits
- **Auto Task Generation (v2.7)**: Generate "Context Cleanup" tasks on warnings
- **Loop Detection (v2.6)**: Over-context counted as loop factor
- **Agent Evolution (v3.0)**: Critic evolves strategies via UV tasks
- **Updating Tool (v3.0)**: Modifies breaking_strategy YAML safely
- **CI/CD (v2.7)**: Test suite includes overflow sims

---

## VII. 14B Model Optimizations

- **Efficient Chunking**: Embedding-based scoring (MiniLM ~50ms per unit)
- **RL Training**: Positive for no-recovery cycles; negative for forced starts
- **Quantization**: Use quantized embedders if available
- **Message Compression**: AutoGen chats limited to 512 tokens per turn
- **Procedural Memory**: Cache strategies; avoid full re-inference

---

## Recommended Next Steps

1. Implement Token Estimator with tiktoken + HF tokenizers
2. Add Embedding Service (MiniLM)
3. Create Test Suite with 15+ overflow sims
4. Critic evolution for strategy re-ordering
5. RL reward logging for 14B fine-tuning
6. Sidebar UI feedback prototype

---

**End of Context Breaking & Token Management Documentation**

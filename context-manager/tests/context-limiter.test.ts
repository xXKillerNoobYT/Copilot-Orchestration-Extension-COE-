import { ContextLimiter, ContextItem } from '../src/context-limiter';

function makeText(length: number): string {
  return 'x'.repeat(length);
}

describe('ContextLimiter (F037)', () => {
  test('enforces default global limit (5000 tokens) with auto-recovery on overflow', () => {
    const limiter = new ContextLimiter();
    // Build items totalling > 5000 tokens (approx 4 chars per token)
    const items: ContextItem[] = [
      { content: makeText(12000), priority: 'low' }, // ~3000 tokens
      { content: makeText(12000), priority: 'medium' }, // ~3000 tokens → total ~6000
    ];
    const result = limiter.enforce(items);
    expect(result.status.autoRecovery).toBe(true);
    expect(result.items.length).toBe(0);
    expect(result.status.limit).toBe(5000);
    expect(result.status.percentageUsed).toBeGreaterThan(1);
  });

  test('applies minimum floor (3500 tokens) preventing underflow', () => {
    const limiter = new ContextLimiter({ globalLimit: 3000 });
    const cfg = limiter.getConfig();
    expect(cfg.limit).toBe(3500);
    expect(cfg.minFloor).toBe(3500);
  });

  test('applies summarization when usage exceeds 80% of limit', () => {
    const limiter = new ContextLimiter();
    // 4500 tokens ~ 18000 chars combined → >80% (of 5000)
    const items: ContextItem[] = [
      { content: makeText(9000), priority: 'low' },
      { content: makeText(9000), priority: 'medium' },
    ];
    const result = limiter.enforce(items);
    expect(result.status.summarizationApplied).toBe(true);
    // Ensure high-priority items are preserved; here none are high, so content should be summarized
    for (const it of result.items) {
      expect(it.content.startsWith('Summary: ')).toBe(true);
    }
  });

  test('status reports usage metrics correctly', () => {
    const limiter = new ContextLimiter();
    const items: ContextItem[] = [
      { content: makeText(1000), priority: 'high' },
      { content: makeText(1000), priority: 'low' },
    ];
    const result = limiter.enforce(items);
    expect(result.status.limit).toBe(5000);
    expect(result.status.tokensUsed).toBeGreaterThan(0);
    expect(result.status.percentageUsed).toBeGreaterThan(0);
    expect(result.status.autoRecovery).toBe(false);
  });

  test('does not apply summarization when under threshold', () => {
    const limiter = new ContextLimiter();
    // 1000 tokens ~ 4000 chars → <80%
    const items: ContextItem[] = [
      { content: makeText(2000), priority: 'low' },
      { content: makeText(2000), priority: 'medium' },
    ];
    const result = limiter.enforce(items);
    expect(result.status.summarizationApplied).toBe(false);
    for (const it of result.items) {
      expect(it.content.startsWith('Summary: ')).toBe(false);
    }
  });

  test('summarization preserves high-priority content unchanged', () => {
    const limiter = new ContextLimiter();
    // exceed threshold to trigger summarization
    const items: ContextItem[] = [
      { content: 'important-high-priority', priority: 'high' },
      { content: makeText(9000), priority: 'low' },
      { content: makeText(9000), priority: 'medium' },
    ];
    const result = limiter.enforce(items);
    expect(result.status.summarizationApplied).toBe(true);
    const high = result.items.find((it) => it.priority === 'high');
    expect(high?.content).toBe('important-high-priority');
  });

  test('handles empty items array gracefully', () => {
    const limiter = new ContextLimiter();
    const result = limiter.enforce([]);
    expect(result.items.length).toBe(0);
    expect(result.status.tokensUsed).toBe(0);
    expect(result.status.percentageUsed).toBe(0);
    expect(result.status.autoRecovery).toBe(false);
  });

  test('handles items with pre-computed tokens', () => {
    const limiter = new ContextLimiter();
    const items: ContextItem[] = [
      { content: 'test', tokens: 100, priority: 'low' },
      { content: 'test2', tokens: 200, priority: 'medium' },
    ];
    const result = limiter.enforce(items);
    expect(result.status.tokensUsed).toBe(300);
  });

  test('handles content shorter than summarization threshold', () => {
    const limiter = new ContextLimiter();
    const items: ContextItem[] = [
      { content: makeText(150), priority: 'low' }, // < 200 chars
      { content: makeText(18000), priority: 'medium' }, // ~4500 tokens triggers summarization
    ];
    const result = limiter.enforce(items);
    expect(result.status.summarizationApplied).toBe(true);
    // First item is already short, should still be summarized but content preserved
    const shortItem = result.items.find((it) => it.content.includes('Summary: xxx'));
    expect(shortItem).toBeDefined();
  });

  test('adds tokens to items that do not have them', () => {
    const limiter = new ContextLimiter();
    const items: ContextItem[] = [
      { content: makeText(400) }, // no priority or tokens specified
    ];
    const result = limiter.enforce(items);
    expect(result.items[0].tokens).toBeDefined();
    expect(result.items[0].tokens).toBeGreaterThan(0);
  });
});
import { GitHubBatcher } from './githubBatch';

describe('GitHubBatcher', () => {
  test('enqueue and flush create batches of up to 50', () => {
    const batcher = new GitHubBatcher();
    for (let i = 0; i < 120; i++) {
      batcher.enqueue({ type: 'create', payload: { i } });
    }
    const batches = batcher.flush();
    expect(batches.length).toBeGreaterThanOrEqual(3);
    expect(batches[0].length).toBeLessThanOrEqual(50);
  });

  test('deduplicates by key', () => {
    const batcher = new GitHubBatcher();
    batcher.enqueue({ type: 'update', payload: { v: 1 }, key: 'issue-1' });
    batcher.enqueue({ type: 'update', payload: { v: 2 }, key: 'issue-1' });
    const batches = batcher.flush();
    expect(batches.flat().length).toBe(1);
    expect(batches[0][0].payload.v).toBe(2);
  });
});

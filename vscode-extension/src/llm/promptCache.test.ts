import { PromptCache } from './promptCache';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Create a temporary directory for testing
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-cache-test-'));
}

async function testBasicCaching() {
  const tempDir = createTempDir();
  const cache = new PromptCache(tempDir, 1024 * 1024, 100); // 1MB, 100 entries

  // Test caching and retrieval
  const testPayload = { message: 'Hello World', data: [1, 2, 3] };
  await cache.store('test-key', testPayload);

  const retrieved = await cache.retrieve('test-key');
  console.assert(retrieved !== null, 'Should retrieve cached payload');
  console.assert(retrieved.message === 'Hello World', 'Should retrieve correct data');
  console.assert(JSON.stringify(retrieved.data) === JSON.stringify([1, 2, 3]), 'Should retrieve correct array data');

  // Test cache miss
  const miss = await cache.retrieve('non-existent-key');
  console.assert(miss === null, 'Should return null for missing key');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function testTTLEviction() {
  const tempDir = createTempDir();
  const cache = new PromptCache(tempDir, 1024 * 1024, 100);

  // Cache an entry
  await cache.store('ttl-test', { data: 'should expire' });

  // Wait a bit and evict old entries
  await new Promise(resolve => setTimeout(resolve, 100));
  const evicted = await cache.evictByAge(50); // 50ms TTL

  console.assert(evicted >= 1, 'Should evict at least one entry');

  const retrieved = await cache.retrieve('ttl-test');
  console.assert(retrieved === null, 'Should not retrieve expired entry');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function testLRUEviction() {
  const tempDir = createTempDir();
  const cache = new PromptCache(tempDir, 500, 2); // Small size limit

  // Cache multiple entries to trigger eviction
  await cache.store('key1', { data: 'x'.repeat(200) }); // Large payload
  await cache.store('key2', { data: 'y'.repeat(200) }); // Large payload
  await cache.store('key3', { data: 'z'.repeat(200) }); // This should trigger eviction

  const stats = cache.getStats();
  console.assert(stats.totalEntries <= 2, 'Should not exceed max entries');
  console.assert(stats.evictions > 0, 'Should have performed evictions');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function testCompression() {
  const tempDir = createTempDir();
  const cache = new PromptCache(tempDir, 1024 * 1024, 100);

  // Create a large payload that should be compressed
  const largePayload = { data: 'x'.repeat(2000) };
  await cache.store('compression-test', largePayload);

  const retrieved = await cache.retrieve('compression-test');
  console.assert(retrieved !== null, 'Should retrieve compressed payload');
  console.assert(retrieved.data === 'x'.repeat(2000), 'Should decompress correctly');

  const stats = cache.getStats();
  console.assert(stats.compressions > 0, 'Should have performed compression');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function testStatistics() {
  const tempDir = createTempDir();
  const cache = new PromptCache(tempDir, 1024 * 1024, 100);

  // Perform some operations
  await cache.store('stats-test', { data: 'test' });
  await cache.retrieve('stats-test'); // Hit
  await cache.retrieve('missing-key'); // Miss


  const stats = cache.getStats();
  console.assert(stats.hits === 1, 'Should record 1 hit');
  console.assert(stats.misses === 1, 'Should record 1 miss');
  console.assert(stats.totalEntries === 1, 'Should have 1 entry');

  const hitRate = cache.getHitRate();
  console.assert(hitRate === 0.5, 'Should calculate correct hit rate');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function testPersistence() {
  const tempDir = createTempDir();

  // Create cache and add data
  let cache = new PromptCache(tempDir, 1024 * 1024, 100);
  await cache.store('persist-test', { persistent: true });

  // Create new cache instance (simulating restart)
  cache = new PromptCache(tempDir, 1024 * 1024, 100);
  const retrieved = await cache.retrieve('persist-test');

  console.assert(retrieved !== null, 'Should load persisted data');
  console.assert(retrieved.persistent === true, 'Should retrieve correct persisted data');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function testClear() {
  const tempDir = createTempDir();
  const cache = new PromptCache(tempDir, 1024 * 1024, 100);

  await cache.store('clear-test', { data: 'to be cleared' });
  await cache.clear();

  const stats = cache.getStats();
  console.assert(stats.totalEntries === 0, 'Should have no entries after clear');

  const retrieved = await cache.retrieve('clear-test');
  console.assert(retrieved === null, 'Should not retrieve cleared data');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function runPromptCacheTests() {
  console.log('Running PromptCache tests...');

  try {
    await testBasicCaching();
    console.log('✓ testBasicCaching passed');

    await testTTLEviction();
    console.log('✓ testTTLEviction passed');

    await testLRUEviction();
    console.log('✓ testLRUEviction passed');

    await testCompression();
    console.log('✓ testCompression passed');

    await testStatistics();
    console.log('✓ testStatistics passed');

    await testPersistence();
    console.log('✓ testPersistence passed');

    await testClear();
    console.log('✓ testClear passed');

    console.log('All PromptCache tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

runPromptCacheTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
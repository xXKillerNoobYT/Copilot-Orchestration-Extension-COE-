import { RateLimitHandler } from './rateLimit';

describe('RateLimitHandler', () => {
  test('retries on 429 up to maxRetries with exponential backoff', async () => {
    const handler = new RateLimitHandler();
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        const err: any = new Error('429 rate limit');
        err.message = '429 rate limit';
        throw err;
      }
      return 'ok';
    };
    const result = await handler.executeWithBackoff(fn, 5);
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });
});

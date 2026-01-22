export class RateLimitHandler {
  async executeWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let delay = 1000;
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        const message = error?.message || '';
        const isRateLimited = message.includes('rate limit') || message.includes('429');
        if (!isRateLimited || attempt >= maxRetries) {
          throw error;
        }
        await new Promise(res => setTimeout(res, delay));
        delay = Math.min(delay * 2, 60_000);
        attempt++;
      }
    }
  }
}

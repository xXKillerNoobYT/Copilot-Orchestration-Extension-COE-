// ./errorHandler.web.spec.ts
import { getUserFriendlyErrorMessage } from '../errorHandler';

/** @aiContributed-2026-01-23 */
describe('getUserFriendlyErrorMessage', () => {
  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for network errors', () => {
    const error = new Error('ECONNREFUSED');
    expect(getUserFriendlyErrorMessage(error)).toBe('Unable to connect to the server. Please ensure it is running.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for timeout errors', () => {
    const error = new Error('timeout');
    expect(getUserFriendlyErrorMessage(error)).toBe('Request timed out. Please try again.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for server not found errors', () => {
    const error = new Error('ENOTFOUND');
    expect(getUserFriendlyErrorMessage(error)).toBe('Server not found. Please check the URL configuration.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for 404 errors', () => {
    const error = new Error('404');
    expect(getUserFriendlyErrorMessage(error)).toBe('Resource not found.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for authentication errors', () => {
    const error = new Error('401');
    expect(getUserFriendlyErrorMessage(error)).toBe('Authentication failed. Please check your credentials.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for server errors', () => {
    const error = new Error('500');
    expect(getUserFriendlyErrorMessage(error)).toBe('Server error. Please try again later.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a user-friendly message for circuit breaker errors', () => {
    const error = new Error('Circuit breaker is OPEN. Service unavailable.');
    expect(getUserFriendlyErrorMessage(error)).toBe('Service temporarily unavailable. Please wait a moment and try again.');
  });

  /** @aiContributed-2026-01-23 */
    it('should return the clean error message for generic errors', () => {
    const error = new Error('Error: Something went wrong');
    expect(getUserFriendlyErrorMessage(error)).toBe('Something went wrong');
  });

  /** @aiContributed-2026-01-23 */
    it('should return a default message for unknown error types', () => {
    const error = 'Unknown error';
    expect(getUserFriendlyErrorMessage(error)).toBe('An unexpected error occurred. Please try again.');
  });
});
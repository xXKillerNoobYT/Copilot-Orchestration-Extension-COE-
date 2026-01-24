/**
 * Jest Sample Test
 * Verifies Jest test setup is working correctly
 */

describe('Jest Test Setup Verification', () => {
  it('should run basic Jest test', () => {
    expect(true).toBe(true);
  });

  it('should handle async/await', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should support TypeScript', () => {
    const greeting: string = 'Hello Jest';
    expect(greeting).toContain('Jest');
  });

  describe('Jest Matchers', () => {
    it('should have equality matchers', () => {
      expect(2 + 2).toBe(4);
      expect({ a: 1 }).toEqual({ a: 1 });
      expect([1, 2, 3]).toEqual([1, 2, 3]);
    });

    it('should have truthiness matchers', () => {
      expect(true).toBeTruthy();
      expect(false).toBeFalsy();
      expect(null).toBeNull();
      expect(undefined).toBeUndefined();
    });

    it('should have comparison matchers', () => {
      expect(10).toBeGreaterThan(5);
      expect(5).toBeLessThan(10);
      expect(10).toBeGreaterThanOrEqual(10);
    });

    it('should have string matchers', () => {
      expect('Hello World').toMatch(/World/);
      expect('Testing').toContain('est');
    });

    it('should have array matchers', () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(numbers).toContain(3);
      expect(numbers).toHaveLength(5);
    });

    it('should have object matchers', () => {
      const user = { name: 'John', age: 30 };
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('age', 30);
    });
  });

  describe('Jest Mocking', () => {
    it('should create mock functions', () => {
      const mockFn = jest.fn();
      mockFn('test');
      expect(mockFn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should mock return values', () => {
      const mockFn = jest.fn(() => 'mocked value');
      expect(mockFn()).toBe('mocked value');
    });

    it('should track mock calls', () => {
      const mockFn = jest.fn();
      mockFn(1, 2, 3);
      mockFn(4, 5, 6);
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn.mock.calls[0]).toEqual([1, 2, 3]);
      expect(mockFn.mock.calls[1]).toEqual([4, 5, 6]);
    });
  });

  describe('Error Handling', () => {
    it('should test thrown errors', () => {
      const throwError = () => {
        throw new Error('Test error');
      };
      expect(throwError).toThrow('Test error');
    });

    it('should test async errors', async () => {
      const throwAsync = async () => {
        throw new Error('Async error');
      };
      await expect(throwAsync()).rejects.toThrow('Async error');
    });
  });
});

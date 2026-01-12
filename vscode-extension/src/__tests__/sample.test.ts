/**
 * Sample Jest Test
 * Verifies Jest setup is working correctly
 */

describe('Jest Setup Verification', () => {
  it('should run basic test', () => {
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

  describe('Matchers', () => {
    it('should have equality matchers', () => {
      expect(2 + 2).toBe(4);
      expect({ a: 1 }).toEqual({ a: 1 });
      expect([1, 2, 3]).toEqual([1, 2, 3]);
    });

    it('should have truthiness matchers', () => {
      expect(null).toBeNull();
      expect(undefined).toBeUndefined();
      expect(true).toBeTruthy();
      expect(false).toBeFalsy();
    });

    it('should have array/object matchers', () => {
      const arr = [1, 2, 3, 4];
      expect(arr).toContain(3);
      expect(arr).toHaveLength(4);

      const obj = { name: 'Test', value: 123 };
      expect(obj).toHaveProperty('name');
      expect(obj).toMatchObject({ name: 'Test' });
    });
  });

  describe('Mocking', () => {
    it('should support mock functions', () => {
      const mockFn = jest.fn();
      mockFn('hello');
      mockFn('world');

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('hello');
      expect(mockFn).toHaveBeenLastCalledWith('world');
    });

    it('should support mock implementations', () => {
      const mockAdd = jest.fn((a: number, b: number) => a + b);
      const result = mockAdd(2, 3);

      expect(result).toBe(5);
      expect(mockAdd).toHaveBeenCalledWith(2, 3);
    });
  });

  describe('VS Code Mock', () => {
    it('should mock vscode module', async () => {
      const vscode = await import('vscode');
      
      expect(vscode.window).toBeDefined();
      expect(vscode.commands).toBeDefined();
      expect(vscode.workspace).toBeDefined();
    });

    it('should mock window.showInformationMessage', async () => {
      const vscode = await import('vscode');
      
      vscode.window.showInformationMessage('Test message');
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test message');
    });
  });
});

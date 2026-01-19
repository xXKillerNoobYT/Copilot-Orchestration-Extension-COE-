/**
 * Tests for TestingAgent parameter parsing functionality
 */
import { TestingAgent } from './testingAgent';

// Jest type definitions
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;

interface Expect {
  (actual: any): any;
  toBeDefined(): void;
  toEqual(expected: any): void;
  toBe(expected: any): void;
  toContain(expected: any): void;
  toHaveLength(length: number): void;
  toHaveProperty(property: string, value?: any): void;
}

declare function expect(actual: any): Expect;

describe('TestingAgent', () => {
  let agent: TestingAgent;

  beforeEach(() => {
    agent = new TestingAgent();
  });

  describe('Parameter Parsing', () => {
    test('should parse simple parameters', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('name: string, age: number');
      
      expect(params).toHaveLength(2);
      expect(params[0]).toHaveProperty('name', 'name');
      expect(params[0]).toHaveProperty('type', 'string');
      expect(params[1]).toHaveProperty('name', 'age');
      expect(params[1]).toHaveProperty('type', 'number');
    });

    test('should parse optional parameters', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('name: string, age?: number');
      
      expect(params).toHaveLength(2);
      expect(params[0].optional).toBe(false);
      expect(params[1].optional).toBe(true);
    });

    test('should parse parameters with default values', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('name: string, age: number = 0');
      
      expect(params).toHaveLength(2);
      expect(params[1]).toHaveProperty('defaultValue', '0');
      expect(params[1].optional).toBe(true);
    });

    test('should parse function type parameters', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('callback: (arg: string) => void');
      
      expect(params).toHaveLength(1);
      expect(params[0]).toHaveProperty('name', 'callback');
      expect(params[0]).toHaveProperty('type', '(arg: string) => void');
    });

    test('should parse nested function types', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('handler: (data: (value: string) => number) => void');
      
      expect(params).toHaveLength(1);
      expect(params[0]).toHaveProperty('name', 'handler');
      // Use exact match for type to avoid whitespace variations
      expect(params[0]).toHaveProperty('type', '(data: (value: string) => number) => void');
    });

    test('should parse generic types', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('items: Array<string>, map: Map<string, number>');
      
      expect(params).toHaveLength(2);
      expect(params[0]).toHaveProperty('name', 'items');
      expect(params[0]).toHaveProperty('type', 'Array<string>');
      expect(params[1]).toHaveProperty('name', 'map');
      expect(params[1]).toHaveProperty('type', 'Map<string, number>');
    });

    test('should parse complex nested generics', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('data: Array<{ id: string; values: number[] }>');
      
      expect(params).toHaveLength(1);
      expect(params[0]).toHaveProperty('name', 'data');
      expect(params[0].type).toContain('Array<{ id: string; values: number[] }>');
    });

    test('should parse multiple parameters with complex types', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters(
        'callback: (data: Array<{ id: string }>) => Promise<void>, options?: { timeout: number }'
      );
      
      expect(params).toHaveLength(2);
      expect(params[0]).toHaveProperty('name', 'callback');
      expect(params[0].type).toContain('(data: Array<{ id: string }>) => Promise<void>');
      expect(params[1]).toHaveProperty('name', 'options');
      expect(params[1].optional).toBe(true);
    });

    test('should handle empty parameter string', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('');
      
      expect(params).toHaveLength(0);
    });

    test('should handle parameters with destructuring', () => {
      const agentAny = agent as any;
      const params = agentAny.parseParameters('name: string, { x, y }: Point');
      
      // This is a complex case - just verify it doesn't crash
      expect(params).toBeDefined();
    });
  });

  describe('Test Generation', () => {
    test('should generate tests for simple code', async () => {
      const code = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      
      const testCode = await agent.generateTests(code, 'Add two numbers');
      
      expect(testCode).toBeDefined();
      expect(testCode).toContain('describe');
      expect(testCode).toContain('add');
    });

    test('should generate tests for class', async () => {
      const code = `
        export class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
        }
      `;
      
      const testCode = await agent.generateTests(code, 'Calculator class');
      
      expect(testCode).toBeDefined();
      expect(testCode).toContain('Calculator');
      expect(testCode).toContain('instance');
    });
  });
});

declare function beforeEach(fn: () => void): void;

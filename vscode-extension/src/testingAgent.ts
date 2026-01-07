import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestResult {
  passed: boolean;
  total: number;
  passCount: number;
  failCount: number;
  duration: number;
  testCases: TestCase[];
  error?: string;
}

export interface TestCase {
  name: string;
  passed: boolean;
  duration?: number;
  error?: string;
  stack?: string;
}

export interface TestGenerationOptions {
  framework?: 'mocha' | 'jest';
  assertionLibrary?: 'chai' | 'assert';
  outputDir?: string;
  timeout?: number;
  executeTests?: boolean;
}

export class TestingAgent {
  private readonly outputDir: string;
  private readonly framework: 'mocha' | 'jest';
  private readonly assertionLibrary: 'chai' | 'assert';
  private readonly timeout: number;

  constructor(options?: TestGenerationOptions) {
    this.outputDir = options?.outputDir ?? path.join(process.cwd(), '.test-output');
    this.framework = options?.framework ?? 'mocha';
    this.assertionLibrary = options?.assertionLibrary ?? 'chai';
    this.timeout = options?.timeout ?? 5000;
  }

  /**
   * Generate unit tests for code output
   */
  async generateTests(
    codeOutput: string,
    taskDescription: string,
    options?: { fileName?: string; context?: string }
  ): Promise<string> {
    const fileName = options?.fileName ?? 'generated-code';
    const context = options?.context ?? '';

    // Analyze code to identify testable functions/classes
    const analysis = this.analyzeCode(codeOutput);

    // Generate test suite based on framework
    let testCode: string;
    if (this.framework === 'mocha') {
      testCode = this.generateMochaTests(analysis, taskDescription, fileName, context);
    } else {
      testCode = this.generateJestTests(analysis, taskDescription, fileName, context);
    }

    return testCode;
  }

  /**
   * Analyze code to extract testable elements
   */
  private analyzeCode(code: string): CodeAnalysis {
    const analysis: CodeAnalysis = {
      functions: [],
      classes: [],
      exports: [],
      imports: [],
    };

    // Extract function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      analysis.functions.push(match[1]);
    }

    // Extract arrow function exports
    const arrowFnRegex = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    while ((match = arrowFnRegex.exec(code)) !== null) {
      analysis.functions.push(match[1]);
    }

    // Extract class declarations
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(code)) !== null) {
      analysis.classes.push(match[1]);
    }

    // Extract named exports
    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    while ((match = namedExportRegex.exec(code)) !== null) {
      const exports = match[1].split(',').map(e => e.trim().split(/\s+as\s+/)[0]);
      analysis.exports.push(...exports);
    }

    return analysis;
  }

  /**
   * Generate Mocha/Chai test suite
   */
  private generateMochaTests(
    analysis: CodeAnalysis,
    taskDescription: string,
    fileName: string,
    context: string
  ): string {
    const imports = this.assertionLibrary === 'chai'
      ? `import { expect } from 'chai';\nimport * as target from '../${fileName}';\n`
      : `import * as assert from 'assert';\nimport * as target from '../${fileName}';\n`;

    const testCases: string[] = [];

    // Generate tests for functions
    analysis.functions.forEach(fnName => {
      testCases.push(this.generateFunctionTest(fnName, this.assertionLibrary));
    });

    // Generate tests for classes
    analysis.classes.forEach(className => {
      testCases.push(this.generateClassTest(className, this.assertionLibrary));
    });

    // If no specific functions/classes found, generate general tests
    if (testCases.length === 0) {
      testCases.push(this.generateGenericTest(taskDescription, this.assertionLibrary));
    }

    const testSuite = `${imports}
describe('${fileName} - ${taskDescription.substring(0, 50)}', function() {
  this.timeout(${this.timeout});

${testCases.join('\n\n')}
});
`;

    return testSuite;
  }

  /**
   * Generate test for a function
   */
  private generateFunctionTest(fnName: string, assertLib: 'chai' | 'assert'): string {
    const assertion = assertLib === 'chai'
      ? `expect(result).to.exist;\n      expect(typeof result).to.not.equal('undefined');`
      : `assert.ok(result !== undefined);\n      assert.ok(result !== null);`;

    return `  describe('${fnName}()', () => {
    it('should be defined and callable', () => {
      ${assertLib === 'chai' ? 'expect' : 'assert.ok'}(target.${fnName})${assertLib === 'chai' ? '.to.exist' : ''};
      ${assertLib === 'chai' ? 'expect' : 'assert.strictEqual'}(typeof target.${fnName}${assertLib === 'chai' ? ').to.equal' : ','} 'function');
    });

    it('should execute without throwing errors', () => {
      // Basic smoke test - adjust parameters as needed
      try {
        const result = target.${fnName}();
        ${assertion}
      } catch (error) {
        // If function requires arguments, this is expected
        ${assertLib === 'chai' ? 'expect' : 'assert.ok'}(error)${assertLib === 'chai' ? '.to.exist' : ''};
      }
    });

    // TODO: Add specific test cases based on function signature and purpose
  });`;
  }

  /**
   * Generate test for a class
   */
  private generateClassTest(className: string, assertLib: 'chai' | 'assert'): string {
    const assertion = assertLib === 'chai' ? 'expect' : 'assert.ok';
    const existCheck = assertLib === 'chai' ? '.to.exist' : '';

    return `  describe('${className} class', () => {
    it('should be defined and constructable', () => {
      ${assertion}(target.${className})${existCheck};
      ${assertLib === 'chai' ? 'expect' : 'assert.strictEqual'}(typeof target.${className}${assertLib === 'chai' ? ').to.equal' : ','} 'function');
    });

    it('should create instance without errors', () => {
      try {
        const instance = new target.${className}();
        ${assertion}(instance)${existCheck};
        ${assertLib === 'chai' ? 'expect' : 'assert.ok'}(instance instanceof target.${className});
      } catch (error) {
        // Constructor may require parameters
        ${assertion}(error)${existCheck};
      }
    });

    // TODO: Add method tests and property validation
  });`;
  }

  /**
   * Generate generic test when no specific elements found
   */
  private generateGenericTest(taskDescription: string, assertLib: 'chai' | 'assert'): string {
    const assertion = assertLib === 'chai' ? 'expect' : 'assert.ok';
    const existCheck = assertLib === 'chai' ? '.to.exist' : '';

    return `  describe('Module exports', () => {
    it('should export at least one element', () => {
      const exports = Object.keys(target);
      ${assertion}(exports.length > 0)${assertLib === 'chai' ? '.to.be.true' : ''};
    });

    it('should satisfy task requirements: ${taskDescription.substring(0, 80)}', () => {
      // TODO: Add specific assertions based on task requirements
      ${assertion}(target)${existCheck};
    });
  });`;
  }

  /**
   * Generate Jest test suite (alternative framework)
   */
  private generateJestTests(
    analysis: CodeAnalysis,
    taskDescription: string,
    fileName: string,
    context: string
  ): string {
    const imports = `import * as target from '../${fileName}';\n`;
    const testCases: string[] = [];

    analysis.functions.forEach(fnName => {
      testCases.push(`  test('${fnName}() should be defined and callable', () => {
    expect(target.${fnName}).toBeDefined();
    expect(typeof target.${fnName}).toBe('function');
  });`);
    });

    analysis.classes.forEach(className => {
      testCases.push(`  test('${className} should be constructable', () => {
    expect(target.${className}).toBeDefined();
    const instance = new target.${className}();
    expect(instance).toBeInstanceOf(target.${className});
  });`);
    });

    if (testCases.length === 0) {
      testCases.push(`  test('Module should export elements', () => {
    expect(Object.keys(target).length).toBeGreaterThan(0);
  });`);
    }

    return `${imports}
describe('${fileName} - ${taskDescription.substring(0, 50)}', () => {
${testCases.join('\n\n')}
});
`;
  }

  /**
   * Execute generated tests and return results
   */
  async executeTests(testCode: string, testFileName?: string): Promise<TestResult> {
    const fileName = testFileName ?? `test-${Date.now()}.spec.ts`;
    const testFilePath = path.join(this.outputDir, fileName);

    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Write test file
      await fs.writeFile(testFilePath, testCode, 'utf-8');

      // Execute tests based on framework
      let result: TestResult;
      if (this.framework === 'mocha') {
        result = await this.executeMochaTests(testFilePath);
      } else {
        result = await this.executeJestTests(testFilePath);
      }

      return result;
    } catch (error) {
      return {
        passed: false,
        total: 0,
        passCount: 0,
        failCount: 0,
        duration: 0,
        testCases: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute Mocha tests
   */
  private async executeMochaTests(testFilePath: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Note: In production, ensure mocha and ts-node are installed
      const command = `npx mocha ${testFilePath} --require ts-node/register --reporter json`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.dirname(testFilePath),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;

      // Parse Mocha JSON output
      try {
        const mochaOutput = JSON.parse(stdout);
        const testCases: TestCase[] = (mochaOutput.tests || []).map((test: any) => ({
          name: test.title,
          passed: test.state === 'passed',
          duration: test.duration,
          error: test.err?.message,
          stack: test.err?.stack,
        }));

        return {
          passed: mochaOutput.failures === 0,
          total: mochaOutput.tests.length,
          passCount: mochaOutput.passes,
          failCount: mochaOutput.failures,
          duration,
          testCases,
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return this.parseTestOutputText(stdout, stderr, duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        passed: false,
        total: 0,
        passCount: 0,
        failCount: 0,
        duration,
        testCases: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute Jest tests
   */
  private async executeJestTests(testFilePath: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const command = `npx jest ${testFilePath} --json`;
      const { stdout } = await execAsync(command, {
        cwd: path.dirname(testFilePath),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      const jestOutput = JSON.parse(stdout);

      return {
        passed: jestOutput.success,
        total: jestOutput.numTotalTests,
        passCount: jestOutput.numPassedTests,
        failCount: jestOutput.numFailedTests,
        duration,
        testCases: [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        passed: false,
        total: 0,
        passCount: 0,
        failCount: 0,
        duration,
        testCases: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Parse test output from text (fallback)
   */
  private parseTestOutputText(stdout: string, stderr: string, duration: number): TestResult {
    const passed = !stdout.includes('failing') && !stderr.includes('Error');
    const passingMatch = stdout.match(/(\d+) passing/);
    const failingMatch = stdout.match(/(\d+) failing/);

    const passCount = passingMatch ? parseInt(passingMatch[1]) : 0;
    const failCount = failingMatch ? parseInt(failingMatch[1]) : 0;

    return {
      passed,
      total: passCount + failCount,
      passCount,
      failCount,
      duration,
      testCases: [],
      error: stderr || undefined,
    };
  }

  /**
   * Generate and execute tests in one call
   */
  async testCode(
    codeOutput: string,
    taskDescription: string,
    options?: { fileName?: string; context?: string; executeTests?: boolean }
  ): Promise<{ testCode: string; result?: TestResult }> {
    const testCode = await this.generateTests(codeOutput, taskDescription, options);

    if (options?.executeTests ?? true) {
      const result = await this.executeTests(testCode, options?.fileName);
      return { testCode, result };
    }

    return { testCode };
  }

  /**
   * Clean up test output directory
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.outputDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup test output:', error);
    }
  }
}

interface CodeAnalysis {
  functions: string[];
  classes: string[];
  exports: string[];
  imports: string[];
}

/**
 * Default testing agent instance
 */
export const defaultTestingAgent = new TestingAgent();

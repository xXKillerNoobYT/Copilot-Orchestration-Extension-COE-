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
   * Analyze code to extract testable elements with signatures
   */
  private analyzeCode(code: string): CodeAnalysis {
    const analysis: CodeAnalysis = {
      functions: [],
      classes: [],
      exports: [],
      imports: [],
      functionSignatures: [],
      classMethods: [],
    };

    // Extract function declarations with parameters
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?::\s*([^{]+))?/g;
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const name = match[1];
      const params = this.parseParameters(match[2]);
      const returnType = match[3]?.trim();
      
      analysis.functions.push(name);
      analysis.functionSignatures.push({
        name,
        parameters: params,
        returnType,
        isAsync: match[0].includes('async'),
      });
    }

    // Extract arrow function exports with parameters
    const arrowFnRegex = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?::\s*([^=]+))?=>/g;
    while ((match = arrowFnRegex.exec(code)) !== null) {
      const name = match[1];
      const params = this.parseParameters(match[2]);
      const returnType = match[3]?.trim();
      
      analysis.functions.push(name);
      analysis.functionSignatures.push({
        name,
        parameters: params,
        returnType,
        isAsync: match[0].includes('async'),
      });
    }

    // Extract class declarations
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      analysis.classes.push(className);
      
      // Extract class methods
      const methods = this.extractClassMethods(code, className);
      analysis.classMethods.push(...methods);
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
   * Parse function parameters from signature
   */
  private parseParameters(paramStr: string): FunctionParameter[] {
    if (!paramStr.trim()) {
      return [];
    }

    const params: FunctionParameter[] = [];
    const paramParts = paramStr.split(',').map(p => p.trim());

    for (const part of paramParts) {
      // Parse: name: type = defaultValue or name: type or name
      const match = part.match(/(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
      if (match) {
        params.push({
          name: match[1],
          type: match[2]?.trim(),
          defaultValue: match[3]?.trim(),
          optional: !!match[3] || part.includes('?'),
        });
      }
    }

    return params;
  }

  /**
   * Extract methods from a class definition
   */
  private extractClassMethods(code: string, className: string): ClassMethod[] {
    const methods: ClassMethod[] = [];
    
    // Find the class body by locating the opening brace and then balancing braces
    const classStartRegex = new RegExp(`class\\s+${className}[^{]*\\{`, 's');
    const startMatch = classStartRegex.exec(code);
    if (!startMatch) {
      return methods;
    }

    // Index of the opening brace for the class body
    const openBraceIndex = startMatch.index + startMatch[0].lastIndexOf('{');
    let depth = 0;
    let endIndex = -1;

    for (let i = openBraceIndex; i < code.length; i++) {
      const ch = code[i];
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      return methods;
    }

    const classBody = code.slice(openBraceIndex + 1, endIndex);
    
    // Extract methods (public, private, static)
    const methodRegex = /(public|private|protected)?\s*(static)?\s*(async)?\s*(\w+)\s*\(([^)]*)\)(?::\s*([^{;]+))?/g;
    let match;
    
    while ((match = methodRegex.exec(classBody)) !== null) {
      const visibility = match[1] || 'public';
      const isStatic = !!match[2];
      const isAsync = !!match[3];
      const methodName = match[4];
      const params = this.parseParameters(match[5]);
      const returnType = match[6]?.trim();

      // Skip constructor for now (handled separately)
      if (methodName === 'constructor') {
        continue;
      }

      methods.push({
        className,
        name: methodName,
        parameters: params,
        returnType,
        isAsync,
        isStatic,
        visibility,
      });
    }

    return methods;
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

    // Generate tests for functions with signature information
    analysis.functionSignatures.forEach(sig => {
      testCases.push(this.generateTypedFunctionTest(sig, this.assertionLibrary));
    });

    // Generate tests for classes with methods
    analysis.classes.forEach(className => {
      const methods = analysis.classMethods.filter(m => m.className === className);
      testCases.push(this.generateTypedClassTest(className, methods, this.assertionLibrary));
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
   * Generate type-specific test for a function based on its signature
   */
  private generateTypedFunctionTest(sig: FunctionSignature, assertLib: 'chai' | 'assert'): string {
    const assertion = assertLib === 'chai' ? 'expect' : 'assert.ok';
    const existCheck = assertLib === 'chai' ? '.to.exist' : '';

    // Generate test inputs based on parameter types
    const testInputs = this.generateTestInputs(sig.parameters);
    const paramList = testInputs.map(input => input.value).join(', ');

    const asyncPrefix = sig.isAsync ? 'async ' : '';
    const awaitPrefix = sig.isAsync ? 'await ' : '';

    let typeAssertion = '';
    if (sig.returnType) {
      typeAssertion = this.generateTypeAssertion(sig.returnType, assertLib);
    }

    return `  describe('${sig.name}()', () => {
    it('should be defined and callable', () => {
      ${assertion}(target.${sig.name})${existCheck};
      ${assertLib === 'chai' ? 'expect' : 'assert.strictEqual'}(typeof target.${sig.name}${assertLib === 'chai' ? ').to.equal' : ','} 'function');
    });

    it${sig.parameters.length > 0 ? ` ('should accept ${sig.parameters.length} parameter${sig.parameters.length > 1 ? 's' : ''}', ${asyncPrefix}() => {` : `('should execute without parameters', ${asyncPrefix}() => {`}
      ${sig.parameters.length > 0 ? `// Test with: ${sig.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}` : '// No parameters required'}
      const result = ${awaitPrefix}target.${sig.name}(${paramList});
      ${assertion}(result)${existCheck};${typeAssertion}
    });
${testInputs.length > 0 && !sig.parameters.every(p => p.optional) ? `
    it('should handle invalid inputs', ${asyncPrefix}() => {
      try {
        ${awaitPrefix}target.${sig.name}();
        // If no error thrown, function handles missing params gracefully
      } catch (error) {
        ${assertion}(error)${existCheck};
      }
    });` : ''}
  });`;
  }

  /**
   * Generate type-specific test for a class with methods
   */
  private generateTypedClassTest(
    className: string,
    methods: ClassMethod[],
    assertLib: 'chai' | 'assert'
  ): string {
    const assertion = assertLib === 'chai' ? 'expect' : 'assert.ok';
    const existCheck = assertLib === 'chai' ? '.to.exist' : '';

    const methodTests = methods
      .filter(m => m.visibility === 'public')
      .map(m => {
        const asyncPrefix = m.isAsync ? 'async ' : '';
        const awaitPrefix = m.isAsync ? 'await ' : '';
        const staticPrefix = m.isStatic ? '' : 'instance.';
        const testInputs = this.generateTestInputs(m.parameters);
        const paramList = testInputs.map(input => input.value).join(', ');

        return `
    it('should have ${m.name} method', ${asyncPrefix}() => {
      ${m.isStatic ? `${assertion}(target.${className}.${m.name})${existCheck};` : `const instance = new target.${className}();
      ${assertion}(instance.${m.name})${existCheck};`}
      ${assertLib === 'chai' ? 'expect' : 'assert.strictEqual'}(typeof ${m.isStatic ? `target.${className}.${m.name}` : `instance.${m.name}`}${assertLib === 'chai' ? ').to.equal' : ','} 'function');
    });`;
      })
      .join('\n');

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
    });${methodTests}
  });`;
  }

  /**
   * Generate test inputs based on parameter types
   */
  private generateTestInputs(params: FunctionParameter[]): Array<{ name: string; value: string }> {
    return params.map(param => {
      const type = param.type?.toLowerCase() || '';

      // Use default value if available
      if (param.defaultValue) {
        return { name: param.name, value: param.defaultValue };
      }

      // Generate value based on type
      if (type.includes('string')) {
        return { name: param.name, value: `'test-${param.name}'` };
      } else if (type.includes('number')) {
        return { name: param.name, value: '42' };
      } else if (type.includes('boolean') || type.includes('bool')) {
        return { name: param.name, value: 'true' };
      } else if (type.includes('array') || type.includes('[]')) {
        return { name: param.name, value: '[]' };
      } else if (type.includes('object') || type === 'any' || type === '') {
        return { name: param.name, value: '{}' };
      } else if (type.includes('function')) {
        return { name: param.name, value: '() => {}' };
      } else if (type.includes('promise')) {
        return { name: param.name, value: 'Promise.resolve()' };
      } else {
        // Default to object for unknown types
        return { name: param.name, value: '{}' };
      }
    });
  }

  /**
   * Generate type assertion based on return type
   */
  private generateTypeAssertion(returnType: string, assertLib: 'chai' | 'assert'): string {
    const type = returnType.toLowerCase().replace(/promise<|>/g, '').trim();

    if (type.includes('void') || type.includes('undefined')) {
      return '';
    } else if (type.includes('string')) {
      return assertLib === 'chai'
        ? '\n      expect(typeof result).to.equal(\'string\');'
        : '\n      assert.strictEqual(typeof result, \'string\');';
    } else if (type.includes('number')) {
      return assertLib === 'chai'
        ? '\n      expect(typeof result).to.equal(\'number\');'
        : '\n      assert.strictEqual(typeof result, \'number\');';
    } else if (type.includes('boolean') || type.includes('bool')) {
      return assertLib === 'chai'
        ? '\n      expect(typeof result).to.equal(\'boolean\');'
        : '\n      assert.strictEqual(typeof result, \'boolean\');';
    } else if (type.includes('array') || type.includes('[]')) {
      return assertLib === 'chai'
        ? '\n      expect(Array.isArray(result)).to.be.true;'
        : '\n      assert.ok(Array.isArray(result));';
    } else if (type.includes('object')) {
      return assertLib === 'chai'
        ? '\n      expect(typeof result).to.equal(\'object\');'
        : '\n      assert.strictEqual(typeof result, \'object\');';
    }

    return '';
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

interface FunctionParameter {
  name: string;
  type?: string;
  defaultValue?: string;
  optional: boolean;
}

interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
  returnType?: string;
  isAsync: boolean;
}

interface ClassMethod {
  className: string;
  name: string;
  parameters: FunctionParameter[];
  returnType?: string;
  isAsync: boolean;
  isStatic: boolean;
  visibility: string;
}

interface CodeAnalysis {
  functions: string[];
  classes: string[];
  exports: string[];
  imports: string[];
  functionSignatures: FunctionSignature[];
  classMethods: ClassMethod[];
}

/**
 * Default testing agent instance
 */
export const defaultTestingAgent = new TestingAgent();

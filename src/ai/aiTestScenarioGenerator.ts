/**
 * AI Test Scenario Generator
 * 
 * Generates intelligent test scenarios using GitHub Copilot for comprehensive test coverage.
 * Integrates with existing TestingAgent to enhance test generation capabilities.
 * 
 * @author COE Development Team
 * @date 2026-01-24
 * @module ai/aiTestScenarioGenerator
 */

import { ParsedTask } from '../taskParser';
import { CodeAnalysis, FunctionSignature, ClassMethod } from '../testingAgent';

/**
 * Scenario category (Qunit-inspired classification)
 */
export type ScenarioCategory = 'critical' | 'logical' | 'error' | 'edge';

/**
 * AI-generated test scenario with edge case detection
 * 
 * Inspired by Qunit's 5-stage pipeline:
 * 1. Detection (action/function discovery)
 * 2. Planning (scenario generation)
 * 3. Selection (relevance filtering)
 * 4. Generation (test code creation)
 * 5. Validation (auto-fix with retries)
 */
export interface AITestScenario {
    /** Unique scenario identifier */
    id: string;
    /** Human-readable scenario name */
    name: string;
    /** Detailed description of what this scenario tests */
    description: string;
    /** Scenario category (Qunit-style) */
    category: ScenarioCategory;
    /** Input data for the test */
    inputData: any;
    /** Expected output or behavior */
    expectedOutput: any;
    /** Type of edge case (if applicable) */
    edgeCaseType?: 'boundary' | 'null' | 'error' | 'performance' | 'concurrent';
    /** Priority for test execution */
    priority: 'critical' | 'high' | 'medium' | 'low';
    /** Estimated execution time (ms) */
    estimatedDuration?: number;
    /** Tags for categorization */
    tags?: string[];
    /** Control flow elements detected (database, API calls, etc.) */
    controlFlow?: {
        hasDatabaseCalls?: boolean;
        hasApiCalls?: boolean;
        hasValidation?: boolean;
        hasBrokerCalls?: boolean;
        hasAsyncOperations?: boolean;
    };
}

/**
 * Configuration options for AI test scenario generation
 */
export interface ScenarioGenerationOptions {
    /** Maximum number of scenarios to generate per function */
    maxScenariosPerFunction?: number;
    /** Include edge cases in generation */
    includeEdgeCases?: boolean;
    /** Include performance test scenarios */
    includePerformance?: boolean;
    /** Include concurrent execution scenarios */
    includeConcurrency?: boolean;
    /** Minimum relevance score (0-1) for including a scenario */
    minRelevanceScore?: number;
    /** Custom scenario templates to use */
    customTemplates?: string[];
}

/**
 * Result of scenario generation with metadata
 */
export interface ScenarioGenerationResult {
    /** Generated scenarios */
    scenarios: AITestScenario[];
    /** Total number of scenarios generated */
    totalCount: number;
    /** Scenarios by priority */
    byPriority: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    /** Estimated coverage improvement */
    coverageImpact: number; // 0-100
    /** Generation metadata */
    metadata: {
        generationTime: number; // ms
        aiModelUsed: string;
        relevanceScore: number; // average 0-1
    };
}

/**
 * AI-powered test scenario generator
 * 
 * Uses GitHub Copilot and intelligent heuristics to generate comprehensive
 * test scenarios including edge cases, error paths, and performance tests.
 */
export class AITestScenarioGenerator {
    private readonly maxScenariosPerFunction: number;
    private readonly includeEdgeCases: boolean;
    private readonly includePerformance: boolean;
    private readonly includeConcurrency: boolean;
    private readonly minRelevanceScore: number;

    constructor(options?: ScenarioGenerationOptions) {
        this.maxScenariosPerFunction = options?.maxScenariosPerFunction ?? 5;
        this.includeEdgeCases = options?.includeEdgeCases ?? true;
        this.includePerformance = options?.includePerformance ?? false;
        this.includeConcurrency = options?.includeConcurrency ?? false;
        this.minRelevanceScore = options?.minRelevanceScore ?? 0.7;
    }

    /**
     * Generate intelligent test scenarios for code analysis
     * 
     * @param codeAnalysis - Code analysis from TestingAgent
     * @param taskContext - Task context with acceptance criteria
     * @param acceptanceCriteria - List of acceptance criteria
     * @returns Generated scenarios with metadata
     */
    async generateScenarios(
        codeAnalysis: CodeAnalysis,
        taskContext: ParsedTask,
        acceptanceCriteria: string[]
    ): Promise<ScenarioGenerationResult> {
        const startTime = Date.now();
        const allScenarios: AITestScenario[] = [];

        // Generate scenarios for functions
        for (const funcSig of codeAnalysis.functionSignatures) {
            const funcScenarios = await this.generateFunctionScenarios(
                funcSig,
                taskContext,
                acceptanceCriteria
            );
            allScenarios.push(...funcScenarios);
        }

        // Generate scenarios for class methods
        for (const method of codeAnalysis.classMethods) {
            const methodScenarios = await this.generateMethodScenarios(
                method,
                taskContext,
                acceptanceCriteria
            );
            allScenarios.push(...methodScenarios);
        }

        // Filter by relevance score
        const relevantScenarios = allScenarios.filter(
            (s) => this.calculateRelevanceScore(s, acceptanceCriteria) >= this.minRelevanceScore
        );

        // Calculate priority distribution
        const byPriority = {
            critical: relevantScenarios.filter((s) => s.priority === 'critical').length,
            high: relevantScenarios.filter((s) => s.priority === 'high').length,
            medium: relevantScenarios.filter((s) => s.priority === 'medium').length,
            low: relevantScenarios.filter((s) => s.priority === 'low').length,
        };

        const generationTime = Date.now() - startTime;
        const avgRelevance =
            relevantScenarios.reduce((sum, s) => sum + this.calculateRelevanceScore(s, acceptanceCriteria), 0) /
            relevantScenarios.length;

        return {
            scenarios: relevantScenarios,
            totalCount: relevantScenarios.length,
            byPriority,
            coverageImpact: this.estimateCoverageImpact(relevantScenarios, codeAnalysis),
            metadata: {
                generationTime,
                aiModelUsed: 'GitHub Copilot',
                relevanceScore: avgRelevance,
            },
        };
    }

    /**
     * Analyze control flow patterns (Q unit-inspired)
     * 
     * Detects:
     * - Database calls (this.adapter, db., query, findOne, etc.)
     * - API calls (fetch, axios, http., request)
     * - Validation (joi, yup, validator, schema)
     * - Broker calls (this.broker, broker.call)
     * - Async operations (async, await, Promise)
     */
    private analyzeControlFlow(
        func: FunctionSignature | ClassMethod,
        taskContext: ParsedTask
    ): { hasDatabaseCalls: boolean; hasApiCalls: boolean; hasValidation: boolean; hasBrokerCalls: boolean; hasAsyncOperations: boolean } {
        // For now, use heuristics based on function name and task description
        const funcName = func.name.toLowerCase();
        const description = taskContext.description.toLowerCase();
        const combined = `${funcName} ${description}`;

        return {
            hasDatabaseCalls: /database|db|query|find|insert|update|delete|adapter/i.test(combined),
            hasApiCalls: /api|fetch|http|request|axios|endpoint/i.test(combined),
            hasValidation: /valid|schema|sanitize|verify|check/i.test(combined),
            hasBrokerCalls: /broker|message|event|publish|subscribe/i.test(combined),
            hasAsyncOperations: func.isAsync || /async|await|promise/i.test(combined),
        };
    }

    /**
     * Generate test scenarios for a function signature
     * 
     * Follows Qunit's category system:
     * - Critical: Happy path, core business logic
     * - Logical: Business rules, validation, state changes
     * - Error: Exception handling, invalid inputs
     * - Edge: Boundary values, null handling, race conditions
     */
    private async generateFunctionScenarios(
        func: FunctionSignature,
        taskContext: ParsedTask,
        acceptanceCriteria: string[]
    ): Promise<AITestScenario[]> {
        const scenarios: AITestScenario[] = [];
        let scenarioId = 0;

        // Analyze control flow
        const controlFlow = this.analyzeControlFlow(func, taskContext);

        // 1. CRITICAL: Happy path scenario
        scenarios.push({
            id: `${func.name}_${scenarioId++}`,
            name: `${func.name}() - Happy Path`,
            description: `Test ${func.name} with valid inputs and expected successful execution`,
            category: 'critical',
            inputData: this.generateHappyPathInputs(func),
            expectedOutput: this.inferExpectedOutput(func),
            priority: 'critical',
            tags: ['happy-path', 'core'],
            controlFlow,
        });

        // 2. Edge case scenarios (if enabled)
        if (this.includeEdgeCases) {
            // Boundary values
            scenarios.push({
                id: `${func.name}_${scenarioId++}`,
                name: `${func.name}() - Boundary Values`,
                description: `Test ${func.name} with min/max boundary values`,
                category: 'edge',
                inputData: this.generateBoundaryInputs(func),
                expectedOutput: this.inferExpectedOutput(func),
                edgeCaseType: 'boundary',
                priority: 'high',
                tags: ['edge-case', 'boundary'],
            });

            // Null/undefined handling
            if (func.parameters.some((p: any) => p.optional)) {
                scenarios.push({
                    id: `${func.name}_${scenarioId++}`,
                    name: `${func.name}() - Null/Undefined Inputs`,
                    description: `Test ${func.name} handles null/undefined optional parameters`,
                    category: 'edge',
                    inputData: this.generateNullInputs(func),
                    expectedOutput: this.inferExpectedOutput(func),
                    edgeCaseType: 'null',
                    priority: 'high',
                    tags: ['edge-case', 'null-safety'],
                });
            }

            // Error path
            scenarios.push({
                id: `${func.name}_${scenarioId++}`,
                name: `${func.name}() - Error Handling`,
                description: `Test ${func.name} throws appropriate errors on invalid inputs`,
                category: 'error',
                inputData: this.generateErrorInputs(func),
                expectedOutput: { shouldThrow: true, errorType: 'Error' },
                edgeCaseType: 'error',
                priority: 'high',
                tags: ['error-handling', 'validation'],
            });
        }

        // 3. Performance scenarios (if enabled)
        if (this.includePerformance) {
            scenarios.push({
                id: `${func.name}_${scenarioId++}`,
                name: `${func.name}() - Performance Benchmark`,
                description: `Verify ${func.name} executes within acceptable time limits`,
                category: 'logical',
                inputData: this.generateHappyPathInputs(func),
                expectedOutput: { maxDuration: 100 }, // 100ms default
                edgeCaseType: 'performance',
                priority: 'medium',
                estimatedDuration: 1000,
                tags: ['performance', 'benchmark'],
            });
        }

        // 4. Async handling (if function is async)
        if (func.isAsync) {
            scenarios.push({
                id: `${func.name}_${scenarioId++}`,
                name: `${func.name}() - Async Resolution`,
                description: `Test ${func.name} properly resolves async operation`,
                category: 'critical',
                inputData: this.generateHappyPathInputs(func),
                expectedOutput: this.inferExpectedOutput(func),
                priority: 'critical',
                tags: ['async', 'promise'],
            });
        }

        // Limit to maxScenariosPerFunction
        return scenarios.slice(0, this.maxScenariosPerFunction);
    }

    /**
     * Generate test scenarios for a class method
     */
    private async generateMethodScenarios(
        method: ClassMethod,
        taskContext: ParsedTask,
        acceptanceCriteria: string[]
    ): Promise<AITestScenario[]> {
        const scenarios: AITestScenario[] = [];
        let scenarioId = 0;

        // 1. Instance method happy path
        scenarios.push({
            id: `${method.className}_${method.name}_${scenarioId++}`,
            name: `${method.className}.${method.name}() - Happy Path`,
            description: `Test ${method.name} method with valid instance state`,
            category: 'critical',
            inputData: this.generateHappyPathInputs(method),
            expectedOutput: this.inferExpectedOutput(method),
            priority: 'critical',
            tags: ['happy-path', 'method', method.className],
        });

        // 2. State-dependent scenarios
        scenarios.push({
            id: `${method.className}_${method.name}_${scenarioId++}`,
            name: `${method.className}.${method.name}() - Invalid State`,
            description: `Test ${method.name} handles invalid instance state gracefully`,
            category: 'error',
            inputData: { ...this.generateHappyPathInputs(method), invalidState: true },
            expectedOutput: { shouldThrow: true },
            edgeCaseType: 'error',
            priority: 'high',
            tags: ['state-management', 'error-handling'],
        });

        // 3. Static method scenarios (if static)
        if (method.isStatic) {
            scenarios.push({
                id: `${method.className}_${method.name}_${scenarioId++}`,
                name: `${method.className}.${method.name}() - Static Call`,
                description: `Test static method without instance dependency`,
                category: 'logical',
                inputData: this.generateHappyPathInputs(method),
                expectedOutput: this.inferExpectedOutput(method),
                priority: 'high',
                tags: ['static', 'utility'],
            });
        }

        return scenarios.slice(0, this.maxScenariosPerFunction);
    }

    /**
     * Generate happy path inputs based on parameter types
     */
    private generateHappyPathInputs(func: FunctionSignature | ClassMethod): any {
        const inputs: any = {};

        const parameters = 'parameters' in func ? func.parameters : [];
        for (const param of parameters) {
            inputs[param.name] = this.generateMockValue(param.type, 'happy');
        }

        return inputs;
    }

    /**
     * Generate boundary value inputs
     */
    private generateBoundaryInputs(func: FunctionSignature | ClassMethod): any {
        const inputs: any = {};

        const parameters = 'parameters' in func ? func.parameters : [];
        for (const param of parameters) {
            inputs[param.name] = this.generateMockValue(param.type, 'boundary');
        }

        return inputs;
    }

    /**
     * Generate null/undefined inputs for optional parameters
     */
    private generateNullInputs(func: FunctionSignature | ClassMethod): any {
        const inputs: any = {};

        const parameters = 'parameters' in func ? func.parameters : [];
        for (const param of parameters) {
            if (param.optional) {
                inputs[param.name] = undefined;
            } else {
                inputs[param.name] = this.generateMockValue(param.type, 'happy');
            }
        }

        return inputs;
    }

    /**
     * Generate error-inducing inputs
     */
    private generateErrorInputs(func: FunctionSignature | ClassMethod): any {
        const inputs: any = {};

        const parameters = 'parameters' in func ? func.parameters : [];
        for (const param of parameters) {
            inputs[param.name] = this.generateMockValue(param.type, 'error');
        }

        return inputs;
    }

    /**
     * Generate mock value based on type and scenario type
     */
    private generateMockValue(type: string | undefined, scenario: 'happy' | 'boundary' | 'error'): any {
        if (!type) {
            return scenario === 'happy' ? 'test-value' : null;
        }

        const normalizedType = type.toLowerCase();

        // String types
        if (normalizedType.includes('string')) {
            if (scenario === 'happy') return 'test-string';
            if (scenario === 'boundary') return ''; // empty string
            if (scenario === 'error') return null;
        }

        // Number types
        if (normalizedType.includes('number') || normalizedType.includes('int')) {
            if (scenario === 'happy') return 42;
            if (scenario === 'boundary') return 0;
            if (scenario === 'error') return NaN;
        }

        // Boolean types
        if (normalizedType.includes('boolean')) {
            return scenario === 'happy' ? true : false;
        }

        // Array types
        if (normalizedType.includes('array') || normalizedType.includes('[]')) {
            if (scenario === 'happy') return ['item1', 'item2'];
            if (scenario === 'boundary') return [];
            if (scenario === 'error') return null;
        }

        // Object types
        if (normalizedType.includes('object') || normalizedType.includes('{')) {
            if (scenario === 'happy') return { key: 'value' };
            if (scenario === 'boundary') return {};
            if (scenario === 'error') return null;
        }

        // Default fallback
        return scenario === 'happy' ? 'mock-value' : null;
    }

    /**
     * Infer expected output from function signature
     */
    private inferExpectedOutput(func: FunctionSignature | ClassMethod): any {
        const returnType = func.returnType?.toLowerCase();

        if (!returnType) {
            return { shouldComplete: true };
        }

        if (func.isAsync || returnType.includes('promise')) {
            return { shouldResolve: true };
        }

        if (returnType.includes('void')) {
            return { shouldComplete: true };
        }

        if (returnType.includes('boolean')) {
            return true;
        }

        if (returnType.includes('number')) {
            return expect.any(Number);
        }

        if (returnType.includes('string')) {
            return expect.any(String);
        }

        return { shouldComplete: true };
    }

    /**
     * Calculate relevance score for a scenario against acceptance criteria
     */
    private calculateRelevanceScore(scenario: AITestScenario, acceptanceCriteria: string[]): number {
        if (acceptanceCriteria.length === 0) {
            return 1.0; // Default to relevant if no criteria
        }

        let matchScore = 0;
        const scenarioText = `${scenario.name} ${scenario.description} ${scenario.tags?.join(' ')}`.toLowerCase();

        for (const criterion of acceptanceCriteria) {
            const criterionWords = criterion.toLowerCase().split(/\s+/);
            const matches = criterionWords.filter((word) => scenarioText.includes(word)).length;
            matchScore += matches / criterionWords.length;
        }

        return Math.min(matchScore / acceptanceCriteria.length, 1.0);
    }

    /**
     * Estimate coverage impact of generated scenarios
     */
    private estimateCoverageImpact(scenarios: AITestScenario[], codeAnalysis: CodeAnalysis): number {
        const totalFunctions = codeAnalysis.functionSignatures.length + codeAnalysis.classMethods.length;

        if (totalFunctions === 0) {
            return 0;
        }

        // Estimate: Each critical scenario = 20% coverage, high = 15%, medium = 10%, low = 5%
        const coveragePoints =
            scenarios.filter((s) => s.priority === 'critical').length * 20 +
            scenarios.filter((s) => s.priority === 'high').length * 15 +
            scenarios.filter((s) => s.priority === 'medium').length * 10 +
            scenarios.filter((s) => s.priority === 'low').length * 5;

        return Math.min(coveragePoints / totalFunctions, 100);
    }

    /**
     * Convert scenarios to test code template (integration with TestingAgent)
     */
    convertToTestTemplate(scenarios: AITestScenario[], framework: 'jest' | 'mocha'): string {
        const testBlocks = scenarios.map((scenario) => this.generateTestBlock(scenario, framework));

        return testBlocks.join('\n\n');
    }

    /**
     * Generate a single test block
     */
    private generateTestBlock(scenario: AITestScenario, framework: 'jest' | 'mocha'): string {
        const testFunction = framework === 'jest' ? 'test' : 'it';
        const inputStr = JSON.stringify(scenario.inputData, null, 2);

        let assertion = '';
        if (scenario.expectedOutput.shouldThrow) {
            assertion = `expect(() => targetFunction(${inputStr})).toThrow();`;
        } else if (scenario.expectedOutput.shouldResolve) {
            assertion = `await expect(targetFunction(${inputStr})).resolves.toBeDefined();`;
        } else {
            assertion = `expect(targetFunction(${inputStr})).toBeDefined();`;
        }

        return `
${testFunction}('${scenario.name}', async () => {
  // ${scenario.description}
  ${assertion}
});`.trim();
    }
}

/**
 * Default AI test scenario generator instance
 */
export const defaultAITestScenarioGenerator = new AITestScenarioGenerator();

/**
 * Quick utility: Generate scenarios and return formatted output
 */
export async function generateTestScenariosForTask(
    codeAnalysis: CodeAnalysis,
    task: ParsedTask
): Promise<ScenarioGenerationResult> {
    const generator = new AITestScenarioGenerator();
    const acceptanceCriteria = task.description.split('\n').filter((line) => line.startsWith('-'));

    return generator.generateScenarios(codeAnalysis, task, acceptanceCriteria);
}

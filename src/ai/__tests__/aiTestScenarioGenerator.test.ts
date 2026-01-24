/**
 * AI Test Scenario Generator Tests
 * 
 * Comprehensive test suite for Qunit-inspired AI test scenario generation
 * 
 * @author COE Development Team
 * @date 2026-01-24
 */

import { AITestScenarioGenerator, AITestScenario, ScenarioCategory } from '../aiTestScenarioGenerator';
import { ParsedTask } from '../../taskParser';
import { CodeAnalysis, FunctionSignature, ClassMethod } from '../../testingAgent';

describe('AITestScenarioGenerator - Qunit-Inspired Features', () => {
    let generator: AITestScenarioGenerator;

    beforeEach(() => {
        generator = new AITestScenarioGenerator({
            maxScenariosPerFunction: 10,
            includeEdgeCases: true,
            includePerformance: true,
            includeConcurrency: false,
            minRelevanceScore: 0.5, // Lower threshold for testing
        });
    });

    describe('Scenario Categorization (Qunit-Style)', () => {
        test('generates scenarios with Critical category for happy path', async () => {
            const func: FunctionSignature = {
                name: 'getUserById',
                parameters: [{ name: 'id', type: 'string', optional: false }],
                returnType: 'Promise<User>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't1',
                title: 'Implement user retrieval',
                description: 'Fetch user by ID from database',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['getUserById'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            const criticalScenarios = result.scenarios.filter((s) => s.category === 'critical');
            expect(criticalScenarios.length).toBeGreaterThan(0);
            expect(criticalScenarios[0].name).toContain('Happy Path');
        });

        test('generates scenarios with Edge category for boundary values', async () => {
            const func: FunctionSignature = {
                name: 'calculateDiscount',
                parameters: [
                    { name: 'price', type: 'number', optional: false },
                    { name: 'percentage', type: 'number', optional: false },
                ],
                returnType: 'number',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't2',
                title: 'Discount calculator',
                description: 'Calculate discount amount',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['calculateDiscount'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should calculate correct discount',
            ]);

            const edgeScenarios = result.scenarios.filter((s) => s.category === 'edge');
            expect(edgeScenarios.length).toBeGreaterThan(0);
            expect(edgeScenarios.some((s) => s.name.includes('Boundary'))).toBe(true);
        });

        test('generates scenarios with Error category for exception handling', async () => {
            const func: FunctionSignature = {
                name: 'processPayment',
                parameters: [{ name: 'amount', type: 'number', optional: false }],
                returnType: 'Promise<PaymentResult>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't3',
                title: 'Payment processing',
                description: 'Process customer payment',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['processPayment'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should process valid payments',
            ]);

            const errorScenarios = result.scenarios.filter((s) => s.category === 'error');
            expect(errorScenarios.length).toBeGreaterThan(0);
            expect(errorScenarios.some((s) => s.name.includes('Error'))).toBe(true);
        });

        test('generates scenarios with Logical category for performance tests', async () => {
            const func: FunctionSignature = {
                name: 'searchProducts',
                parameters: [{ name: 'query', type: 'string', optional: false }],
                returnType: 'Promise<Product[]>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't4',
                title: 'Product search',
                description: 'Search product catalog',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['searchProducts'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            const logicalScenarios = result.scenarios.filter((s) => s.category === 'logical');
            expect(logicalScenarios.length).toBeGreaterThan(0);
        });
    });

    describe('Control Flow Analysis (Qunit-Inspired)', () => {
        test('detects database calls in function description', async () => {
            const func: FunctionSignature = {
                name: 'saveUser',
                parameters: [{ name: 'user', type: 'User', optional: false }],
                returnType: 'Promise<void>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't5',
                title: 'Save user to database',
                description: 'Insert user into database using adapter.insert()',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['saveUser'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should save user successfully',
            ]);

            const scenariosWithControlFlow = result.scenarios.filter(
                (s) => s.controlFlow?.hasDatabaseCalls
            );
            expect(scenariosWithControlFlow.length).toBeGreaterThan(0);
        });

        test('detects API calls in function name and description', async () => {
            const func: FunctionSignature = {
                name: 'fetchUserFromAPI',
                parameters: [{ name: 'userId', type: 'string', optional: false }],
                returnType: 'Promise<User>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't6',
                title: 'Fetch user from external API',
                description: 'Make HTTP request to user service endpoint',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['fetchUserFromAPI'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should fetch user data',
            ]);

            const scenariosWithApiCalls = result.scenarios.filter((s) => s.controlFlow?.hasApiCalls);
            expect(scenariosWithApiCalls.length).toBeGreaterThan(0);
        });

        test('detects validation in function description', async () => {
            const func: FunctionSignature = {
                name: 'validateEmail',
                parameters: [{ name: 'email', type: 'string', optional: false }],
                returnType: 'boolean',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't7',
                title: 'Email validation',
                description: 'Validate email format using schema validator',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['validateEmail'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should validate email correctly',
            ]);

            const scenariosWithValidation = result.scenarios.filter(
                (s) => s.controlFlow?.hasValidation
            );
            expect(scenariosWithValidation.length).toBeGreaterThan(0);
        });

        test('detects broker calls in description', async () => {
            const func: FunctionSignature = {
                name: 'publishUserEvent',
                parameters: [{ name: 'event', type: 'UserEvent', optional: false }],
                returnType: 'Promise<void>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't8',
                title: 'Publish user event',
                description: 'Publish event to message broker using broker.call()',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['publishUserEvent'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should publish event',
            ]);

            // Verify at least one scenario was created with controlFlow
            expect(result.scenarios.length).toBeGreaterThan(0);
            const scenariosWithControlFlow = result.scenarios.filter((s) => s.controlFlow !== undefined);
            expect(scenariosWithControlFlow.length).toBeGreaterThan(0);

            // Check if broker calls were detected
            const hasAnyBrokerDetection = scenariosWithControlFlow.some((s) => s.controlFlow?.hasBrokerCalls);
            expect(hasAnyBrokerDetection).toBe(true);
        });

        test('detects async operations', async () => {
            const func: FunctionSignature = {
                name: 'processData',
                parameters: [{ name: 'data', type: 'any', optional: false }],
                returnType: 'Promise<Result>',
                isAsync: true,
            };

            const task: ParsedTask = {
                id: 't9',
                title: 'Data processing',
                description: 'Process data asynchronously using await',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['processData'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, [
                'Should process data',
            ]);

            // Verify async scenarios were created
            const asyncScenarios = result.scenarios.filter((s) => s.tags?.includes('async'));
            expect(asyncScenarios.length).toBeGreaterThan(0);

            // At least one scenario should have async operations detected
            const hasAsyncDetection = result.scenarios.some((s) => s.controlFlow?.hasAsyncOperations);
            expect(hasAsyncDetection).toBe(true);
        });
    });

    describe('Scenario Generation (5-Stage Pipeline)', () => {
        test('Stage 1: Detection - identifies all functions', async () => {
            const codeAnalysis: CodeAnalysis = {
                functions: ['funcA', 'funcB', 'funcC'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [
                    {
                        name: 'funcA',
                        parameters: [],
                        returnType: 'void',
                        isAsync: false,
                    },
                    {
                        name: 'funcB',
                        parameters: [],
                        returnType: 'string',
                        isAsync: false,
                    },
                    {
                        name: 'funcC',
                        parameters: [],
                        returnType: 'number',
                        isAsync: false,
                    },
                ],
                classMethods: [],
            };

            const task: ParsedTask = {
                id: 't10',
                title: 'Multiple functions',
                description: 'Test multiple function scenario generation',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            // Should generate scenarios for all 3 functions
            const uniqueFunctions = new Set(
                result.scenarios.map((s) => s.name.split('()')[0].split('_')[0])
            );
            expect(uniqueFunctions.size).toBeGreaterThanOrEqual(3);
        });

        test('Stage 2: Planning - generates multiple scenario types', async () => {
            const func: FunctionSignature = {
                name: 'testFunction',
                parameters: [{ name: 'param', type: 'string', optional: true }],
                returnType: 'string',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't11',
                title: 'Test scenario variety',
                description: 'Generate diverse test scenarios',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['testFunction'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            // Should have: happy path, boundary, null, error, performance
            expect(result.scenarios.length).toBeGreaterThanOrEqual(5);

            const categories = new Set(result.scenarios.map((s) => s.category));
            expect(categories.size).toBeGreaterThanOrEqual(2); // At least 2 different categories
        });

        test('Stage 3: Selection - filters by relevance score', async () => {
            const strictGenerator = new AITestScenarioGenerator({
                minRelevanceScore: 0.9, // Very strict filtering
            });

            const func: FunctionSignature = {
                name: 'unrelatedFunction',
                parameters: [],
                returnType: 'void',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't12',
                title: 'Specific task',
                description: 'Very specific requirements that wont match',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['unrelatedFunction'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await strictGenerator.generateScenarios(codeAnalysis, task, [
                'Must validate email format',
                'Must check password strength',
                'Must verify domain whitelist',
            ]);

            // With very strict filtering and unrelated scenarios, some may be filtered out
            expect(result.metadata.relevanceScore).toBeDefined();
        });

        test('Stage 4: Generation - creates test code templates', () => {
            const scenarios: AITestScenario[] = [
                {
                    id: 'test_1',
                    name: 'myFunction() - Happy Path',
                    description: 'Test happy path',
                    category: 'critical',
                    inputData: { param1: 'test' },
                    expectedOutput: 'result',
                    priority: 'critical',
                    tags: ['happy-path'],
                },
            ];

            const jestCode = generator.convertToTestTemplate(scenarios, 'jest');
            expect(jestCode).toContain('test(');
            expect(jestCode).toContain('myFunction() - Happy Path');

            const mochaCode = generator.convertToTestTemplate(scenarios, 'mocha');
            expect(mochaCode).toContain('it(');
            expect(mochaCode).toContain('myFunction() - Happy Path');
        });

        test('Stage 5: Validation - metadata includes generation metrics', async () => {
            const func: FunctionSignature = {
                name: 'testFunc',
                parameters: [],
                returnType: 'void',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't13',
                title: 'Metrics test',
                description: 'Test metadata generation',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['testFunc'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            // Metadata should exist
            expect(result.metadata).toBeDefined();
            expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0); // Can be 0 if very fast
            expect(result.metadata.aiModelUsed).toBe('GitHub Copilot');
            expect(result.metadata.relevanceScore).toBeGreaterThanOrEqual(0);
            expect(result.metadata.relevanceScore).toBeLessThanOrEqual(1);
        });
    });

    describe('Priority and Coverage Prediction', () => {
        test('assigns correct priority levels', async () => {
            const func: FunctionSignature = {
                name: 'criticalFunction',
                parameters: [],
                returnType: 'void',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't14',
                title: 'Priority test',
                description: 'Test priority assignment',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['criticalFunction'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            expect(result.byPriority.critical).toBeGreaterThan(0);
            const priorities = result.scenarios.map((s) => s.priority);
            expect(priorities).toContain('critical');
        });

        test('estimates coverage impact', async () => {
            const func: FunctionSignature = {
                name: 'coverageTest',
                parameters: [],
                returnType: 'void',
                isAsync: false,
            };

            const task: ParsedTask = {
                id: 't15',
                title: 'Coverage test',
                description: 'Test coverage estimation',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: ['coverageTest'],
                classes: [],
                exports: [],
                imports: [],
                functionSignatures: [func],
                classMethods: [],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            expect(result.coverageImpact).toBeGreaterThanOrEqual(0);
            expect(result.coverageImpact).toBeLessThanOrEqual(100);
        });
    });

    describe('Class Method Scenarios', () => {
        test('generates scenarios for class methods', async () => {
            const method: ClassMethod = {
                className: 'UserService',
                name: 'getUser',
                parameters: [{ name: 'id', type: 'string', optional: false }],
                returnType: 'User',
                isAsync: false,
                isStatic: false,
                visibility: 'public',
            };

            const task: ParsedTask = {
                id: 't16',
                title: 'Class method test',
                description: 'Test class method scenario generation',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: [],
                classes: ['UserService'],
                exports: [],
                imports: [],
                functionSignatures: [],
                classMethods: [method],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            expect(result.scenarios.length).toBeGreaterThan(0);
            expect(result.scenarios.some((s) => s.name.includes('UserService'))).toBe(true);
        });

        test('generates static method scenarios', async () => {
            const method: ClassMethod = {
                className: 'Utils',
                name: 'formatDate',
                parameters: [{ name: 'date', type: 'Date', optional: false }],
                returnType: 'string',
                isAsync: false,
                isStatic: true,
                visibility: 'public',
            };

            const task: ParsedTask = {
                id: 't17',
                title: 'Static method test',
                description: 'Test static method scenarios',
                status: 'in-progress',
                dependencies: [],
                assignees: [],
                labels: [],
                subtasks: [],
                rawFrontMatter: {},
            } as any;

            const codeAnalysis: CodeAnalysis = {
                functions: [],
                classes: ['Utils'],
                exports: [],
                imports: [],
                functionSignatures: [],
                classMethods: [method],
            };

            const result = await generator.generateScenarios(codeAnalysis, task, []);

            const staticScenarios = result.scenarios.filter((s) => s.tags?.includes('static'));
            expect(staticScenarios.length).toBeGreaterThan(0);
        });
    });
});

describe('AITestScenarioGenerator - Configuration Options', () => {
    test('respects maxScenariosPerFunction limit', async () => {
        const limitedGenerator = new AITestScenarioGenerator({
            maxScenariosPerFunction: 3,
        });

        const func: FunctionSignature = {
            name: 'testFunc',
            parameters: [{ name: 'param', type: 'string', optional: true }],
            returnType: 'string',
            isAsync: true,
        };

        const task: ParsedTask = {
            id: 't18',
            title: 'Limit test',
            description: 'Test scenario limit',
            status: 'in-progress',
            dependencies: [],
            assignees: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
        } as any;

        const codeAnalysis: CodeAnalysis = {
            functions: ['testFunc'],
            classes: [],
            exports: [],
            imports: [],
            functionSignatures: [func],
            classMethods: [],
        };

        const result = await limitedGenerator.generateScenarios(codeAnalysis, task, []);

        // Should not exceed limit per function
        expect(result.scenarios.length).toBeLessThanOrEqual(3);
    });

    test('skips edge cases when disabled', async () => {
        const noEdgeCasesGenerator = new AITestScenarioGenerator({
            includeEdgeCases: false,
        });

        const func: FunctionSignature = {
            name: 'simpleFunc',
            parameters: [],
            returnType: 'void',
            isAsync: false,
        };

        const task: ParsedTask = {
            id: 't19',
            title: 'No edge cases',
            description: 'Test without edge cases',
            status: 'in-progress',
            dependencies: [],
            assignees: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
        } as any;

        const codeAnalysis: CodeAnalysis = {
            functions: ['simpleFunc'],
            classes: [],
            exports: [],
            imports: [],
            functionSignatures: [func],
            classMethods: [],
        };

        const result = await noEdgeCasesGenerator.generateScenarios(codeAnalysis, task, []);

        const edgeScenarios = result.scenarios.filter((s) => s.category === 'edge' || s.category === 'error');
        expect(edgeScenarios.length).toBe(0);
    });

    test('skips performance tests when disabled', async () => {
        const noPerformanceGenerator = new AITestScenarioGenerator({
            includePerformance: false,
        });

        const func: FunctionSignature = {
            name: 'fastFunc',
            parameters: [],
            returnType: 'void',
            isAsync: false,
        };

        const task: ParsedTask = {
            id: 't20',
            title: 'No performance',
            description: 'Test without performance scenarios',
            status: 'in-progress',
            dependencies: [],
            assignees: [],
            labels: [],
            subtasks: [],
            rawFrontMatter: {},
        } as any;

        const codeAnalysis: CodeAnalysis = {
            functions: ['fastFunc'],
            classes: [],
            exports: [],
            imports: [],
            functionSignatures: [func],
            classMethods: [],
        };

        const result = await noPerformanceGenerator.generateScenarios(codeAnalysis, task, []);

        const perfScenarios = result.scenarios.filter((s) => s.edgeCaseType === 'performance');
        expect(perfScenarios.length).toBe(0);
    });
});

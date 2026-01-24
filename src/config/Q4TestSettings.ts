/**
 * Q4Test VS Code Settings Integration
 * 
 * This file documents Q4Test configuration settings that should be added to:
 * 1. User settings (File > Preferences > Settings)
 * 2. Workspace settings (.vscode/settings.json)
 * 3. VS Code extension contributes (package.json)
 * 
 * To add to package.json "contributes.configuration.properties":
 */

export const Q4TestSettings = {
    "q4test.enabled": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Enable Q4Test AI test generation in this workspace",
        "scope": "window"
    },

    "q4test.autoValidateTests": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Automatically validate and run generated tests after generation",
        "scope": "window"
    },

    "q4test.maxFixAttempts": {
        "type": "number",
        "default": 3,
        "minimum": 1,
        "maximum": 10,
        "markdownDescription": "Maximum number of attempts to fix failing generated tests",
        "scope": "window"
    },

    "q4test.testCommand": {
        "type": "string",
        "default": "npm run test:jest",
        "markdownDescription": "Command to run Jest tests. Will be executed after test generation",
        "scope": "window"
    },

    "q4test.testWatchCommand": {
        "type": "string",
        "default": "npm run test:jest:watch",
        "markdownDescription": "Command to run Jest tests in watch mode during development",
        "scope": "window"
    },

    "q4test.testDirectory": {
        "type": "string",
        "default": "./src",
        "markdownDescription": "Directory where Q4Test will look for source files to generate tests for",
        "scope": "window"
    },

    "q4test.generatedTestPrefix": {
        "type": "string",
        "default": "Q4TEST_GEN_",
        "markdownDescription": "Prefix for auto-generated test files. Helps identify AI-generated vs hand-written tests",
        "scope": "window"
    },

    "q4test.testScenarioCategories": {
        "type": "array",
        "default": ["critical", "logical", "error", "edge"],
        "items": {
            "type": "string",
            "enum": ["critical", "logical", "error", "edge"]
        },
        "markdownDescription": "Test scenario types to generate. Critical (core functionality), Logical (business logic), Error (error handling), Edge (edge cases)",
        "scope": "window"
    },

    "q4test.mockingLibrary": {
        "type": "string",
        "default": "jest",
        "enum": ["jest", "sinon", "unittest.mock"],
        "markdownDescription": "Mocking library to use in generated tests",
        "scope": "window"
    },

    "q4test.includeEdgeCases": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Include edge case test scenarios in generation",
        "scope": "window"
    },

    "q4test.includeErrorHandling": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Include error handling test scenarios in generation",
        "scope": "window"
    },

    "q4test.useTypescriptTypes": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Use TypeScript type information in generated tests",
        "scope": "window"
    },

    "q4test.generateBeforeEach": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Generate beforeEach hooks in test suites",
        "scope": "window"
    },

    "q4test.generateAfterEach": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Generate afterEach hooks in test suites",
        "scope": "window"
    },

    "q4test.mockExternalDependencies": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "Automatically mock external dependencies (databases, APIs, etc.)",
        "scope": "window"
    },

    "q4test.coverageThreshold.statements": {
        "type": "number",
        "default": 50,
        "minimum": 0,
        "maximum": 100,
        "markdownDescription": "Minimum statement coverage percentage for generated tests",
        "scope": "window"
    },

    "q4test.coverageThreshold.branches": {
        "type": "number",
        "default": 50,
        "minimum": 0,
        "maximum": 100,
        "markdownDescription": "Minimum branch coverage percentage for generated tests",
        "scope": "window"
    },

    "q4test.coverageThreshold.functions": {
        "type": "number",
        "default": 50,
        "minimum": 0,
        "maximum": 100,
        "markdownDescription": "Minimum function coverage percentage for generated tests",
        "scope": "window"
    },

    "q4test.coverageThreshold.lines": {
        "type": "number",
        "default": 50,
        "minimum": 0,
        "maximum": 100,
        "markdownDescription": "Minimum line coverage percentage for generated tests",
        "scope": "window"
    },

    "q4test.firebase.enabled": {
        "type": "boolean",
        "default": false,
        "markdownDescription": "Enable Firebase test history persistence (optional)",
        "scope": "window"
    },

    "q4test.firebase.projectId": {
        "type": "string",
        "default": "",
        "markdownDescription": "Firebase project ID for test history sync",
        "scope": "window"
    },

    "q4test.debug": {
        "type": "boolean",
        "default": false,
        "markdownDescription": "Enable debug logging for Q4Test operations",
        "scope": "window"
    }
};

/**
 * Q4Test VS Code Commands to add to package.json "contributes.commands"
 */
export const Q4TestCommands = [
    {
        "command": "q4test.openPanel",
        "title": "Q4Test: Open Panel",
        "description": "Open the Q4Test sidebar panel for test generation",
        "category": "Q4Test",
        "icon": "$(beaker)"
    },
    {
        "command": "q4test.generateTests",
        "title": "Q4Test: Generate Tests",
        "description": "Generate AI tests for the current file or selected action",
        "category": "Q4Test",
        "icon": "$(play)"
    },
    {
        "command": "q4test.runTests",
        "title": "Q4Test: Run Tests",
        "description": "Run the generated tests for the current file",
        "category": "Q4Test",
        "icon": "$(play)"
    },
    {
        "command": "q4test.runTestsWatch",
        "title": "Q4Test: Run Tests (Watch Mode)",
        "description": "Run tests in watch mode for continuous development",
        "category": "Q4Test",
        "icon": "$(debug-continue)"
    },
    {
        "command": "q4test.repairTests",
        "title": "Q4Test: Repair Failing Tests",
        "description": "Automatically fix failing generated tests with AI assistance",
        "category": "Q4Test",
        "icon": "$(check)"
    },
    {
        "command": "q4test.analyzeCoverage",
        "title": "Q4Test: Analyze Coverage",
        "description": "Analyze and report on generated test coverage",
        "category": "Q4Test",
        "icon": "$(graph)"
    },
    {
        "command": "q4test.validateTests",
        "title": "Q4Test: Validate Generated Tests",
        "description": "Validate generated tests for Jest compliance",
        "category": "Q4Test",
        "icon": "$(check-all)"
    },
    {
        "command": "q4test.mergeCoverage",
        "title": "Q4Test: Merge Coverage Reports",
        "description": "Merge generated test coverage with hand-written test coverage",
        "category": "Q4Test",
        "icon": "$(combine)"
    },
    {
        "command": "q4test.openSettings",
        "title": "Q4Test: Open Settings",
        "description": "Open Q4Test configuration settings",
        "category": "Q4Test",
        "icon": "$(settings)"
    }
];

/**
 * Q4Test Keybindings to add to package.json "contributes.keybindings"
 */
export const Q4TestKeybindings = [
    {
        "command": "q4test.generateTests",
        "key": "ctrl+shift+t g",
        "mac": "cmd+shift+t g",
        "when": "editorFocus"
    },
    {
        "command": "q4test.runTests",
        "key": "ctrl+shift+t r",
        "mac": "cmd+shift+t r",
        "when": "editorFocus"
    },
    {
        "command": "q4test.runTestsWatch",
        "key": "ctrl+shift+t w",
        "mac": "cmd+shift+t w",
        "when": "editorFocus"
    }
];

/**
 * Example .vscode/settings.json for Q4Test configuration
 */
export const WorkspaceSettingsExample = {
    "q4test.enabled": true,
    "q4test.autoValidateTests": true,
    "q4test.maxFixAttempts": 3,
    "q4test.testCommand": "npm run test:jest",
    "q4test.testWatchCommand": "npm run test:jest:watch",
    "q4test.testDirectory": "./src",
    "q4test.generatedTestPrefix": "Q4TEST_GEN_",
    "q4test.mockingLibrary": "jest",
    "q4test.testScenarioCategories": ["critical", "logical", "error", "edge"],
    "q4test.includeEdgeCases": true,
    "q4test.includeErrorHandling": true,
    "q4test.useTypescriptTypes": true,
    "q4test.generateBeforeEach": true,
    "q4test.generateAfterEach": true,
    "q4test.mockExternalDependencies": true,
    "q4test.coverageThreshold.statements": 50,
    "q4test.coverageThreshold.branches": 50,
    "q4test.coverageThreshold.functions": 50,
    "q4test.coverageThreshold.lines": 50,
    "q4test.debug": false
};

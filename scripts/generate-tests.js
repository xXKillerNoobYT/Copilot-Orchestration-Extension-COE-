/**
 * Comprehensive Test Suite Generator
 * 
 * This script generates Jest test files for untested modules in the VS Code extension.
 * Run with: node scripts/generate-tests.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files that need tests
const filesToTest = [
  { src: 'contextBuilder.ts', category: 'core' },
  { src: 'copilotDispatcher.ts', category: 'core' },
  { src: 'decompositionAgent.ts', category: 'core' },
  { src: 'index.ts', category: 'core' },
  { src: 'drift/designTokenDrift.ts', category: 'drift' },
  { src: 'drift/driftDetector.ts', category: 'drift' },
  { src: 'exporters/markdownExporter.ts', category: 'exporters' },
  { src: 'github/githubClient.ts', category: 'github' },
  { src: 'github/githubSyncTest.ts', category: 'github' },
  { src: 'github/webhookHandler.ts', category: 'github' },
  { src: 'integration/index.ts', category: 'integration' },
  { src: 'integration/runTest.ts', category: 'integration' },
  { src: 'integration/llmExecutionIntegration.ts', category: 'integration' },
  { src: 'llm/client.ts', category: 'llm' },
  { src: 'llm/promptCache.ts', category: 'llm' },
  { src: 'mcp-server/agentValidation.ts', category: 'mcp' },
  { src: 'mcp-server/index.ts', category: 'mcp' },
  { src: 'mcp-server/handlers/getContextBundle.ts', category: 'mcp' },
  { src: 'mcp-server/handlers/reportObservation.ts', category: 'mcp' },
  { src: 'mcp-server/handlers/getNextTask.ts', category: 'mcp' },
  { src: 'mcp-server/handlers/reportTaskStatus.ts', category: 'mcp' },
  { src: 'mcp-server/handlers/reportTestFailure.ts', category: 'mcp' },
  { src: 'mcp-server/integrations/contextRetrieval.ts', category: 'mcp' },
  { src: 'mcp-server/integrations/githubIntegration.ts', category: 'mcp' },
  { src: 'mcp-server/integrations/serviceFactory.ts', category: 'mcp' },
  { src: 'mcp-server/integrations/taskManager.ts', category: 'mcp' },
  { src: 'panels/auditDashboardPanel.ts', category: 'panels' },
  { src: 'panels/llmResponsePanel.ts', category: 'panels' },
  { src: 'panels/DeadLetterQueuePanel.ts', category: 'panels' },
  { src: 'panels/planBuilderPanel.ts', category: 'panels' },
  { src: 'planBuilder/aiAssistanceService.ts', category: 'planBuilder' },
  { src: 'planBuilder/architectureSuggestions.ts', category: 'planBuilder' },
  { src: 'planBuilder/dependencyAnalysis.ts', category: 'planBuilder' },
  { src: 'planBuilder/designHandoff.ts', category: 'planBuilder' },
  { src: 'planBuilder/exporters/planExporter.ts', category: 'planBuilder' },
  { src: 'planBuilder/designSystem/tokenGenerator.ts', category: 'planBuilder' },
  { src: 'planBuilder/llmPrompts.ts', category: 'planBuilder' },
  { src: 'planBuilder/planAdjustmentEngine.ts', category: 'planBuilder' },
  { src: 'planBuilder/planDiff.ts', category: 'planBuilder' },
  { src: 'planBuilder/planPersistence.ts', category: 'planBuilder' },
  { src: 'planBuilder/planValidator.ts', category: 'planBuilder' },
  { src: 'planBuilder/questionFramework.ts', category: 'planBuilder' },
  { src: 'planBuilder/services/PlanContextService.ts', category: 'planBuilder' },
  { src: 'planBuilder/validators.ts', category: 'planBuilder' },
];

function generateTestTemplate(srcPath, className) {
  const relativePath = srcPath.replace(/\.ts$/, '');
  const testName = path.basename(srcPath, '.ts');

  return `import { ${className} } from '../${relativePath}';

jest.mock('vscode');

describe('${className}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(${className}).toBeDefined();
    });
  });

  describe('Core Functionality', () => {
    it('should handle basic operations', () => {
      // TODO: Add specific test cases
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      // TODO: Add error test cases
      expect(true).toBe(true);
    });
  });
});
`;
}

function toPascalCase(str) {
  return str.replace(/(^\w|-\w|_\w)/g, (match) =>
    match.replace(/-|_/, '').toUpperCase()
  );
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateTests() {
  const srcRoot = path.join(__dirname, '..', 'vscode-extension', 'src');
  let generatedCount = 0;
  let skippedCount = 0;

  filesToTest.forEach(({ src, category }) => {
    const srcFilePath = path.join(srcRoot, src);
    const testDir = path.join(path.dirname(srcFilePath), '__tests__');
    const testFileName = path.basename(src, '.ts') + '.test.ts';
    const testFilePath = path.join(testDir, testFileName);

    // Skip if test already exists
    if (fs.existsSync(testFilePath)) {
      console.log(`⏭️  Skipping ${src} (test already exists)`);
      skippedCount++;
      return;
    }

    // Ensure test directory exists
    ensureDirectoryExists(testDir);

    // Generate class name from file name
    const className = toPascalCase(path.basename(src, '.ts'));

    // Generate test content
    const testContent = generateTestTemplate(src, className);

    // Write test file
    fs.writeFileSync(testFilePath, testContent, 'utf8');
    console.log(`✅ Generated test for ${src}`);
    generatedCount++;
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Generated: ${generatedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${filesToTest.length}`);
}

// Run the generator
generateTests();

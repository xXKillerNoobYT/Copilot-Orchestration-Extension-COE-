const fs = require('fs');
const path = require('path');

// Vitest files to convert
const vitestFiles = [
  'vscode-extension/src/components/preview/PreviewEngine.test.ts',
  'vscode-extension/src/services/planPersistence.test.ts',
  'vscode-extension/src/planBuilder/__tests__/integration/wizardFlow.test.ts',
  'vscode-extension/src/planBuilder/__tests__/integration/exportFormats.test.ts',
  'vscode-extension/src/planBuilder/__tests__/integration/validation.test.ts',
];

// Mocha/assert files to convert
const mochaFiles = [
  'vscode-extension/src/planBuilder/designSystem/tokenGenerator.test.ts',
  'vscode-extension/src/planBuilder/designSystem/validator.test.ts',
  'vscode-extension/src/extension.agentLoop.test.ts',
  'vscode-extension/src/integration/activationFlows.integration.test.ts',
  'vscode-extension/src/integration/extension.integration.test.ts',
  'vscode-extension/src/integration/statusBarLifecycle.integration.test.ts',
  'vscode-extension/src/integration/panelLiveStatus.integration.test.ts',
];

function convertVitestToJest(content) {
  // Remove vitest import
  content = content.replace(
    /import\s+\{\s*(?:describe,\s*)?(?:it,\s*)?(?:expect,\s*)?(?:beforeEach,\s*)?(?:afterEach,\s*)?(?:vi,?\s*)?\}\s+from\s+['"]vitest['"];?\n?/g,
    ''
  );
  
  // Replace vi.* with jest.*
  content = content.replace(/vi\.useFakeTimers/g, 'jest.useFakeTimers');
  content = content.replace(/vi\.restoreAllMocks/g, 'jest.restoreAllMocks');
  content = content.replace(/vi\.advanceTimersByTime/g, 'jest.advanceTimersByTime');
  content = content.replace(/vi\.fn/g, 'jest.fn');
  content = content.replace(/vi\.spyOn/g, 'jest.spyOn');
  content = content.replace(/vi\.mock/g, 'jest.mock');
  content = content.replace(/vi\.clearAllMocks/g, 'jest.clearAllMocks');
  content = content.replace(/vi\.resetAllMocks/g, 'jest.resetAllMocks');
  content = content.replace(/vi\./g, 'jest.');
  
  return content;
}

function convertMochaToJest(content) {
  // Remove assert import
  content = content.replace(/import\s+\*\s+as\s+assert\s+from\s+['"]assert['"];?\n?/g, '');
  
  // Convert assert calls to expect
  content = content.replace(/assert\.strictEqual\(([^,]+),\s*([^)]+)\)/g, 'expect($1).toBe($2)');
  content = content.replace(/assert\.equal\(([^,]+),\s*([^)]+)\)/g, 'expect($1).toBe($2)');
  content = content.replace(/assert\.ok\(([^)]+)\)/g, 'expect($1).toBeTruthy()');
  content = content.replace(/assert\.notOk\(([^)]+)\)/g, 'expect($1).toBeFalsy()');
  content = content.replace(/assert\.deepEqual\(([^,]+),\s*([^)]+)\)/g, 'expect($1).toEqual($2)');
  content = content.replace(/assert\.throws\(\(\)\s*=>\s*\{([^}]+)\}\s*,\s*([^)]+)\)/g, 'expect(() => {$1}).toThrow($2)');
  content = content.replace(/before\(/g, 'beforeAll(');
  content = content.replace(/after\(/g, 'afterAll(');
  
  return content;
}

// Convert Vitest files
console.log('Converting Vitest files...');
vitestFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = convertVitestToJest(content);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ ${path.basename(file)}`);
  } else {
    console.log(`✗ NOT FOUND: ${file}`);
  }
});

// Convert Mocha files
console.log('\nConverting Mocha/assert files...');
mochaFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = convertMochaToJest(content);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ ${path.basename(file)}`);
  } else {
    console.log(`✗ NOT FOUND: ${file}`);
  }
});

console.log('\n✓ All test files converted!');

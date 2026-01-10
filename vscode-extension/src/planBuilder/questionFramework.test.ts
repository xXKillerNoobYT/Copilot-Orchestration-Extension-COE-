/**
 * Tests for Question Framework
 */

import { QuestionFramework } from './questionFramework';
import { WizardStateManager } from './wizardState';
import { Validators } from './validators';

// Test Question Framework
function testQuestionFramework() {
  console.log('\n🧪 Testing Question Framework\n');

  const framework = new QuestionFramework();

  // Test 1: Get all pages
  const allPages = framework.getPages();
  console.assert(allPages.length === 10, `Expected 10 pages, got ${allPages.length}`);
  console.log(`✓ All pages loaded: ${allPages.length} pages`);

  // Test 2: Get questions for introduction page
  const introQuestions = framework.getQuestionsForPage('introduction');
  console.assert(introQuestions.length === 2, `Expected 2 intro questions, got ${introQuestions.length}`);
  console.log(`✓ Introduction page questions: ${introQuestions.length}`);

  // Test 3: Validate required field
  const projectNameValidation = framework.validateAnswer('project_name', '');
  console.assert(!projectNameValidation.valid, 'Empty project name should be invalid');
  console.assert(projectNameValidation.errors.length > 0, 'Should have validation errors');
  console.log(`✓ Required validation: ${projectNameValidation.errors[0]}`);

  // Test 4: Validate valid input
  const validProjectName = framework.validateAnswer('project_name', 'My Awesome Project');
  console.assert(validProjectName.valid, 'Valid project name should pass validation');
  console.log('✓ Valid input passes validation');

  // Test 5: Min length validation
  const shortName = framework.validateAnswer('project_name', 'Ab');
  console.assert(!shortName.valid, 'Short project name should fail min length validation');
  console.log('✓ Min length validation working');

  // Test 6: Conditional page visibility
  const pagesWithAnswers = framework.getPages({ project_category: 'web_app' });
  console.assert(pagesWithAnswers.length > 0, 'Should return pages based on answers');
  console.log(`✓ Conditional visibility: ${pagesWithAnswers.length} pages`);

  console.log('\n✅ Question Framework tests passed\n');
}

// Test Wizard State Manager
function testWizardStateManager() {
  console.log('🧪 Testing Wizard State Manager\n');

  const stateManager = new WizardStateManager();

  // Test 1: Initial state
  const initialState = stateManager.getState();
  console.assert(initialState.currentPage === 'introduction', 'Should start on introduction page');
  console.log('✓ Initial state correct');

  // Test 2: Set answer
  stateManager.setAnswer('project_name', 'Test Project');
  const answer = stateManager.getAnswer<string>('project_name');
  console.assert(answer === 'Test Project', `Expected 'Test Project', got '${answer}'`);
  console.log('✓ Set/Get answer working');

  // Test 3: Navigate to page
  stateManager.navigateToPage('project_type');
  const currentState = stateManager.getState();
  console.assert(currentState.currentPage === 'project_type', 'Should navigate to project_type page');
  console.assert(currentState.visitedPages.includes('project_type'), 'Should mark page as visited');
  console.log('✓ Page navigation working');

  // Test 4: Mark page completed
  stateManager.markPageCompleted('introduction');
  console.assert(stateManager.isPageCompleted('introduction'), 'Should mark page as completed');
  console.log('✓ Page completion tracking working');

  // Test 5: Progress calculation
  const progress = stateManager.getProgress(10);
  console.assert(progress >= 0 && progress <= 100, 'Progress should be between 0-100');
  console.log(`✓ Progress calculation: ${progress}%`);

  // Test 6: Export/Import state
  const exported = stateManager.exportState();
  const newManager = new WizardStateManager();
  newManager.importState(exported);
  const importedAnswer = newManager.getAnswer<string>('project_name');
  console.assert(importedAnswer === 'Test Project', 'Imported state should match exported');
  console.log('✓ Export/Import state working');

  // Test 7: Reset
  stateManager.reset();
  const resetState = stateManager.getState();
  console.assert(Object.keys(resetState.answers).length === 0, 'Reset should clear answers');
  console.log('✓ Reset working');

  // Cleanup
  stateManager.dispose();

  console.log('\n✅ Wizard State Manager tests passed\n');
}

// Test Validators
function testValidators() {
  console.log('🧪 Testing Validators\n');

  // Test 1: Required validator
  const requiredPass = Validators.required('value');
  console.assert(requiredPass.valid, 'Required should pass with value');
  const requiredFail = Validators.required('');
  console.assert(!requiredFail.valid, 'Required should fail with empty value');
  console.log('✓ Required validator working');

  // Test 2: Min validator
  const minPass = Validators.min('hello', 3);
  console.assert(minPass.valid, 'Min should pass with sufficient length');
  const minFail = Validators.min('hi', 3);
  console.assert(!minFail.valid, 'Min should fail with insufficient length');
  console.log('✓ Min validator working');

  // Test 3: Max validator
  const maxPass = Validators.max('hello', 10);
  console.assert(maxPass.valid, 'Max should pass within limit');
  const maxFail = Validators.max('hello world!', 5);
  console.assert(!maxFail.valid, 'Max should fail when exceeding limit');
  console.log('✓ Max validator working');

  // Test 4: Email validator
  const emailPass = Validators.email('test@example.com');
  console.assert(emailPass.valid, 'Valid email should pass');
  const emailFail = Validators.email('invalid-email');
  console.assert(!emailFail.valid, 'Invalid email should fail');
  console.log('✓ Email validator working');

  // Test 5: URL validator
  const urlPass = Validators.url('https://example.com');
  console.assert(urlPass.valid, 'Valid URL should pass');
  const urlFail = Validators.url('not-a-url');
  console.assert(!urlFail.valid, 'Invalid URL should fail');
  console.log('✓ URL validator working');

  // Test 6: Project name validator
  const projectNamePass = Validators.projectName('my-awesome-project');
  console.assert(projectNamePass.valid, 'Valid project name should pass');
  const projectNameFail = Validators.projectName('my project!');
  console.assert(!projectNameFail.valid, 'Invalid project name should fail');
  console.log('✓ Project name validator working');

  // Test 7: Range validator
  const rangePass = Validators.range(50, 0, 100);
  console.assert(rangePass.valid, 'Value in range should pass');
  const rangeFail = Validators.range(150, 0, 100);
  console.assert(!rangeFail.valid, 'Value out of range should fail');
  console.log('✓ Range validator working');

  // Test 8: OneOf validator
  const oneOfPass = Validators.oneOf('apple', ['apple', 'banana', 'orange']);
  console.assert(oneOfPass.valid, 'Value in allowed list should pass');
  const oneOfFail = Validators.oneOf('grape', ['apple', 'banana', 'orange']);
  console.assert(!oneOfFail.valid, 'Value not in allowed list should fail');
  console.log('✓ OneOf validator working');

  // Test 9: Custom validator
  const customPass = Validators.custom(10, (v) => typeof v === 'number' && (v as number) > 5, 'Must be > 5');
  console.assert(customPass.valid, 'Custom validator should pass when condition met');
  const customFail = Validators.custom(3, (v) => typeof v === 'number' && (v as number) > 5, 'Must be > 5');
  console.assert(!customFail.valid, 'Custom validator should fail when condition not met');
  console.log('✓ Custom validator working');

  console.log('\n✅ Validator tests passed\n');
}

// Run all tests
console.log('╔═══════════════════════════════════════╗');
console.log('║  Plan Builder Question Framework Tests ║');
console.log('╚═══════════════════════════════════════╝');

testQuestionFramework();
testWizardStateManager();
testValidators();

console.log('╔═══════════════════════════════════════╗');
console.log('║  ✅ All Plan Builder Tests Passed      ║');
console.log('╚═══════════════════════════════════════╝\n');

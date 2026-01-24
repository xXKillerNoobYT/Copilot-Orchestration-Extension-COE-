/**
 * Wizard Flow Integration Tests (Corrected)
 * 
 * End-to-end tests for complete wizard flow matching actual implementation.
 * Tests the wizard as it actually works, not aspirational APIs.
 * 
 * Reference: TASK-mk7jzlhj-kozt7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WizardContainer, type WizardProgress } from '../../wizardContainer';
import { QuestionFramework } from '../../questionFramework';

/**
 * Helper: Provide valid answers for all required questions on a page
 */
function answerPageQuestions(wizard: WizardContainer, framework: QuestionFramework) {
  const currentPage = wizard.getCurrentPage();
  if (!currentPage) return;
  
  const questions = framework.getQuestionsForPage(currentPage.id, wizard.getAllAnswers());
  questions.forEach(q => {
    // Provide appropriate test values based on type
    let testValue: any;
    switch (q.type) {
      case 'text':
      case 'textarea':
        testValue = `Test ${q.id}`;
        break;
      case 'select':
        testValue = q.options?.[0]?.value || 'default';
        break;
      case 'multi-select':
        testValue = q.options ? [q.options[0]?.value] : [];
        break;
      case 'boolean':
        testValue = true;
        break;
      case 'number':
      case 'range':
        testValue = 5;
        break;
      default:
        testValue = 'test';
    }
    wizard.setAnswer(q.id, testValue);
  });
}

describe('Wizard Flow Integration Tests', () => {
  let wizard: WizardContainer;
  let framework: QuestionFramework;

  beforeEach(() => {
    framework = new QuestionFramework();
    wizard = new WizardContainer();
  });

  describe('Complete Wizard Journey', () => {
    it('should have 10 pages in the framework', () => {
      const pages = framework.getPages();
      expect(pages).toHaveLength(10);
      
      // Verify all expected page IDs exist
      const pageIds = pages.map(p => p.id);
      expect(pageIds).toContain('introduction');
      expect(pageIds).toContain('project_type');
      expect(pageIds).toContain('architecture');
      expect(pageIds).toContain('integrations');
      expect(pageIds).toContain('deployment');
      expect(pageIds).toContain('testing');
      expect(pageIds).toContain('documentation');
      expect(pageIds).toContain('team');
      expect(pageIds).toContain('timeline');
      expect(pageIds).toContain('review');
    });

    it('should navigate through all pages', () => {
      const pages = framework.getPages();
      expect(wizard.getCurrentPageIndex()).toBe(0);

      // Navigate forward through all pages with valid answers
      for (let i = 0; i < pages.length - 1; i++) {
        answerPageQuestions(wizard, framework);
        const success = wizard.navigateNext();
        expect(success).toBe(true);
        expect(wizard.getCurrentPageIndex()).toBe(i + 1);
      }

      // Should be on last page
      expect(wizard.getCurrentPageIndex()).toBe(pages.length - 1);
    });

    it('should track wizard progress correctly', () => {
      const progress = wizard.getProgress();
      
      expect(progress).toHaveProperty('currentPageIndex');
      expect(progress).toHaveProperty('totalPages');
      expect(progress).toHaveProperty('completedPageCount');
      expect(progress).toHaveProperty('progressPercentage');
      expect(progress).toHaveProperty('estimatedTimeRemaining');
      
      expect(progress.totalPages).toBe(10);
      expect(progress.currentPageIndex).toBe(0);
      expect(progress.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(progress.progressPercentage).toBeLessThanOrEqual(100);
    });

    it('should allow setting and getting answers', () => {
      wizard.setAnswer('project_name', 'Test Project');
      wizard.setAnswer('project_description', 'A test project for integration tests');
      
      const allAnswers = wizard.getAllAnswers();
      expect(allAnswers).toHaveProperty('project_name');
      expect(allAnswers.project_name).toBe('Test Project');
      expect(allAnswers.project_description).toBe('A test project for integration tests');
    });

    it('should retrieve current page', () => {
      const currentPage = wizard.getCurrentPage();
      
      expect(currentPage).not.toBeNull();
      expect(currentPage).toHaveProperty('id');
      expect(currentPage).toHaveProperty('title');
      expect(currentPage?.id).toBe('introduction'); // First page
    });

    it('should get all pages', () => {
      const allPages = wizard.getAllPages();
      
      expect(allPages).toHaveLength(10);
      allPages.forEach(page => {
        expect(page).toHaveProperty('id');
        expect(page).toHaveProperty('title');
        expect(page).toHaveProperty('description');
        expect(page).toHaveProperty('questions');
      });
    });
  });

  describe('Question Framework', () => {
    it('should get questions for each page', () => {
      const pages = framework.getPages();
      
      pages.forEach(page => {
        const questions = framework.getQuestionsForPage(page.id);
        expect(Array.isArray(questions)).toBe(true);
        
        questions.forEach(q => {
          expect(q).toHaveProperty('id');
          expect(q).toHaveProperty('title'); // Actual property name
          expect(q).toHaveProperty('type');
        });
      });
    });

    it('should validate answers', () => {
      const pages = framework.getPages();
      const firstPage = pages[0];
      
      if (firstPage && firstPage.questions.length > 0) {
        const firstQuestion = firstPage.questions[0];
        
        // Test validation (actual implementation details)
        const validation = framework.validateAnswer(firstQuestion.id, 'Test Value');
        expect(validation).toHaveProperty('valid');
        expect(validation).toHaveProperty('errors');
      }
    });
  });

  describe('Navigation', () => {
    it('should navigate next successfully', () => {
      const initialIndex = wizard.getCurrentPageIndex();
      
      // Answer all required questions on current page
      answerPageQuestions(wizard, framework);
      
      const success = wizard.navigateNext();
      expect(success).toBe(true);
      expect(wizard.getCurrentPageIndex()).toBe(initialIndex + 1);
    });

    it('should get current page index', () => {
      const index = wizard.getCurrentPageIndex();
      expect(typeof index).toBe('number');
      expect(index).toBeGreaterThanOrEqual(0);
    });

    it('should jump to specific page by ID', () => {
      const pages = framework.getPages();
      const page2 = pages[2];
      
      // Navigate to page 2 by stepping through with valid answers
      for (let i = 0; i < 2; i++) {
        answerPageQuestions(wizard, framework);
        wizard.navigateNext();
      }
      expect(wizard.getCurrentPageIndex()).toBe(2);
      
      // Navigate to page 5
      for (let i = 2; i < 5; i++) {
        answerPageQuestions(wizard, framework);
        wizard.navigateNext();
      }
      expect(wizard.getCurrentPageIndex()).toBe(5);
      
      // Jump back to visited page 2
      const success = wizard.jumpToPage(page2.id);
      expect(success).toBe(true);
      expect(wizard.getCurrentPageIndex()).toBe(2);
    });
  });

  describe('Validation', () => {
    it('should validate pages by ID', () => {
      const currentPage = wizard.getCurrentPage();
      if (currentPage) {
        const validation = wizard.validatePage(currentPage.id);
        
        expect(validation).toHaveProperty('valid');
        expect(validation).toHaveProperty('errors');
        expect(validation).toHaveProperty('warnings');
        expect(Array.isArray(validation.errors)).toBe(true);
        expect(Array.isArray(validation.warnings)).toBe(true);
      }
    });

  });

  describe('Progress Tracking', () => {
    it('should calculate progress percentage correctly', () => {
      // Start: 0%
      let progress = wizard.getProgress();
      const initialPercentage = progress.progressPercentage;
      expect(initialPercentage).toBeGreaterThanOrEqual(0);

      // Navigate through pages sequentially with helper
      for (let i = 0; i < 5; i++) {
        answerPageQuestions(wizard, framework);
        wizard.navigateNext();
      }
      
      progress = wizard.getProgress();
      expect(progress.progressPercentage).toBeGreaterThan(initialPercentage);
      expect(progress.currentPageIndex).toBe(5);

      // Continue to near end
      for (let i = 5; i < 9; i++) {
        answerPageQuestions(wizard, framework);
        wizard.navigateNext();
      }
      
      progress = wizard.getProgress();
      expect(progress.progressPercentage).toBeGreaterThan(50);
      expect(progress.currentPageIndex).toBe(9);
    });

    it('should estimate time remaining', () => {
      const progress = wizard.getProgress();
      expect(typeof progress.estimatedTimeRemaining).toBe('number');
      expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State Management', () => {
    it('should get all answers', () => {
      wizard.setAnswer('test_key_1', 'value1');
      wizard.setAnswer('test_key_2', 'value2');
      
      const answers = wizard.getAllAnswers();
      expect(answers.test_key_1).toBe('value1');
      expect(answers.test_key_2).toBe('value2');
    });



    it('should reset wizard state', () => {
      wizard.setAnswer('key1', 'value1');
      const pages = framework.getPages();
      wizard.jumpToPage(pages[5].id);
      
      wizard.reset();
      
      expect(wizard.getCurrentPageIndex()).toBe(0);
      expect(wizard.getAllAnswers().key1).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should complete full navigation in reasonable time', () => {
      const start = performance.now();
      
      // Navigate through all pages
      const pages = framework.getPages();
      for (let i = 0; i < pages.length; i++) {
        wizard.jumpToPage(pages[i].id);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // <1 second
    });

    it('should handle rapid answer updates efficiently', () => {
      const start = performance.now();
      
      // Set 100 answers rapidly
      for (let i = 0; i < 100; i++) {
        wizard.setAnswer(`key_${i}`, `value_${i}`);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // <500ms
    });
  });
});

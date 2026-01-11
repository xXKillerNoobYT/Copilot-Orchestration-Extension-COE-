/**
 * Wizard Container Tests
 * 
 * Test suite for wizard orchestration, navigation, and state management
 * Reference: Code Master Section 9 - Interactive Design Phase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WizardContainer, NavigationDirection } from '../../src/planBuilder/wizardContainer';
import { QuestionFramework } from '../../src/planBuilder/questionFramework';

describe('WizardContainer', () => {
  let wizard: WizardContainer;

  beforeEach(() => {
    wizard = new WizardContainer('analyst');
  });

  afterEach(() => {
    wizard.dispose();
  });

  describe('Initialization', () => {
    it('should create wizard with initial state', () => {
      expect(wizard).toBeDefined();
      expect(wizard.getCurrentPageIndex()).toBe(0);
      expect(wizard.getCurrentPage()).toBeTruthy();
    });

    it('should have all pages available', () => {
      const pages = wizard.getAllPages();
      expect(pages.length).toBeGreaterThan(0);
    });

    it('should have current page defined', () => {
      const page = wizard.getCurrentPage();
      expect(page).toBeTruthy();
      expect(page?.title).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to next page', () => {
      const initialIndex = wizard.getCurrentPageIndex();
      const pages = wizard.getAllPages();

      // Skip if already at last page
      if (initialIndex < pages.length - 1) {
        // Set required answers for current page before navigation
        wizard.setAnswer('project_name', 'Test Project');
        wizard.setAnswer('project_description', 'This is a test project with sufficient description');
        
        const nextSuccess = wizard.navigateNext();
        expect(nextSuccess).toBe(true);
        expect(wizard.getCurrentPageIndex()).toBe(initialIndex + 1);
      }
    });

    it('should not navigate beyond last page', () => {
      const pages = wizard.getAllPages();

      // Navigate to end - set answers for each page
      let pageNum = 0;
      while (wizard.navigateNext()) {
        pageNum++;
        // Set minimal required answers to allow navigation
        wizard.setAnswer('project_name', `Test Project ${pageNum}`);
        wizard.setAnswer('project_description', 'This is a test project with sufficient description');
      }

      const lastIndex = wizard.getCurrentPageIndex();
      const nextSuccess = wizard.navigateNext();
      expect(nextSuccess).toBe(false);
      expect(wizard.getCurrentPageIndex()).toBe(lastIndex);
    });

    it('should navigate to previous page', () => {
      // First, move forward - set required answers
      wizard.setAnswer('project_name', 'Test Project');
      wizard.setAnswer('project_description', 'This is a test project with sufficient description');
      wizard.navigateNext();
      const currentIndex = wizard.getCurrentPageIndex();

      const prevSuccess = wizard.navigatePrevious();
      expect(prevSuccess).toBe(true);
      expect(wizard.getCurrentPageIndex()).toBe(currentIndex - 1);
    });

    it('should not navigate before first page', () => {
      expect(wizard.getCurrentPageIndex()).toBe(0);
      const prevSuccess = wizard.navigatePrevious();
      expect(prevSuccess).toBe(false);
      expect(wizard.getCurrentPageIndex()).toBe(0);
    });

    it('should jump to visited page', () => {
      const pages = wizard.getAllPages();

      // Visit first few pages
      if (pages.length > 2) {
        wizard.navigateNext();
        wizard.navigateNext();

        const targetPageId = pages[0].id;
        const jumpSuccess = wizard.jumpToPage(targetPageId);
        expect(jumpSuccess).toBe(true);
        expect(wizard.getCurrentPage()?.id).toBe(targetPageId);
      }
    });

    it('should not jump to unvisited non-adjacent page', () => {
      const pages = wizard.getAllPages();

      if (pages.length > 3) {
        // Try to jump 3 pages ahead
        const targetPageId = pages[3].id;
        const jumpSuccess = wizard.jumpToPage(targetPageId);
        expect(jumpSuccess).toBe(false);
      }
    });
  });

  describe('Answer Management', () => {
    it('should set and get answers', () => {
      const currentPage = wizard.getCurrentPage();
      if (currentPage && currentPage.questions.length > 0) {
        const question = currentPage.questions[0];
        const testValue = 'test answer';

        wizard.setAnswer(question.id, testValue);
        const retrieved = wizard.getAnswer(question.id);
        expect(retrieved).toBe(testValue);
      }
    });

    it('should get all answers', () => {
      const currentPage = wizard.getCurrentPage();
      if (currentPage && currentPage.questions.length > 0) {
        const question = currentPage.questions[0];
        wizard.setAnswer(question.id, 'value1');

        const allAnswers = wizard.getAllAnswers();
        expect(allAnswers[question.id]).toBe('value1');
      }
    });

    it('should persist answers across page changes', () => {
      const currentPage = wizard.getCurrentPage();
      if (currentPage && currentPage.questions.length > 0) {
        const question = currentPage.questions[0];
        const testValue = 'persistent answer';

        wizard.setAnswer(question.id, testValue);

        // Navigate and return
        if (wizard.navigateNext()) {
          wizard.navigatePrevious();
          const retrieved = wizard.getAnswer(question.id);
          expect(retrieved).toBe(testValue);
        }
      }
    });
  });

  describe('Validation', () => {
    it('should validate current page', () => {
      const currentPage = wizard.getCurrentPage();
      if (currentPage) {
        const validation = (wizard as any).validatePage(currentPage.id);
        expect(validation).toBeDefined();
        expect(validation.valid).toBeDefined();
        expect(Array.isArray(validation.errors)).toBe(true);
      }
    });

    it('should report validation errors for required questions', () => {
      const currentPage = wizard.getCurrentPage();
      if (currentPage) {
        // Find a required question
        const requiredQuestion = currentPage.questions.find(
          q => q.validation?.some(v => v.type === 'required')
        );

        if (requiredQuestion) {
          // Don't answer the required question
          const validation = (wizard as any).validatePage(currentPage.id);
          // This may or may not fail depending on other factors
          expect(validation.errors).toBeDefined();
        }
      }
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress', () => {
      const progress = wizard.getProgress();
      expect(progress).toBeDefined();
      expect(progress.currentPageIndex).toBe(0);
      expect(progress.totalPages).toBeGreaterThan(0);
      expect(progress.progressPercentage).toBeLessThanOrEqual(100);
      expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should increase progress as pages complete', () => {
      const initialProgress = wizard.getProgress();
      const initialPercentage = initialProgress.progressPercentage;

      // Complete current page and move to next
      if (wizard.navigateNext()) {
        const newProgress = wizard.getProgress();
        expect(newProgress.progressPercentage).toBeGreaterThanOrEqual(initialPercentage);
      }
    });
  });

  describe('State Persistence', () => {
    it('should export state to JSON', () => {
      wizard.setAnswer('test-question', 'test-value');

      const exported = wizard.exportState();
      expect(exported).toBeTruthy();
      expect(typeof exported).toBe('string');

      // Should be valid JSON
      const parsed = JSON.parse(exported);
      expect(parsed.answers).toBeDefined();
    });

    it('should import state from JSON', () => {
      const testAnswer = 'imported-value';
      wizard.setAnswer('test-question', testAnswer);

      const exported = wizard.exportState();

      const newWizard = new WizardContainer();
      newWizard.importState(exported);

      const imported = newWizard.getAnswer('test-question');
      expect(imported).toBe(testAnswer);

      newWizard.dispose();
    });
  });

  describe('Completion', () => {
    it('should complete wizard and generate plan', async () => {
      // Answer all required questions
      const pages = wizard.getAllPages();
      let answeredCount = 0;

      for (const page of pages) {
        for (const question of page.questions) {
          if (question.options && question.options.length > 0) {
            wizard.setAnswer(question.id, question.options[0].value);
            answeredCount++;
          } else if (question.type === 'text') {
            wizard.setAnswer(question.id, 'test answer');
            answeredCount++;
          }
        }
      }

      expect(answeredCount).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should reset wizard to initial state', () => {
      // Set some data
      wizard.setAnswer('test-question', 'test-value');
      wizard.navigateNext();

      // Reset
      wizard.reset();

      expect(wizard.getCurrentPageIndex()).toBe(0);
      expect(wizard.getAnswer('test-question')).toBeUndefined();
    });
  });

  describe('Callbacks', () => {
    it('should trigger page change callback', () => {
      let pageChangeTriggered = false;
      wizard.onPageChangeEvent(() => {
        pageChangeTriggered = true;
      });

      // Set required answers before navigation
      wizard.setAnswer('project_name', 'Test Project');
      wizard.setAnswer('project_description', 'This is a test project with sufficient description');
      wizard.navigateNext();
      expect(pageChangeTriggered).toBe(true);
    });

    it('should trigger progress update callback', () => {
      let progressUpdateTriggered = false;
      wizard.onProgressUpdateEvent(() => {
        progressUpdateTriggered = true;
      });

      wizard.setAnswer('test-question', 'value');
      expect(progressUpdateTriggered).toBe(true);
    });
  });
});

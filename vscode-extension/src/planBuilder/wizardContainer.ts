/**
 * Wizard Container Infrastructure
 * 
 * Main orchestration logic for the Interactive Plan Builder wizard.
 * Manages page flow, state transitions, navigation, and persistence.
 * 
 * Reference: Code Master Section 9 - Interactive Design Phase
 */

import { QuestionFramework, type Question, type WizardPage } from './questionFramework';
import { WizardStateManager, type WizardState } from './wizardState';

export enum NavigationDirection {
  NEXT = 'next',
  PREVIOUS = 'previous',
  JUMP = 'jump',
}

export interface NavigationEvent {
  direction: NavigationDirection;
  fromPage: string;
  toPage: string;
  timestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WizardProgress {
  currentPageIndex: number;
  totalPages: number;
  completedPageCount: number;
  progressPercentage: number;
  estimatedTimeRemaining: number; // in seconds
}

/**
 * WizardContainer manages the complete wizard lifecycle
 */
export class WizardContainer {
  private framework: QuestionFramework;
  private stateManager: WizardStateManager;
  private currentPageIndex: number = 0;
  private navigationHistory: NavigationEvent[] = [];
  private userRole?: string; // 'designer', 'analyst', 'architect'
  private startTime: Date = new Date();

  // Callbacks for UI integration
  private onPageChange?: (page: WizardPage, index: number) => void;
  private onProgressUpdate?: (progress: WizardProgress) => void;
  private onValidationError?: (errors: string[]) => void;
  private onCompletion?: (plan: Record<string, unknown>) => void;

  constructor(initialRole?: string) {
    this.framework = new QuestionFramework();
    this.stateManager = new WizardStateManager();
    this.userRole = initialRole;

    // Restore previous session if available
    this.restoreSession();
  }

  /**
   * Get all pages (filtered by conditional visibility)
   */
  getAllPages(): WizardPage[] {
    return this.framework.getPages(this.stateManager.getAllAnswers());
  }

  /**
   * Get current page
   */
  getCurrentPage(): WizardPage | null {
    const pages = this.getAllPages();
    return pages[this.currentPageIndex] || null;
  }

  /**
   * Get current page index
   */
  getCurrentPageIndex(): number {
    return this.currentPageIndex;
  }

  /**
   * Get questions for current page
   */
  getCurrentQuestions(): Question[] {
    const currentPage = this.getCurrentPage();
    if (!currentPage) return [];
    return this.framework.getQuestionsForPage(
      currentPage.id,
      this.stateManager.getAllAnswers()
    );
  }

  /**
   * Navigate to the next page
   */
  navigateNext(): boolean {
    const pages = this.getAllPages();
    const currentPage = this.getCurrentPage();

    // Validate current page before moving forward
    if (currentPage) {
      const validation = this.validatePage(currentPage.id);
      if (!validation.valid) {
        this.onValidationError?.(validation.errors);
        return false;
      }

      // Mark page as completed
      this.stateManager.markPageCompleted(currentPage.id);
    }

    if (this.currentPageIndex < pages.length - 1) {
      this.navigateToIndex(this.currentPageIndex + 1, NavigationDirection.NEXT);
      return true;
    }

    return false;
  }

  /**
   * Navigate to the previous page
   */
  navigatePrevious(): boolean {
    if (this.currentPageIndex > 0) {
      this.navigateToIndex(this.currentPageIndex - 1, NavigationDirection.PREVIOUS);
      return true;
    }

    return false;
  }

  /**
   * Jump to a specific page (if allowed)
   */
  jumpToPage(pageId: string): boolean {
    const pages = this.getAllPages();
    const targetIndex = pages.findIndex(p => p.id === pageId);

    if (targetIndex === -1) {
      console.warn(`Page ${pageId} not found or not visible`);
      return false;
    }

    // Can only jump to visited or adjacent pages
    const isVisited = this.stateManager.getState().visitedPages.includes(pageId);
    const isAdjacent = Math.abs(targetIndex - this.currentPageIndex) <= 1;

    if (!isVisited && !isAdjacent) {
      console.warn(`Cannot jump to unvisited non-adjacent page ${pageId}`);
      return false;
    }

    this.navigateToIndex(targetIndex, NavigationDirection.JUMP);
    return true;
  }

  /**
   * Internal navigation helper
   */
  private navigateToIndex(index: number, direction: NavigationDirection): void {
    const pages = this.getAllPages();
    const fromPage = this.getCurrentPage();
    const toPage = pages[index];

    if (!toPage) return;

    // Record navigation
    if (fromPage) {
      this.navigationHistory.push({
        direction,
        fromPage: fromPage.id,
        toPage: toPage.id,
        timestamp: new Date(),
      });
    }

    // Update current page
    this.currentPageIndex = index;
    this.stateManager.navigateToPage(toPage.id);

    // Notify UI
    this.onPageChange?.(toPage, index);
    this.updateProgress();
  }

  /**
   * Set an answer for a question
   */
  setAnswer(questionId: string, value: unknown): void {
    this.stateManager.setAnswer(questionId, value);

    // Update live preview in UI
    this.onProgressUpdate?.(this.getProgress());
  }

  /**
   * Get an answer
   */
  getAnswer<T = unknown>(questionId: string): T | undefined {
    return this.stateManager.getAnswer<T>(questionId);
  }

  /**
   * Get all answers
   */
  getAllAnswers(): Record<string, unknown> {
    return this.stateManager.getAllAnswers();
  }

  /**
   * Validate a specific page
   */
  validatePage(pageId: string): ValidationResult {
    const pages = this.getAllPages();
    const page = pages.find(p => p.id === pageId);

    if (!page) {
      return { valid: false, errors: ['Page not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const answers = this.getAllAnswers();

    for (const question of page.questions) {
      // Skip conditional questions that aren't visible
      if (question.showIf && !question.showIf(answers)) {
        continue;
      }

      const value = answers[question.id];
      const validation = this.framework.validateAnswer(question.id, value);

      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get overall wizard progress
   */
  getProgress(): WizardProgress {
    const pages = this.getAllPages();
    const completedPages = this.stateManager.getState().completedPages;

    // Estimate time remaining based on user role
    const questionsRemaining = pages
      .slice(this.currentPageIndex)
      .reduce((sum, page) => sum + page.questions.length, 0);

    const timePerQuestion = this.getTimePerQuestion();
    const estimatedSecondsRemaining = questionsRemaining * timePerQuestion;

    return {
      currentPageIndex: this.currentPageIndex,
      totalPages: pages.length,
      completedPageCount: completedPages.length,
      progressPercentage: Math.round(
        (completedPages.length / pages.length) * 100
      ),
      estimatedTimeRemaining: Math.ceil(estimatedSecondsRemaining),
    };
  }

  /**
   * Estimate time per question based on user role
   */
  private getTimePerQuestion(): number {
    // Time in seconds per question
    switch (this.userRole) {
      case 'designer':
        return 45; // Designers think more about visual details
      case 'analyst':
        return 60; // Analysts provide detailed answers
      case 'architect':
        return 90; // Architects think strategically
      default:
        return 60; // Default to analyst pace
    }
  }

  /**
   * Update progress and notify UI
   */
  private updateProgress(): void {
    this.onProgressUpdate?.(this.getProgress());
  }

  /**
   * Complete the wizard and generate plan
   */
  async completeWizard(): Promise<Record<string, unknown>> {
    // Validate last page
    const currentPage = this.getCurrentPage();
    if (currentPage) {
      const validation = this.validatePage(currentPage.id);
      if (!validation.valid) {
        this.onValidationError?.(validation.errors);
        throw new Error('Cannot complete wizard with validation errors');
      }
      this.stateManager.markPageCompleted(currentPage.id);
    }

    // Generate plan from answers
    const plan = this.generatePlan();

    // Notify completion
    this.onCompletion?.(plan);

    return plan;
  }

  /**
   * Generate plan from wizard answers
   */
  private generatePlan(): Record<string, unknown> {
    const answers = this.getAllAnswers();

    return {
      wizardId: `plan-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      userRole: this.userRole,
      totalTimeSeconds: Math.round(
        (Date.now() - this.startTime.getTime()) / 1000
      ),
      answers,
      navigationPath: this.navigationHistory.map(nav => ({
        ...nav,
        timestamp: nav.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Reset wizard to beginning
   */
  reset(): void {
    this.currentPageIndex = 0;
    this.navigationHistory = [];
    this.startTime = new Date();
    this.stateManager.reset();
  }

  /**
   * Restore previous session
   */
  private restoreSession(): void {
    const savedState = this.stateManager.getState();

    // Find current page index from saved state
    const pages = this.getAllPages();
    const savedPageIndex = pages.findIndex(p => p.id === savedState.currentPage);

    if (savedPageIndex !== -1) {
      this.currentPageIndex = savedPageIndex;
    }
  }

  /**
   * Export current state for persistence
   */
  exportState(): string {
    return this.stateManager.exportState();
  }

  /**
   * Import state from JSON
   */
  importState(json: string): void {
    this.stateManager.importState(json);
    this.restoreSession();
  }

  /**
   * Register UI callbacks
   */
  onPageChangeEvent(callback: (page: WizardPage, index: number) => void): void {
    this.onPageChange = callback;
  }

  onProgressUpdateEvent(callback: (progress: WizardProgress) => void): void {
    this.onProgressUpdate = callback;
  }

  onValidationErrorEvent(callback: (errors: string[]) => void): void {
    this.onValidationError = callback;
  }

  onCompletionEvent(callback: (plan: Record<string, unknown>) => void): void {
    this.onCompletion = callback;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stateManager.dispose();
  }
}

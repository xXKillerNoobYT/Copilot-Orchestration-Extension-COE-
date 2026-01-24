/**
 * Wizard State Management
 * 
 * Manages state persistence across wizard pages
 * Reference: Code Master Section 9.2
 */

export interface WizardState {
  currentPage: string;
  answers: Record<string, unknown>;
  visitedPages: string[];
  completedPages: string[];
  startedAt: Date;
  lastUpdated: Date;
  planId?: string;
  userId?: string;
  templateId?: string; // ID of applied template (if any)
  templateAppliedAt?: Date; // When template was applied
}

export class WizardStateManager {
  private state: WizardState;
  private storageKey = 'planBuilder.wizardState';
  private autoSaveEnabled = true;
  private autoSaveInterval?: NodeJS.Timeout;

  constructor(initialState?: Partial<WizardState>) {
    this.state = {
      currentPage: 'introduction',
      answers: {},
      visitedPages: [],
      completedPages: [],
      startedAt: new Date(),
      lastUpdated: new Date(),
      ...initialState,
    };

    // Load saved state from storage
    this.loadFromStorage();

    // Start auto-save if enabled
    if (this.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  /**
   * Get current wizard state
   */
  getState(): Readonly<WizardState> {
    return { ...this.state };
  }

  /**
   * Set an answer for a question
   */
  setAnswer(questionId: string, value: unknown): void {
    this.state.answers[questionId] = value;
    this.state.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Get an answer for a question
   */
  getAnswer<T = unknown>(questionId: string): T | undefined {
    return this.state.answers[questionId] as T | undefined;
  }

  /**
   * Get all answers
   */
  getAllAnswers(): Readonly<Record<string, unknown>> {
    return { ...this.state.answers };
  }

  /**
   * Apply a template to wizard state
   * @param templateId Template identifier
   * @param templateAnswers Pre-filled answers from template
   */
  applyTemplate(templateId: string, templateAnswers: Record<string, unknown>): void {
    this.state.templateId = templateId;
    this.state.templateAppliedAt = new Date();
    
    // Merge template answers with existing answers (template answers take precedence)
    this.state.answers = {
      ...this.state.answers,
      ...templateAnswers
    };
    
    this.state.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Check if wizard is using a template
   */
  hasTemplate(): boolean {
    return !!this.state.templateId;
  }

  /**
   * Get applied template ID
   */
  getTemplateId(): string | undefined {
    return this.state.templateId;
  }

  /**
   * Clear template association
   */
  clearTemplate(): void {
    this.state.templateId = undefined;
    this.state.templateAppliedAt = undefined;
    this.state.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Navigate to a page
   */
  navigateToPage(pageId: string): void {
    this.state.currentPage = pageId;

    if (!this.state.visitedPages.includes(pageId)) {
      this.state.visitedPages.push(pageId);
    }

    this.state.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Mark a page as completed
   */
  markPageCompleted(pageId: string): void {
    if (!this.state.completedPages.includes(pageId)) {
      this.state.completedPages.push(pageId);
    }
    this.state.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Check if a page is completed
   */
  isPageCompleted(pageId: string): boolean {
    return this.state.completedPages.includes(pageId);
  }

  /**
   * Check if a page has been visited
   */
  isPageVisited(pageId: string): boolean {
    return this.state.visitedPages.includes(pageId);
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgress(totalPages: number): number {
    if (totalPages === 0) return 0;
    return Math.round((this.state.completedPages.length / totalPages) * 100);
  }

  /**
   * Reset wizard state
   */
  reset(): void {
    this.state = {
      currentPage: 'introduction',
      answers: {},
      visitedPages: [],
      completedPages: [],
      startedAt: new Date(),
      lastUpdated: new Date(),
    };
    this.clearStorage();
  }

  /**
   * Export state to JSON
   */
  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import state from JSON
   */
  importState(json: string): void {
    try {
      const imported = JSON.parse(json);
      this.state = {
        ...this.state,
        ...imported,
        startedAt: new Date(imported.startedAt),
        lastUpdated: new Date(imported.lastUpdated),
      };
      this.saveToStorage();
    } catch (error) {
      throw new Error(`Failed to import state: ${(error as Error).message}`);
    }
  }

  /**
   * Save state to storage (localStorage or VS Code workspace state)
   */
  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, this.exportState());
      }
    } catch (error) {
      console.error('Failed to save wizard state:', error);
    }
  }

  /**
   * Load state from storage
   */
  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          this.importState(saved);
        }
      }
    } catch (error) {
      console.error('Failed to load wizard state:', error);
    }
  }

  /**
   * Clear storage
   */
  private clearStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('Failed to clear wizard state:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(intervalMs: number = 5000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveToStorage();
    }, intervalMs);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopAutoSave();
    this.saveToStorage();
  }
}

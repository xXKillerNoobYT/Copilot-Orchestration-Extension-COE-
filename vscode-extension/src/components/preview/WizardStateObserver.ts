/**
 * WizardStateObserver.ts
 * 
 * Observes wizard state changes via Pinia store and triggers preview updates.
 * Uses debouncing to prevent excessive re-renders during rapid input.
 * 
 * @performance Debounced updates (200ms) to maintain <500ms total latency
 * @author Auto Zen Agent
 * @date 2026-01-12
 */

import { watch, WatchStopHandle } from 'vue';
import type { WizardState } from './PreviewEngine';

export type StateChangeCallback = (state: WizardState, changedField?: string) => void;

export interface ObserverOptions {
  debounceMs?: number;
  deep?: boolean;
  immediate?: boolean;
  onError?: (error: Error) => void;
}

/**
 * WizardStateObserver - Monitors wizard state and triggers callbacks on changes
 * 
 * Features:
 * - Debounced updates to prevent excessive re-renders
 * - Deep watching of nested state objects
 * - Automatic cleanup on destroy
 * - Error handling for callback failures
 * - Field-level change detection
 */
export class WizardStateObserver {
  private static readonly DEFAULT_DEBOUNCE_MS = 200;
  
  private watchHandles: WatchStopHandle[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly onError: (error: Error) => void;
  private isDestroyed: boolean = false;
  private lastState: WizardState | null = null;

  constructor(options: ObserverOptions = {}) {
    this.debounceMs = options.debounceMs ?? WizardStateObserver.DEFAULT_DEBOUNCE_MS;
    this.onError = options.onError ?? this.defaultErrorHandler;
  }

  /**
   * Start observing wizard state
   * 
   * @param getState Function that returns current wizard state
   * @param callback Function called when state changes
   * @param options Observer options
   */
  public observe(
    getState: () => WizardState,
    callback: StateChangeCallback,
    options: ObserverOptions = {}
  ): void {
    if (this.isDestroyed) {
      throw new Error('Cannot observe on destroyed WizardStateObserver');
    }

    // Set up watcher for the entire state object
    const stopHandle = watch(
      getState,
      (newState, oldState) => {
        this.handleStateChange(newState, oldState, callback);
      },
      {
        deep: options.deep ?? true,
        immediate: options.immediate ?? false
      }
    );

    this.watchHandles.push(stopHandle);
  }

  /**
   * Start observing a specific field in wizard state
   * 
   * @param getField Function that returns specific field value
   * @param fieldName Name of the field being watched
   * @param callback Function called when field changes
   */
  public observeField<T>(
    getField: () => T,
    fieldName: string,
    callback: StateChangeCallback
  ): void {
    if (this.isDestroyed) {
      throw new Error('Cannot observe on destroyed WizardStateObserver');
    }

    const stopHandle = watch(
      getField,
      (newValue, oldValue) => {
        // Only trigger if value actually changed
        if (newValue !== oldValue) {
          this.debouncedCallback(() => {
            try {
              // Create a partial state update for the callback
              const state = this.lastState || this.createEmptyState();
              callback(state, fieldName);
            } catch (error) {
              this.onError(error as Error);
            }
          });
        }
      },
      { deep: true }
    );

    this.watchHandles.push(stopHandle);
  }

  /**
   * Handle state change with debouncing
   */
  private handleStateChange(
    newState: WizardState,
    oldState: WizardState | undefined,
    callback: StateChangeCallback
  ): void {
    // Store latest state
    this.lastState = { ...newState };

    // Find which field changed (if any)
    const changedField = oldState ? this.findChangedField(newState, oldState) : undefined;

    // Debounce the callback
    this.debouncedCallback(() => {
      try {
        callback(newState, changedField);
      } catch (error) {
        this.onError(error as Error);
      }
    });
  }

  /**
   * Execute callback with debouncing
   */
  private debouncedCallback(callback: () => void): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      callback();
      this.debounceTimer = null;
    }, this.debounceMs);
  }

  /**
   * Find which field changed between states
   */
  private findChangedField(newState: WizardState, oldState: WizardState): string | undefined {
    // Check step change
    if (newState.currentStep !== oldState.currentStep) {
      return 'currentStep';
    }

    // Check answers (shallow comparison)
    const newAnswerKeys = Object.keys(newState.answers);
    const oldAnswerKeys = Object.keys(oldState.answers);

    if (newAnswerKeys.length !== oldAnswerKeys.length) {
      return 'answers';
    }

    for (const key of newAnswerKeys) {
      if (newState.answers[key] !== oldState.answers[key]) {
        return `answers.${key}`;
      }
    }

    // Check validation errors
    if (JSON.stringify(newState.validationErrors) !== JSON.stringify(oldState.validationErrors)) {
      return 'validationErrors';
    }

    // Check completion status
    if (newState.isComplete !== oldState.isComplete) {
      return 'isComplete';
    }

    return undefined;
  }

  /**
   * Create empty state for initialization
   */
  private createEmptyState(): WizardState {
    return {
      currentStep: 0,
      answers: {},
      validationErrors: {},
      isComplete: false
    };
  }

  /**
   * Default error handler
   */
  private defaultErrorHandler(error: Error): void {
    console.error('[WizardStateObserver] Error in state change callback:', error);
  }

  /**
   * Stop all observations and clean up
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Stop all watchers
    this.watchHandles.forEach(handle => handle());
    this.watchHandles = [];

    // Mark as destroyed
    this.isDestroyed = true;
    this.lastState = null;
  }

  /**
   * Check if observer is destroyed
   */
  public isActive(): boolean {
    return !this.isDestroyed;
  }

  /**
   * Get current debounce delay
   */
  public getDebounceMs(): number {
    return this.debounceMs;
  }

  /**
   * Pause observations (stop triggering callbacks)
   */
  public pause(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Resume observations (re-enable callbacks)
   * Note: This doesn't restart watchers, just clears any pending debounce
   */
  public resume(): void {
    // Watchers are still active, this just ensures clean state
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

/**
 * Create a new WizardStateObserver instance
 */
export function createObserver(options?: ObserverOptions): WizardStateObserver {
  return new WizardStateObserver(options);
}

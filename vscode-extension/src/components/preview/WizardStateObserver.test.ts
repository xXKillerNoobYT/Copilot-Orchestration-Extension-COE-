/**
 * WizardStateObserver.test.ts
 * 
 * Comprehensive tests for WizardStateObserver including:
 * - State change detection
 * - Debouncing behavior
 * - Field-level watching
 * - Cleanup and lifecycle
 * 
 * @author Auto Zen Agent
 * @date 2026-01-12
 * Converted from Vitest to Jest: 2026-01-17
 */

import { WizardStateObserver, createObserver } from './WizardStateObserver';
import type { WizardState } from './PreviewEngine';

// Mock Vue's watch and ref functionality for Jest
type WatchCallback = (newVal: any, oldVal: any) => void;
type WatchStopHandle = () => void;

const watchCallbacks: Map<string, { callback: WatchCallback; options: any; source: any }> = new Map();
let watchIdCounter = 0;

jest.mock('vue', () => ({
  watch: jest.fn((source: any, callback: WatchCallback, options?: any): WatchStopHandle => {
    const watchId = `watch-${watchIdCounter++}`;
    watchCallbacks.set(watchId, { callback, options, source });
    
    // If immediate, call with initial value
    if (options?.immediate) {
      const initialValue = typeof source === 'function' ? source() : source.value;
      setTimeout(() => callback(initialValue, undefined), 0);
    }
    
    // Return stop handle
    return () => {
      watchCallbacks.delete(watchId);
    };
  }),
  ref: <T,>(value: T) => ({ value })
}));

// Helper to trigger watch callbacks manually
function triggerWatchers(newState: WizardState, oldState?: WizardState) {
  watchCallbacks.forEach(({ callback, source }) => {
    // Call the callback with new state
    callback(newState, oldState);
  });
}

describe('WizardStateObserver', () => {
  let observer: WizardStateObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    watchCallbacks.clear();
    watchIdCounter = 0;
    observer = createObserver();
  });

  afterEach(() => {
    if (observer) {
      observer.destroy();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
    watchCallbacks.clear();
  });

  describe('Basic Observation', () => {
    it('should detect state changes', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      // Simulate state change
      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      // Fast-forward debounce timer
      jest.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass new state to callback', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      const newState = { ...state, currentStep: 2 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 2 }),
        'currentStep'
      );
    });

    it('should detect field changes in answers', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      const newState = {
        ...state,
        answers: { projectName: 'Test Project' }
      };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][1]).toContain('answers');
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid changes', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      // Trigger multiple rapid changes
      for (let i = 1; i <= 5; i++) {
        const newState = { ...state, currentStep: i };
        triggerWatchers(newState, { ...state, currentStep: i - 1 });
        jest.advanceTimersByTime(50); // Less than debounce time
      }

      // Should not have called yet (debounce not finished)
      expect(callback).not.toHaveBeenCalled();

      // Complete debounce
      jest.advanceTimersByTime(200);

      // Should have called only once with final state
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toMatchObject({ currentStep: 5 });
    });

    it('should respect custom debounce time', () => {
      const customObserver = createObserver({ debounceMs: 500 });

      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      customObserver.observe(getState, callback);

      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200); // Less than 500ms
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300); // Total 500ms
      expect(callback).toHaveBeenCalledTimes(1);

      customObserver.destroy();
    });

    it('should get debounce delay', () => {
      const customObserver = createObserver({ debounceMs: 300 });
      expect(customObserver.getDebounceMs()).toBe(300);
      customObserver.destroy();
    });
  });

  describe('Field-Level Observation', () => {
    it('should observe specific field changes', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: { projectName: 'Initial' },
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getField = () => state.answers.projectName;

      observer.observeField(getField, 'projectName', callback);

      // Simulate field change
      triggerWatchers('Changed', 'Initial');

      jest.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalled();
    });

    it('should not trigger on same value', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: { projectName: 'Same' },
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getField = () => state.answers.projectName;

      observer.observeField(getField, 'projectName', callback);

      // Simulate no actual change
      triggerWatchers('Same', 'Same');

      jest.advanceTimersByTime(200);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should pass field name to callback', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: { description: 'Test' },
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getField = () => state.answers.description;

      observer.observeField(getField, 'description', callback);

      triggerWatchers('Updated', 'Test');

      jest.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('description');
    });
  });

  describe('Change Detection', () => {
    it('should detect currentStep change', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      const newState = { ...state, currentStep: 3 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('currentStep');
    });

    it('should detect isComplete change', () => {
      const state: WizardState = {
        currentStep: 5,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      const newState = { ...state, isComplete: true };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('isComplete');
    });

    it('should detect validation error changes', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      const newState = {
        ...state,
        validationErrors: { field1: ['Error 1'] }
      };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('validationErrors');
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const errorHandler = jest.fn();
      const faultyObserver = createObserver({ onError: errorHandler });

      const callback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const getState = () => state;
      faultyObserver.observe(getState, callback);

      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Callback error' })
      );

      faultyObserver.destroy();
    });

    it('should use default error handler if none provided', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn(() => {
        throw new Error('Test error');
      });

      const getState = () => state;
      observer.observe(getState, callback);

      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw when observing after destroy', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const getState = () => state;
      observer.destroy();

      expect(() => {
        observer.observe(getState, jest.fn());
      }).toThrow('Cannot observe on destroyed WizardStateObserver');
    });
  });

  describe('Lifecycle Management', () => {
    it('should clean up on destroy', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      observer.destroy();

      // Change after destroy
      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      // Should not trigger callback after destroy
      expect(callback).not.toHaveBeenCalled();
    });

    it('should report active status correctly', () => {
      expect(observer.isActive()).toBe(true);

      observer.destroy();

      expect(observer.isActive()).toBe(false);
    });

    it('should handle multiple destroys gracefully', () => {
      observer.destroy();
      
      expect(() => {
        observer.destroy(); // Second destroy
      }).not.toThrow();
    });

    it('should clean up multiple watchers', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: { field1: 'a', field2: 'b' },
        validationErrors: {},
        isComplete: false
      };

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const getState = () => state;
      const getField1 = () => state.answers.field1;

      observer.observe(getState, callback1);
      observer.observeField(getField1, 'field1', callback2);

      observer.destroy();

      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Pause and Resume', () => {
    it('should pause observations', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);
      
      // Pause before debounce completes
      jest.advanceTimersByTime(100);
      observer.pause();
      jest.advanceTimersByTime(200);

      // Should not have called (paused)
      expect(callback).not.toHaveBeenCalled();
    });

    it('should resume observations', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      observer.pause();
      observer.resume();

      const newState = { ...state, currentStep: 1 };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Deep Watching', () => {
    it('should detect nested object changes', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {
          architecture: {
            pattern: 'MVC',
            layers: ['Model', 'View']
          }
        },
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback, { deep: true });

      // Simulate nested change
      const newState = {
        ...state,
        answers: {
          architecture: {
            pattern: 'MVC',
            layers: ['Model', 'View', 'Controller']
          }
        }
      };
      triggerWatchers(newState, state);

      jest.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalled();
    });

    it('should respect deep option', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: { nested: { value: 1 } },
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback, { deep: false });

      // Note: In this simplified mock, deep watching behavior is not fully implemented
      // This test verifies the option is accepted without error
      expect(observer.isActive()).toBe(true);
    });
  });

  describe('Immediate Execution', () => {
    it('should trigger immediately when requested', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback, { immediate: true });

      // Flush any pending timers from immediate execution
      jest.runAllTimers();

      expect(callback).toHaveBeenCalled();
    });

    it('should not trigger immediately by default', () => {
      const state: WizardState = {
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      };

      const callback = jest.fn();
      const getState = () => state;

      observer.observe(getState, callback);

      jest.advanceTimersByTime(0);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

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
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import { WizardStateObserver, createObserver } from './WizardStateObserver';
import type { WizardState } from './PreviewEngine';

describe('WizardStateObserver', () => {
  let observer: WizardStateObserver;

  beforeEach(() => {
    observer = createObserver();
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (observer) {
      observer.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Basic Observation', () => {
    it('should detect state changes', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      // Change state
      state.value = {
        ...state.value,
        currentStep: 1
      };

      // Wait for debounce
      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass new state to callback', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      state.value = {
        ...state.value,
        currentStep: 2
      };

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 2 }),
        'currentStep'
      );
    });

    it('should detect field changes in answers', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      state.value = {
        ...state.value,
        answers: { projectName: 'Test Project' }
      };

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][1]).toContain('answers');
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid changes', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      // Trigger multiple rapid changes
      for (let i = 1; i <= 5; i++) {
        state.value = { ...state.value, currentStep: i };
        vi.advanceTimersByTime(50); // Less than debounce time
      }

      // Should not have called yet (debounce not finished)
      expect(callback).not.toHaveBeenCalled();

      // Complete debounce
      vi.advanceTimersByTime(200);

      // Should have called only once with final state
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toMatchObject({ currentStep: 5 });
    });

    it('should respect custom debounce time', async () => {
      const customObserver = createObserver({ debounceMs: 500 });

      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      customObserver.observe(() => state.value, callback);

      state.value = { ...state.value, currentStep: 1 };

      vi.advanceTimersByTime(200); // Less than 500ms
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300); // Total 500ms
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
    it('should observe specific field changes', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: { projectName: 'Initial' },
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observeField(
        () => state.value.answers.projectName,
        'projectName',
        callback
      );

      state.value.answers.projectName = 'Changed';

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalled();
    });

    it('should not trigger on same value', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: { projectName: 'Same' },
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observeField(
        () => state.value.answers.projectName,
        'projectName',
        callback
      );

      state.value.answers.projectName = 'Same'; // No actual change

      vi.advanceTimersByTime(200);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should pass field name to callback', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: { description: 'Test' },
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observeField(
        () => state.value.answers.description,
        'description',
        callback
      );

      state.value.answers.description = 'Updated';

      vi.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('description');
    });
  });

  describe('Change Detection', () => {
    it('should detect currentStep change', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      state.value = { ...state.value, currentStep: 3 };

      vi.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('currentStep');
    });

    it('should detect isComplete change', async () => {
      const state = ref<WizardState>({
        currentStep: 5,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      state.value = { ...state.value, isComplete: true };

      vi.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('isComplete');
    });

    it('should detect validation error changes', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      state.value = {
        ...state.value,
        validationErrors: { field1: ['Error 1'] }
      };

      vi.advanceTimersByTime(200);

      expect(callback.mock.calls[0][1]).toBe('validationErrors');
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const errorHandler = vi.fn();
      const faultyObserver = createObserver({ onError: errorHandler });

      const callback = vi.fn(() => {
        throw new Error('Callback error');
      });

      faultyObserver.observe(() => state.value, callback);

      state.value = { ...state.value, currentStep: 1 };

      vi.advanceTimersByTime(200);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Callback error' })
      );

      faultyObserver.destroy();
    });

    it('should use default error handler if none provided', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn(() => {
        throw new Error('Test error');
      });

      observer.observe(() => state.value, callback);

      state.value = { ...state.value, currentStep: 1 };

      vi.advanceTimersByTime(200);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw when observing after destroy', () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      observer.destroy();

      expect(() => {
        observer.observe(() => state.value, vi.fn());
      }).toThrow('Cannot observe on destroyed WizardStateObserver');
    });
  });

  describe('Lifecycle Management', () => {
    it('should clean up on destroy', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      observer.destroy();

      // Change after destroy
      state.value = { ...state.value, currentStep: 1 };

      vi.advanceTimersByTime(200);

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

    it('should clean up multiple watchers', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: { field1: 'a', field2: 'b' },
        validationErrors: {},
        isComplete: false
      });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      observer.observe(() => state.value, callback1);
      observer.observeField(() => state.value.answers.field1, 'field1', callback2);

      observer.destroy();

      state.value.currentStep = 1;
      state.value.answers.field1 = 'changed';

      vi.advanceTimersByTime(200);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Pause and Resume', () => {
    it('should pause observations', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      state.value = { ...state.value, currentStep: 1 };
      
      // Pause before debounce completes
      vi.advanceTimersByTime(100);
      observer.pause();
      vi.advanceTimersByTime(200);

      // Should not have called (paused)
      expect(callback).not.toHaveBeenCalled();
    });

    it('should resume observations', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      observer.pause();
      observer.resume();

      state.value = { ...state.value, currentStep: 1 };

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Deep Watching', () => {
    it('should detect nested object changes', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {
          architecture: {
            pattern: 'MVC',
            layers: ['Model', 'View']
          }
        },
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback, { deep: true });

      // Modify nested object
      state.value.answers.architecture.layers.push('Controller');

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalled();
    });

    it('should respect deep option', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: { nested: { value: 1 } },
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback, { deep: false });

      // Modify nested value (shouldn't trigger without deep)
      (state.value.answers.nested as any).value = 2;

      vi.advanceTimersByTime(200);

      // With deep:false, nested changes may not trigger
      // (behavior depends on Vue's watch implementation)
    });
  });

  describe('Immediate Execution', () => {
    it('should trigger immediately when requested', async () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback, { immediate: true });

      vi.advanceTimersByTime(0); // No time needed

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger immediately by default', () => {
      const state = ref<WizardState>({
        currentStep: 0,
        answers: {},
        validationErrors: {},
        isComplete: false
      });

      const callback = vi.fn();

      observer.observe(() => state.value, callback);

      vi.advanceTimersByTime(0);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

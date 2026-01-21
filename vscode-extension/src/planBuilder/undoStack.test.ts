/**
 * Undo Stack Tests
 * 
 * Test suite for undo/redo functionality
 */

import { UndoStack, createStateAction, createCallbackAction } from './undoStack';

describe('UndoStack', () => {
  let stack: UndoStack<any>;

  beforeEach(() => {
    stack = new UndoStack(20);
  });

  describe('Constructor', () => {
    it('should create stack with default max size', () => {
      const defaultStack = new UndoStack();
      expect(defaultStack.getUndoSize()).toBe(0);
      expect(defaultStack.canUndo()).toBe(false);
    });

    it('should create stack with custom max size', () => {
      const customStack = new UndoStack(50);
      expect(customStack.getUndoSize()).toBe(0);
    });
  });

  describe('Execute and Undo', () => {
    it('should execute action and add to stack', () => {
      let value = 0;
      const action = createCallbackAction(
        () => { value = 1; },
        () => { value = 0; },
        'Increment'
      );

      stack.execute(action);

      expect(value).toBe(1);
      expect(stack.canUndo()).toBe(true);
      expect(stack.getUndoSize()).toBe(1);
    });

    it('should undo last action', () => {
      let value = 0;
      const action = createCallbackAction(
        () => { value = 1; },
        () => { value = 0; },
        'Increment'
      );

      stack.execute(action);
      expect(value).toBe(1);

      stack.undo();
      expect(value).toBe(0);
      expect(stack.canUndo()).toBe(false);
    });

    it('should handle multiple actions', () => {
      let value = 0;

      for (let i = 1; i <= 5; i++) {
        const action = createCallbackAction(
          () => { value += 1; },
          () => { value -= 1; },
          `Add ${i}`
        );
        stack.execute(action);
      }

      expect(value).toBe(5);
      expect(stack.getUndoSize()).toBe(5);

      // Undo 3 times
      stack.undo();
      stack.undo();
      stack.undo();

      expect(value).toBe(2);
      expect(stack.getUndoSize()).toBe(2);
    });

    it('should return false when undoing empty stack', () => {
      expect(stack.undo()).toBe(false);
    });

    it('should clear redo stack on new action', () => {
      let value = 0;
      const action1 = createCallbackAction(() => { value = 1; }, () => { value = 0; });
      const action2 = createCallbackAction(() => { value = 2; }, () => { value = 1; });
      const action3 = createCallbackAction(() => { value = 3; }, () => { value = 2; });

      stack.execute(action1);
      stack.execute(action2);
      stack.undo();

      expect(stack.canRedo()).toBe(true);

      stack.execute(action3);

      expect(stack.canRedo()).toBe(false);
      expect(value).toBe(3);
    });
  });

  describe('Redo', () => {
    it('should redo undone action', () => {
      let value = 0;
      const action = createCallbackAction(
        () => { value = 1; },
        () => { value = 0; }
      );

      stack.execute(action);
      stack.undo();
      expect(value).toBe(0);

      stack.redo();
      expect(value).toBe(1);
    });

    it('should handle multiple redos', () => {
      let value = 0;

      for (let i = 1; i <= 3; i++) {
        const action = createCallbackAction(
          () => { value += 1; },
          () => { value -= 1; }
        );
        stack.execute(action);
      }

      // Undo all
      stack.undo();
      stack.undo();
      stack.undo();
      expect(value).toBe(0);

      // Redo all
      stack.redo();
      stack.redo();
      stack.redo();
      expect(value).toBe(3);
    });

    it('should return false when redoing empty redo stack', () => {
      expect(stack.redo()).toBe(false);
    });
  });

  describe('Stack Size Limit', () => {
    it('should limit stack to max size', () => {
      const smallStack = new UndoStack(5);
      let value = 0;

      // Execute 10 actions (more than limit)
      for (let i = 0; i < 10; i++) {
        const action = createCallbackAction(
          () => { value += 1; },
          () => { value -= 1; }
        );
        smallStack.execute(action);
      }

      expect(value).toBe(10);
      expect(smallStack.getUndoSize()).toBe(5); // Should be limited to 5

      // Undo 5 times
      for (let i = 0; i < 5; i++) {
        smallStack.undo();
      }

      expect(value).toBe(5); // Can only undo 5 actions
      expect(smallStack.canUndo()).toBe(false);
    });
  });

  describe('State-based Actions', () => {
    it('should work with state-based actions', () => {
      const beforeState = { count: 0, name: 'before' };
      const afterState = { count: 1, name: 'after' };
      let currentState = { ...beforeState };

      const action = createStateAction(
        beforeState,
        afterState,
        (state) => { currentState = { ...state }; },
        'Update state'
      );

      stack.execute(action);
      expect(currentState).toEqual(afterState);

      stack.undo();
      expect(currentState).toEqual(beforeState);

      stack.redo();
      expect(currentState).toEqual(afterState);
    });
  });

  describe('Clear', () => {
    it('should clear all stacks', () => {
      let value = 0;
      const action = createCallbackAction(
        () => { value = 1; },
        () => { value = 0; }
      );

      stack.execute(action);
      stack.undo();

      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);

      stack.clear();

      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
      expect(stack.getUndoSize()).toBe(0);
      expect(stack.getRedoSize()).toBe(0);
    });
  });

  describe('Action Descriptions', () => {
    it('should track action descriptions', () => {
      const action1 = createCallbackAction(
        () => {},
        () => {},
        'First action'
      );
      const action2 = createCallbackAction(
        () => {},
        () => {},
        'Second action'
      );

      stack.execute(action1);
      expect(stack.getLastActionDescription()).toBe('First action');

      stack.execute(action2);
      expect(stack.getLastActionDescription()).toBe('Second action');
    });

    it('should track redo descriptions', () => {
      const action = createCallbackAction(
        () => {},
        () => {},
        'Test action'
      );

      stack.execute(action);
      stack.undo();

      expect(stack.getNextRedoDescription()).toBe('Test action');

      stack.redo();
      expect(stack.getNextRedoDescription()).toBeUndefined();
    });
  });

  describe('canUndo and canRedo', () => {
    it('should correctly report undo/redo availability', () => {
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);

      const action = createCallbackAction(() => {}, () => {});
      stack.execute(action);

      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);

      stack.undo();

      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);

      stack.redo();

      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });
  });

  describe('Integration Test', () => {
    it('should handle complex undo/redo scenarios', () => {
      let text = '';

      // Execute several actions
      stack.execute(createCallbackAction(
        () => { text += 'A'; },
        () => { text = text.slice(0, -1); },
        'Add A'
      ));
      stack.execute(createCallbackAction(
        () => { text += 'B'; },
        () => { text = text.slice(0, -1); },
        'Add B'
      ));
      stack.execute(createCallbackAction(
        () => { text += 'C'; },
        () => { text = text.slice(0, -1); },
        'Add C'
      ));

      expect(text).toBe('ABC');
      expect(stack.getUndoSize()).toBe(3);

      // Undo twice
      stack.undo();
      stack.undo();
      expect(text).toBe('A');

      // Add new action (should clear redo)
      stack.execute(createCallbackAction(
        () => { text += 'D'; },
        () => { text = text.slice(0, -1); },
        'Add D'
      ));
      expect(text).toBe('AD');
      expect(stack.canRedo()).toBe(false);

      // Undo all
      while (stack.canUndo()) {
        stack.undo();
      }
      expect(text).toBe('');
      expect(stack.getRedoSize()).toBe(2);

      // Redo all
      while (stack.canRedo()) {
        stack.redo();
      }
      expect(text).toBe('AD');
    });
  });
});

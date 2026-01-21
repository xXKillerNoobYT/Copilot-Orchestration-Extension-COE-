/**
 * Undo Stack
 * 
 * Generic undo/redo stack implementation using Command Pattern.
 * Supports 20+ undo levels with keyboard shortcuts.
 * 
 * Reference: Section 2.4 of COMPREHENSIVE-AUDIT-UNDONE-TASKS.md
 */

export interface UndoableAction<T = any> {
  /** Execute the action (do or redo) */
  execute(): void;
  
  /** Undo the action */
  undo(): void;
  
  /** Optional description for debugging */
  description?: string;
  
  /** Optional data payload */
  data?: T;
}

export class UndoStack<T = any> {
  private undoStack: UndoableAction<T>[] = [];
  private redoStack: UndoableAction<T>[] = [];
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  /**
   * Execute an action and add it to the undo stack
   */
  execute(action: UndoableAction<T>): void {
    // Execute the action
    action.execute();
    
    // Add to undo stack
    this.undoStack.push(action);
    
    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];
    
    // Limit stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last action
   * @returns true if undo was performed, false if stack is empty
   */
  undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) {
      return false;
    }

    // Undo the action
    action.undo();
    
    // Move to redo stack
    this.redoStack.push(action);
    
    return true;
  }

  /**
   * Redo the last undone action
   * @returns true if redo was performed, false if stack is empty
   */
  redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) {
      return false;
    }

    // Re-execute the action
    action.execute();
    
    // Move back to undo stack
    this.undoStack.push(action);
    
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the size of the undo stack
   */
  getUndoSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get the size of the redo stack
   */
  getRedoSize(): number {
    return this.redoStack.length;
  }

  /**
   * Clear all stacks
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the last action description (for debugging/UI)
   */
  getLastActionDescription(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.description;
  }

  /**
   * Get the next redo action description (for debugging/UI)
   */
  getNextRedoDescription(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.description;
  }
}

/**
 * Create a simple state-based undoable action
 * 
 * Useful for simple state changes where you just need to
 * store before/after state.
 */
export function createStateAction<T>(
  beforeState: T,
  afterState: T,
  applyState: (state: T) => void,
  description?: string
): UndoableAction<T> {
  return {
    execute: () => applyState(afterState),
    undo: () => applyState(beforeState),
    description,
    data: afterState,
  };
}

/**
 * Create an undoable action from callbacks
 */
export function createCallbackAction(
  doFn: () => void,
  undoFn: () => void,
  description?: string
): UndoableAction {
  return {
    execute: doFn,
    undo: undoFn,
    description,
  };
}

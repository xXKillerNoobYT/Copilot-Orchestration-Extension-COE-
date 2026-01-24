// ./errorHandler.web.spec.ts
import * as vscode from 'vscode';
import { showErrorMessage } from '../errorHandler';

jest.mock('vscode', () => ({
    ...jest.requireActual('vscode'),
    window: {
    showErrorMessage: jest.fn(),
  },
}));

/** @aiContributed-2026-01-23 */
describe('showErrorMessage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-23 */
    it('should display a user-friendly error message for a known error', () => {
    const error = new Error('ECONNREFUSED');
    showErrorMessage(error);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Unable to connect to the server. Please ensure it is running.'
    );
  });

  /** @aiContributed-2026-01-23 */
    it('should display a generic error message for an unknown error', () => {
    const error = new Error('Unknown error');
    showErrorMessage(error);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Unknown error');
  });

  /** @aiContributed-2026-01-23 */
    it('should include context in the error message if provided', () => {
    const error = new Error('404');
    const context = 'Fetching data';
    showErrorMessage(error, context);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Fetching data: Resource not found.'
    );
  });

  /** @aiContributed-2026-01-23 */
    it('should log the full error to the console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('500');
    showErrorMessage(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler] Error:', error);
    consoleErrorSpy.mockRestore();
  });
});

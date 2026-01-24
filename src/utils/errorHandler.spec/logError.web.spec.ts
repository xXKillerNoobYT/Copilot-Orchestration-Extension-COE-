// ./errorHandler.web.spec.ts
import { logError } from '../errorHandler';
import * as vscode from 'vscode';

jest.mock('vscode', () => ({
    ...jest.requireActual('vscode'),
    window: {
    showErrorMessage: jest.fn(),
  },
}));

/** @aiContributed-2026-01-23 */
describe('logError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-23 */
    it('should log error message with context and additional info', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test error');
    const context = 'TestContext';
    const additionalInfo = { key: 'value' };

    logError(error, context, additionalInfo);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[TestContext\] Error:/),
      'Test error'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Stack trace:', error.stack);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Additional info:',
      JSON.stringify(additionalInfo, null, 2)
    );
  });

  /** @aiContributed-2026-01-23 */
    it('should log error message without additional info', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test error');
    const context = 'TestContext';

    logError(error, context);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[TestContext\] Error:/),
      'Test error'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Stack trace:', error.stack);
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Additional info:',
      expect.any(String)
    );
  });

  /** @aiContributed-2026-01-23 */
    it('should handle non-Error objects gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = 'String error';
    const context = 'TestContext';

    logError(error, context);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[TestContext\] Error:/),
      'String error'
    );
    expect(consoleErrorSpy).not.toHaveBeenCalledWith('Stack trace:', expect.any(String));
  });
});

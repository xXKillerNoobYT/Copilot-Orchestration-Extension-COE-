// ./githubAuthProvider.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider';
import * as vscode from 'vscode';

jest.mock('vscode', () => ({
    ...jest.requireActual('vscode'),
    SecretStorage: jest.fn(),
}));

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider', () => {
  let secretStorageMock: vscode.SecretStorage;
  let gitHubAuthProvider: GitHubAuthProvider;

  beforeEach(() => {
    secretStorageMock = {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn(),
    } as unknown as vscode.SecretStorage;

    gitHubAuthProvider = new GitHubAuthProvider(secretStorageMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-24 */
    describe('authenticate', () => {
    /** @aiContributed-2026-01-24 */
        it('should return success with token when a valid token is stored', async () => {
      const mockToken = 'valid-token';
      const mockValidation = { valid: true };

      jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue(mockToken);
      jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue(mockValidation);

      const result = await gitHubAuthProvider.authenticate();

      expect(result).toEqual({ success: true, token: mockToken });
      expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
      expect(gitHubAuthProvider.validateToken).toHaveBeenCalledWith(mockToken);
    });

    /** @aiContributed-2026-01-24 */
        it('should prompt for token and return success when a valid token is provided', async () => {
      const mockToken = 'valid-token';
      const mockValidation = { valid: true };

      jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue(undefined);
      jest.spyOn(gitHubAuthProvider, 'promptForToken').mockResolvedValue(mockToken);
      jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue(mockValidation);

      const result = await gitHubAuthProvider.authenticate();

      expect(result).toEqual({ success: true, token: mockToken });
      expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
      expect(gitHubAuthProvider.promptForToken).toHaveBeenCalled();
      expect(gitHubAuthProvider.validateToken).toHaveBeenCalledWith(mockToken);
    });

    /** @aiContributed-2026-01-24 */
        it('should return error when token validation fails', async () => {
      const mockToken = 'invalid-token';
      const mockValidation = { valid: false, error: 'Invalid token' };

      jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue(mockToken);
      jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue(mockValidation);
      jest.spyOn(gitHubAuthProvider, 'clearToken').mockResolvedValue();

      const result = await gitHubAuthProvider.authenticate();

      expect(result).toEqual({ success: false, error: 'Invalid token' });
      expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
      expect(gitHubAuthProvider.validateToken).toHaveBeenCalledWith(mockToken);
      expect(gitHubAuthProvider.clearToken).toHaveBeenCalled();
    });

    /** @aiContributed-2026-01-24 */
        it('should return error when user cancels token prompt', async () => {
      jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue(undefined);
      jest.spyOn(gitHubAuthProvider, 'promptForToken').mockResolvedValue(undefined);

      const result = await gitHubAuthProvider.authenticate();

      expect(result).toEqual({ success: false, error: 'Authentication cancelled by user' });
      expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
      expect(gitHubAuthProvider.promptForToken).toHaveBeenCalled();
    });

    /** @aiContributed-2026-01-24 */
        it('should return error when an exception occurs', async () => {
      jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockRejectedValue(new Error('Unexpected error'));

      const result = await gitHubAuthProvider.authenticate();

      expect(result).toEqual({ success: false, error: 'Unexpected error' });
      expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
    });
  });
});
// ./githubAuthProvider.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import * as vscode from 'vscode';

jest.mock('vscode', () => ({
    ...jest.requireActual('vscode'),
    SecretStorage: jest.fn(),
}));

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider.refresh', () => {
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

  /** @aiContributed-2026-01-24 */
    it('should authenticate and return success if no token is stored', async () => {
    jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue(undefined);
    jest.spyOn(gitHubAuthProvider, 'authenticate').mockResolvedValue({ success: true });

    const result = await gitHubAuthProvider.refresh();

    expect(result).toBe(true);
    expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
    expect(gitHubAuthProvider.authenticate).toHaveBeenCalled();
  });

  /** @aiContributed-2026-01-24 */
    it('should clear token and re-authenticate if stored token is invalid', async () => {
    jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue('invalid-token');
    jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue({ valid: false });
    jest.spyOn(gitHubAuthProvider, 'clearToken').mockResolvedValue();
    jest.spyOn(gitHubAuthProvider, 'authenticate').mockResolvedValue({ success: true });

    const result = await gitHubAuthProvider.refresh();

    expect(result).toBe(true);
    expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
    expect(gitHubAuthProvider.validateToken).toHaveBeenCalledWith('invalid-token');
    expect(gitHubAuthProvider.clearToken).toHaveBeenCalled();
    expect(gitHubAuthProvider.authenticate).toHaveBeenCalled();
  });

  /** @aiContributed-2026-01-24 */
    it('should return true if stored token is valid', async () => {
    jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue('valid-token');
    jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue({ valid: true });

    const result = await gitHubAuthProvider.refresh();

    expect(result).toBe(true);
    expect(gitHubAuthProvider.getStoredToken).toHaveBeenCalled();
    expect(gitHubAuthProvider.validateToken).toHaveBeenCalledWith('valid-token');
  });
});
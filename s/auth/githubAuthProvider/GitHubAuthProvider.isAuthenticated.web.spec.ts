// ./githubAuthProvider.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import * as vscode from 'vscode';

jest.mock('vscode', () => ({
    ...jest.requireActual('vscode'),
    SecretStorage: jest.fn(),
}));

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider - isAuthenticated', () => {
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
    it('should return false if no token is stored', async () => {
    jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue(undefined);

    const result = await gitHubAuthProvider.isAuthenticated();

    expect(result).toBe(false);
  });

  /** @aiContributed-2026-01-24 */
    it('should return false if the token is invalid', async () => {
    jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue('mockToken');
    jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue({ valid: false });

    const result = await gitHubAuthProvider.isAuthenticated();

    expect(result).toBe(false);
  });

  /** @aiContributed-2026-01-24 */
    it('should return true if the token is valid', async () => {
    jest.spyOn(gitHubAuthProvider, 'getStoredToken').mockResolvedValue('mockToken');
    jest.spyOn(gitHubAuthProvider, 'validateToken').mockResolvedValue({ valid: true });

    const result = await gitHubAuthProvider.isAuthenticated();

    expect(result).toBe(true);
  });
});
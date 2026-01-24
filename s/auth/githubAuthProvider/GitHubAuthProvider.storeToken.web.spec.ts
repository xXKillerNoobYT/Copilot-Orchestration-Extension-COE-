// ./githubAuthProvider.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import * as vscode from 'vscode';

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider', () => {
  let secretStorageMock: vscode.SecretStorage;
  let gitHubAuthProvider: GitHubAuthProvider;

  beforeEach(() => {
    secretStorageMock = {
      store: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as unknown as vscode.SecretStorage;

    gitHubAuthProvider = new GitHubAuthProvider(secretStorageMock);
  });

  /** @aiContributed-2026-01-24 */
    it('should store the token in secret storage', async () => {
    const token = 'test-token';

    await gitHubAuthProvider.storeToken(token);

    expect(secretStorageMock.store).toHaveBeenCalledWith(
      'copilot-orchestrator.github.token',
      token
    );
  });
});
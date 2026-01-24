// ./githubAuthProvider.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import * as vscode from 'vscode';

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider', () => {
  let secretStorageMock: vscode.SecretStorage;
  let gitHubAuthProvider: GitHubAuthProvider;

  beforeEach(() => {
    secretStorageMock = {
      delete: jest.fn(),
    } as unknown as vscode.SecretStorage;

    gitHubAuthProvider = new GitHubAuthProvider(secretStorageMock);
  });

  /** @aiContributed-2026-01-24 */
    it('should call secretStorage.delete with the correct key when clearToken is called', async () => {
    await gitHubAuthProvider.clearToken();

    expect(secretStorageMock.delete).toHaveBeenCalledWith('copilot-orchestrator.github.token');
    expect(secretStorageMock.delete).toHaveBeenCalledTimes(1);
  });
});
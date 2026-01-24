// ./githubAuthProvider.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import * as vscode from 'vscode';

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider - getStoredToken', () => {
  let secretStorageMock: jest.Mocked<vscode.SecretStorage>;
  let gitHubAuthProvider: GitHubAuthProvider;

  beforeEach(() => {
    secretStorageMock = {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<vscode.SecretStorage>;

    gitHubAuthProvider = new GitHubAuthProvider(secretStorageMock);
  });

  /** @aiContributed-2026-01-24 */
    it('should return the stored token if it exists', async () => {
    const mockToken = 'mocked-token';
    secretStorageMock.get.mockResolvedValue(mockToken);

    const result = await (gitHubAuthProvider as any).getStoredToken();

    expect(secretStorageMock.get).toHaveBeenCalledWith('copilot-orchestrator.github.token');
    expect(result).toBe(mockToken);
  });

  /** @aiContributed-2026-01-24 */
    it('should return undefined if no token is stored', async () => {
    secretStorageMock.get.mockResolvedValue(undefined);

    const result = await (gitHubAuthProvider as any).getStoredToken();

    expect(secretStorageMock.get).toHaveBeenCalledWith('copilot-orchestrator.github.token');
    expect(result).toBeUndefined();
  });
});
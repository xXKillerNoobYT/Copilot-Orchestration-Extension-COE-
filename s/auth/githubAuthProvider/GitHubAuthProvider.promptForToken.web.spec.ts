// ./githubAuthProvider.GitHubAuthProvider.promptForToken.gptgen.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import * as vscode from 'vscode';

jest.mock('vscode', () => ({
    ...jest.requireActual('vscode'),
    window: {
    showInputBox: jest.fn(),
  },
}));

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider', () => {
  let secretStorageMock: vscode.SecretStorage;
  let gitHubAuthProvider: GitHubAuthProvider;

  beforeEach(() => {
    secretStorageMock = {} as vscode.SecretStorage;
    gitHubAuthProvider = new GitHubAuthProvider(secretStorageMock);
  });

  /** @aiContributed-2026-01-24 */
    describe('promptForToken', () => {
    /** @aiContributed-2026-01-24 */
        it('should return the token entered by the user', async () => {
      const mockToken = 'ghp_mockToken123';
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue(mockToken);

      const result = await (gitHubAuthProvider as any).promptForToken();

      expect(vscode.window.showInputBox).toHaveBeenCalledWith({
        prompt: 'Enter your GitHub Personal Access Token',
        password: true,
        placeHolder: 'ghp_... or github_pat_...',
        ignoreFocusOut: true,
        validateInput: expect.any(Function),
      });
      expect(result).toBe(mockToken);
    });

    /** @aiContributed-2026-01-24 */
        it('should return undefined if the user cancels the input', async () => {
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

      const result = await (gitHubAuthProvider as any).promptForToken();

      expect(vscode.window.showInputBox).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    /** @aiContributed-2026-01-24 */
        it('should validate input and reject empty or whitespace-only tokens', async () => {
      (vscode.window.showInputBox as jest.Mock).mockImplementation(({ validateInput }) => {
        expect(validateInput('')).toBe('Token is required');
        expect(validateInput('   ')).toBe('Token is required');
        expect(validateInput('validToken')).toBeUndefined();
        return Promise.resolve(undefined);
      });

      await (gitHubAuthProvider as any).promptForToken();
    });
  });
});
// ./githubAuthProvider.GitHubAuthProvider.validateToken.gptgen.web.spec.ts
import { GitHubAuthProvider } from '../../../src/auth/githubAuthProvider.ts';
import { SecretStorage } from 'vscode';

/** @aiContributed-2026-01-24 */
describe('GitHubAuthProvider - validateToken', () => {
  let secretStorageMock: jest.Mocked<SecretStorage>;
  let gitHubAuthProvider: GitHubAuthProvider;

  beforeEach(() => {
    secretStorageMock = {
      store: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SecretStorage>;

    gitHubAuthProvider = new GitHubAuthProvider(secretStorageMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-24 */
    it('should return valid response when token is valid', async () => {
    const mockToken = 'valid-token';
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ login: 'test-user' }),
      headers: {
        get: jest.fn().mockReturnValue('repo, user'),
      },
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse as Response);

    const result = await (gitHubAuthProvider as any).validateToken(mockToken);

    expect(result).toEqual({
      valid: true,
      login: 'test-user',
      scopes: ['repo', 'user'],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${mockToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
    );
  });

  /** @aiContributed-2026-01-24 */
    it('should return error when token is invalid', async () => {
    const mockToken = 'invalid-token';
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse as Response);

    const result = await (gitHubAuthProvider as any).validateToken(mockToken);

    expect(result).toEqual({
      valid: false,
      error: 'GitHub API returned 401: Unauthorized',
    });
  });

  /** @aiContributed-2026-01-24 */
    it('should return timeout error when request times out', async () => {
    jest.setTimeout(35000); // Increase the timeout for this test to 35 seconds
    const mockToken = 'timeout-token';

    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject({ name: 'AbortError' }), 31000);
        })
    );

    const result = await (gitHubAuthProvider as any).validateToken(mockToken);

    expect(result).toEqual({
      valid: false,
      error: 'GitHub API request timed out after 30 seconds',
    });
  }, 35000); // Set timeout for this specific test

  /** @aiContributed-2026-01-24 */
    it('should handle unexpected errors gracefully', async () => {
    const mockToken = 'error-token';

    global.fetch = jest.fn().mockRejectedValue(new Error('Unexpected error'));

    const result = await (gitHubAuthProvider as any).validateToken(mockToken);

    expect(result).toEqual({
      valid: false,
      error: 'Unexpected error',
    });
  });
});
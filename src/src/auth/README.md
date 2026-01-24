# GitHub Authentication Provider

## Overview

The `GitHubAuthProvider` class manages GitHub Personal Access Token authentication for the Copilot Orchestrator extension. It provides secure token storage, validation, and refresh mechanisms using VS Code's Secret Storage API.

## Features

- ✅ Secure token storage using VS Code Secret Storage
- ✅ Real-time token validation with GitHub API
- ✅ Automatic token refresh and expiration handling
- ✅ User-friendly token input with validation
- ✅ Support for both classic and fine-grained tokens

## Usage

### Basic Setup

```typescript
import * as vscode from 'vscode';
import { GitHubAuthProvider } from './auth/githubAuthProvider';

// Initialize with extension context
const authProvider = new GitHubAuthProvider(context.secrets);

// Authenticate user
const result = await authProvider.authenticate();
if (result.success) {
  console.log('Authentication successful!');
  console.log('Token:', result.token);
} else {
  console.error('Authentication failed:', result.error);
}
```

### Check Authentication Status

```typescript
// Check if user is already authenticated
const isAuthenticated = await authProvider.isAuthenticated();
if (!isAuthenticated) {
  // Prompt for authentication
  await authProvider.authenticate();
}
```

### Refresh Authentication

```typescript
// Refresh validates existing token or prompts for new one
const refreshed = await authProvider.refresh();
if (refreshed) {
  console.log('Authentication is valid');
}
```

### Manual Token Management

```typescript
// Get stored token
const token = await authProvider.getStoredToken();

// Store a new token
await authProvider.storeToken('ghp_your_token_here');

// Clear stored token (logout)
await authProvider.clearToken();
```

## Token Validation

The provider validates GitHub tokens by making a test API call to `https://api.github.com/user`. This ensures:

1. Token is well-formed
2. Token has valid permissions
3. Token is not expired
4. Token belongs to a real GitHub user

### Token Format

Supported token formats:
- **Classic Personal Access Tokens**: `ghp_...`
- **Fine-grained Personal Access Tokens**: `github_pat_...`

### Required Scopes

For full functionality, your GitHub token should have these scopes:
- `repo` - Full control of private repositories
- `user` - Read user profile data
- `write:discussion` - Read and write team discussions (optional)

## Creating a GitHub Personal Access Token

### Step 1: Navigate to GitHub Settings

1. Go to [GitHub.com](https://github.com)
2. Click your profile picture → **Settings**
3. Scroll down to **Developer settings** (left sidebar)
4. Click **Personal access tokens** → **Tokens (classic)**

### Step 2: Generate New Token

1. Click **Generate new token** → **Generate new token (classic)**
2. Enter a descriptive note (e.g., "Copilot Orchestrator Extension")
3. Set expiration (recommended: 90 days)
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `user` (Read user profile data)
5. Click **Generate token**

### Step 3: Copy and Store Token

1. **Copy the token immediately** (you won't see it again!)
2. Paste it when prompted by the VS Code extension
3. The extension will store it securely using VS Code Secret Storage

> ⚠️ **Security Note**: Never share your token or commit it to version control!

## API Reference

### GitHubAuthProvider Class

#### Constructor

```typescript
constructor(secretStorage: vscode.SecretStorage)
```

Creates a new authentication provider instance.

**Parameters:**
- `secretStorage` - VS Code Secret Storage instance from `context.secrets`

#### Methods

##### `authenticate(): Promise<AuthenticationResult>`

Authenticates user with GitHub, prompting for token if needed.

**Returns:**
```typescript
{
  success: boolean;
  token?: string;          // Only returned if success is true
  error?: string;          // Only returned if success is false
  expiresAt?: Date;        // Future feature
}
```

**Workflow:**
1. Check for stored token
2. If not found, prompt user for token
3. Validate token with GitHub API
4. Store token if valid
5. Return result

##### `validateToken(token: string): Promise<TokenValidationResult>`

Validates a GitHub token with the GitHub API.

**Parameters:**
- `token` - GitHub Personal Access Token to validate

**Returns:**
```typescript
{
  valid: boolean;
  login?: string;          // GitHub username
  scopes?: string[];       // Token scopes/permissions
  error?: string;          // Error message if invalid
}
```

##### `getStoredToken(): Promise<string | undefined>`

Retrieves the stored GitHub token from Secret Storage.

**Returns:** Token string or `undefined` if not found

##### `storeToken(token: string): Promise<void>`

Stores a GitHub token securely in VS Code Secret Storage.

**Parameters:**
- `token` - GitHub Personal Access Token to store

##### `clearToken(): Promise<void>`

Removes the stored GitHub token (logout).

##### `isAuthenticated(): Promise<boolean>`

Checks if user is authenticated with a valid token.

**Returns:** `true` if token is stored and valid, `false` otherwise

##### `refresh(): Promise<boolean>`

Validates current token or prompts for new one if invalid.

**Returns:** `true` if authentication is valid after refresh

## Security Best Practices

### DO ✅

- Use VS Code Secret Storage for token storage
- Validate tokens before using them
- Clear tokens on logout
- Prompt users to generate new tokens every 90 days
- Use the minimum required scopes for your use case

### DON'T ❌

- Store tokens in workspace settings
- Log tokens to console in production
- Share tokens between users
- Commit tokens to version control
- Store tokens in plaintext files

## Error Handling

```typescript
const result = await authProvider.authenticate();

if (!result.success) {
  switch (result.error) {
    case 'Authentication cancelled by user':
      // User closed the input prompt
      vscode.window.showInformationMessage('Authentication cancelled');
      break;
      
    case 'Invalid GitHub token':
      // Token validation failed
      vscode.window.showErrorMessage('Invalid token. Please try again.');
      break;
      
    default:
      // Network or other error
      vscode.window.showErrorMessage(`Authentication failed: ${result.error}`);
  }
}
```

## Troubleshooting

### "Invalid token format" error

**Problem**: User entered an invalid token format.

**Solution**: Ensure token starts with `ghp_` (classic) or `github_pat_` (fine-grained).

### "GitHub API returned 401: Unauthorized" error

**Problem**: Token is expired or has insufficient permissions.

**Solution**: Generate a new token with the required scopes.

### "Network error" during validation

**Problem**: Cannot reach GitHub API.

**Solution**: Check internet connection and GitHub API status.

## Example: Full Integration

```typescript
import * as vscode from 'vscode';
import { GitHubAuthProvider } from './auth/githubAuthProvider';

export async function activate(context: vscode.ExtensionContext) {
  const authProvider = new GitHubAuthProvider(context.secrets);
  
  // Register authentication command
  const authenticateCmd = vscode.commands.registerCommand(
    'copilot-orchestrator.authenticate',
    async () => {
      const result = await authProvider.authenticate();
      
      if (result.success) {
        vscode.window.showInformationMessage(
          'Successfully authenticated with GitHub!'
        );
      } else {
        vscode.window.showErrorMessage(
          `Authentication failed: ${result.error}`
        );
      }
    }
  );
  
  // Register logout command
  const logoutCmd = vscode.commands.registerCommand(
    'copilot-orchestrator.logout',
    async () => {
      await authProvider.clearToken();
      vscode.window.showInformationMessage('Logged out successfully');
    }
  );
  
  context.subscriptions.push(authenticateCmd, logoutCmd);
  
  // Check authentication on startup
  const isAuthenticated = await authProvider.isAuthenticated();
  if (!isAuthenticated) {
    const choice = await vscode.window.showInformationMessage(
      'GitHub authentication required for Copilot Orchestrator',
      'Authenticate Now',
      'Later'
    );
    
    if (choice === 'Authenticate Now') {
      await vscode.commands.executeCommand('copilot-orchestrator.authenticate');
    }
  }
}
```

## Related Documentation

- [VS Code Secret Storage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub API Authentication](https://docs.github.com/en/rest/authentication)
- [Copilot Agent Client](../services/copilotAgentClient.ts)

## License

This authentication provider is part of the Copilot Orchestrator Extension and follows the same license.

/**
 * Mock for VS Code API
 * Supports both Jest and Vitest
 * 
 * Reference: https://jestjs.io/docs/manual-mocks
 * See: https://code.visualstudio.com/api/references/vscode-api
 * Tutorial: Creating VS Code Extension Mocks: https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */

// Check if we're in Jest or Vitest context
let mockFn: any;
if (typeof jest !== 'undefined' && jest.fn) {
  mockFn = jest.fn.bind(jest);
} else {
  // Vitest context - import vi
  try {
    // @ts-ignore
    import('vitest').then(({ vi }) => {
      mockFn = vi.fn.bind(vi);
    });
  } catch {
    // Fallback
    mockFn = () => () => {};
  }
}

// For Vitest, we'll use a function that returns the mock
const createMock = () => {
  if (typeof jest !== 'undefined') return jest.fn();
  // Return a basic function for now, vi will be injected
  const fn: any = () => {};
  fn.mockReturnValue = () => fn;
  fn.mockResolvedValue = () => fn;
  return fn;
};

// VS Code Disposable pattern
// Reference: https://code.visualstudio.com/api/references/vscode-api#Disposable
export class Disposable {
  private disposed = false;

  constructor(private fn: () => void) {}

  dispose() {
    if (!this.disposed) {
      this.disposed = true;
      this.fn();
    }
  }

  static from(...disposables: Disposable[]): Disposable {
    return new Disposable(() => disposables.forEach(d => d.dispose()));
  }
}

// VS Code RelativePattern
// Reference: https://code.visualstudio.com/api/references/vscode-api#RelativePattern
export class RelativePattern {
  constructor(public base: any, public pattern: string) {}
}

// VS Code Uri
// Reference: https://code.visualstudio.com/api/references/vscode-api#Uri
export class Uri {
  static file(path: string) {
    return { fsPath: path, scheme: 'file' } as any;
  }
  static parse(value: string) {
    return { fsPath: value, scheme: 'file' } as any;
  }
}

export const window = {
  showInformationMessage: createMock(),
  showErrorMessage: createMock(),
  showWarningMessage: createMock(),
  showQuickPick: createMock(),
  showInputBox: createMock(),
  createOutputChannel: createMock(),
  createStatusBarItem: createMock(),
  createTerminal: createMock(),
  activeTextEditor: undefined,
  visibleTextEditors: [],
};

export const workspace = {
  getConfiguration: mockFn(() => ({
    get: mockFn(),
    update: mockFn(),
    has: mockFn(),
    inspect: mockFn(),
  })),
  // Critical: File system watcher for profile watching tests
  // Reference: https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher
  createFileSystemWatcher: jest.fn((pattern) => ({
    onDidCreate: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
    onDidDelete: jest.fn(() => ({ dispose: jest.fn() })),
    dispose: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: mockFn(),
  onDidChangeWorkspaceFolders: mockFn(),
  openTextDocument: mockFn(),
  saveAll: mockFn(),
  fs: {
    readFile: mockFn(),
    writeFile: mockFn(),
    delete: mockFn(),
    stat: mockFn(),
    readDirectory: mockFn(),
    createDirectory: mockFn(),
  },
};

export const commands = {
  registerCommand: mockFn(),
  executeCommand: mockFn(),
  getCommands: mockFn(),
};

// Note: Uri is already exported as a class above, so we don't need this export
// The Uri class has both static methods (file, parse) for compatibility

export const Range = mockFn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
}));

export const Position = mockFn((line: number, character: number) => ({
  line,
  character,
}));

export const EventEmitter = mockFn(() => ({
  fire: mockFn(),
  event: mockFn(),
  dispose: mockFn(),
}));

export const CancellationTokenSource = mockFn(() => ({
  token: {
    isCancellationRequested: false,
    onCancellationRequested: mockFn(),
  },
  cancel: mockFn(),
  dispose: mockFn(),
}));

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum QuickPickItemKind {
  Separator = -1,
  Default = 0,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export const languages = {
  registerCodeLensProvider: jest.fn(),
  registerCompletionItemProvider: jest.fn(),
  registerHoverProvider: jest.fn(),
  registerDefinitionProvider: jest.fn(),
};

export const extensions = {
  getExtension: jest.fn(),
  all: [],
};

export const env = {
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
  openExternal: jest.fn(),
  asExternalUri: jest.fn(),
};

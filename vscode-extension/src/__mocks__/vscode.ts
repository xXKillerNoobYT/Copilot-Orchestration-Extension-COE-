/**
 * Mock for VS Code API
 * Supports both Jest and Vitest
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

export const Uri = {
  file: mockFn((path: string) => ({ fsPath: path, path, scheme: 'file' })),
  parse: mockFn((value: string) => ({ fsPath: value, path: value, scheme: 'file' })),
};

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

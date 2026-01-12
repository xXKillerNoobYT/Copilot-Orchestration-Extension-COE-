/**
 * Mock for VS Code API
 * Used by Jest tests to avoid requiring actual vscode module
 */

declare const jest: any;

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showInputBox: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  createStatusBarItem: jest.fn(() => ({
    text: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  createTerminal: jest.fn(),
  activeTextEditor: undefined,
  visibleTextEditors: [],
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(),
    inspect: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: jest.fn(),
  onDidChangeWorkspaceFolders: jest.fn(),
  openTextDocument: jest.fn(),
  saveAll: jest.fn(),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    delete: jest.fn(),
    stat: jest.fn(),
    readDirectory: jest.fn(),
    createDirectory: jest.fn(),
  },
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  getCommands: jest.fn(),
};

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path, path, scheme: 'file' })),
  parse: jest.fn((value: string) => ({ fsPath: value, path: value, scheme: 'file' })),
};

export const Range = jest.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
}));

export const Position = jest.fn((line: number, character: number) => ({
  line,
  character,
}));

export const EventEmitter = jest.fn(() => ({
  fire: jest.fn(),
  event: jest.fn(),
  dispose: jest.fn(),
}));

export const CancellationTokenSource = jest.fn(() => ({
  token: {
    isCancellationRequested: false,
    onCancellationRequested: jest.fn(),
  },
  cancel: jest.fn(),
  dispose: jest.fn(),
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

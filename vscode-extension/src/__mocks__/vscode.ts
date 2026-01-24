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
    mockFn = () => () => { };
  }
}

// For Vitest, we'll use a function that returns the mock
const createMock = () => {
  if (typeof jest !== 'undefined') return jest.fn();
  // Return a basic function for now, vi will be injected
  const fn: any = () => { };
  fn.mockReturnValue = () => fn;
  fn.mockResolvedValue = () => fn;
  return fn;
};

// VS Code Disposable pattern
// Reference: https://code.visualstudio.com/api/references/vscode-api#Disposable
export class Disposable {
  private disposed = false;

  constructor(private fn: () => void) { }

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
  constructor(public base: any, public pattern: string) { }
}

// VS Code Uri
// Reference: https://code.visualstudio.com/api/references/vscode-api#Uri
export class Uri {
  public fsPath: string;
  public scheme: string;
  public authority?: string;
  public path: string;
  public query?: string;
  public fragment?: string;

  constructor(scheme: string, authority: string, path: string, query: string, fragment: string) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = path;
  }

  static file(path: string): Uri {
    const uri = new Uri('file', '', path, '', '');
    uri.fsPath = path;
    return uri;
  }

  static parse(value: string): Uri {
    return new Uri('file', '', value, '', '');
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const joined = [base.fsPath || base.path, ...pathSegments].join('/').replace(/\/+/g, '/');
    return Uri.file(joined);
  }

  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority ?? '',
      change.path ?? this.path,
      change.query ?? this.query ?? '',
      change.fragment ?? this.fragment ?? ''
    );
  }

  toString(): string {
    return `${this.scheme}://${this.authority || ''}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`;
  }
}

// VS Code MarkdownString
// Reference: https://code.visualstudio.com/api/references/vscode-api#MarkdownString
export class MarkdownString {
  value: string;
  isTrusted?: boolean;

  constructor(value: string = '', isTrusted?: boolean) {
    this.value = value;
    this.isTrusted = isTrusted;
  }

  appendText(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  appendCodeblock(value: string, language?: string): MarkdownString {
    this.value += `\n\`\`\`${language || ''}\n${value}\n\`\`\`\n`;
    return this;
  }
}

// VS Code TreeItem
// Reference: https://code.visualstudio.com/api/references/vscode-api#TreeItem
export class TreeItem {
  label?: string;
  iconPath?: any;
  command?: any;
  tooltip?: string;
  contextValue?: string;

  constructor(label: string, collapsibleState?: number) {
    this.label = label;
  }
}

// VS Code ThemeIcon
// Reference: https://code.visualstudio.com/api/references/vscode-api#ThemeIcon
export class ThemeIcon {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export const window = {
  showInformationMessage: createMock(),
  showErrorMessage: createMock(),
  showWarningMessage: createMock(),
  showQuickPick: createMock(),
  showInputBox: createMock(),
  showSaveDialog: createMock(),
  showOpenDialog: createMock(),
  createOutputChannel: mockFn(() => ({
    appendLine: mockFn(),
    append: mockFn(),
    clear: mockFn(),
    show: mockFn(),
    hide: mockFn(),
    dispose: mockFn(),
    name: 'Test Output Channel',
    onDidDispose: mockFn(() => ({ dispose: mockFn() })),
  })),
  createStatusBarItem: mockFn(() => ({
    text: '',
    show: mockFn(),
    hide: mockFn(),
    dispose: mockFn(),
    alignment: undefined,
    priority: undefined,
    tooltip: undefined,
    color: undefined,
    backgroundColor: undefined,
    command: undefined,
  })),
  createWebviewPanel: mockFn((viewType: string, title: string, showOptions: any, options?: any) => ({
    webview: {
      html: '',
      options: options || {},
      onDidReceiveMessage: mockFn(() => ({ dispose: mockFn() })),
      postMessage: mockFn(),
      asWebviewUri: mockFn((uri: any) => uri),
    },
    title,
    viewType,
    options,
    visible: true,
    active: true,
    onDidDispose: mockFn(() => ({ dispose: mockFn() })),
    onDidChangeViewState: mockFn(() => ({ dispose: mockFn() })),
    reveal: mockFn(),
    dispose: mockFn(),
  })),
  createTerminal: createMock(),
  withProgress: createMock(),
  showTextDocument: createMock(),
  activeTextEditor: undefined,
  visibleTextEditors: [],
};

export const workspace = {
  getConfiguration: mockFn((section?: string) => {
    // Default configuration values for tests
    const defaultConfig: Record<string, any> = {
      'copilot-orchestrator.backendUrl': 'http://localhost:8000',
      'copilot-orchestrator.llm.baseUrl': 'http://localhost:1234/v1',
      'copilot-orchestrator.llm.apiKey': 'test-api-key',
      'copilot-orchestrator.llm.model': 'test-model',
      'copilot-orchestrator.llm.maxTokens': 4096,
      'copilot-orchestrator.llm.temperature': 0.7,
      'copilot-orchestrator.llm.enabled': true,
      'copilot-orchestrator.enableTelemetry': false,
      'copilot-orchestrator.autoStart': false,
    };

    return {
      get: mockFn((key: string, defaultValue?: any) => {
        const fullKey = section ? `${section}.${key}` : key;
        return defaultConfig[fullKey] !== undefined ? defaultConfig[fullKey] : defaultValue;
      }),
      update: mockFn(),
      has: mockFn((key: string) => {
        const fullKey = section ? `${section}.${key}` : key;
        return defaultConfig[fullKey] !== undefined;
      }),
      inspect: mockFn(),
    };
  }),
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

export const EventEmitter = jest.fn(function () {
  const listeners: Function[] = [];
  return {
    fire: jest.fn((data?: any) => {
      listeners.forEach(listener => listener(data));
    }),
    event: jest.fn((listener: Function) => {
      listeners.push(listener);
      return {
        dispose: jest.fn(() => {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        })
      };
    }),
    dispose: jest.fn(),
  };
});

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

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
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

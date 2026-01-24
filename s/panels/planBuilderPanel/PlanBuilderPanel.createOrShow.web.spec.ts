import * as vscode from 'vscode';
import { PlanBuilderPanel } from '../../../src/panels/planBuilderPanel';

jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  window: {
    activeTextEditor: null,
    createWebviewPanel: jest.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: jest.fn(),
      },
      onDidDispose: jest.fn(),
      reveal: jest.fn(),
      dispose: jest.fn(),
    })),
    onDidChangeActiveColorTheme: jest.fn(),
  },
  Uri: {
    joinPath: jest.fn((...paths: string[]) => ({ fsPath: paths.join('/') })),
  },
}));

/** @aiContributed-2026-01-24 */
describe('PlanBuilderPanel', () => {
  let mockExtensionUri: vscode.Uri;

  beforeEach(() => {
    mockExtensionUri = { fsPath: '/mock/path' } as vscode.Uri;
    jest.clearAllMocks();
  });

  /* it('should reveal the existing panel if it already exists', () => {
        const mockReveal = jest.fn();
        const mockPanel = {
          reveal: mockReveal,
          webview: { html: '', onDidReceiveMessage: jest.fn() },
          onDidDispose: jest.fn(),
        } as unknown as vscode.WebviewPanel;
        PlanBuilderPanel.currentPanel = new PlanBuilderPanel(mockPanel, mockExtensionUri);

        PlanBuilderPanel.createOrShow(mockExtensionUri);

        expect(mockReveal).toHaveBeenCalledWith(vscode.ViewColumn.Beside);
      }); */

  /** @aiContributed-2026-01-24 */
    it('should create a new panel if none exists', () => {
    const mockCreateWebviewPanel = vscode.window.createWebviewPanel as jest.Mock;

    PlanBuilderPanel.currentPanel = undefined;

    PlanBuilderPanel.createOrShow(mockExtensionUri);

    expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
      'planBuilder',
      'Interactive Plan Builder',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [expect.any(Object)],
      }
    );
    expect(PlanBuilderPanel.currentPanel).toBeInstanceOf(PlanBuilderPanel);
  });

  /* it('should use the correct column when an active text editor exists', () => {
        (vscode.window as any).activeTextEditor = { document: {} };
        const mockCreateWebviewPanel = vscode.window.createWebviewPanel as jest.Mock;

        PlanBuilderPanel.createOrShow(mockExtensionUri);

        expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
          'planBuilder',
          'Interactive Plan Builder',
          vscode.ViewColumn.Beside,
          expect.any(Object)
        );
      }); */
});
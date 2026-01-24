import * as vscode from 'vscode';
import * as fs from 'fs';
import { PlanBuilderPanel } from '../../../src/panels/planBuilderPanel';

jest.mock('fs');
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  Uri: {
    joinPath: jest.fn((...paths: string[]) => ({ fsPath: paths.join('/') })),
  },
  Webview: jest.fn(),
  window: {
    createWebviewPanel: jest.fn(() => ({
      onDidDispose: jest.fn(),
      webview: { 
        asWebviewUri: jest.fn(), 
        cspSource: 'test-csp-source', 
        onDidReceiveMessage: jest.fn() 
      },
    })),
    onDidChangeActiveColorTheme: jest.fn(), // Mocking the missing function
  },
}));

/** @aiContributed-2026-01-24 */
describe('PlanBuilderPanel', () => {
  let panel: vscode.WebviewPanel;
  let extensionUri: vscode.Uri;

  beforeEach(() => {
    panel = vscode.window.createWebviewPanel('test', 'Test', vscode.ViewColumn.One, {});
    extensionUri = { fsPath: '/test/extensionUri' } as vscode.Uri;
  });

  /** @aiContributed-2026-01-24 */
    it('should return correct HTML when assets are resolved via manifest', () => {
    const instance = new (PlanBuilderPanel as any)(panel, extensionUri);
    const mockResolveAssetsFromManifest = jest.spyOn(instance, '_resolveAssetsFromManifest' as any).mockReturnValue({
      styleUri: { toString: () => 'style-uri' },
      scriptUri: { toString: () => 'script-uri' },
    });

    const html = (instance as any)._getHtmlForWebview(panel.webview);

    expect(mockResolveAssetsFromManifest).toHaveBeenCalled();
    expect(html).toContain('<link rel="stylesheet" type="text/css" href="style-uri">');
    expect(html).toContain('<script nonce="');
    expect(html).toContain('src="script-uri"></script>');
  });

  /* it('should fallback to regex discovery when manifest is incomplete', () => {
        const instance = new (PlanBuilderPanel as any)(panel, extensionUri);
        jest.spyOn(instance, '_resolveAssetsFromManifest' as any).mockReturnValue(null);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readdirSync').mockReturnValue(['main-12345678.css', 'main-12345678.js']);
        panel.webview.asWebviewUri = jest.fn((uri) => uri);

        const html = (instance as any)._getHtmlForWebview(panel.webview);

        expect(html).toContain('<link rel="stylesheet" type="text/css" href="/test/extensionUri/dist/planBuilder/assets/main-12345678.css">');
        expect(html).toContain('<script nonce="');
        expect(html).toContain('src="/test/extensionUri/dist/planBuilder/assets/main-12345678.js"></script>');
      }); */

  /** @aiContributed-2026-01-24 */
    it('should return error HTML when assets are not found', () => {
    const instance = new (PlanBuilderPanel as any)(panel, extensionUri);
    jest.spyOn(instance, '_resolveAssetsFromManifest' as any).mockReturnValue(null);
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const mockGetErrorHtml = jest.spyOn(instance, '_getErrorHtml' as any).mockReturnValue('<div>Error</div>');

    const html = (instance as any)._getHtmlForWebview(panel.webview);

    expect(mockGetErrorHtml).toHaveBeenCalledWith(
      'Plan Builder Not Built',
      expect.stringContaining('npm run build:vue')
    );
    expect(html).toBe('<div>Error</div>');
  });
});
// ./planBuilderPanel.PlanBuilderPanel._resolveAssetsFromManifest.gptgen.web.spec.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { PlanBuilderPanel } from '../../../src/panels/planBuilderPanel';

jest.mock('fs');
jest.mock('path');
jest.mock('vscode');

/** @aiContributed-2026-01-24 */
describe('PlanBuilderPanel - _resolveAssetsFromManifest', () => {
  let webviewMock: vscode.Webview;

  beforeEach(() => {
    webviewMock = {
      asWebviewUri: jest.fn((uri) => uri),
    } as unknown as vscode.Webview;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-24 */
    it('should return null if manifest.json does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const panel = Object.create(PlanBuilderPanel.prototype);
    jest.spyOn(panel as any, '_update').mockImplementation(() => {}); // Mock _update to prevent errors
    const result = (panel as any)._resolveAssetsFromManifest('/build/root', webviewMock);

    expect(result).toBeNull();
    expect(fs.existsSync).toHaveBeenCalledWith(path.join('/build/root', '.vite', 'manifest.json'));
  });

  /** @aiContributed-2026-01-24 */
    it('should return null if no matching entry is found in manifest.json', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({}));

    const panel = Object.create(PlanBuilderPanel.prototype);
    jest.spyOn(panel as any, '_update').mockImplementation(() => {}); // Mock _update to prevent errors
    const result = (panel as any)._resolveAssetsFromManifest('/build/root', webviewMock);

    expect(result).toBeNull();
    expect(fs.readFileSync).toHaveBeenCalledWith(path.join('/build/root', '.vite', 'manifest.json'), 'utf-8');
  });

  /** @aiContributed-2026-01-24 */
    it('should return styleUri and scriptUri if matching entry is found', () => {
    const manifest = {
      'index.html': {
        file: 'assets/main.js',
        css: ['assets/styles.css'],
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(manifest));
    jest.spyOn(vscode.Uri, 'file').mockImplementation((filePath) => filePath as unknown as vscode.Uri);
    jest.spyOn(vscode.Uri, 'joinPath').mockImplementation((uri, ...paths) => `${uri}/${paths.join('/')}` as unknown as vscode.Uri);

    const panel = Object.create(PlanBuilderPanel.prototype);
    jest.spyOn(panel as any, '_update').mockImplementation(() => {}); // Mock _update to prevent errors
    const result = (panel as any)._resolveAssetsFromManifest('/build/root', webviewMock);

    expect(result).toEqual({
      styleUri: '/build/root/assets/styles.css',
      scriptUri: '/build/root/assets/main.js',
    });
    expect(webviewMock.asWebviewUri).toHaveBeenCalledTimes(2);
  });

  /** @aiContributed-2026-01-24 */
    it('should handle errors when parsing manifest.json', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid JSON');
    });

    const panel = Object.create(PlanBuilderPanel.prototype);
    jest.spyOn(panel as any, '_update').mockImplementation(() => {}); // Mock _update to prevent errors
    const result = (panel as any)._resolveAssetsFromManifest('/build/root', webviewMock);

    expect(result).toBeNull();
    expect(fs.readFileSync).toHaveBeenCalledWith(path.join('/build/root', '.vite', 'manifest.json'), 'utf-8');
  });
});
// ./planBuilderPanel.web.spec.ts
import { PlanBuilderPanel } from '../../../src/panels/planBuilderPanel';
import * as vscode from 'vscode';

/** @aiContributed-2026-01-24 */
describe('PlanBuilderPanel.kill', () => {
  let disposeMock: jest.Mock;

  beforeEach(() => {
    disposeMock = jest.fn();
    PlanBuilderPanel.currentPanel = {
      dispose: disposeMock,
    } as unknown as vscode.WebviewPanel;
  });

  afterEach(() => {
    PlanBuilderPanel.currentPanel = undefined;
    jest.clearAllMocks();
  });

  /** @aiContributed-2026-01-24 */
    it('should dispose the current panel and set it to undefined', () => {
    PlanBuilderPanel.kill();

    expect(disposeMock).toHaveBeenCalledTimes(1);
    expect(PlanBuilderPanel.currentPanel).toBeUndefined();
  });

  /** @aiContributed-2026-01-24 */
    it('should not throw an error if there is no current panel', () => {
    PlanBuilderPanel.currentPanel = undefined;

    expect(() => PlanBuilderPanel.kill()).not.toThrow();
  });
});
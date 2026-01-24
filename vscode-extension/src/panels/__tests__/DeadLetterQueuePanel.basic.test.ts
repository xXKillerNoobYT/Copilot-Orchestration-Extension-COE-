/**
 * Panel Tests - Dead Letter Queue Panel
 * Basic coverage for DLQ panel functionality
 */

import * as vscode from 'vscode';
import { DeadLetterQueuePanel } from '../DeadLetterQueuePanel';

jest.mock('vscode');

describe('DeadLetterQueuePanel', () => {
    let mockContext: vscode.ExtensionContext;
    let mockPanel: any;

    beforeEach(() => {
        mockPanel = {
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                postMessage: jest.fn(),
                asWebviewUri: jest.fn((uri) => uri),
            },
            onDidDispose: jest.fn(),
            reveal: jest.fn(),
            dispose: jest.fn(),
        };

        (vscode.window as any).createWebviewPanel = jest.fn().mockReturnValue(mockPanel);

        mockContext = {
            extensionUri: { fsPath: '/test/extension', toString: () => '/test/extension' } as vscode.Uri,
            subscriptions: [],
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Panel Creation', () => {
        it('should create panel instance', () => {
            const panel = DeadLetterQueuePanel.createOrShow(mockContext);
            expect(panel).toBeDefined();
            expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        });

        it('should reuse existing panel', () => {
            const panel1 = DeadLetterQueuePanel.createOrShow(mockContext);
            const panel2 = DeadLetterQueuePanel.createOrShow(mockContext);

            expect(panel1).toBe(panel2);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
        });

        it('should reveal panel when already exists', () => {
            DeadLetterQueuePanel.createOrShow(mockContext);
            DeadLetterQueuePanel.createOrShow(mockContext);

            expect(mockPanel.reveal).toHaveBeenCalled();
        });
    });

    describe('Panel Disposal', () => {
        it('should dispose panel', () => {
            const panel = DeadLetterQueuePanel.createOrShow(mockContext);
            panel.dispose();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should allow recreation after disposal', () => {
            const panel1 = DeadLetterQueuePanel.createOrShow(mockContext);
            panel1.dispose();

            const panel2 = DeadLetterQueuePanel.createOrShow(mockContext);
            expect(panel2).toBeDefined();
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
        });
    });

    describe('Webview Content', () => {
        it('should set HTML content', () => {
            DeadLetterQueuePanel.createOrShow(mockContext);

            expect(mockPanel.webview.html).toBeTruthy();
            expect(mockPanel.webview.html).toContain('Dead Letter Queue');
        });

        it('should include message handler', () => {
            DeadLetterQueuePanel.createOrShow(mockContext);

            expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
        });
    });
});
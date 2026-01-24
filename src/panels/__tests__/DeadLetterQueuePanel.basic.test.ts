/**
 * Panel Tests - Dead Letter Queue Panel
 * Basic coverage for DLQ panel functionality
 */

import * as vscode from 'vscode';
import { DeadLetterQueuePanel } from '../DeadLetterQueuePanel';
import { DeadLetterQueueService } from '../../services/deadLetterQueue';

jest.mock('vscode');
jest.mock('../../services/deadLetterQueue');

describe('DeadLetterQueuePanel', () => {
    let mockExtensionUri: vscode.Uri;
    let mockDlqService: jest.Mocked<DeadLetterQueueService>;
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

        mockExtensionUri = { fsPath: '/test/extension', toString: () => '/test/extension' } as vscode.Uri;
        
        mockDlqService = {
            getEntries: jest.fn().mockResolvedValue([]),
            addEntry: jest.fn(),
            updateEntryStatus: jest.fn(),
            deleteEntry: jest.fn(),
            clearOldEntries: jest.fn(),
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Reset singleton instance between tests
        (DeadLetterQueuePanel as any).instance = undefined;
    });

    describe('Panel Creation', () => {
        it('should create panel instance', async () => {
            const panel = DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            expect(panel).toBeDefined();
            expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
            // Wait for async update() to complete
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should reuse existing panel', async () => {
            const panel1 = DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            const panel2 = DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);

            expect(panel1).toBe(panel2);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should reveal panel when already exists', async () => {
            DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);

            expect(mockPanel.reveal).toHaveBeenCalled();
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    });

    describe('Panel Disposal', () => {
        it('should dispose panel', async () => {
            const panel = DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            await new Promise(resolve => setTimeout(resolve, 0));
            panel.dispose();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should allow recreation after disposal', async () => {
            const panel1 = DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            await new Promise(resolve => setTimeout(resolve, 0));
            panel1.dispose();

            const panel2 = DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            expect(panel2).toBeDefined();
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    });

    describe('Webview Content', () => {
        it('should set HTML content', async () => {
            DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockPanel.webview.html).toBeTruthy();
            expect(mockPanel.webview.html).toContain('Dead Letter Queue');
        });

        it('should include message handler', async () => {
            DeadLetterQueuePanel.createOrShow(mockExtensionUri, mockDlqService);
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
        });
    });
});
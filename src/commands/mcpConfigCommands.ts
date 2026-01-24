/**
 * Commands to help users configure MCP server for GitHub Copilot coding agent
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Copy MCP server path to clipboard
 */
export async function copyMCPServerPath(): Promise<void> {
    try {
        // Get extension path
        const extension = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
        if (!extension) {
            vscode.window.showErrorMessage('Extension not found');
            return;
        }

        const mcpServerPath = path.join(extension.extensionPath, 'dist', 'mcp-server', 'index.js');

        // Check if file exists
        if (!fs.existsSync(mcpServerPath)) {
            vscode.window.showErrorMessage('MCP server binary not found. Run "npm run compile" first.');
            return;
        }

        // Copy to clipboard
        await vscode.env.clipboard.writeText(mcpServerPath);

        vscode.window.showInformationMessage(
            `MCP server path copied to clipboard: ${mcpServerPath}`,
            'Open Setup Guide'
        ).then(action => {
            if (action === 'Open Setup Guide') {
                const setupDoc = path.join(extension.extensionPath, 'GITHUB-COPILOT-AGENT-SETUP.md');
                vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(setupDoc));
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy path: ${error}`);
    }
}

/**
 * Generate MCP configuration for GitHub Copilot coding agent
 */
export async function generateMCPConfig(): Promise<void> {
    try {
        // Get extension path
        const extension = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
        if (!extension) {
            vscode.window.showErrorMessage('Extension not found');
            return;
        }

        const mcpServerPath = path.join(extension.extensionPath, 'dist', 'mcp-server', 'index.js');

        // Generate JSON config
        const config = {
            mcpServers: {
                'copilot-orchestrator': {
                    command: 'node',
                    args: [mcpServerPath],
                    description: 'Copilot Orchestrator MCP Server - Task management and feedback tools'
                }
            }
        };

        const configJson = JSON.stringify(config, null, 2);

        // Copy to clipboard
        await vscode.env.clipboard.writeText(configJson);

        // Show preview
        const previewDoc = await vscode.workspace.openTextDocument({
            content: configJson,
            language: 'json'
        });
        await vscode.window.showTextDocument(previewDoc);

        const action = await vscode.window.showInformationMessage(
            'MCP configuration copied to clipboard and shown above. Add this to .github/copilot-mcp.json in your repository.',
            'Create File',
            'Open Guide'
        );

        if (action === 'Create File') {
            await createMCPConfigFile(configJson);
        } else if (action === 'Open Guide') {
            const setupDoc = path.join(extension.extensionPath, 'GITHUB-COPILOT-AGENT-SETUP.md');
            vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(setupDoc));
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate config: ${error}`);
    }
}

/**
 * Create .github/copilot-mcp.json file in workspace
 */
async function createMCPConfigFile(configJson: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const githubDir = path.join(workspaceFolder.uri.fsPath, '.github');
    const configFile = path.join(githubDir, 'copilot-mcp.json');

    // Create .github directory if doesn't exist
    if (!fs.existsSync(githubDir)) {
        fs.mkdirSync(githubDir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(configFile)) {
        const overwrite = await vscode.window.showWarningMessage(
            'copilot-mcp.json already exists. Overwrite?',
            'Yes',
            'No'
        );
        if (overwrite !== 'Yes') {
            return;
        }
    }

    // Write file
    fs.writeFileSync(configFile, configJson, 'utf-8');

    // Open file
    const doc = await vscode.workspace.openTextDocument(configFile);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
        'Created .github/copilot-mcp.json. Remember to commit and push this file!',
        'Commit Now'
    ).then(async action => {
        if (action === 'Commit Now') {
            // Open source control view
            await vscode.commands.executeCommand('workbench.view.scm');
        }
    });
}

/**
 * Test MCP server locally
 */
export async function testMCPServer(): Promise<void> {
    try {
        const extension = vscode.extensions.getExtension('your-publisher-id.copilot-orchestrator');
        if (!extension) {
            vscode.window.showErrorMessage('Extension not found');
            return;
        }

        const mcpServerPath = path.join(extension.extensionPath, 'dist', 'mcp-server', 'index.js');

        // Create terminal and test server
        const terminal = vscode.window.createTerminal('MCP Server Test');
        terminal.show();
        terminal.sendText(`node ${mcpServerPath}`);
        terminal.sendText('# MCP server should start and listen on stdio');
        terminal.sendText('# Press Ctrl+C to stop');

        vscode.window.showInformationMessage(
            'MCP server started in terminal. It should show "Copilot Orchestrator MCP Server started" message.',
            'Stop'
        ).then(action => {
            if (action === 'Stop') {
                terminal.dispose();
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to test MCP server: ${error}`);
    }
}

/**
 * Register all MCP configuration commands
 */
export function registerMCPConfigCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-orchestrator.copyMCPServerPath', copyMCPServerPath)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-orchestrator.generateMCPConfig', generateMCPConfig)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-orchestrator.testMCPServer', testMCPServer)
    );
}

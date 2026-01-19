/**
 * Command Registration Validation Tests
 *
 * Purpose:
 * - Ensure all commands in package.json are registered in code
 * - Ensure all registered commands are declared in package.json
 * - Prevent "command not found" errors from mismatched registrations
 *
 * These tests automatically verify command registration consistency
 * and are part of the CI/CD pipeline to catch issues before deployment.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Extract command IDs from package.json contributions.commands
 */
function extractCommandsFromPackageJson(): string[] {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson.contributes?.commands) {
        return [];
    }

    return packageJson.contributes.commands
        .map((cmd: { command: string }) => cmd.command)
        .filter((cmd: string) => cmd.startsWith('copilot-orchestrator.'));
}

/**
 * Extract registered command IDs from extension.ts and command files
 *
 * Searches for:
 * - vscode.commands.registerCommand('command-id', ...)
 * - context.subscriptions.push(vscode.commands.registerCommand('command-id', ...))
 */
function extractRegisteredCommands(): string[] {
    const commands = new Set<string>();

    // Files to scan for command registrations
    const filesToScan = [
        path.join(__dirname, '../extension.ts'),
        path.join(__dirname, '../commands/planAdjustmentCommands.ts'),
        path.join(__dirname, '../commands/mcpConfigCommands.ts'),
        path.join(__dirname, '../commands/autoAgentLoop.ts'),
        path.join(__dirname, '../commands/planBuilderCommand.ts'),
        path.join(__dirname, '../commands/openTaskList.ts'),
        path.join(__dirname, '../commands/auditDashboard.ts'),
    ];

    // Regex patterns to match command registration
    // Matches: vscode.commands.registerCommand('copilot-orchestrator.commandName', ...)
    // Also matches: registerCommand('copilot-orchestrator.commandName', ...)
    // Note: Non-global flag to avoid regex state issues with exec()
    const registerCommandPattern = /(?:vscode\.commands\.)?registerCommand\s*\(\s*['"`]([^'"`]+)['"`]/;

    for (const filePath of filesToScan) {
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Find all matches by using matchAll with a global regex
        const globalPattern = new RegExp(registerCommandPattern.source, 'g');
        const matches = content.matchAll(globalPattern);
        
        for (const match of matches) {
            const commandId = match[1];
            if (commandId.startsWith('copilot-orchestrator.')) {
                commands.add(commandId);
            }
        }
    }

    return Array.from(commands).sort();
}

describe('Command Registration Validation', () => {
    let packageCommands: string[];
    let registeredCommands: string[];

    beforeAll(() => {
        packageCommands = extractCommandsFromPackageJson();
        registeredCommands = extractRegisteredCommands();
    });

    test('package.json should have commands defined', () => {
        expect(packageCommands.length).toBeGreaterThan(0);
    });

    test('extension should have registered commands', () => {
        expect(registeredCommands.length).toBeGreaterThan(0);
    });

    test('all commands in package.json are registered in code', () => {
        const missing = packageCommands.filter(cmd =>
            !registeredCommands.includes(cmd)
        );

        expect(missing).toEqual([]);
    });

    test('all registered commands are in package.json', () => {
        const extra = registeredCommands.filter(cmd =>
            !packageCommands.includes(cmd)
        );

        if (extra.length > 0) {
            console.error('\n❌ Commands registered in code but NOT in package.json:');
            extra.forEach(cmd => console.error(`  - ${cmd}`));
            console.error('\nPlease add these commands to package.json contributions.commands section.\n');
        }

        expect(extra).toEqual([]);
    });

    test('command IDs are case-sensitive matches', () => {
        // Check for case mismatches
        const caseMismatches: string[] = [];

        for (const pkgCmd of packageCommands) {
            const regCmd = registeredCommands.find(
                cmd => cmd.toLowerCase() === pkgCmd.toLowerCase() && cmd !== pkgCmd
            );
            if (regCmd) {
                caseMismatches.push(`${pkgCmd} (package.json) vs ${regCmd} (code)`);
            }
        }

        if (caseMismatches.length > 0) {
            console.error('\n❌ Commands with case mismatches:');
            caseMismatches.forEach(msg => console.error(`  - ${msg}`));
            console.error('\nCommand IDs are case-sensitive. Please ensure exact matches.\n');
        }

        expect(caseMismatches).toEqual([]);
    });

    test('command IDs follow naming convention', () => {
        const allCommands = [...new Set([...packageCommands, ...registeredCommands])];
        const invalidCommands = allCommands.filter(
            cmd => !cmd.startsWith('copilot-orchestrator.')
        );

        if (invalidCommands.length > 0) {
            console.error('\n❌ Commands that don\'t follow naming convention:');
            invalidCommands.forEach(cmd => console.error(`  - ${cmd}`));
            console.error('\nAll commands should start with \'copilot-orchestrator.\'\n');
        }

        expect(invalidCommands).toEqual([]);
    });

    // Diagnostic test to show what was found (always passes)
    test('diagnostic: list all package.json commands', () => {
        console.log('\n📦 Commands in package.json:');
        packageCommands.forEach(cmd => console.log(`  - ${cmd}`));
        expect(true).toBe(true);
    });

    test('diagnostic: list all registered commands', () => {
        console.log('\n🔧 Registered commands in code:');
        registeredCommands.forEach(cmd => console.log(`  - ${cmd}`));
        expect(true).toBe(true);
    });
});

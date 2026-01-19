/**
 * Handler for copilot_orchestrator_get_workspace_config tool
 * Reads actual VS Code workspace configuration and agent profiles
 */

import { MCPHandlerBase } from './MCPHandlerBase';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

class GetWorkspaceConfigHandler extends MCPHandlerBase {
  /**
   * Get workspace configuration from VS Code settings and YAML files
   */
  async execute(args: any) {
    const { includeAgentProfiles = false } = args || {};

    return this.executeWithRetry(
      async () => {
        const config = vscode.workspace.getConfiguration('copilot-orchestrator');
        
        // Build workspace configuration from actual VS Code settings
        const workspaceConfig: any = {
          workspace: {
            taskRoots: config.get<string[]>('workspace.taskRoots', ['_ZENTASKS']),
            issueFolder: config.get<string>('workspace.issueFolder', '.vscode/github-issues'),
            toolRegistryPath: config.get<string>('workspace.toolRegistryPath', '.github/copilot-tools.json'),
            rootPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          },
          mcp: {
            baseUrl: config.get<string>('mcp.baseUrl', 'http://localhost:8000'),
            authToken: config.get<string>('mcp.authToken') ? '***' : undefined, // Don't expose actual token
            timeout: config.get<number>('mcp.timeout', 30000),
            localServerEnabled: config.get<boolean>('mcp.localServerEnabled', true),
            dockerGatewayEnabled: config.get<boolean>('mcp.dockerGatewayEnabled', false),
          },
          llm: {
            baseUrl: config.get<string>('llm.baseUrl', 'http://localhost:1234/v1'),
            model: config.get<string>('llm.model', 'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF'),
            temperature: config.get<number>('llm.temperature', 0.7),
            timeout: config.get<number>('llm.timeout', 30000),
          },
          websocket: {
            driver: config.get<string>('websocket.driver', 'soketi'),
            host: config.get<string>('websocket.host', 'localhost'),
            port: config.get<number>('websocket.port', 6001),
            enabled: config.get<boolean>('websocket.enabled', true),
          },
          github: {
            syncEnabled: config.get<boolean>('github.syncEnabled', true),
            syncInterval: config.get<number>('github.syncInterval', 300000), // 5 minutes
            rateLimit: config.get<number>('github.rateLimit', 5000),
          },
          project: {
            id: config.get<string>('project.id', 'default'),
            name: config.get<string>('project.name', 'Untitled Project'),
          },
        };

        // Load agent profiles if requested
        if (includeAgentProfiles) {
          workspaceConfig.agentProfiles = await this.loadAgentProfiles();
        }

        return this.formatSuccess(workspaceConfig);
      },
      'handleGetWorkspaceConfig',
      args
    );
  }

  /**
   * Load agent profiles from YAML files in workspace
   */
  private async loadAgentProfiles(): Promise<Record<string, any>> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      console.warn('[GetWorkspaceConfig] No workspace folder found');
      return this.getDefaultAgentProfiles();
    }

    // Try to load from .github/agents/*.yaml or configured location
    const config = vscode.workspace.getConfiguration('copilot-orchestrator');
    const profilesPath = config.get<string>('agents.profilesPath', '.github/agents');
    const fullPath = path.join(workspaceRoot, profilesPath);

    try {
      if (!fs.existsSync(fullPath)) {
        console.warn(`[GetWorkspaceConfig] Agent profiles directory not found: ${fullPath}`);
        return this.getDefaultAgentProfiles();
      }

      const profiles: Record<string, any> = {};
      const files = fs.readdirSync(fullPath);

      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const filePath = path.join(fullPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Simple YAML parsing - in production, use a proper YAML parser
          const agentName = file.replace(/\.(yaml|yml)$/, '');
          profiles[agentName] = this.parseSimpleYAML(content);
        }
      }

      return Object.keys(profiles).length > 0 ? profiles : this.getDefaultAgentProfiles();
    } catch (error) {
      console.warn('[GetWorkspaceConfig] Failed to load agent profiles:', error);
      return this.getDefaultAgentProfiles();
    }
  }

  /**
   * Simple YAML parser for agent profiles (basic key-value extraction)
   * In production, use js-yaml or similar library
   */
  private parseSimpleYAML(content: string): any {
    const profile: any = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          profile[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
        } else if (value.match(/^\d+$/)) {
          profile[key] = parseInt(value);
        } else {
          profile[key] = value.replace(/['"]/g, '');
        }
      }
    }

    return profile;
  }

  /**
   * Get default agent profiles if YAML files not found
   */
  private getDefaultAgentProfiles(): Record<string, any> {
    return {
      'Auto Zen': {
        role: 'Autonomous code execution',
        tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'github/*'],
        maxDepth: 5,
      },
      'Zen Planner': {
        role: 'Strategic task decomposition',
        tools: ['read', 'mcp_docker/search', 'agent', 'edit/createJupyterNotebook'],
        maxDepth: 3,
      },
      'Testing Agent': {
        role: 'Quality assurance & coverage',
        tools: ['execute', 'read', 'github-mcp-server-*'],
        maxDepth: 2,
      },
      'Verification Agent': {
        role: 'Visual and automated verification',
        tools: ['execute', 'read', 'vscode/*'],
        maxDepth: 2,
      },
    };
  }
}

// Create singleton instance
const handler = new GetWorkspaceConfigHandler();

/**
 * Export handler function for MCP server
 */
export async function handleGetWorkspaceConfig(args: any) {
  return handler.execute(args);
}

/**
 * MCP Server for Copilot Orchestrator Extension
 * 
 * Exposes extension-only tools for GitHub Copilot coding agent.
 * These tools are READ-ONLY for orchestration state - no file/terminal writing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

// Tool handlers will be implemented in separate files
import { handleGetTaskStatus } from './handlers/getTaskStatus.js';
import { handleListActiveTasks } from './handlers/listActiveTasks.js';
import { handleGetAgentState } from './handlers/getAgentState.js';
import { handleReportObservation } from './handlers/reportObservation.js';
import { handleRequestVerification } from './handlers/requestVerification.js';
import { handleAskUserQuestion } from './handlers/askUserQuestion.js';
import { handleGetWorkspaceConfig } from './handlers/getWorkspaceConfig.js';

/**
 * Extension-only MCP tools exposed to GitHub Copilot coding agent
 */
const EXTENSION_TOOLS: Tool[] = [
  {
    name: 'copilot_orchestrator_get_task_status',
    description: 'Get current status of a specific task by ID or GitHub issue number',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID or GitHub issue number'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'copilot_orchestrator_list_active_tasks',
    description: 'List all active tasks with optional filtering by status, priority, or assignee',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in-progress', 'blocked', 'done'],
          description: 'Filter by task status'
        },
        priority: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Filter by priority level'
        },
        assignee: {
          type: 'string',
          description: 'Filter by assigned agent name'
        }
      }
    }
  },
  {
    name: 'copilot_orchestrator_get_agent_state',
    description: 'Get current state of agent orchestration system (running agents, queue depth, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        agentName: {
          type: 'string',
          description: 'Specific agent to query (optional, returns all if omitted)'
        }
      }
    }
  },
  {
    name: 'copilot_orchestrator_report_observation',
    description: 'Report a discovery, issue, risk, or optimization opportunity to the orchestration system',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['discovery', 'issue', 'risk', 'optimization'],
          description: 'Type of observation'
        },
        message: {
          type: 'string',
          description: 'Detailed observation message'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Severity level'
        },
        suggestedAction: {
          type: 'string',
          description: 'Recommended action to take'
        },
        createTask: {
          type: 'boolean',
          description: 'Whether to create a follow-up task',
          default: false
        }
      },
      required: ['type', 'message']
    }
  },
  {
    name: 'copilot_orchestrator_request_verification',
    description: 'Request human verification for UI/UX changes, functional requirements, or integration testing',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID requiring verification'
        },
        verificationType: {
          type: 'string',
          enum: ['visual', 'functional', 'integration'],
          description: 'Type of verification needed'
        },
        checklist: {
          type: 'array',
          items: { type: 'string' },
          description: 'Checklist items for user to verify'
        }
      },
      required: ['taskId', 'verificationType', 'checklist']
    }
  },
  {
    name: 'copilot_orchestrator_ask_user_question',
    description: 'Ask user a question about requirements, design decisions, or clarifications',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Question to ask the user'
        },
        context: {
          type: 'object',
          description: 'Additional context for the question'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in seconds (optional)',
          default: 300
        }
      },
      required: ['question']
    }
  },
  {
    name: 'copilot_orchestrator_get_workspace_config',
    description: 'Get workspace configuration including task roots, agent profiles, and MCP settings',
    inputSchema: {
      type: 'object',
      properties: {
        includeAgentProfiles: {
          type: 'boolean',
          description: 'Include agent profile configurations',
          default: false
        }
      }
    }
  }
];

/**
 * Main MCP server instance
 */
const server = new Server(
  {
    name: 'copilot-orchestrator-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Handle tool list requests
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: EXTENSION_TOOLS };
});

/**
 * Handle tool call requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'copilot_orchestrator_get_task_status':
        return await handleGetTaskStatus(args);

      case 'copilot_orchestrator_list_active_tasks':
        return await handleListActiveTasks(args);

      case 'copilot_orchestrator_get_agent_state':
        return await handleGetAgentState(args);

      case 'copilot_orchestrator_report_observation':
        return await handleReportObservation(args);

      case 'copilot_orchestrator_request_verification':
        return await handleRequestVerification(args);

      case 'copilot_orchestrator_ask_user_question':
        return await handleAskUserQuestion(args);

      case 'copilot_orchestrator_get_workspace_config':
        return await handleGetWorkspaceConfig(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

/**
 * Start the MCP server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('Copilot Orchestrator MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});

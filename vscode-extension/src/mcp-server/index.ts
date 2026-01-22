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
import { handleGetTaskStatus } from './handlers/getTaskStatus';
import { handleListActiveTasks } from './handlers/listActiveTasks';
import { handleGetAgentState } from './handlers/getAgentState';
import { handleReportObservation } from './handlers/reportObservation';
import { handleRequestVerification } from './handlers/requestVerification';
import { handleAskUserQuestion } from './handlers/askUserQuestion';
import { handleGetWorkspaceConfig } from './handlers/getWorkspaceConfig';
// Agent Mode specific handlers
import { handleGetNextTask } from './handlers/getNextTask';
import { handleReportTaskStatus } from './handlers/reportTaskStatus';
import { handleGetContextBundle } from './handlers/getContextBundle';
import { handleReportTestFailure } from './handlers/reportTestFailure';
import { handleReportVerificationResult } from './handlers/reportVerificationResult';

// Audit logging
import { getAuditLogger } from './auditLogger';

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
  },
  // Agent Mode specific tools
  {
    name: 'copilot_orchestrator_get_next_task',
    description: 'Get the highest-priority task for agent to work on next. Returns task with full context bundle.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter string for task selection'
        },
        priority: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Minimum priority level for task selection'
        },
        agentType: {
          type: 'string',
          description: 'Agent type for skill-matching (e.g., code-master, test-runner, auto-zen)'
        }
      }
    }
  },
  {
    name: 'copilot_orchestrator_report_task_status',
    description: 'Update task progress and status. Triggers workflow transitions and notifies other agents.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID to update'
        },
        status: {
          type: 'string',
          enum: ['pending', 'in-progress', 'blocked', 'done', 'failed'],
          description: 'New task status'
        },
        progress: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Progress percentage (0.0 to 1.0)'
        },
        observations: {
          type: 'string',
          description: 'Agent observations about task progress'
        },
        blockers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of blockers preventing task completion'
        }
      },
      required: ['taskId', 'status']
    }
  },
  {
    name: 'copilot_orchestrator_get_context_bundle',
    description: 'Get comprehensive context for a task including relevant files, documentation, and guidance.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID to get context for'
        },
        includeFiles: {
          type: 'boolean',
          description: 'Include relevant file listings',
          default: true
        },
        includeDocs: {
          type: 'boolean',
          description: 'Include relevant documentation',
          default: true
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'copilot_orchestrator_report_test_failure',
    description: 'Report test failures and optionally create investigation tasks for debugging.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID where test failed'
        },
        testName: {
          type: 'string',
          description: 'Name of the failing test'
        },
        errorMessage: {
          type: 'string',
          description: 'Error message from test failure'
        },
        stackTrace: {
          type: 'string',
          description: 'Stack trace from test failure'
        },
        suggestedFix: {
          type: 'string',
          description: 'Suggested fix if agent can diagnose the issue'
        }
      },
      required: ['taskId', 'testName', 'errorMessage']
    }
  },
  {
    name: 'copilot_orchestrator_report_verification_result',
    description: 'Submit verification findings after testing. Triggers quality gates and workflow transitions.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID being verified'
        },
        verificationType: {
          type: 'string',
          enum: ['visual', 'functional', 'integration'],
          description: 'Type of verification performed'
        },
        passed: {
          type: 'boolean',
          description: 'Whether verification passed'
        },
        findings: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of verification findings or issues'
        },
        screenshots: {
          type: 'array',
          items: { type: 'string' },
          description: 'Paths to screenshot files (for visual verification)'
        }
      },
      required: ['taskId', 'verificationType', 'passed', 'findings']
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

      // Agent Mode specific tools
      case 'copilot_orchestrator_get_next_task':
        return await handleGetNextTask(args);

      case 'copilot_orchestrator_report_task_status':
        return await handleReportTaskStatus(args);

      case 'copilot_orchestrator_get_context_bundle':
        return await handleGetContextBundle(args);

      case 'copilot_orchestrator_report_test_failure':
        return await handleReportTestFailure(args);

      case 'copilot_orchestrator_report_verification_result':
        return await handleReportVerificationResult(args);

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
  // Initialize audit logger
  const auditLogger = getAuditLogger();
  auditLogger.initialize();
  
  // Set up WebSocket callback for event streaming
  auditLogger.setWebSocketCallback((event) => {
    // Log to stderr (stdout is reserved for MCP protocol)
    console.error('[WebSocket Event]', JSON.stringify(event));
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('Copilot Orchestrator MCP Server started with audit logging');
  console.error('Audit database initialized with WAL mode');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});

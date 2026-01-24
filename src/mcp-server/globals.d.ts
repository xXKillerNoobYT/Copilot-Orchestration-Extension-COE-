/**
 * Global type declarations for MCP server
 * Provides Node.js global types without requiring @types/node in this sub-project
 */

declare namespace NodeJS {
  interface ProcessEnv {
    MCP_BASE_URL?: string;
    MCP_PROJECT_ID?: string;
    MCP_AUTH_TOKEN?: string;
    MCP_TIMEOUT?: string;
    MCP_LOCAL_SERVER_ENABLED?: string;
    MCP_DOCKER_GATEWAY_ENABLED?: string;
    WORKSPACE_TASK_ROOTS?: string;
    WORKSPACE_ISSUE_FOLDER?: string;
    WORKSPACE_TOOL_REGISTRY?: string;
    WORKSPACE_ROOT?: string;
    LLM_BASE_URL?: string;
    LLM_MODEL?: string;
    LLM_TEMPERATURE?: string;
    LLM_TIMEOUT?: string;
    WEBSOCKET_DRIVER?: string;
    WEBSOCKET_HOST?: string;
    WEBSOCKET_PORT?: string;
    WEBSOCKET_ENABLED?: string;
    GITHUB_SYNC_ENABLED?: string;
    GITHUB_SYNC_INTERVAL?: string;
    GITHUB_RATE_LIMIT?: string;
    PROJECT_NAME?: string;
    [key: string]: string | undefined;
  }
  
  interface Process {
    env: ProcessEnv;
    cwd(): string;
  }
}

declare const process: NodeJS.Process;

// Declare fetch as global (available in Node 18+)
declare function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;

interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
}

type HeadersInit = Headers | string[][] | Record<string, string>;
type BodyInit = string;

interface Response {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<any>;
}

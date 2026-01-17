/**
 * Mock MCP Client for testing
 */

export class MCPClient {
  private static instance: MCPClient | null = null;

  askQuestion = jest.fn();

  static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  static initialize(): MCPClient {
    MCPClient.instance = new MCPClient();
    return MCPClient.instance;
  }

  static resetInstance(): void {
    if (MCPClient.instance) {
      MCPClient.instance.askQuestion.mockReset();
    }
    MCPClient.instance = null;
  }
}

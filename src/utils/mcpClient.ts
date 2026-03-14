import type { MCPServerConfig, MCPTool, MCPResource } from '../types';

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export class MCPClient {
  private config: MCPServerConfig;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  private async request(method: string, params?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    return data.result;
  }

  async initialize(): Promise<{ tools: MCPTool[]; resources: MCPResource[] }> {
    // Initialize connection
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'OpenClaw Mobile', version: '1.0.0' },
    });

    // List tools
    try {
      const toolsResult = await this.request('tools/list');
      this.tools = (toolsResult.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema || {},
        serverId: this.config.id,
      }));
    } catch {
      this.tools = [];
    }

    // List resources
    try {
      const resourcesResult = await this.request('resources/list');
      this.resources = (resourcesResult.resources || []).map((r: any) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
        serverId: this.config.id,
      }));
    } catch {
      this.resources = [];
    }

    return { tools: this.tools, resources: this.resources };
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const result = await this.request('tools/call', {
      name: call.name,
      arguments: call.arguments,
    });
    return result;
  }

  async readResource(uri: string): Promise<string> {
    const result = await this.request('resources/read', { uri });
    const contents = result.contents || [];
    return contents.map((c: any) => c.text || '').join('\n');
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getResources(): MCPResource[] {
    return this.resources;
  }
}

// MCP Manager: manages multiple MCP connections
class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private allTools: MCPTool[] = [];

  async connect(config: MCPServerConfig): Promise<{ tools: MCPTool[]; resources: MCPResource[] }> {
    const client = new MCPClient(config);
    const result = await client.initialize();
    this.clients.set(config.id, client);
    this.refreshTools();
    return result;
  }

  disconnect(serverId: string) {
    this.clients.delete(serverId);
    this.refreshTools();
  }

  private refreshTools() {
    this.allTools = [];
    for (const client of this.clients.values()) {
      this.allTools.push(...client.getTools());
    }
  }

  getAllTools(): MCPTool[] {
    return this.allTools;
  }

  async callTool(toolName: string, args: Record<string, any>): Promise<string> {
    for (const [_, client] of this.clients) {
      const tool = client.getTools().find((t) => t.name === toolName);
      if (tool) {
        try {
          const result = await client.callTool({ name: toolName, arguments: args });
          if (result.isError) {
            return `[MCP Error] ${result.content.map((c) => c.text || '').join('\n')}`;
          }
          return result.content
            .map((c) => c.text || JSON.stringify(c))
            .join('\n');
        } catch (err: any) {
          throw new Error(`MCP tool "${toolName}" execution failed: ${err.message}`);
        }
      }
    }
    throw new Error(`Tool "${toolName}" not found on any connected MCP server`);
  }

  // Format tools as OpenAI-compatible function definitions
  getToolDefinitions(): any[] {
    return this.allTools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }
}

export const mcpManager = new MCPManager();

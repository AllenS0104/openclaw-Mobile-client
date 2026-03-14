export type ProviderId = 'openai' | 'claude' | 'deepseek' | 'qwen' | 'gemini' | 'minimax' | 'moonshot';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  icon: string;
  apiKeyPlaceholder: string;
  defaultEndpoint: string;
  models: ModelInfo[];
  supportsVision: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  supportsVision?: boolean;
}

export interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  imageUri?: string;
  imageBase64?: string;
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[]; // base64 images
  timestamp: number;
  isStreaming?: boolean;
  toolCallId?: string;
  toolName?: string;
}

export interface Conversation {
  id: string;
  title: string;
  providerId: ProviderId;
  modelId: string;
  messages: Message[];
  systemPrompt?: string;
  skillIds?: string[];
  memoryId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProviderSettings {
  apiKey: string;
  endpoint: string;
  selectedModel: string;
}

export interface AppSettings {
  providers: Record<ProviderId, ProviderSettings>;
  activeProvider: ProviderId;
  theme: 'light' | 'dark' | 'system';
  mcpServers: MCPServerConfig[];
  memoryEnabled: boolean;
  memoryAutoCompact: boolean;
  memoryMaxMessages: number;
  imageGenProvider: string; // preferred provider: 'openai' | 'qwen' | 'gemini' | 'minimax' | '' (auto)
}

export interface ToolPlugin {
  id: string;
  name: string;
  icon: string;
  description: string;
  execute: (input: string) => Promise<string>;
}

// ===== Skills =====
export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
  builtIn: boolean;
  enabled: boolean;
  tools?: SkillTool[];
  createdAt: number;
}

export interface SkillTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

// ===== MCP (Model Context Protocol) =====
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

// ===== Memory =====
export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: 'fact' | 'preference' | 'context' | 'summary';
  source: string; // conversation id
  timestamp: number;
}

export interface ConversationMemory {
  id: string;
  conversationId: string;
  summary: string;
  keyFacts: MemoryEntry[];
  tokensSaved: number;
  createdAt: number;
}

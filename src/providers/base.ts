import type { ProviderConfig, ProviderId, Message } from '../types';

export interface ChatRequest {
  messages: { role: string; content: any }[];
  model: string;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export abstract class BaseProvider {
  abstract config: ProviderConfig;

  abstract sendMessage(
    apiKey: string,
    endpoint: string,
    model: string,
    messages: Message[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void>;

  protected formatMessages(messages: Message[]): { role: string; content: any }[] {
    return messages.map((m) => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            ...m.images.map((img) => ({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${img}` },
            })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });
  }

  protected async streamSSE(
    url: string,
    headers: Record<string, string>,
    body: object,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
    extractContent?: (data: any) => string,
  ): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();

      if (reader) {
        // Streaming mode: ReadableStream available
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              callbacks.onDone();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = extractContent
                ? extractContent(parsed)
                : parsed.choices?.[0]?.delta?.content || '';
              if (content) callbacks.onToken(content);
            } catch {
              // skip malformed JSON
            }
          }
        }
      } else {
        // Fallback: ReadableStream not available (React Native)
        // Read full response and parse SSE events
        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const content = extractContent
              ? extractContent(parsed)
              : parsed.choices?.[0]?.delta?.content || '';
            if (content) callbacks.onToken(content);
          } catch {
            // skip malformed JSON
          }
        }
      }
      callbacks.onDone();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        callbacks.onDone();
      } else {
        callbacks.onError(error);
      }
    }
  }
}

// Provider registry
export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    apiKeyPlaceholder: 'sk-...',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    supportsVision: true,
    models: [
      { id: 'gpt-5.2', name: 'GPT-5.2', supportsVision: true },
      { id: 'gpt-5.1', name: 'GPT-5.1', supportsVision: true },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', supportsVision: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', supportsVision: true },
      { id: 'gpt-4o', name: 'GPT-4o', supportsVision: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsVision: true },
    ],
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    icon: '🧠',
    apiKeyPlaceholder: 'sk-ant-...',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    supportsVision: true,
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', supportsVision: true },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', supportsVision: true },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', supportsVision: true },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', supportsVision: true },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔍',
    apiKeyPlaceholder: 'sk-...',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    supportsVision: false,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1' },
    ],
  },
  qwen: {
    id: 'qwen',
    name: '通义千问 Qwen',
    icon: '💎',
    apiKeyPlaceholder: 'sk-...',
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    supportsVision: true,
    models: [
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-turbo', name: 'Qwen Turbo' },
      { id: 'qwen-vl-max', name: 'Qwen VL Max', supportsVision: true },
      { id: 'qwen-vl-plus', name: 'Qwen VL Plus', supportsVision: true },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    apiKeyPlaceholder: 'AIza...',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    supportsVision: true,
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', supportsVision: true },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', supportsVision: true },
      { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', supportsVision: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsVision: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsVision: true },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', supportsVision: true },
    ],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    icon: '🟣',
    apiKeyPlaceholder: 'eyJ...',
    defaultEndpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    supportsVision: false,
    models: [
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5' },
      { id: 'MiniMax-M1', name: 'MiniMax M1' },
    ],
  },
  moonshot: {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    icon: '🌙',
    apiKeyPlaceholder: 'sk-...',
    defaultEndpoint: 'https://api.moonshot.ai/v1/chat/completions',
    supportsVision: false,
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5' },
      { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking' },
      { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K' },
    ],
  },
};

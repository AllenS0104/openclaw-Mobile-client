import { BaseProvider, PROVIDERS, type StreamCallbacks } from './base';
import type { Message, ProviderConfig } from '../types';

export class ClaudeProvider extends BaseProvider {
  config: ProviderConfig = PROVIDERS.claude;

  async sendMessage(
    apiKey: string,
    endpoint: string,
    model: string,
    messages: Message[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = endpoint || this.config.defaultEndpoint;

    // Claude uses a different format
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system' && m.role !== 'tool')
      .map((m) => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map((img) => ({
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: img },
              })),
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

    const body: any = {
      model,
      messages: chatMessages,
      max_tokens: 4096,
      stream: true,
    };
    if (systemMsg) body.system = systemMsg.content;

    await this.streamSSE(
      url,
      {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
      callbacks,
      signal,
      (data) => {
        if (data.type === 'content_block_delta') {
          return data.delta?.text || '';
        }
        return '';
      },
    );
  }
}

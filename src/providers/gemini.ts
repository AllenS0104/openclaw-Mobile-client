import { BaseProvider, PROVIDERS, type StreamCallbacks } from './base';
import type { Message, ProviderConfig } from '../types';

export class GeminiProvider extends BaseProvider {
  config: ProviderConfig = PROVIDERS.gemini;

  async sendMessage(
    apiKey: string,
    endpoint: string,
    model: string,
    messages: Message[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!apiKey) {
      throw new Error(
        '需要 Gemini API Key\n\n' +
        '获取方式：访问 aistudio.google.com/apikey\n' +
        '然后在设置页填入 API Key'
      );
    }

    const baseUrl = endpoint || this.config.defaultEndpoint;
    const url = `${baseUrl}${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system' && m.role !== 'tool');

    const contents = chatMessages.map((m) => {
      const parts: any[] = [{ text: m.content }];
      if (m.images) {
        m.images.forEach((img) => {
          parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } });
        });
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const body: any = { contents };
    if (systemMsg) {
      body.system_instruction = { parts: [{ text: systemMsg.content }] };
    }

    await this.streamSSE(url, {}, body, callbacks, signal, (data) => {
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts
        .filter((p: any) => !p.thought)
        .map((p: any) => p.text || '')
        .join('');
    });
  }
}

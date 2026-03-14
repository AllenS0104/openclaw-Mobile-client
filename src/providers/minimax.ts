import { BaseProvider, PROVIDERS, type StreamCallbacks } from './base';
import type { Message, ProviderConfig } from '../types';

export class MiniMaxProvider extends BaseProvider {
  config: ProviderConfig = PROVIDERS.minimax;

  async sendMessage(
    apiKey: string,
    endpoint: string,
    model: string,
    messages: Message[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = endpoint || this.config.defaultEndpoint;
    await this.streamSSE(
      url,
      { Authorization: `Bearer ${apiKey}` },
      { model, messages: this.formatMessages(messages), stream: true },
      callbacks,
      signal,
    );
  }
}

import type { ProviderId } from '../types';
import { BaseProvider } from './base';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { DeepSeekProvider } from './deepseek';
import { QwenProvider } from './qwen';
import { GeminiProvider } from './gemini';
import { MiniMaxProvider } from './minimax';
import { MoonshotProvider } from './moonshot';

const providers: Record<ProviderId, BaseProvider> = {
  openai: new OpenAIProvider(),
  claude: new ClaudeProvider(),
  deepseek: new DeepSeekProvider(),
  qwen: new QwenProvider(),
  gemini: new GeminiProvider(),
  minimax: new MiniMaxProvider(),
  moonshot: new MoonshotProvider(),
};

export function getProvider(id: ProviderId): BaseProvider {
  return providers[id];
}

export { PROVIDERS } from './base';

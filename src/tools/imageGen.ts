/**
 * Multi-provider image generation.
 * Supports: OpenAI DALL·E 3, Qwen/通义万相 Wanx, Gemini Imagen, MiniMax.
 * Auto-detects available provider from user's configured API keys.
 */

import type { ProviderId, ProviderSettings } from '../types';

export type ImageGenProvider = 'openai' | 'qwen' | 'gemini' | 'minimax';

export interface ImageGenParams {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
}

export interface ImageGenResult {
  url: string;
  revisedPrompt?: string;
  provider: ImageGenProvider;
}

const IMG_GEN_REGEX = /\[IMG_GEN\]([\s\S]*?)\[\/IMG_GEN\]/g;

/** Parse [IMG_GEN] tags from assistant message content. */
export function parseImageGenTags(content: string): ImageGenParams[] {
  const results: ImageGenParams[] = [];
  let match: RegExpExecArray | null;
  while ((match = IMG_GEN_REGEX.exec(content)) !== null) {
    try {
      const params = JSON.parse(match[1].trim());
      if (params.prompt) {
        results.push({
          prompt: params.prompt,
          size: params.size || '1024x1024',
          style: params.style || 'vivid',
        });
      }
    } catch {
      const text = match[1].trim();
      if (text) results.push({ prompt: text, size: '1024x1024', style: 'vivid' });
    }
  }
  return results;
}

// ── Provider-specific implementations ──────────────────────────

async function dalleGenerate(
  params: ImageGenParams, apiKey: string, endpoint: string,
): Promise<ImageGenResult> {
  const baseUrl = (endpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'dall-e-3', prompt: params.prompt, n: 1,
      size: params.size || '1024x1024', style: params.style || 'vivid',
      response_format: 'url',
    }),
  });
  if (!res.ok) throw new Error(`DALL·E error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const img = data.data?.[0];
  if (!img?.url) throw new Error('DALL·E: no image URL');
  return { url: img.url, revisedPrompt: img.revised_prompt, provider: 'openai' };
}

async function wanxGenerate(
  params: ImageGenParams, apiKey: string, endpoint: string,
): Promise<ImageGenResult> {
  const baseUrl = (endpoint || 'https://dashscope.aliyuncs.com/api/v1').replace(/\/$/, '');
  // Step 1: submit async task
  const submitRes = await fetch(`${baseUrl}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt: params.prompt },
      parameters: {
        size: params.size === '1792x1024' ? '1024*576'
            : params.size === '1024x1792' ? '576*1024'
            : '1024*1024',
        n: 1,
      },
    }),
  });
  if (!submitRes.ok) throw new Error(`通义万相 error (${submitRes.status}): ${await submitRes.text()}`);
  const submitData = await submitRes.json();
  const taskId = submitData.output?.task_id;
  if (!taskId) throw new Error('通义万相: no task_id');

  // Step 2: poll for result (max 60s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;
    if (status === 'SUCCEEDED') {
      const url = pollData.output?.results?.[0]?.url;
      if (url) return { url, provider: 'qwen' };
      throw new Error('通义万相: succeeded but no URL');
    }
    if (status === 'FAILED') throw new Error(`通义万相: ${pollData.output?.message || 'failed'}`);
  }
  throw new Error('通义万相: timeout (60s)');
}

async function imagenGenerate(
  params: ImageGenParams, apiKey: string, endpoint: string,
): Promise<ImageGenResult> {
  const baseUrl = (endpoint || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  const res = await fetch(
    `${baseUrl}/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: params.prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: params.size === '1792x1024' ? '16:9'
                     : params.size === '1024x1792' ? '9:16' : '1:1',
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Imagen error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (b64) return { url: `data:image/png;base64,${b64}`, provider: 'gemini' };
  throw new Error('Imagen: no image data');
}

async function minimaxGenerate(
  params: ImageGenParams, apiKey: string, endpoint: string,
): Promise<ImageGenResult> {
  const baseUrl = (endpoint || 'https://api.minimax.chat/v1').replace(/\/$/, '');
  const res = await fetch(`${baseUrl}/text/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'image-01', prompt: params.prompt }),
  });
  if (!res.ok) throw new Error(`MiniMax image error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const url = data.data?.image_url || data.data?.url;
  if (url) return { url, provider: 'minimax' };
  throw new Error('MiniMax: no image URL');
}

// ── Provider registry ──────────────────────────────────────────

const IMAGE_GEN_PROVIDERS: {
  id: ImageGenProvider;
  chatProviderId: ProviderId;
  label: string;
  generate: (p: ImageGenParams, key: string, ep: string) => Promise<ImageGenResult>;
}[] = [
  { id: 'openai',  chatProviderId: 'openai',  label: 'DALL·E 3',    generate: dalleGenerate },
  { id: 'qwen',    chatProviderId: 'qwen',    label: '通义万相',     generate: wanxGenerate },
  { id: 'gemini',  chatProviderId: 'gemini',  label: 'Imagen 3',    generate: imagenGenerate },
  { id: 'minimax', chatProviderId: 'minimax', label: 'MiniMax 图像', generate: minimaxGenerate },
];

/** List image gen providers that have a configured API key. */
export function getAvailableImageGenProviders(
  providers: Record<ProviderId, ProviderSettings>,
): { id: ImageGenProvider; label: string }[] {
  return IMAGE_GEN_PROVIDERS
    .filter((p) => providers[p.chatProviderId]?.apiKey)
    .map((p) => ({ id: p.id, label: p.label }));
}

/** Auto-select best available provider. */
export function autoSelectImageGenProvider(
  providers: Record<ProviderId, ProviderSettings>,
  preferred?: ImageGenProvider,
): ImageGenProvider | null {
  const available = getAvailableImageGenProviders(providers);
  if (available.length === 0) return null;
  if (preferred && available.some((a) => a.id === preferred)) return preferred;
  const priority: ImageGenProvider[] = ['openai', 'qwen', 'gemini', 'minimax'];
  for (const p of priority) {
    if (available.some((a) => a.id === p)) return p;
  }
  return available[0].id;
}

/** Generate image using the best available provider. */
export async function generateImage(
  params: ImageGenParams,
  providers: Record<ProviderId, ProviderSettings>,
  preferredProvider?: ImageGenProvider,
): Promise<ImageGenResult> {
  const selectedId = autoSelectImageGenProvider(providers, preferredProvider);
  if (!selectedId) {
    throw new Error(
      '没有可用的图片生成服务。\n请在设置中配置以下任一服务商的 API Key：\n• OpenAI → DALL·E 3\n• 通义千问 → 通义万相\n• Gemini → Imagen 3\n• MiniMax → MiniMax 图像'
    );
  }
  const def = IMAGE_GEN_PROVIDERS.find((p) => p.id === selectedId)!;
  const creds = providers[def.chatProviderId];
  return def.generate(params, creds.apiKey, creds.endpoint);
}

// ── Tag utilities ──────────────────────────────────────────────

export function stripImageGenTags(content: string): string {
  return content.replace(IMG_GEN_REGEX, '\n🖼️ *[图片生成中...]*\n');
}

export function replaceImageGenTags(content: string, imageUrls: string[]): string {
  let i = 0;
  return content.replace(IMG_GEN_REGEX, () => {
    const url = imageUrls[i++];
    return url ? `\n![generated](${url})\n` : '\n❌ *[图片生成失败]*\n';
  });
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message, MemoryEntry, ConversationMemory } from '../types';

const MEMORY_KEY = '@openclaw_memory';
const SUMMARIES_KEY = '@openclaw_summaries';

// Rough token estimation (1 token ≈ 1.5 Chinese chars or 4 English chars)
function estimateTokens(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const other = text.length - chinese;
  return Math.ceil(chinese / 1.5 + other / 4);
}

// Global memory entries (facts, preferences extracted across conversations)
let memoryEntries: MemoryEntry[] = [];
let summaryCache: Map<string, ConversationMemory> = new Map();

export async function loadMemory(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(MEMORY_KEY);
    if (stored) memoryEntries = JSON.parse(stored);
    const summaries = await AsyncStorage.getItem(SUMMARIES_KEY);
    if (summaries) {
      const arr: ConversationMemory[] = JSON.parse(summaries);
      summaryCache = new Map(arr.map((s) => [s.conversationId, s]));
    }
  } catch {}
}

async function saveMemory(): Promise<void> {
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(memoryEntries));
  await AsyncStorage.setItem(
    SUMMARIES_KEY,
    JSON.stringify(Array.from(summaryCache.values()))
  );
}

// Add a memory entry
export function addMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): void {
  // Deduplicate by key
  const existing = memoryEntries.findIndex((e) => e.key === entry.key);
  const newEntry: MemoryEntry = {
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
  };
  if (existing >= 0) {
    memoryEntries[existing] = newEntry;
  } else {
    memoryEntries.push(newEntry);
  }
  saveMemory();
}

export function getMemoryEntries(): MemoryEntry[] {
  return memoryEntries;
}

export function deleteMemoryEntry(id: string): void {
  memoryEntries = memoryEntries.filter((e) => e.id !== id);
  saveMemory();
}

export function clearAllMemory(): void {
  memoryEntries = [];
  summaryCache.clear();
  saveMemory();
}

// Build a memory context string to inject into system prompt
export function buildMemoryContext(): string {
  if (memoryEntries.length === 0) return '';

  const facts = memoryEntries.filter((e) => e.category === 'fact');
  const prefs = memoryEntries.filter((e) => e.category === 'preference');
  const contexts = memoryEntries.filter((e) => e.category === 'context');

  let parts: string[] = ['[用户记忆]'];
  if (facts.length > 0) {
    parts.push('事实: ' + facts.map((f) => `${f.key}: ${f.value}`).join('; '));
  }
  if (prefs.length > 0) {
    parts.push('偏好: ' + prefs.map((p) => `${p.key}: ${p.value}`).join('; '));
  }
  if (contexts.length > 0) {
    parts.push('上下文: ' + contexts.map((c) => `${c.key}: ${c.value}`).join('; '));
  }
  return parts.join('\n');
}

// Compact messages: summarize older messages, keep recent ones
export function compactMessages(
  messages: Message[],
  maxMessages: number,
): { compacted: Message[]; tokensSaved: number } {
  if (messages.length <= maxMessages) {
    return { compacted: messages, tokensSaved: 0 };
  }

  // Keep the last `keepRecent` messages intact, summarize the rest
  const keepRecent = Math.min(Math.floor(maxMessages * 0.6), 20);
  const toSummarize = messages.slice(0, messages.length - keepRecent);
  const toKeep = messages.slice(messages.length - keepRecent);

  // Build summary of older messages
  const summaryParts: string[] = [];
  let currentTopic = '';

  for (const msg of toSummarize) {
    if (msg.role === 'system' || msg.role === 'tool') continue;
    const preview = msg.content.substring(0, 300);
    const ellipsis = msg.content.length > 300 ? '...' : '';
    if (msg.role === 'user') {
      // Flush any unpaired previous user message
      if (currentTopic) {
        summaryParts.push(`Q: ${currentTopic}`);
      }
      currentTopic = preview + ellipsis;
    } else if (msg.role === 'assistant') {
      if (currentTopic) {
        summaryParts.push(`Q: ${currentTopic} → A: ${preview}${ellipsis}`);
        currentTopic = '';
      } else {
        summaryParts.push(`A: ${preview}${ellipsis}`);
      }
    }
  }
  // Flush last unpaired user message
  if (currentTopic) summaryParts.push(`Q: ${currentTopic}`);

  const summaryText = summaryParts.length > 0
    ? `[对话历史摘要 - ${summaryParts.length} 轮]\n${summaryParts.join('\n')}`
    : '[之前有对话但已压缩]';

  const summaryMessage: Message = {
    id: 'compact_summary',
    role: 'system',
    content: summaryText,
    timestamp: Date.now(),
  };

  const originalTokens = toSummarize.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const summaryTokens = estimateTokens(summaryText);

  return {
    compacted: [summaryMessage, ...toKeep],
    tokensSaved: Math.max(0, originalTokens - summaryTokens),
  };
}

// Extract key information from a message using pattern matching
export function extractMemoryFromMessage(
  message: Message,
  conversationId: string,
): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const content = message.content;

  // Extract patterns like "my name is X", "I work at X", etc.
  const patterns: { regex: RegExp; key: string; category: MemoryEntry['category'] }[] = [
    { regex: /我(?:的名字|叫|是)(?:叫)?[\s]*([^\s,，。.!！?？]{2,10})/g, key: '用户名字', category: 'fact' },
    { regex: /我(?:在|任职于)[\s]*([^\s,，。.!！?？]{2,20})(?:工作|上班)/g, key: '工作单位', category: 'fact' },
    { regex: /我是(?:一[个名位])?[\s]*([^\s,，。.!！?？]{2,15})/g, key: '用户身份', category: 'fact' },
    { regex: /(?:我喜欢|我偏好|我习惯)[\s]*([^\s,，。.!！?？]{2,30})/g, key: '偏好', category: 'preference' },
    { regex: /(?:请(?:用|以)|请?帮我?(?:用|以))[\s]*([^\s,，。.!！?？]{2,20})(?:风格|方式|语气)/g, key: '风格偏好', category: 'preference' },
    { regex: /my name is (\w+)/gi, key: 'user_name', category: 'fact' },
    { regex: /i (?:work|am working) (?:at|for) ([^,.!?]+)/gi, key: 'workplace', category: 'fact' },
    { regex: /i (?:prefer|like|love) ([^,.!?]+)/gi, key: 'preference', category: 'preference' },
  ];

  for (const { regex, key, category } of patterns) {
    const matches = content.matchAll(regex);
    for (const match of matches) {
      if (match[1] && match[1].trim().length >= 2) {
        entries.push({
          id: '',
          key,
          value: match[1].trim(),
          category,
          source: conversationId,
          timestamp: Date.now(),
        });
      }
    }
  }

  return entries;
}

// Get token estimation for a message array
export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

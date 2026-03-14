import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Conversation } from '../types';

const CONVERSATIONS_DIR = `${FileSystem.documentDirectory}conversations/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CONVERSATIONS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CONVERSATIONS_DIR, { intermediates: true });
  }
}

export async function exportConversation(conversation: Conversation): Promise<string> {
  await ensureDir();
  const fileName = `chat_${conversation.id}_${Date.now()}.json`;
  const filePath = CONVERSATIONS_DIR + fileName;
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(conversation, null, 2));
  return filePath;
}

export async function exportAllConversations(conversations: Conversation[]): Promise<string> {
  await ensureDir();
  const fileName = `openclaw_backup_${Date.now()}.json`;
  const filePath = CONVERSATIONS_DIR + fileName;
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(conversations, null, 2));
  return filePath;
}

export async function importConversations(uri: string): Promise<Conversation[]> {
  const content = await FileSystem.readAsStringAsync(uri);
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed.id && parsed.messages) return [parsed];
  throw new Error('无效的对话文件格式');
}

export async function shareFile(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: '导出对话记录',
    });
  }
}

export async function listBackups(): Promise<string[]> {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(CONVERSATIONS_DIR);
  return files.filter((f) => f.endsWith('.json')).sort().reverse();
}

export async function deleteBackup(fileName: string): Promise<void> {
  await FileSystem.deleteAsync(CONVERSATIONS_DIR + fileName, { idempotent: true });
}

export async function readBackup(fileName: string): Promise<Conversation[]> {
  const content = await FileSystem.readAsStringAsync(CONVERSATIONS_DIR + fileName);
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [parsed];
}

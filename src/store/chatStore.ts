import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Conversation, Message, ProviderId } from '../types';

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  loaded: boolean;

  loadConversations: () => Promise<void>;
  saveConversations: () => Promise<void>;

  createConversation: (providerId: ProviderId, modelId: string) => string;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  setActiveConversation: (id: string | null) => void;

  getActiveConversation: () => Conversation | undefined;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  setSystemPrompt: (conversationId: string, prompt: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  setMessageStreaming: (conversationId: string, messageId: string, streaming: boolean) => void;
}

const STORAGE_KEY = '@openclaw_conversations';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Debounced save to avoid write conflicts during streaming
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(saveFn: () => Promise<void>) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { saveFn(); _saveTimer = null; }, 500);
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  loaded: false,

  loadConversations: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ conversations: JSON.parse(stored), loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveConversations: async () => {
    const { conversations } = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  },

  createConversation: (providerId, modelId) => {
    const id = generateId();
    const conversation: Conversation = {
      id,
      title: '新对话',
      providerId,
      modelId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
    }));
    scheduleSave(() => get().saveConversations());
    return id;
  },

  deleteConversation: (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
    }));
    scheduleSave(() => get().saveConversations());
  },

  clearAllConversations: () => {
    set({ conversations: [], activeConversationId: null });
    AsyncStorage.removeItem(STORAGE_KEY);
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const updated = {
          ...c,
          messages: [...c.messages, message],
          updatedAt: Date.now(),
        };
        // Auto-title from first user message
        if (c.title === '新对话' && message.role === 'user') {
          updated.title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
        }
        return updated;
      }),
    }));
    scheduleSave(() => get().saveConversations());
  },

  updateMessage: (conversationId, messageId, content) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  deleteMessage: (conversationId, messageId) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.filter((m) => m.id !== messageId),
          updatedAt: Date.now(),
        };
      }),
    }));
    scheduleSave(() => get().saveConversations());
  },

  setSystemPrompt: (conversationId, prompt) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, systemPrompt: prompt } : c
      ),
    }));
    scheduleSave(() => get().saveConversations());
  },

  updateConversationTitle: (conversationId, title) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, title } : c
      ),
    }));
    scheduleSave(() => get().saveConversations());
  },

  setMessageStreaming: (conversationId, messageId, streaming) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, isStreaming: streaming } : m
          ),
        };
      }),
    }));
  },
}));

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, ProviderId, ProviderSettings, MCPServerConfig } from '../types';

const defaultProviderSettings: ProviderSettings = {
  apiKey: '',
  endpoint: '',
  selectedModel: '',
};

const defaultSettings: AppSettings = {
  activeProvider: 'gemini',
  theme: 'light',
  providers: {
    openai: { ...defaultProviderSettings, selectedModel: 'gpt-5.2' },
    claude: { ...defaultProviderSettings, selectedModel: 'claude-opus-4-6' },
    deepseek: { ...defaultProviderSettings, selectedModel: 'deepseek-chat' },
    qwen: { ...defaultProviderSettings, selectedModel: 'qwen-max' },
    gemini: { ...defaultProviderSettings, selectedModel: 'gemini-3-flash-preview' },
    minimax: { ...defaultProviderSettings, selectedModel: 'MiniMax-M2.5' },
    moonshot: { ...defaultProviderSettings, selectedModel: 'kimi-k2.5' },
  },
  mcpServers: [],
  memoryEnabled: true,
  memoryAutoCompact: true,
  memoryMaxMessages: 30,
  imageGenProvider: '', // auto-detect
};

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setActiveProvider: (id: ProviderId) => void;
  setProviderConfig: (id: ProviderId, config: Partial<ProviderSettings>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  getActiveProviderSettings: () => ProviderSettings;
  // MCP
  addMCPServer: (server: MCPServerConfig) => void;
  removeMCPServer: (id: string) => void;
  toggleMCPServer: (id: string) => void;
  // Memory
  setMemoryEnabled: (enabled: boolean) => void;
  setMemoryAutoCompact: (enabled: boolean) => void;
  setMemoryMaxMessages: (max: number) => void;
  // Image Generation
  setImageGenProvider: (provider: string) => void;
}

const STORAGE_KEY = '@openclaw_settings';

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        // Deep merge: user's saved provider settings fully override defaults
        // (empty apiKey means user intentionally cleared it)
        const mergedProviders = { ...defaultSettings.providers };
        if (parsed.providers) {
          for (const key of Object.keys(mergedProviders) as ProviderId[]) {
            if (parsed.providers[key]) {
              mergedProviders[key] = {
                apiKey: parsed.providers[key].apiKey ?? defaultSettings.providers[key].apiKey,
                endpoint: parsed.providers[key].endpoint ?? defaultSettings.providers[key].endpoint,
                selectedModel: parsed.providers[key].selectedModel || defaultSettings.providers[key].selectedModel,
              };
            }
            // Reset stale selectedModel if it's not in the current model list
            const { PROVIDERS } = require('../providers/base');
            const validModels = PROVIDERS[key]?.models.map((m: any) => m.id) || [];
            if (mergedProviders[key].selectedModel && !validModels.includes(mergedProviders[key].selectedModel)) {
              mergedProviders[key].selectedModel = defaultSettings.providers[key].selectedModel;
            }
          }
        }
        set({
          settings: { ...defaultSettings, ...parsed, providers: mergedProviders },
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setActiveProvider: (id) => {
    set((state) => {
      const newSettings = { ...state.settings, activeProvider: id };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  setProviderConfig: (id, config) => {
    set((state) => {
      const newProviders = {
        ...state.settings.providers,
        [id]: { ...state.settings.providers[id], ...config },
      };
      const newSettings = { ...state.settings, providers: newProviders };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  setTheme: (theme) => {
    set((state) => {
      const newSettings = { ...state.settings, theme };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  getActiveProviderSettings: () => {
    const { settings } = get();
    return settings.providers[settings.activeProvider];
  },

  // MCP Server management
  addMCPServer: (server) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        mcpServers: [...state.settings.mcpServers, server],
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  removeMCPServer: (id) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        mcpServers: state.settings.mcpServers.filter((s) => s.id !== id),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  toggleMCPServer: (id) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        mcpServers: state.settings.mcpServers.map((s) =>
          s.id === id ? { ...s, enabled: !s.enabled } : s
        ),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  // Memory settings
  setMemoryEnabled: (enabled) => {
    set((state) => {
      const newSettings = { ...state.settings, memoryEnabled: enabled };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  setMemoryAutoCompact: (enabled) => {
    set((state) => {
      const newSettings = { ...state.settings, memoryAutoCompact: enabled };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  setMemoryMaxMessages: (max) => {
    set((state) => {
      const newSettings = { ...state.settings, memoryMaxMessages: max };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },

  // Image Generation
  setImageGenProvider: (provider) => {
    set((state) => {
      const newSettings = { ...state.settings, imageGenProvider: provider };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return { settings: newSettings };
    });
  },
}));

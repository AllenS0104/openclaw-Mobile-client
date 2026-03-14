import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../src/store/settingsStore';
import { useChatStore } from '../src/store/chatStore';
import { getTheme } from '../src/theme';

export default function RootLayout() {
  const { settings, loadSettings } = useSettingsStore();
  const { loadConversations } = useChatStore();
  const theme = getTheme(settings.theme);

  useEffect(() => {
    loadSettings().catch(() => {});
    loadConversations().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style={theme.statusBar === 'dark-content' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </>
  );
}

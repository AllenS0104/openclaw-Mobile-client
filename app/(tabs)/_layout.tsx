import { Tabs } from 'expo-router';
import { Text, Keyboard, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../src/store/settingsStore';
import { getTheme } from '../../src/theme';
import { useLayout } from '../../src/utils/useLayout';

export default function TabLayout() {
  const { settings } = useSettingsStore();
  const theme = getTheme(settings.theme);
  const layout = useLayout();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const tabBarHeight = layout.isTablet ? 70 : 60;
  const tabBarFontSize = layout.isTablet ? 12 : 10;
  const tabBarIconSize = layout.isTablet ? 26 : 22;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: keyboardVisible ? { display: 'none' } : {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border2,
          height: tabBarHeight,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.text3,
        tabBarLabelStyle: {
          fontSize: tabBarFontSize,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '聊天',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: tabBarIconSize, color }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '历史',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: tabBarIconSize, color }}>📜</Text>,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: '工具',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: tabBarIconSize, color }}>🔧</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: tabBarIconSize, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}

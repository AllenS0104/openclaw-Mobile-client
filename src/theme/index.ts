import { Appearance } from 'react-native';

const lightTheme = {
  bg: '#f5f0eb',
  bg2: '#ffffff',
  bg3: '#f0ebe4',
  bg4: '#e8e0d6',
  text: '#2d2d2d',
  text2: '#666666',
  text3: '#999999',
  accent: '#e67e22',
  accent2: '#d35400',
  accent3: '#f39c12',
  cyan: '#2980b9',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#8e44ad',
  border: 'rgba(0,0,0,0.08)',
  border2: 'rgba(0,0,0,0.12)',
  glass: 'rgba(245,240,235,0.95)',
  card: '#ffffff',
  inputBg: '#ffffff',
  userBubble: '#e67e22',
  userBubbleText: '#ffffff',
  aiBubble: '#ffffff',
  aiBubbleText: '#2d2d2d',
  tabBar: 'rgba(245,240,235,0.95)',
  statusBar: 'dark-content' as 'dark-content' | 'light-content',
};

const darkTheme: typeof lightTheme = {
  bg: '#0a0a14',
  bg2: '#1a1a2e',
  bg3: '#16213e',
  bg4: '#0f3460',
  text: '#e0e0e0',
  text2: '#aaaaaa',
  text3: '#777777',
  accent: '#e67e22',
  accent2: '#d35400',
  accent3: '#f39c12',
  cyan: '#3498db',
  green: '#2ecc71',
  red: '#e74c3c',
  purple: '#9b59b6',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.12)',
  glass: 'rgba(10,10,20,0.95)',
  card: '#1a1a2e',
  inputBg: '#1a1a2e',
  userBubble: '#e67e22',
  userBubbleText: '#ffffff',
  aiBubble: '#1a1a2e',
  aiBubbleText: '#e0e0e0',
  tabBar: 'rgba(10,10,20,0.95)',
  statusBar: 'light-content' as const,
};

export type Theme = typeof lightTheme;

export function getTheme(mode: 'light' | 'dark' | 'system'): Theme {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
}

export { lightTheme, darkTheme };

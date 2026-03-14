import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ToastAndroid, Platform, Alert } from 'react-native';
import type { ProviderConfig } from '../types';
import type { Theme } from '../theme';

// Providers accessible in China without VPN
const CHINA_DIRECT: Record<string, boolean> = {
  deepseek: true,
  qwen: true,
  minimax: true,
  moonshot: true,
};

// Suggested China mirror endpoints for providers that need VPN
const CHINA_MIRRORS: Record<string, { label: string; url: string }[]> = {
  openai: [
    { label: 'OpenAI 官方 (需VPN)', url: 'https://api.openai.com/v1/chat/completions' },
  ],
  claude: [
    { label: 'Anthropic 官方 (需VPN)', url: 'https://api.anthropic.com/v1/messages' },
  ],
  gemini: [
    { label: 'Google 官方 (需VPN)', url: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  ],
};

interface Props {
  provider: ProviderConfig;
  apiKey: string;
  endpoint: string;
  theme: Theme;
  isActive: boolean;
  onApiKeyChange: (key: string) => void;
  onEndpointChange: (endpoint: string) => void;
  onSelect: () => void;
}

export function ProviderCard({
  provider,
  apiKey,
  endpoint,
  theme,
  isActive,
  onApiKeyChange,
  onEndpointChange,
  onSelect,
}: Props) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localEndpoint, setLocalEndpoint] = useState(endpoint);
  const isDirect = CHINA_DIRECT[provider.id];
  const mirrors = CHINA_MIRRORS[provider.id];
  const hasChanges = localKey !== apiKey || localEndpoint !== endpoint;

  const handleSave = () => {
    if (localKey !== apiKey) onApiKeyChange(localKey);
    if (localEndpoint !== endpoint) onEndpointChange(localEndpoint);
    if (Platform.OS === 'android') {
      ToastAndroid.show('✅ 已保存', ToastAndroid.SHORT);
    } else {
      Alert.alert('', '✅ 已保存');
    }
  };

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isActive ? theme.accent : theme.border,
          borderWidth: isActive ? 2 : 1,
        },
      ]}
      onPress={onSelect}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{provider.icon}</Text>
        <Text style={[styles.name, { color: theme.text }]}>{provider.name}</Text>
        {isActive && (
          <View style={[styles.activeBadge, { backgroundColor: theme.accent }]}>
            <Text style={styles.activeText}>当前</Text>
          </View>
        )}
        {isDirect ? (
          <Text style={[styles.networkBadge, { backgroundColor: '#27ae6020', color: '#27ae60' }]}>
            🇨🇳 直连
          </Text>
        ) : (
          <Text style={[styles.networkBadge, { backgroundColor: '#e74c3c20', color: '#e74c3c' }]}>
            🔒 需VPN
          </Text>
        )}
      </View>

      <Text style={[styles.label, { color: theme.text2 }]}>API Key</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
        placeholder={provider.apiKeyPlaceholder}
        placeholderTextColor={theme.text3}
        value={localKey}
        onChangeText={setLocalKey}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={[styles.label, { color: theme.text2 }]}>
        自定义 Endpoint {!isDirect ? '(填入镜像地址可免VPN)' : '(可选)'}
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
        placeholder={provider.defaultEndpoint}
        placeholderTextColor={theme.text3}
        value={localEndpoint}
        onChangeText={setLocalEndpoint}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Mirror tips for VPN-required providers */}
      {mirrors && !isDirect && (
        <Text style={[styles.mirrorTip, { color: theme.text3 }]}>
          💡 提示：可使用第三方 API 代理服务（如 API2D、CloseAI 等），将代理地址填入 Endpoint 即可免VPN使用
        </Text>
      )}

      {/* Save button */}
      <Pressable
        style={[
          styles.saveBtn,
          {
            backgroundColor: hasChanges ? theme.accent : theme.bg3,
            opacity: hasChanges ? 1 : 0.6,
          },
        ]}
        onPress={handleSave}
      >
        <Text style={[styles.saveBtnText, { color: hasChanges ? '#fff' : theme.text3 }]}>
          💾 保存设置
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  networkBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  mirrorTip: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

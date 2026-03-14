import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProviderCard } from '../../src/components/ProviderCard';
import { SkillManager } from '../../src/components/SkillManager';
import { MCPManager } from '../../src/components/MCPManager';
import { MemoryManager } from '../../src/components/MemoryManager';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSkillStore } from '../../src/store/skillStore';
import { getTheme } from '../../src/theme';
import { useLayout } from '../../src/utils/useLayout';
import { PROVIDERS } from '../../src/providers';
import type { ProviderId } from '../../src/types';

export default function SettingsScreen() {
  const { settings, setActiveProvider, setProviderConfig, setTheme } = useSettingsStore();
  const { skills, loadSkills } = useSkillStore();
  const theme = getTheme(settings.theme);
  const layout = useLayout();

  const [showSkills, setShowSkills] = useState(false);
  const [showMCP, setShowMCP] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  useEffect(() => { loadSkills(); }, []);

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'system', label: '跟随系统', icon: '📱' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
        <Text style={[styles.title, { color: theme.text }]}>设置</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme */}
        <Text style={[styles.sectionTitle, { color: theme.text2 }]}>外观</Text>
        <View style={styles.themeRow}>
          {themeOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: settings.theme === opt.value ? theme.accent : theme.bg3,
                },
              ]}
              onPress={() => setTheme(opt.value)}
            >
              <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
              <Text
                style={[
                  styles.themeBtnText,
                  { color: settings.theme === opt.value ? '#fff' : theme.text2 },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Providers */}
        <Text style={[styles.sectionTitle, { color: theme.text2, marginTop: 24 }]}>AI 服务商</Text>
        <Text style={[styles.sectionDesc, { color: theme.text3 }]}>
          点击卡片切换服务商，配置 API Key 后即可使用
        </Text>

        <View style={layout.columns >= 2 ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : undefined}>
          {(Object.keys(PROVIDERS) as ProviderId[]).map((pid) => {
            const providerSettings = settings.providers[pid];
            return (
              <View key={pid} style={layout.columns >= 2 ? { width: '48%' } : undefined}>
                <ProviderCard
                  provider={PROVIDERS[pid]}
                  apiKey={providerSettings.apiKey}
                  endpoint={providerSettings.endpoint}
                  theme={theme}
                  isActive={settings.activeProvider === pid}
                  onApiKeyChange={(key) => setProviderConfig(pid, { apiKey: key })}
                  onEndpointChange={(ep) => setProviderConfig(pid, { endpoint: ep })}
                  onSelect={() => setActiveProvider(pid)}
                />
              </View>
            );
          })}
        </View>

        {/* Advanced Features */}
        <Text style={[styles.sectionTitle, { color: theme.text2, marginTop: 24 }]}>高级功能</Text>

        <View style={styles.featureRow}>
          <Pressable
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowSkills(true)}
          >
            <Text style={{ fontSize: 28 }}>🧩</Text>
            <Text style={[styles.featureName, { color: theme.text }]}>技能</Text>
            <Text style={{ color: theme.text3, fontSize: 11 }}>
              {skills.filter((s) => s.enabled).length} 已启用
            </Text>
          </Pressable>

          <Pressable
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowMCP(true)}
          >
            <Text style={{ fontSize: 28 }}>🔌</Text>
            <Text style={[styles.featureName, { color: theme.text }]}>MCP</Text>
            <Text style={{ color: theme.text3, fontSize: 11 }}>
              {(settings.mcpServers || []).length} 个服务器
            </Text>
          </Pressable>

          <Pressable
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowMemory(true)}
          >
            <Text style={{ fontSize: 28 }}>🧠</Text>
            <Text style={[styles.featureName, { color: theme.text }]}>记忆</Text>
            <Text style={{ color: theme.text3, fontSize: 11 }}>
              {settings.memoryEnabled ? '已启用' : '未启用'}
            </Text>
          </Pressable>
        </View>

        {/* About */}
        <View style={[styles.aboutSection, { borderTopColor: theme.border }]}>
          <Text style={[styles.aboutTitle, { color: theme.text }]}>OpenClaw Mobile</Text>
          <Text style={[styles.aboutVersion, { color: theme.text3 }]}>v1.0.0</Text>
          <Text style={[styles.aboutDesc, { color: theme.text2 }]}>
            多模型 AI 聊天助手{'\n'}
            支持 7 个 AI 服务商 · 技能系统 · MCP · 记忆管理
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <SkillManager theme={theme} visible={showSkills} onClose={() => setShowSkills(false)} />
      <MCPManager theme={theme} visible={showMCP} onClose={() => setShowMCP(false)} />
      <MemoryManager theme={theme} visible={showMemory} onClose={() => setShowMemory(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  sectionDesc: { fontSize: 12, marginBottom: 12 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  themeBtnText: { fontSize: 13, fontWeight: '500' },
  aboutSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  aboutTitle: { fontSize: 18, fontWeight: '700' },
  aboutVersion: { fontSize: 13, marginTop: 4 },
  aboutDesc: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  featureRow: { flexDirection: 'row', gap: 10 },
  featureCard: {
    flex: 1, alignItems: 'center', padding: 16,
    borderRadius: 14, borderWidth: 1, gap: 6,
  },
  featureName: { fontSize: 14, fontWeight: '700' },
});

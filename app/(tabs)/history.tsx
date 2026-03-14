import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChatStore } from '../../src/store/chatStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { getTheme } from '../../src/theme';
import { PROVIDERS } from '../../src/providers';
import { formatTime, truncate } from '../../src/utils/stream';
import { exportAllConversations, exportConversation, shareFile } from '../../src/utils/storage';
import { useLayout } from '../../src/utils/useLayout';
import type { Conversation } from '../../src/types';

export default function HistoryScreen() {
  const { settings } = useSettingsStore();
  const { conversations, deleteConversation, clearAllConversations, setActiveConversation } = useChatStore();
  const theme = getTheme(settings.theme);
  const layout = useLayout();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.messages.some((m) => m.content.toLowerCase().includes(search.toLowerCase())),
      )
    : conversations;

  const handleSelect = (conv: Conversation) => {
    setActiveConversation(conv.id);
    router.push('/');
  };

  const handleDelete = (conv: Conversation) => {
    Alert.alert('对话操作', conv.title, [
      { text: '导出', onPress: () => handleExportOne(conv) },
      { text: '删除', style: 'destructive', onPress: () => deleteConversation(conv.id) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('清空所有对话', '此操作不可撤销，确定要清空所有历史记录？', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: clearAllConversations },
    ]);
  };

  const handleExportAll = async () => {
    try {
      const filePath = await exportAllConversations(conversations);
      await shareFile(filePath);
    } catch (e: any) {
      Alert.alert('导出失败', e.message);
    }
  };

  const handleExportOne = async (conv: Conversation) => {
    try {
      const filePath = await exportConversation(conv);
      await shareFile(filePath);
    } catch (e: any) {
      Alert.alert('导出失败', e.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
        <Text style={[styles.title, { color: theme.text }]}>历史记录</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {conversations.length > 0 && (
            <Pressable onPress={handleExportAll}>
              <Text style={{ color: theme.accent, fontSize: 14 }}>导出</Text>
            </Pressable>
          )}
          {conversations.length > 0 && (
            <Pressable onPress={handleClearAll}>
              <Text style={{ color: theme.red, fontSize: 14 }}>清空</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.bg2, borderColor: theme.border2, color: theme.text }]}
          placeholder="搜索对话..."
          placeholderTextColor={theme.text3}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 40 }}>📭</Text>
          <Text style={[styles.emptyText, { color: theme.text3 }]}>
            {search ? '没有找到匹配的对话' : '暂无对话记录'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={layout.isTablet ? 2 : 1}
          key={layout.isTablet ? 'tablet' : 'phone'}
          columnWrapperStyle={layout.isTablet ? { gap: 10 } : undefined}
          renderItem={({ item }) => {
            const provider = PROVIDERS[item.providerId];
            const lastMsg = item.messages[item.messages.length - 1];
            return (
              <Pressable
                style={[styles.card, {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  flex: layout.isTablet ? 1 : undefined,
                }]}
                onPress={() => handleSelect(item)}
                onLongPress={() => handleDelete(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 16 }}>{provider?.icon || '🤖'}</Text>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.cardTime, { color: theme.text3 }]}>{formatTime(item.updatedAt)}</Text>
                </View>
                {lastMsg && (
                  <Text style={[styles.cardPreview, { color: theme.text2 }]} numberOfLines={2}>
                    {truncate(lastMsg.content, 80)}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardMeta, { color: theme.text3 }]}>
                    {item.modelId} · {item.messages.length} 条消息
                  </Text>
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  searchBox: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  cardTime: { fontSize: 12 },
  cardPreview: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardFooter: { flexDirection: 'row' },
  cardMeta: { fontSize: 11 },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Modal, FlatList, Switch,
  StyleSheet, Alert, useWindowDimensions,
} from 'react-native';
import {
  loadMemory, getMemoryEntries, deleteMemoryEntry,
  clearAllMemory, buildMemoryContext, estimateMessagesTokens,
} from '../utils/memory';
import { useSettingsStore } from '../store/settingsStore';
import type { Theme } from '../theme';
import type { MemoryEntry } from '../types';

interface Props {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
}

export function MemoryManager({ theme, visible, onClose }: Props) {
  const { settings, setMemoryEnabled, setMemoryAutoCompact, setMemoryMaxMessages } = useSettingsStore();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [contextPreview, setContextPreview] = useState('');

  useEffect(() => {
    if (visible) {
      loadMemory().then(() => {
        setEntries([...getMemoryEntries()]);
        setContextPreview(buildMemoryContext());
      });
    }
  }, [visible]);

  const handleDelete = (entry: MemoryEntry) => {
    Alert.alert('删除记忆', `删除 "${entry.key}: ${entry.value}"？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: () => {
          deleteMemoryEntry(entry.id);
          setEntries([...getMemoryEntries()]);
          setContextPreview(buildMemoryContext());
        }
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('清空所有记忆', '这将删除所有提取的用户信息和对话摘要。不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空', style: 'destructive', onPress: () => {
          clearAllMemory();
          setEntries([]);
          setContextPreview('');
        }
      },
    ]);
  };

  const categoryLabel: Record<string, string> = {
    fact: '📋 事实',
    preference: '⭐ 偏好',
    context: '🔗 上下文',
  };

  const maxMsgOptions = [20, 30, 50, 80, 100];

  return (
    <Modal visible={visible} animationType={isTablet ? 'fade' : 'slide'} transparent>
      <View style={isTablet ? styles.overlayCenter : styles.overlay}>
        <View style={[isTablet ? styles.sheetCenter : styles.sheet, { backgroundColor: theme.bg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              🧠 记忆管理 ({entries.length})
            </Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.text2, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          {/* Settings */}
          <View style={[styles.settingsSection, { borderBottomColor: theme.border2 }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>启用记忆</Text>
                <Text style={{ color: theme.text3, fontSize: 11 }}>
                  自动提取用户信息以优化对话
                </Text>
              </View>
              <Switch
                value={settings.memoryEnabled}
                onValueChange={(v) => setMemoryEnabled(v)}
                trackColor={{ true: theme.accent }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>自动压缩</Text>
                <Text style={{ color: theme.text3, fontSize: 11 }}>
                  超出限制时自动压缩历史消息以减少 token
                </Text>
              </View>
              <Switch
                value={settings.memoryAutoCompact}
                onValueChange={(v) => setMemoryAutoCompact(v)}
                trackColor={{ true: theme.accent }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>压缩阈值</Text>
              <View style={styles.maxMsgRow}>
                {maxMsgOptions.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.maxMsgBtn,
                      {
                        backgroundColor: settings.memoryMaxMessages === n ? theme.accent : theme.bg3,
                      },
                    ]}
                    onPress={() => setMemoryMaxMessages(n)}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: settings.memoryMaxMessages === n ? '#fff' : theme.text2,
                      fontWeight: '600',
                    }}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Context Preview */}
          {contextPreview ? (
            <View style={[styles.preview, { backgroundColor: theme.bg3 }]}>
              <Text style={{ color: theme.text2, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                📝 当前注入的记忆上下文:
              </Text>
              <Text style={{ color: theme.text3, fontSize: 11, lineHeight: 16 }} numberOfLines={5}>
                {contextPreview}
              </Text>
            </View>
          ) : null}

          {/* Memory Entries */}
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: theme.text3, fontSize: 14 }}>暂无记忆条目</Text>
                <Text style={{ color: theme.text3, fontSize: 11, marginTop: 4 }}>
                  对话中提到的个人信息会自动提取到这里
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.entryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text3, fontSize: 10 }}>
                    {categoryLabel[item.category] || item.category}
                  </Text>
                  <Text style={[styles.entryKey, { color: theme.text }]}>{item.key}</Text>
                  <Text style={{ color: theme.text2, fontSize: 13 }}>{item.value}</Text>
                </View>
                <Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Text style={{ color: '#FF5555', fontSize: 18 }}>×</Text>
                </Pressable>
              </View>
            )}
          />

          {entries.length > 0 && (
            <Pressable style={[styles.clearBtn, { borderColor: '#FF5555' }]} onPress={handleClearAll}>
              <Text style={{ color: '#FF5555', fontWeight: '600' }}>🗑 清空所有记忆</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  sheetCenter: { borderRadius: 20, width: '70%', maxWidth: 600, maxHeight: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  settingsSection: { padding: 16, borderBottomWidth: 1 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  maxMsgRow: { flexDirection: 'row', gap: 6 },
  maxMsgBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  preview: { margin: 16, padding: 12, borderRadius: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  entryCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  entryKey: { fontSize: 14, fontWeight: '600', marginVertical: 2 },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  clearBtn: {
    margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', marginBottom: 30,
  },
});

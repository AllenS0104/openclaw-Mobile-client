import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal, TextInput,
  Switch, StyleSheet, Alert, FlatList, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { mcpManager } from '../utils/mcpClient';
import type { Theme } from '../theme';
import type { MCPServerConfig, MCPTool } from '../types';

interface Props {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
}

export function MCPManager({ theme, visible, onClose }: Props) {
  const { settings, addMCPServer, removeMCPServer, toggleMCPServer } = useSettingsStore();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const servers = settings.mcpServers || [];

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedTools, setConnectedTools] = useState<Map<string, MCPTool[]>>(new Map());

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) {
      Alert.alert('请填写名称和 URL');
      return;
    }
    addMCPServer({
      id: Date.now().toString(36),
      name: name.trim(),
      url: url.trim(),
      apiKey: apiKey.trim() || undefined,
      enabled: true,
    });
    setShowAdd(false);
    setName('');
    setUrl('');
    setApiKey('');
  };

  const handleConnect = async (server: MCPServerConfig) => {
    setConnecting(server.id);
    try {
      const result = await mcpManager.connect(server);
      setConnectedTools((prev) => {
        const next = new Map(prev);
        next.set(server.id, result.tools);
        return next;
      });
      Alert.alert('连接成功', `发现 ${result.tools.length} 个工具, ${result.resources.length} 个资源`);
    } catch (err: any) {
      Alert.alert('连接失败', err.message || '无法连接到 MCP 服务器');
    } finally {
      setConnecting(null);
    }
  };

  const handleRemove = (server: MCPServerConfig) => {
    Alert.alert('删除服务器', `确定删除 "${server.name}"？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: () => {
          mcpManager.disconnect(server.id);
          removeMCPServer(server.id);
        }
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType={isTablet ? 'fade' : 'slide'} transparent>
      <View style={isTablet ? styles.overlayCenter : styles.overlay}>
        <View style={[isTablet ? styles.sheetCenter : styles.sheet, { backgroundColor: theme.bg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
            <Text style={[styles.title, { color: theme.text }]}>🔌 MCP 服务器</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.text2, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          {showAdd ? (
            <View style={styles.form}>
              <Text style={[styles.label, { color: theme.text2 }]}>服务器名称</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
                value={name} onChangeText={setName} placeholder="My MCP Server"
                placeholderTextColor={theme.text3}
              />
              <Text style={[styles.label, { color: theme.text2 }]}>URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
                value={url} onChangeText={setUrl} placeholder="http://localhost:3000/mcp"
                placeholderTextColor={theme.text3} autoCapitalize="none"
              />
              <Text style={[styles.label, { color: theme.text2 }]}>API Key (可选)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
                value={apiKey} onChangeText={setApiKey} placeholder="可选 API Key"
                placeholderTextColor={theme.text3} secureTextEntry
              />
              <View style={styles.formActions}>
                <Pressable
                  style={[styles.btn, { backgroundColor: theme.bg3 }]}
                  onPress={() => setShowAdd(false)}
                >
                  <Text style={{ color: theme.text2 }}>取消</Text>
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleAdd}>
                  <Text style={{ color: '#fff' }}>添加</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Pressable
                style={[styles.addBtn, { borderColor: theme.accent }]}
                onPress={() => setShowAdd(true)}
              >
                <Text style={{ color: theme.accent, fontWeight: '600' }}>＋ 添加 MCP 服务器</Text>
              </Pressable>

              {servers.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={{ color: theme.text3 }}>还没有 MCP 服务器</Text>
                  <Text style={[styles.hint, { color: theme.text3 }]}>
                    MCP (Model Context Protocol) 允许 AI 连接到外部工具和数据源
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={servers}
                  keyExtractor={(s) => s.id}
                  contentContainerStyle={styles.list}
                  renderItem={({ item }) => {
                    const isConn = mcpManager.isConnected(item.id);
                    const tools = connectedTools.get(item.id) || [];
                    return (
                      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.cardHeader}>
                          <View style={[
                            styles.dot,
                            { backgroundColor: isConn ? '#4CAF50' : theme.text3 },
                          ]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.serverName, { color: theme.text }]}>{item.name}</Text>
                            <Text style={{ color: theme.text3, fontSize: 11 }} numberOfLines={1}>{item.url}</Text>
                          </View>
                          <Switch
                            value={item.enabled}
                            onValueChange={() => toggleMCPServer(item.id)}
                            trackColor={{ true: theme.accent }}
                          />
                        </View>

                        {tools.length > 0 && (
                          <View style={styles.toolList}>
                            <Text style={{ color: theme.text2, fontSize: 11, marginBottom: 4 }}>
                              🛠 {tools.length} 个工具:
                            </Text>
                            {tools.slice(0, 5).map((t) => (
                              <Text key={t.name} style={{ color: theme.text3, fontSize: 11 }}>
                                • {t.name}: {t.description?.substring(0, 50)}
                              </Text>
                            ))}
                            {tools.length > 5 && (
                              <Text style={{ color: theme.text3, fontSize: 11 }}>
                                还有 {tools.length - 5} 个...
                              </Text>
                            )}
                          </View>
                        )}

                        <View style={styles.cardActions}>
                          <Pressable
                            style={[styles.actionBtn, { backgroundColor: theme.accent + '20' }]}
                            onPress={() => handleConnect(item)}
                            disabled={connecting === item.id}
                          >
                            {connecting === item.id ? (
                              <ActivityIndicator size="small" color={theme.accent} />
                            ) : (
                              <Text style={{ color: theme.accent, fontSize: 13 }}>
                                {isConn ? '重新连接' : '连接'}
                              </Text>
                            )}
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, { backgroundColor: '#FF555520' }]}
                            onPress={() => handleRemove(item)}
                          >
                            <Text style={{ color: '#FF5555', fontSize: 13 }}>删除</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </>
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
  addBtn: {
    margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5,
    borderStyle: 'dashed', alignItems: 'center',
  },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  serverName: { fontSize: 15, fontWeight: '600' },
  toolList: { marginTop: 10, paddingLeft: 18 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  form: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14,
  },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});

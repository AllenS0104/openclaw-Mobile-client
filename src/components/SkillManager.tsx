import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal, FlatList, TextInput,
  Switch, StyleSheet, Alert, ScrollView, useWindowDimensions,
} from 'react-native';
import { useSkillStore } from '../store/skillStore';
import { useSettingsStore } from '../store/settingsStore';
import { getAvailableImageGenProviders, autoSelectImageGenProvider, type ImageGenProvider } from '../tools/imageGen';
import type { Theme } from '../theme';
import type { Skill } from '../types';

interface Props {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
}

export function SkillManager({ theme, visible, onClose }: Props) {
  const { skills, toggleSkill, addSkill, deleteSkill, updateSkill } = useSkillStore();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🛠');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  const handleSave = () => {
    if (!name.trim() || !systemPrompt.trim()) {
      Alert.alert('请填写名称和提示词');
      return;
    }
    if (editId) {
      updateSkill(editId, { name, icon, description, systemPrompt });
    } else {
      addSkill({ name, icon, description, systemPrompt, enabled: true });
    }
    resetForm();
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditId(null);
    setName('');
    setIcon('🛠');
    setDescription('');
    setSystemPrompt('');
  };

  const handleEdit = (skill: Skill) => {
    if (skill.builtIn) return;
    setEditId(skill.id);
    setName(skill.name);
    setIcon(skill.icon);
    setDescription(skill.description);
    setSystemPrompt(skill.systemPrompt);
    setShowAdd(true);
  };

  const handleDelete = (skill: Skill) => {
    Alert.alert('删除技能', `确定删除 "${skill.name}"？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteSkill(skill.id) },
    ]);
  };

  const enabledCount = skills.filter((s) => s.enabled).length;

  return (
    <Modal visible={visible} animationType={isTablet ? 'fade' : 'slide'} transparent>
      <View style={isTablet ? styles.overlayCenter : styles.overlay}>
        <View style={[isTablet ? styles.sheetCenter : styles.sheet, { backgroundColor: theme.bg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              🧩 技能管理 ({enabledCount} 已启用)
            </Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.text2, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          {/* Add/Edit Form */}
          {showAdd ? (
            <ScrollView style={styles.form}>
              <Text style={[styles.label, { color: theme.text2 }]}>图标</Text>
              <View style={styles.iconRow}>
                {['🛠', '🤖', '📝', '🧪', '🎨', '🔬', '📈', '🎯', '🧮', '💡'].map((e) => (
                  <Pressable
                    key={e}
                    style={[styles.iconPick, { backgroundColor: icon === e ? theme.accent + '30' : theme.bg3 }]}
                    onPress={() => setIcon(e)}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.label, { color: theme.text2 }]}>名称</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
                value={name} onChangeText={setName} placeholder="技能名称"
                placeholderTextColor={theme.text3}
              />
              <Text style={[styles.label, { color: theme.text2 }]}>描述</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
                value={description} onChangeText={setDescription} placeholder="简短描述"
                placeholderTextColor={theme.text3}
              />
              <Text style={[styles.label, { color: theme.text2 }]}>System Prompt</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
                value={systemPrompt} onChangeText={setSystemPrompt}
                placeholder="定义这个技能的 system prompt..."
                placeholderTextColor={theme.text3}
                multiline numberOfLines={6}
              />
              <View style={styles.formActions}>
                <Pressable style={[styles.btn, { backgroundColor: theme.bg3 }]} onPress={resetForm}>
                  <Text style={{ color: theme.text2 }}>取消</Text>
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleSave}>
                  <Text style={{ color: '#fff' }}>{editId ? '保存' : '添加'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <>
              <Pressable
                style={[styles.addBtn, { borderColor: theme.accent }]}
                onPress={() => setShowAdd(true)}
              >
                <Text style={{ color: theme.accent, fontWeight: '600' }}>＋ 添加自定义技能</Text>
              </Pressable>

              <FlatList
                data={skills}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isImageGen = item.id === 'image-gen';
                  const { settings, setImageGenProvider } = useSettingsStore.getState();
                  const availableImgProviders = isImageGen ? getAvailableImageGenProviders(settings.providers) : [];
                  const autoSelected = isImageGen ? autoSelectImageGenProvider(settings.providers, (settings.imageGenProvider || undefined) as ImageGenProvider | undefined) : null;

                  return (
                    <Pressable
                      style={[styles.skillCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onLongPress={() => item.builtIn ? null : handleDelete(item)}
                      onPress={() => handleEdit(item)}
                    >
                      <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                      <View style={styles.skillInfo}>
                        <Text style={[styles.skillName, { color: theme.text }]}>
                          {item.name}
                          {item.builtIn && <Text style={{ color: theme.text3, fontSize: 11 }}> (内置)</Text>}
                        </Text>
                        <Text style={[styles.skillDesc, { color: theme.text3 }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                        {/* Image gen: show available providers */}
                        {isImageGen && item.enabled && (
                          <View style={styles.imgProviderRow}>
                            {availableImgProviders.length > 0 ? (
                              availableImgProviders.map((p) => (
                                <Pressable
                                  key={p.id}
                                  style={[
                                    styles.imgProviderChip,
                                    { backgroundColor: autoSelected === p.id ? theme.accent + '30' : theme.bg3 },
                                  ]}
                                  onPress={() => setImageGenProvider(p.id)}
                                >
                                  <Text style={{ fontSize: 10, color: autoSelected === p.id ? theme.accent : theme.text3 }}>
                                    {p.label} {autoSelected === p.id ? '✓' : ''}
                                  </Text>
                                </Pressable>
                              ))
                            ) : (
                              <Text style={{ fontSize: 10, color: '#FF9800' }}>
                                ⚠ 需配置 OpenAI/千问/Gemini/MiniMax 任一 Key
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                      <Switch
                        value={item.enabled}
                        onValueChange={() => toggleSkill(item.id)}
                        trackColor={{ true: theme.accent }}
                      />
                    </Pressable>
                  );
                }}
                contentContainerStyle={styles.list}
              />
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
  skillCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12,
  },
  skillInfo: { flex: 1 },
  skillName: { fontSize: 15, fontWeight: '600' },
  skillDesc: { fontSize: 12, marginTop: 2 },
  imgProviderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  imgProviderChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  form: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14,
  },
  textArea: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, minHeight: 120, textAlignVertical: 'top',
  },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  iconPick: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 30 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});

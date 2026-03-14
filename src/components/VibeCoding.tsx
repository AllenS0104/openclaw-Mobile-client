import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  onSendToChat: (prompt: string) => void;
}

export function VibeCoding({ theme, visible, onClose, onSendToChat }: Props) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [description, setDescription] = useState('');
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const languages = [
    'typescript', 'javascript', 'python', 'java', 'go', 'rust',
    'swift', 'kotlin', 'html', 'css', 'sql', 'bash',
  ];

  const vibePrompts = [
    { label: '✨ 生成代码', prompt: (desc: string, lang: string) => `请用${lang}实现以下功能：\n${desc}` },
    { label: '🔍 解释代码', prompt: (_: string, lang: string, c: string) => `请解释以下${lang}代码：\n\`\`\`${lang}\n${c}\n\`\`\`` },
    { label: '🐛 找 Bug', prompt: (_: string, lang: string, c: string) => `请找出以下${lang}代码中的 bug 并修复：\n\`\`\`${lang}\n${c}\n\`\`\`` },
    { label: '⚡ 优化', prompt: (_: string, lang: string, c: string) => `请优化以下${lang}代码的性能和可读性：\n\`\`\`${lang}\n${c}\n\`\`\`` },
    { label: '📝 加注释', prompt: (_: string, lang: string, c: string) => `请为以下${lang}代码添加详细的中文注释：\n\`\`\`${lang}\n${c}\n\`\`\`` },
    { label: '🧪 写测试', prompt: (_: string, lang: string, c: string) => `请为以下${lang}代码编写单元测试：\n\`\`\`${lang}\n${c}\n\`\`\`` },
    { label: '🔄 重构', prompt: (_: string, lang: string, c: string) => `请重构以下${lang}代码，使其更符合最佳实践：\n\`\`\`${lang}\n${c}\n\`\`\`` },
  ];

  const handleVibe = (promptFn: (desc: string, lang: string, code: string) => string) => {
    const prompt = promptFn(description, language, code);
    onSendToChat(prompt);
    onClose();
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setCode(text);
  };

  return (
    <Modal visible={visible} animationType={isTablet ? 'fade' : 'slide'} transparent>
      <View style={[isTablet ? styles.overlayCenter : styles.overlay]}>
        <View style={[isTablet ? styles.containerCenter : styles.container, { backgroundColor: theme.bg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
            <Text style={[styles.title, { color: theme.text }]}>⚡ Vibe Coding</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.text2, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Language selector */}
            <Text style={[styles.label, { color: theme.text2 }]}>语言</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langRow}>
              {languages.map((lang) => (
                <Pressable
                  key={lang}
                  style={[styles.langChip, { backgroundColor: lang === language ? theme.accent : theme.bg3 }]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={{ color: lang === language ? '#fff' : theme.text2, fontSize: 12 }}>
                    {lang}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Description for generation */}
            <Text style={[styles.label, { color: theme.text2 }]}>需求描述 (生成代码用)</Text>
            <TextInput
              style={[styles.descInput, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
              placeholder="描述你想要的功能..."
              placeholderTextColor={theme.text3}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />

            {/* Code editor area */}
            <View style={styles.codeHeader}>
              <Text style={[styles.label, { color: theme.text2 }]}>代码 (粘贴或输入)</Text>
              <Pressable onPress={handlePaste} style={[styles.pasteBtn, { backgroundColor: theme.bg3 }]}>
                <Text style={{ color: theme.accent, fontSize: 12 }}>📋 粘贴</Text>
              </Pressable>
            </View>
            <TextInput
              style={[styles.codeInput, { backgroundColor: theme.bg3, borderColor: theme.border2, color: theme.text }]}
              placeholder={`// 粘贴你的 ${language} 代码...`}
              placeholderTextColor={theme.text3}
              value={code}
              onChangeText={setCode}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
              spellCheck={false}
            />

            {/* Vibe actions */}
            <Text style={[styles.label, { color: theme.text2, marginTop: 16 }]}>快捷操作</Text>
            <View style={styles.actionsGrid}>
              {vibePrompts.map((vp) => (
                <Pressable
                  key={vp.label}
                  style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleVibe(vp.prompt)}
                >
                  <Text style={[styles.actionText, { color: theme.text }]}>{vp.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  containerCenter: { borderRadius: 20, width: '75%', maxWidth: 640, maxHeight: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  langRow: { flexDirection: 'row', marginBottom: 8 },
  langChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
  descInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 50, textAlignVertical: 'top',
  },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pasteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  codeInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontFamily: 'monospace', minHeight: 150, textAlignVertical: 'top',
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 40 },
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  actionText: { fontSize: 13, fontWeight: '500' },
});

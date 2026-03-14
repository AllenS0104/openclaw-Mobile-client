import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ToolCard } from '../../src/components/ToolCard';
import { useSettingsStore } from '../../src/store/settingsStore';
import { getTheme } from '../../src/theme';
import { useLayout } from '../../src/utils/useLayout';
import { webSearch, fetchUrl } from '../../src/tools/webSearch';
import { translate, LANGUAGES } from '../../src/tools/translator';
import { generatePassword, evaluateStrength, type PasswordOptions } from '../../src/tools/passwordGen';

export default function ToolsScreen() {
  const { settings } = useSettingsStore();
  const theme = getTheme(settings.theme);
  const layout = useLayout();

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [result, setResult] = useState('');

  // Password Gen state
  const [pwOptions, setPwOptions] = useState<PasswordOptions>({
    length: 16,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  });
  const [generatedPw, setGeneratedPw] = useState('');

  // Web Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchUrlInput, setFetchUrlInput] = useState('');

  // Translate state
  const [translateText, setTranslateText] = useState('');
  const [targetLang, setTargetLang] = useState('en');

  const handleGenPassword = () => {
    const pw = generatePassword(pwOptions);
    setGeneratedPw(pw);
  };

  const tools = [
    {
      id: 'password',
      icon: '🔐',
      name: '密码生成器',
      description: '生成安全随机密码，可自定义长度和字符集',
    },
    {
      id: 'translate',
      icon: '🌐',
      name: '翻译助手',
      description: '快速翻译文本到多种语言',
    },
    {
      id: 'websearch',
      icon: '🔍',
      name: '网页搜索',
      description: '搜索网页或抓取URL内容',
    },
    {
      id: 'code',
      icon: '💻',
      name: 'Code Runner',
      description: '代码格式化和语法高亮显示',
    },
  ];

  const renderToolContent = () => {
    switch (activeTool) {
      case 'password': {
        const strength = generatedPw ? evaluateStrength(generatedPw) : null;
        return (
          <View style={styles.toolContent}>
            <Text style={[styles.toolTitle, { color: theme.text }]}>密码生成器</Text>

            <Text style={[styles.label, { color: theme.text2 }]}>长度: {pwOptions.length}</Text>
            <View style={styles.sliderRow}>
              {[8, 12, 16, 20, 24, 32].map((len) => (
                <Pressable
                  key={len}
                  style={[
                    styles.lenBtn,
                    {
                      backgroundColor: pwOptions.length === len ? theme.accent : theme.bg3,
                    },
                  ]}
                  onPress={() => setPwOptions({ ...pwOptions, length: len })}
                >
                  <Text style={{ color: pwOptions.length === len ? '#fff' : theme.text2, fontSize: 13 }}>
                    {len}
                  </Text>
                </Pressable>
              ))}
            </View>

            {(['lowercase', 'uppercase', 'numbers', 'symbols'] as const).map((key) => (
              <View key={key} style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>
                  {key === 'lowercase' ? '小写字母 (a-z)' :
                   key === 'uppercase' ? '大写字母 (A-Z)' :
                   key === 'numbers' ? '数字 (0-9)' : '特殊字符 (!@#$)'}
                </Text>
                <Switch
                  value={pwOptions[key]}
                  onValueChange={(v) => setPwOptions({ ...pwOptions, [key]: v })}
                  trackColor={{ true: theme.accent }}
                />
              </View>
            ))}

            <Pressable style={[styles.actionBtn, { backgroundColor: theme.accent }]} onPress={handleGenPassword}>
              <Text style={styles.actionBtnText}>生成密码</Text>
            </Pressable>

            {generatedPw ? (
              <View style={[styles.resultBox, { backgroundColor: theme.bg3 }]}>
                <Text style={[styles.resultText, { color: theme.text }]} selectable>
                  {generatedPw}
                </Text>
                {strength && (
                  <Text style={[styles.strengthText, { color: strength.color }]}>
                    强度: {strength.level}
                  </Text>
                )}
                <Pressable
                  style={[styles.copyBtn, { backgroundColor: theme.accent }]}
                  onPress={() => {
                    Clipboard.setStringAsync(generatedPw);
                    Alert.alert('已复制');
                  }}
                >
                  <Text style={styles.copyBtnText}>📋 复制</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      }

      case 'translate':
        return (
          <View style={styles.toolContent}>
            <Text style={[styles.toolTitle, { color: theme.text }]}>翻译助手</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
              placeholder="输入要翻译的文本..."
              placeholderTextColor={theme.text3}
              value={translateText}
              onChangeText={setTranslateText}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.label, { color: theme.text2, marginTop: 10 }]}>目标语言</Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.langBtn,
                    { backgroundColor: targetLang === lang.code ? theme.accent : theme.bg3 },
                  ]}
                  onPress={() => setTargetLang(lang.code)}
                >
                  <Text style={{ color: targetLang === lang.code ? '#fff' : theme.text2, fontSize: 13 }}>
                    {lang.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
              onPress={async () => {
                if (!translateText.trim()) return;
                const r = await translate(translateText, targetLang);
                setResult(r);
              }}
            >
              <Text style={styles.actionBtnText}>翻译</Text>
            </Pressable>
            {result ? (
              <View style={[styles.resultBox, { backgroundColor: theme.bg3 }]}>
                <Text style={[styles.resultText, { color: theme.text }]} selectable>{result}</Text>
              </View>
            ) : null}
          </View>
        );

      case 'websearch':
        return (
          <View style={styles.toolContent}>
            <Text style={[styles.toolTitle, { color: theme.text }]}>网页搜索</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
              placeholder="搜索关键词..."
              placeholderTextColor={theme.text3}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
              onPress={async () => {
                if (!searchQuery.trim()) return;
                const r = await webSearch(searchQuery);
                setResult(r);
              }}
            >
              <Text style={styles.actionBtnText}>搜索</Text>
            </Pressable>

            <Text style={[styles.label, { color: theme.text2, marginTop: 16 }]}>或直接获取网页内容</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border2, color: theme.text }]}
              placeholder="https://example.com"
              placeholderTextColor={theme.text3}
              value={fetchUrlInput}
              onChangeText={setFetchUrlInput}
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.cyan }]}
              onPress={async () => {
                if (!fetchUrlInput.trim()) return;
                setResult('正在获取...');
                const r = await fetchUrl(fetchUrlInput);
                setResult(r);
              }}
            >
              <Text style={styles.actionBtnText}>获取内容</Text>
            </Pressable>

            {result ? (
              <View style={[styles.resultBox, { backgroundColor: theme.bg3 }]}>
                <Text style={[styles.resultText, { color: theme.text }]} selectable>{result}</Text>
              </View>
            ) : null}
          </View>
        );

      case 'code':
        return (
          <View style={styles.toolContent}>
            <Text style={[styles.toolTitle, { color: theme.text }]}>Code Runner</Text>
            <Text style={[styles.label, { color: theme.text2 }]}>
              在聊天中发送代码给 AI，它会帮你分析、解释和修改代码。
            </Text>
            <Text style={[styles.label, { color: theme.text2, marginTop: 8 }]}>
              支持的语言：JavaScript, TypeScript, Python, Java, C++, Go, Rust, SQL 等。
            </Text>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.accent, marginTop: 16 }]}
              onPress={() => setActiveTool(null)}
            >
              <Text style={styles.actionBtnText}>去聊天试试</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>工具箱</Text>
      </View>

      <Modal visible={activeTool !== null} transparent animationType={layout.isTablet ? 'fade' : 'slide'}>
        <View style={[layout.isTablet ? styles.modalOverlayCenter : styles.modalOverlay]}>
          <View style={[
            layout.isTablet ? styles.modalSheetCenter : styles.modalSheet,
            { backgroundColor: theme.bg },
          ]}>
            <Pressable style={styles.closeBtn} onPress={() => { setActiveTool(null); setResult(''); }}>
              <Text style={{ color: theme.text2, fontSize: 16 }}>✕ 关闭</Text>
            </Pressable>
            <ScrollView>{renderToolContent()}</ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={layout.columns > 1 ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : undefined}>
          {tools.map((tool) => (
            <View key={tool.id} style={layout.columns > 1 ? { width: `${Math.floor(100 / layout.columns) - 2}%` as any } : undefined}>
              <ToolCard
                icon={tool.icon}
                name={tool.name}
                description={tool.description}
                theme={theme}
                onPress={() => setActiveTool(tool.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  list: { padding: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  modalSheetCenter: { borderRadius: 20, width: '70%', maxWidth: 600, maxHeight: '80%', padding: 24 },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  toolContent: { paddingBottom: 40 },
  toolTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, height: 100, textAlignVertical: 'top' },
  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultBox: { marginTop: 16, padding: 14, borderRadius: 12 },
  resultText: { fontSize: 14, lineHeight: 20 },
  sliderRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  lenBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { fontSize: 14 },
  strengthText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  copyBtn: { marginTop: 10, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  copyBtnText: { color: '#fff', fontSize: 14 },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});

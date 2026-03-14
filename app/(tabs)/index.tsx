import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatBubble } from '../../src/components/ChatBubble';
import { ChatInput } from '../../src/components/ChatInput';
import { ModelSelector } from '../../src/components/ModelSelector';
import { VibeCoding } from '../../src/components/VibeCoding';
import { useChatStore } from '../../src/store/chatStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSkillStore } from '../../src/store/skillStore';
import { getProvider, PROVIDERS } from '../../src/providers';
import { getTheme } from '../../src/theme';
import { generateId } from '../../src/utils/stream';
import { useLayout } from '../../src/utils/useLayout';
import { useVoice } from '../../src/utils/useVoice';
import {
  loadMemory, buildMemoryContext, compactMessages,
  extractMemoryFromMessage, addMemoryEntry,
} from '../../src/utils/memory';
import { mcpManager } from '../../src/utils/mcpClient';
import { parseImageGenTags, generateImage, replaceImageGenTags, type ImageGenProvider } from '../../src/tools/imageGen';
import type { Message } from '../../src/types';

export default function ChatScreen() {
  const { settings, setActiveProvider, setProviderConfig, getActiveProviderSettings } = useSettingsStore();
  const {
    conversations,
    activeConversationId,
    createConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    setMessageStreaming,
    getActiveConversation,
  } = useChatStore();

  const theme = getTheme(settings.theme);
  const layout = useLayout();
  const voice = useVoice();
  const { getSkillSystemPrompt, loadSkills } = useSkillStore();
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVibeCoding, setShowVibeCoding] = useState(false);

  useEffect(() => { loadSkills(); loadMemory(); }, []);

  const conversation = getActiveConversation();
  const providerSettings = getActiveProviderSettings();
  const providerConfig = PROVIDERS[settings.activeProvider];

  const currentModel = providerSettings.selectedModel || providerConfig.models[0].id;
  const modelInfo = providerConfig.models.find((m) => m.id === currentModel);
  const supportsVision = modelInfo?.supportsVision || false;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(
    async (text: string, images?: string[]) => {
      if (!providerSettings.apiKey) {
        alert('请先在设置页配置 API Key');
        return;
      }

      let convId = activeConversationId;
      if (!convId) {
        convId = createConversation(settings.activeProvider, currentModel);
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        images,
        timestamp: Date.now(),
      };
      addMessage(convId, userMessage);

      const assistantId = generateId();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      addMessage(convId, assistantMessage);

      setIsStreaming(true);
      scrollToBottom();

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const provider = getProvider(settings.activeProvider);
        const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
        const allMessages: Message[] = [];

        // Build system prompt: base + model identity + skills + memory
        const systemParts: string[] = [];

        // Inject model identity so the model correctly self-identifies
        const modelDisplayName = modelInfo?.name || currentModel;
        const providerName = providerConfig.name;
        systemParts.push(
          `You are ${modelDisplayName}, provided by ${providerName}. ` +
          `When asked about your identity or model version, always respond that you are ${modelDisplayName}. ` +
          `Current date: ${new Date().toISOString().split('T')[0]}.`
        );

        if (conv?.systemPrompt) systemParts.push(conv.systemPrompt);
        const skillPrompt = getSkillSystemPrompt();
        if (skillPrompt) systemParts.push(skillPrompt);
        if (settings.memoryEnabled) {
          const memCtx = buildMemoryContext();
          if (memCtx) systemParts.push(memCtx);
        }
        if (systemParts.length > 0) {
          allMessages.push({
            id: 'system',
            role: 'system',
            content: systemParts.join('\n\n'),
            timestamp: 0,
          });
        }

        // Apply memory compaction if enabled
        let chatMessages = conv?.messages || [];
        if (settings.memoryEnabled && settings.memoryAutoCompact) {
          const { compacted } = compactMessages(chatMessages, settings.memoryMaxMessages);
          chatMessages = compacted;
        }
        allMessages.push(...chatMessages);

        // Extract memory from user message
        if (settings.memoryEnabled && convId) {
          const extracted = extractMemoryFromMessage(userMessage, convId);
          extracted.forEach((e) => addMemoryEntry(e));
        }

        let accumulated = '';

        await provider.sendMessage(
          providerSettings.apiKey,
          providerSettings.endpoint,
          currentModel,
          allMessages.filter((m) => !m.isStreaming),
          {
            onToken: (token) => {
              accumulated += token;
              updateMessage(convId!, assistantId, accumulated);
              scrollToBottom();
            },
            onDone: () => {
              setMessageStreaming(convId!, assistantId, false);
              setIsStreaming(false);
              abortRef.current = null;

              // Post-process: handle [IMG_GEN] tags only when image-gen skill is enabled
              const imageGenSkillEnabled = useSkillStore.getState().skills.some(
                (s) => s.id === 'image-gen' && s.enabled
              );
              const imgTags = imageGenSkillEnabled ? parseImageGenTags(accumulated) : [];
              if (imgTags.length > 0) {
                const currentProviders = useSettingsStore.getState().settings.providers;
                const preferredImgProvider = (useSettingsStore.getState().settings.imageGenProvider || undefined) as ImageGenProvider | undefined;
                (async () => {
                  try {
                    const urls: string[] = [];
                    for (const tag of imgTags) {
                      const result = await generateImage(tag, currentProviders, preferredImgProvider);
                      urls.push(result.url);
                    }
                    const updated = replaceImageGenTags(accumulated, urls);
                    updateMessage(convId!, assistantId, updated);
                  } catch (err: any) {
                    const updated = accumulated + `\n\n⚠️ ${err.message}`;
                    updateMessage(convId!, assistantId, updated);
                  }
                })();
              }
            },
            onError: (error) => {
              updateMessage(convId!, assistantId, `❌ 错误: ${error.message}`);
              setMessageStreaming(convId!, assistantId, false);
              setIsStreaming(false);
              abortRef.current = null;
            },
          },
          abortController.signal,
        );
      } catch (error: any) {
        updateMessage(convId, assistantId, `❌ 错误: ${error.message}`);
        setMessageStreaming(convId, assistantId, false);
        setIsStreaming(false);
      }
    },
    [activeConversationId, settings.activeProvider, currentModel, providerSettings],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleNewChat = useCallback(() => {
    useChatStore.getState().setActiveConversation(null);
  }, []);

  // Voice: start recording
  const handleStartRecording = useCallback(async () => {
    try {
      await voice.startRecording();
    } catch (e: any) {
      Alert.alert('录音失败', e.message);
    }
  }, [voice]);

  // Voice: stop recording and transcribe
  const handleStopRecording = useCallback(async () => {
    try {
      const audioBase64 = await voice.stopRecording();
      if (!audioBase64) return;
      if (!providerSettings.apiKey) {
        Alert.alert('提示', '需要 API Key 才能进行语音转文字');
        return;
      }
      const text = await voice.transcribe(audioBase64, providerSettings.apiKey, providerSettings.endpoint);
      if (text) handleSend(text);
    } catch (e: any) {
      Alert.alert('转录失败', e.message);
    }
  }, [voice, providerSettings, handleSend]);

  // Vibe Coding: send generated prompt to chat
  const handleVibeCodeSend = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

  const messages = conversation?.messages || [];

  const contentMaxWidth = layout.isTablet ? 720 : undefined;
  const adaptiveStyle = contentMaxWidth
    ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
    : {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border2 }, adaptiveStyle]}>
        <Pressable onPress={handleNewChat} style={styles.newChatBtn}>
          <Text style={{ color: theme.accent, fontSize: 22 }}>✚</Text>
        </Pressable>
        <ModelSelector
          theme={theme}
          activeProvider={settings.activeProvider}
          selectedModel={currentModel}
          onSelectProvider={setActiveProvider}
          onSelectModel={(modelId) => setProviderConfig(settings.activeProvider, { selectedModel: modelId })}
        />
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon]}>🐾</Text>
            <Text style={[styles.emptyTitle, { color: theme.text, fontSize: layout.fontSize.xl }]}>OpenClaw</Text>
            <Text style={[styles.emptySubtitle, { color: theme.text3, fontSize: layout.fontSize.md }]}>
              多模型 AI 助手，开始对话吧
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                theme={theme}
                onDelete={() => {
                  if (conversation) deleteMessage(conversation.id, item.id);
                }}
                onSpeak={voice.speak}
                isSpeaking={voice.isSpeaking}
                onStopSpeaking={voice.stopSpeaking}
              />
            )}
            contentContainerStyle={[styles.messageList, adaptiveStyle]}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {/* Input */}
        <View style={adaptiveStyle}>
          <ChatInput
            theme={theme}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            supportsVision={supportsVision}
            isRecording={voice.isRecording}
            recordingDuration={voice.recordingDuration}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onCancelRecording={voice.cancelRecording}
            onVibeCode={() => setShowVibeCoding(true)}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Vibe Coding Modal */}
      <VibeCoding
        theme={theme}
        visible={showVibeCoding}
        onClose={() => setShowVibeCoding(false)}
        onSendToChat={handleVibeCodeSend}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  newChatBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
  },
  messageList: {
    paddingVertical: 12,
  },
});

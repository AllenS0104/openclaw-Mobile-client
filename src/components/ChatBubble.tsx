import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';
import type { Message } from '../types';
import type { Theme } from '../theme';

interface Props {
  message: Message;
  theme: Theme;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
}

export function ChatBubble({ message, theme, onDelete, onRegenerate, onSpeak, isSpeaking, onStopSpeaking }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  const handleLongPress = () => {
    Alert.alert('消息操作', undefined, [
      {
        text: '复制',
        onPress: () => Clipboard.setStringAsync(message.content),
      },
      ...(message.role === 'assistant' && onSpeak
        ? [{ text: isSpeaking ? '⏹ 停止朗读' : '🔊 朗读', onPress: () => isSpeaking ? onStopSpeaking?.() : onSpeak(message.content) }]
        : []),
      ...(message.role === 'assistant' && onRegenerate
        ? [{ text: '重新生成', onPress: onRegenerate }]
        : []),
      ...(onDelete
        ? [{ text: '删除', style: 'destructive' as const, onPress: onDelete }]
        : []),
      { text: '取消', style: 'cancel' as const },
    ]);
  };

  const markdownStyles = {
    body: { color: isUser ? theme.userBubbleText : theme.aiBubbleText, fontSize: 15, lineHeight: 22 },
    code_inline: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.bg3,
      color: isUser ? theme.userBubbleText : theme.accent,
      paddingHorizontal: 4,
      borderRadius: 3,
      fontSize: 13,
    },
    code_block: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : theme.bg3,
      padding: 10,
      borderRadius: 8,
      fontSize: 13,
    },
    fence: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : theme.bg3,
      padding: 10,
      borderRadius: 8,
      fontSize: 13,
      color: isUser ? theme.userBubbleText : theme.text,
    },
    link: { color: isUser ? '#fff' : theme.cyan },
    blockquote: {
      borderLeftColor: theme.accent,
      borderLeftWidth: 3,
      paddingLeft: 10,
      backgroundColor: 'transparent',
    },
  };

  return (
    <Pressable onLongPress={handleLongPress} style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: theme.accent + '20' }]}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.userBubble, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.aiBubble, borderBottomLeftRadius: 4 },
        ]}
      >
        {message.images?.map((img, i) => (
          <Image
            key={i}
            source={{ uri: `data:image/jpeg;base64,${img}` }}
            style={styles.image}
            resizeMode="cover"
          />
        ))}
        <Markdown style={markdownStyles}>{message.content || (message.isStreaming ? '●' : '')}</Markdown>
      </View>
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: theme.cyan + '20' }]}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
  },
});

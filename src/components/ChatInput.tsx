import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  onSend: (text: string, images?: string[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  supportsVision?: boolean;
  // Voice
  isRecording?: boolean;
  recordingDuration?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  // Vibe Coding
  onVibeCode?: () => void;
}

export function ChatInput({
  theme, onSend, onStop, isStreaming, supportsVision,
  isRecording, recordingDuration, onStartRecording, onStopRecording, onCancelRecording,
  onVibeCode,
}: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    onSend(trimmed, images.length > 0 ? images : undefined);
    setText('');
    setImages([]);
  };

  const handlePaste = async () => {
    const clipText = await Clipboard.getStringAsync();
    if (clipText) setText((prev) => prev + clipText);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImages((prev) => [...prev, result.assets[0].base64!]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Recording UI
  if (isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: theme.glass, borderTopColor: theme.border2 }]}>
        <View style={styles.recordingRow}>
          <View style={[styles.recordingDot, { backgroundColor: theme.red }]} />
          <Text style={[styles.recordingTime, { color: theme.red }]}>
            录音中 {formatDuration(recordingDuration || 0)}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable style={[styles.iconBtn, { backgroundColor: theme.bg3 }]} onPress={onCancelRecording}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
          <Pressable style={[styles.sendBtn, { backgroundColor: theme.green }]} onPress={onStopRecording}>
            <Text style={styles.sendText}>✓</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.glass, borderTopColor: theme.border2 }]}>
      {images.length > 0 && (
        <View style={styles.imagePreviewRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.imagePreview}>
              <Pressable style={styles.removeImage} onPress={() => removeImage(i)}>
                <Text style={styles.removeImageText}>✕</Text>
              </Pressable>
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.bg3 }]}>
                <Text>🖼</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={styles.inputRow}>
        {/* Image picker */}
        {supportsVision && (
          <Pressable style={[styles.iconBtn, { backgroundColor: theme.bg3 }]} onPress={handlePickImage}>
            <Text style={styles.iconText}>📷</Text>
          </Pressable>
        )}
        {/* Vibe Coding button */}
        {onVibeCode && (
          <Pressable style={[styles.iconBtn, { backgroundColor: theme.bg3 }]} onPress={onVibeCode}>
            <Text style={styles.iconText}>⚡</Text>
          </Pressable>
        )}
        {/* Text input */}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border2,
            },
          ]}
          placeholder="输入消息..."
          placeholderTextColor={theme.text3}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={10000}
          onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
        />
        {/* Voice record button */}
        {onStartRecording && !text.trim() && images.length === 0 ? (
          <Pressable style={[styles.iconBtn, { backgroundColor: theme.bg3 }]} onPress={onStartRecording}>
            <Text style={styles.iconText}>🎙</Text>
          </Pressable>
        ) : null}
        {/* Send / Stop */}
        {isStreaming ? (
          <Pressable style={[styles.sendBtn, { backgroundColor: theme.red }]} onPress={onStop}>
            <Text style={styles.sendText}>⏹</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: text.trim() || images.length ? 1 : 0.5 }]}
            onPress={handleSend}
            disabled={!text.trim() && images.length === 0}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  imagePreview: {
    position: 'relative',
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImage: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
  },
});

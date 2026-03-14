import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';

export interface VoiceState {
  isRecording: boolean;
  isSpeaking: boolean;
  recordingDuration: number;
}

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('需要麦克风权限');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      durationRef.current = 0;
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (error: any) {
      throw new Error(`录音失败: ${error.message}`);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        // Read audio as base64 for potential whisper API usage
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }
      return null;
    } catch (error: any) {
      recordingRef.current = null;
      throw new Error(`停止录音失败: ${error.message}`);
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  // TTS - speak AI response aloud
  const speak = useCallback((text: string, language: string = 'zh-CN') => {
    // Strip markdown formatting for cleaner speech
    const cleaned = text
      .replace(/```[\s\S]*?```/g, '代码块已省略')
      .replace(/`[^`]+`/g, (match) => match.replace(/`/g, ''))
      .replace(/[#*_~>\[\]()!]/g, '')
      .replace(/\n+/g, '。')
      .trim();

    if (!cleaned) return;

    setIsSpeaking(true);
    Speech.speak(cleaned, {
      language,
      rate: Platform.OS === 'ios' ? 0.52 : 0.95,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  // Transcribe audio via OpenAI Whisper API
  const transcribe = useCallback(async (
    audioBase64: string,
    apiKey: string,
    endpoint?: string,
  ): Promise<string> => {
    if (!audioBase64 || !audioBase64.trim()) {
      throw new Error('录音数据为空');
    }

    const url = endpoint
      ? endpoint.replace(/\/chat\/completions$/, '/audio/transcriptions')
      : 'https://api.openai.com/v1/audio/transcriptions';

    // Create form data with audio file
    const formData = new FormData();
    formData.append('file', {
      uri: `data:audio/m4a;base64,${audioBase64}`,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('language', 'zh');

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`转录失败: ${err}`);
    }

    const result = await response.json();
    return result.text || '';
  }, []);

  return {
    isRecording,
    isSpeaking,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    speak,
    stopSpeaking,
    transcribe,
  };
}

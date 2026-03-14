import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { PROVIDERS } from '../providers/base';
import type { ProviderId, ModelInfo } from '../types';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  activeProvider: ProviderId;
  selectedModel: string;
  onSelectProvider: (id: ProviderId) => void;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({ theme, activeProvider, selectedModel, onSelectProvider, onSelectModel }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const provider = PROVIDERS[activeProvider];
  const model = provider.models.find((m) => m.id === selectedModel) || provider.models[0];

  return (
    <>
      <Pressable style={[styles.selector, { backgroundColor: theme.bg2, borderColor: theme.border2 }]} onPress={() => setShowModal(true)}>
        <Text style={[styles.selectorIcon]}>{provider.icon}</Text>
        <Text style={[styles.selectorText, { color: theme.text }]} numberOfLines={1}>
          {model.name}
        </Text>
        <Text style={{ color: theme.text3 }}>▾</Text>
      </Pressable>

      <Modal visible={showModal} transparent animationType={isTablet ? 'fade' : 'slide'}>
        <Pressable style={isTablet ? styles.overlayCenter : styles.overlay} onPress={() => setShowModal(false)}>
          <View style={[isTablet ? styles.sheetCenter : styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>选择模型</Text>

            {/* Provider tabs */}
            <View style={styles.providerTabs}>
              {(Object.keys(PROVIDERS) as ProviderId[]).map((pid) => (
                <Pressable
                  key={pid}
                  style={[
                    styles.providerTab,
                    {
                      backgroundColor: pid === activeProvider ? theme.accent : theme.bg3,
                    },
                  ]}
                  onPress={() => onSelectProvider(pid)}
                >
                  <Text style={{ fontSize: 16 }}>{PROVIDERS[pid].icon}</Text>
                  <Text
                    style={[
                      styles.providerTabText,
                      { color: pid === activeProvider ? '#fff' : theme.text2 },
                    ]}
                    numberOfLines={1}
                  >
                    {PROVIDERS[pid].name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Models */}
            <FlatList
              data={PROVIDERS[activeProvider].models}
              keyExtractor={(item) => item.id}
              renderItem={({ item }: { item: ModelInfo }) => (
                <Pressable
                  style={[
                    styles.modelItem,
                    {
                      backgroundColor: item.id === selectedModel ? theme.accent + '15' : 'transparent',
                      borderColor: item.id === selectedModel ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => {
                    onSelectModel(item.id);
                    setShowModal(false);
                  }}
                >
                  <Text style={[styles.modelName, { color: theme.text }]}>{item.name}</Text>
                  {item.supportsVision && (
                    <Text style={[styles.badge, { backgroundColor: theme.cyan + '20', color: theme.cyan }]}>
                      👁 Vision
                    </Text>
                  )}
                  {item.id === selectedModel && <Text style={{ color: theme.accent }}>✓</Text>}
                </Pressable>
              )}
              style={styles.modelList}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  selectorIcon: {
    fontSize: 16,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 120,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  sheetCenter: {
    borderRadius: 20,
    padding: 24,
    width: '65%',
    maxWidth: 560,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  providerTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  providerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  providerTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modelList: {
    maxHeight: 300,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  modelName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

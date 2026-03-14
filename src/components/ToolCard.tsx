import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Theme } from '../theme';

interface Props {
  icon: string;
  name: string;
  description: string;
  theme: Theme;
  onPress: () => void;
}

export function ToolCard({ icon, name, description, theme, onPress }: Props) {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.accent + '15' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        <Text style={[styles.desc, { color: theme.text3 }]} numberOfLines={2}>
          {description}
        </Text>
      </View>
      <Text style={{ color: theme.text3, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
  },
});

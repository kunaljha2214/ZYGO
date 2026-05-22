import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GlassCard } from '../neon/GlassCard';
import { ProfileMenuRow } from './ProfileMenuRow';
import type { ProfileMenuItem } from '../../config/profileMenu';

type Props = {
  items: ProfileMenuItem[];
  onItemPress: (id: ProfileMenuItem['id']) => void;
};

export function ProfileMenuList({ items, onItemPress }: Props) {
  return (
    <GlassCard style={styles.card} noPadding>
      <View style={styles.inner}>
        {items.map((item, index) => (
          <ProfileMenuRow
            key={item.id}
            icon={item.icon}
            label={item.label}
            subtitle={item.subtitle}
            showChevron={item.showChevron !== false}
            onPress={() => onItemPress(item.id)}
            isLast={index === items.length - 1}
          />
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  inner: { paddingHorizontal: 16, paddingVertical: 4 },
});

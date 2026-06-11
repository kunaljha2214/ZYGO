import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  accessibilityLabel?: string;
};

export function GlassCard({ children, onPress, active, style, noPadding, accessibilityLabel }: Props) {
  const inner = (
    <View style={[styles.card, active && styles.cardActive, noPadding && styles.noPad, style]}>
      <View style={styles.shine} pointerEvents="none" />
      <View style={styles.edgeGlow} pointerEvents="none" />
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    overflow: 'hidden',
  },
  noPad: { padding: 0 },
  cardActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '30%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  edgeGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primarySoft,
    opacity: 0.35,
  },
  pressed: { opacity: 0.94 },
});

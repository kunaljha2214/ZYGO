import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radii } from '../theme';

type Props = {
  icon: string;
  title: string;
  description: string;
  meta?: string;
  active?: boolean;
  onPress: () => void;
};

export function ServiceTile({ icon, title, description, meta, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        active && styles.wrapActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.shine} pointerEvents="none" />
      <View style={[styles.iconRing, active && styles.iconRingActive]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <View style={[styles.arrow, active && styles.arrowActive]}>
        <Text style={styles.arrowText}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
    gap: 14,
  },
  wrapActive: {
    borderColor: 'rgba(168, 85, 247, 0.55)',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingActive: {
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(168, 85, 247, 0.45)',
  },
  icon: { fontSize: 26 },
  body: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  meta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryBright,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowActive: { backgroundColor: colors.primary },
  arrowText: { fontSize: 18, fontWeight: '700', color: colors.lavender },
});

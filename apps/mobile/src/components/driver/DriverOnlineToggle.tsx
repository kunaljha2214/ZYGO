import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  online: boolean;
  busy?: boolean;
  onToggle: (value: boolean) => void;
};

export function DriverOnlineToggle({ online, busy, onToggle }: Props) {
  return (
    <View style={[styles.wrap, online && styles.wrapOn]}>
      <View style={styles.dotRow}>
        <View style={[styles.dot, online && styles.dotOn]} />
        <Text style={styles.label}>{online ? 'You are online' : 'You are offline'}</Text>
      </View>
      <Switch
        value={online}
        onValueChange={onToggle}
        disabled={busy}
        trackColor={{ false: colors.chip, true: colors.primary }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  wrapOn: {
    borderColor: colors.primary,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  dotOn: { backgroundColor: '#4ade80' },
  label: { color: colors.text, fontWeight: '800', fontSize: 16 },
});

import React from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  online: boolean;
  pending?: boolean;
  onToggle: (value: boolean) => void;
};

export function DriverOnlineToggle({ online, pending, onToggle }: Props) {
  return (
    <View style={[styles.wrap, online && styles.wrapOn]}>
      <View style={styles.dotRow}>
        <View style={[styles.dot, online && styles.dotOn]} />
        <Text style={styles.label}>{online ? 'You are online' : 'You are offline'}</Text>
        {pending ? <ActivityIndicator size="small" color={colors.primaryBright} /> : null}
      </View>
      <Switch
        value={online}
        onValueChange={onToggle}
        trackColor={{ false: colors.chip, true: colors.primary }}
        thumbColor={colors.text}
        accessibilityLabel={online ? 'Go offline' : 'Go online for rides'}
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
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  dotOn: { backgroundColor: '#4ade80' },
  label: { color: colors.text, fontWeight: '800', fontSize: 16, flexShrink: 1 },
});

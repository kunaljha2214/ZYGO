import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  label: string;
  value: string;
  accent?: string;
  wide?: boolean;
};

export function MetricCard({ label, value, accent, wide }: Props) {
  return (
    <View style={[styles.card, wide && styles.wide]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
  },
  wide: { minWidth: '100%' },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

type Bar = { label: string; value: number };

type Props = {
  title: string;
  data: Bar[];
  valuePrefix?: string;
};

export function MiniBarChart({ title, data, valuePrefix = '' }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chart}>
        {data.map((d) => (
          <View key={d.label} style={styles.col}>
            <Text style={styles.val} numberOfLines={1}>
              {d.value > 0 ? `${valuePrefix}${d.value}` : '—'}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: Math.max(4, (d.value / max) * 72) }]} />
            </View>
            <Text style={styles.lbl} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 120,
  },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  val: { fontSize: 9, color: colors.textMuted, marginBottom: 4 },
  barTrack: {
    width: '100%',
    height: 72,
    backgroundColor: colors.inputBg,
    borderRadius: radii.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    minHeight: 4,
  },
  lbl: { fontSize: 9, color: colors.textSecondary, marginTop: 6, fontWeight: '600' },
});

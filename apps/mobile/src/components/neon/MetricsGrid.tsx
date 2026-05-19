import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

export type MetricItem = { label: string; value: string };

type Props = {
  title: string;
  headline: string;
  items: MetricItem[];
};

export function MetricsGrid({ title, headline, items }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.cell}>
            <Text style={styles.cellLabel} numberOfLines={2}>
              {item.label}
            </Text>
            <Text style={styles.cellValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    overflow: 'hidden',
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  cell: { flex: 1 },
  cellLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 4,
    lineHeight: 12,
  },
  cellValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
  },
});

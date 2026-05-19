import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

type Bar = { label: string; value: number; highlight?: boolean };

type Props = {
  title?: string;
  subtitle?: string;
  bars: Bar[];
  highlightLabel?: string;
};

export function ActivityBars({
  title = 'Your activity',
  subtitle = 'Orders',
  bars,
  highlightLabel,
}: Props) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
      <View style={styles.chart}>
        {bars.map((bar, i) => {
          const h = Math.max(14, (bar.value / max) * 76);
          const active = bar.highlight;
          return (
            <View key={i} style={styles.col}>
              {active && highlightLabel ? (
                <View style={styles.badgeWrap}>
                  <Text style={styles.badge}>{highlightLabel}</Text>
                </View>
              ) : (
                <View style={styles.badgeSpacer} />
              )}
              <View
                style={[
                  styles.bar,
                  { height: h },
                  active ? styles.barActive : styles.barMuted,
                ]}
              />
              <Text style={styles.barLabel}>{bar.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 108,
  },
  col: { flex: 1, alignItems: 'center' },
  badgeWrap: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  badge: { fontSize: 10, fontWeight: '800', color: colors.primaryBright },
  badgeSpacer: { height: 22 },
  bar: {
    width: '70%',
    maxWidth: 28,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barMuted: { backgroundColor: 'rgba(255,255,255,0.06)' },
  barActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 6,
  },
  barLabel: { fontSize: 10, color: colors.textMuted, marginTop: 8, fontWeight: '600' },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../neon/GlassCard';
import { colors, radii, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';

type Props = {
  kind: 'food' | 'ride';
  title: string;
  amount: number;
  status: string;
  onPress: () => void;
};

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'delivered') {
    return { chip: styles.chipDone, text: styles.chipTextDone };
  }
  if (s === 'cancelled' || s === 'rejected') {
    return { chip: styles.chipCancelled, text: styles.chipTextCancelled };
  }
  if (s === 'requested' || s === 'dispatching' || s === 'placed' || s === 'confirmed') {
    return { chip: styles.chipActive, text: styles.chipTextActive };
  }
  return { chip: styles.chipDefault, text: styles.chipTextDefault };
}

function kindIcon(kind: 'food' | 'ride') {
  return kind === 'food' ? '🍔' : '🛵';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export function OrderListCard({ kind, title, amount, status, onPress }: Props) {
  const chip = statusStyle(status);
  const kindLabel = kind === 'food' ? 'Food' : 'Ride';

  return (
    <GlassCard
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${kindLabel} order ${title}, ${formatInr(amount)}, ${formatStatus(status)}`}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{kindIcon(kind)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {kindLabel} · {title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.amount}>{formatInr(amount)}</Text>
            <Text style={styles.dot}>·</Text>
            <View style={[styles.chip, chip.chip]}>
              <Text style={[styles.chipText, chip.text]}>{formatStatus(status)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  body: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  amount: { color: colors.lavender, fontWeight: '700', fontSize: 14 },
  dot: { color: colors.textMuted, fontSize: 14 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  chipDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  chipTextDone: { color: '#4ade80' },
  chipCancelled: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  chipTextCancelled: { color: colors.error },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBright,
  },
  chipTextActive: { color: colors.lavender },
  chipDefault: {
    backgroundColor: colors.chip,
    borderColor: colors.chipBorder,
  },
  chipTextDefault: { color: colors.textMuted },
  chevron: { color: colors.primaryBright, fontSize: 22, fontWeight: '300', marginLeft: 4 },
});

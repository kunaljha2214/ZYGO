import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../neon/GlassCard';
import { colors, radii, spacing } from '../../theme';

type Props = {
  name: string;
  rating: number;
  cuisines: string[];
  distanceKm?: number;
  isOpenNow?: boolean;
  availabilityLabel?: string | null;
  onPress: () => void;
};

function cuisineLine(cuisines: string[]) {
  if (!cuisines.length) return 'Restaurant';
  return cuisines.join(', ');
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function RestaurantListCard({
  name,
  rating,
  cuisines,
  distanceKm,
  isOpenNow = true,
  availabilityLabel,
  onPress,
}: Props) {
  const closedLabel = !isOpenNow ? availabilityLabel : null;

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.cuisines} numberOfLines={2}>
              {cuisineLine(cuisines)}
            </Text>
          </View>
          {closedLabel ? (
            <Text style={styles.closedLabel} numberOfLines={2}>
              {closedLabel}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.lavender, fontWeight: '800', fontSize: 18 },
  body: { flex: 1, minWidth: 0 },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  star: { color: colors.primaryBright, fontSize: 13 },
  rating: { color: colors.lavender, fontWeight: '700', fontSize: 14 },
  dot: { color: colors.textMuted, fontSize: 14 },
  cuisines: { color: colors.textMuted, fontSize: 13, flex: 1, lineHeight: 18 },
  closedLabel: {
    color: colors.primaryBright,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    fontWeight: '600',
  },
  distance: { color: colors.lavender, fontSize: 13, fontWeight: '600' },
  chevron: { color: colors.primaryBright, fontSize: 24, fontWeight: '300' },
});

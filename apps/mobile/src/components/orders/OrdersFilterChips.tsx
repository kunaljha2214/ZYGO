import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { OrdersFilter } from '../../navigation/types';
import { colors, radii } from '../../theme';

const FILTERS: { id: OrdersFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'ride', label: 'Ride' },
];

type Props = {
  value: OrdersFilter;
  onChange: (filter: OrdersFilter) => void;
};

export function OrdersFilterChips({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: 14,
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
});

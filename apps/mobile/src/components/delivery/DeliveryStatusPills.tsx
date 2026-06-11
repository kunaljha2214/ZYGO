import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../../theme';

const STEPS = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'arriving_at_restaurant', label: 'To restaurant' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'arrived_at_customer', label: 'At customer' },
  { key: 'delivered', label: 'Delivered' },
];

type Props = {
  status: string;
};

export function DeliveryStatusPills({ status }: Props) {
  const idx = STEPS.findIndex((s) => s.key === status);
  const current = idx >= 0 ? idx : 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View
            key={step.key}
            style={[styles.pill, done && styles.pillDone, active && styles.pillActive]}
          >
            <Text style={[styles.label, (done || active) && styles.labelOn]}>{step.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  pillDone: {
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  pillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.28)',
    borderColor: colors.primaryBright,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  labelOn: { color: colors.lavender, fontWeight: '700' },
});

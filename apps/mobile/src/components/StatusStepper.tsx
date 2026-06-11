import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme';

const FOOD_STEPS = [
  'payment_pending',
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'out_for_delivery',
  'delivered',
];
const RIDE_STEPS = ['requested', 'dispatching', 'assigned', 'arriving', 'arrived', 'in_progress', 'completed'];

type Props = {
  kind: 'food' | 'ride';
  status: string;
};

function stepLabel(s: string): string {
  return s.replace(/_/g, ' ');
}

export function StatusStepper({ kind, status }: Props) {
  const steps = kind === 'food' ? FOOD_STEPS : RIDE_STEPS;
  const cancelled = status === 'cancelled';
  const idx = steps.indexOf(status);
  const currentIndex = cancelled ? -1 : idx >= 0 ? idx : 0;

  if (cancelled) {
    return <Text style={styles.cancelledBanner}>Cancelled</Text>;
  }

  return (
    <View style={styles.track}>
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]} />
            <Text
              style={[styles.stepText, (done || current) && styles.stepTextCurrent]}
              numberOfLines={2}
            >
              {stepLabel(step)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
    gap: 8,
  },
  step: { alignItems: 'center', flex: 1, minWidth: 52, maxWidth: 72 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.stepInactive,
    marginBottom: 6,
  },
  dotDone: { backgroundColor: colors.stepDone },
  dotCurrent: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.15 }],
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  stepText: { color: colors.textMuted, textTransform: 'capitalize', fontSize: 10, textAlign: 'center' },
  stepTextCurrent: { color: colors.text, fontWeight: '600' },
  cancelledBanner: { color: colors.error, fontWeight: '700', marginVertical: 16, fontSize: 16 },
});

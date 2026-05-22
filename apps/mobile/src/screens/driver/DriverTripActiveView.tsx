import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { AppAlert } from '../../alert';
import { AppScreen } from '../../components/layout/AppScreen';
import { GlassCard } from '../../components/neon/GlassCard';
import { Button } from '../../components/Button';
import { TripStatusPills } from '../../components/trip/TripStatusPills';
import { advanceRide, updateDriverLocation } from '../../api/driver';
import type { DriverRide } from '../../types/driver';
import Geolocation from '@react-native-community/geolocation';
import { colors, radii, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';
import { drivingDirectionsUrl } from '../../utils/navigationUrl';

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Accepted — head to pickup',
  arriving: 'Arriving at pickup',
  arrived: 'Arrived at pickup',
  in_progress: 'Ride in progress',
  completed: 'Completed',
};

const NEXT_STATUS: Record<string, string> = {
  assigned: 'arriving',
  arriving: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
};

const BUTTON_LABELS: Record<string, string> = {
  assigned: 'Mark: Arriving at pickup',
  arriving: 'Mark: Arrived',
  arrived: 'Start ride',
  in_progress: 'End ride',
};

type Props = {
  ride: DriverRide;
  onRideUpdated: (ride: DriverRide | null) => void;
};

export function DriverTripActiveView({ ride, onRideUpdated }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [current, setCurrent] = React.useState(ride);

  useEffect(() => {
    setCurrent(ride);
  }, [ride]);

  useEffect(() => {
    if (!current?.id) return;
    const rideId = current.id;
    const tick = () => {
      Geolocation.getCurrentPosition((pos) => {
        void updateDriverLocation(pos.coords.latitude, pos.coords.longitude, rideId);
      });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [current?.id]);

  const advance = async () => {
    const next = NEXT_STATUS[current.status];
    if (!next) return;
    setBusy(true);
    try {
      const updated = await advanceRide(current.id, next);
      setCurrent(updated);
      onRideUpdated(updated.status === 'completed' ? null : updated);
      if (updated.status === 'completed') {
        AppAlert.alert(
          'Ride completed',
          `You earned ${formatInr(updated.driverEarned)} (fare ${formatInr(updated.fare)}, platform ${formatInr(updated.platformFee)})`
        );
      }
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const pickup = current.pickup.coordinates;
  const drop = current.drop.coordinates;
  const navTarget =
    current.status === 'in_progress' || current.status === 'arrived' ? drop : pickup;
  const btnLabel = BUTTON_LABELS[current.status];

  return (
    <AppScreen tab scroll eyebrow="Captain" title="Your trip" subtitle="Active ride">
      <View style={styles.statusPill}>
        <Text style={styles.status}>{STATUS_LABELS[current.status] ?? current.status}</Text>
      </View>

      <TripStatusPills status={current.status} />

      <GlassCard glow style={styles.card}>
        <Text style={styles.cardLabel}>Pickup</Text>
        <Text style={styles.line}>{current.pickup.line1}</Text>
        <Pressable
          onPress={() => void Linking.openURL(drivingDirectionsUrl(pickup.lat, pickup.lng, 'Pickup'))}
        >
          <Text style={styles.nav}>Navigate to pickup →</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardLabel}>Drop</Text>
        <Text style={styles.line}>{current.drop.line1}</Text>
        <Pressable
          onPress={() => void Linking.openURL(drivingDirectionsUrl(drop.lat, drop.lng, 'Drop'))}
        >
          <Text style={styles.nav}>Navigate to destination →</Text>
        </Pressable>
      </GlassCard>

      <GlassCard glow style={styles.card}>
        <Text style={styles.cardLabel}>Fare breakdown</Text>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Ride fare</Text>
          <Text style={styles.fareVal}>{formatInr(current.fare)}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Platform fee</Text>
          <Text style={styles.fareVal}>{formatInr(current.platformFee)}</Text>
        </View>
        <View style={[styles.fareRow, styles.fareRowLast]}>
          <Text style={styles.earnLabel}>You earn</Text>
          <Text style={styles.earn}>{formatInr(current.driverEarned)}</Text>
        </View>
        {current.surgeMultiplier && current.surgeMultiplier > 1 ? (
          <Text style={styles.surge}>Surge {current.surgeMultiplier}x active</Text>
        ) : null}
        {current.tollCharges ? (
          <Text style={styles.line}>Tolls: {formatInr(current.tollCharges)}</Text>
        ) : null}
      </GlassCard>

      <Pressable
        style={styles.mapsBtn}
        onPress={() =>
          void Linking.openURL(drivingDirectionsUrl(navTarget.lat, navTarget.lng, 'Navigate'))
        }
      >
        <Text style={styles.mapsBtnText}>Open navigation</Text>
      </Pressable>

      {btnLabel && current.status !== 'completed' ? (
        <Button title={btnLabel} onPress={() => void advance()} loading={busy} />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  status: { color: colors.lavender, fontWeight: '800', fontSize: 14 },
  card: { marginBottom: spacing.md },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  line: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  nav: { color: colors.primaryBright, fontWeight: '700', marginTop: spacing.md, fontSize: 14 },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  fareRowLast: { borderBottomWidth: 0, marginTop: 4 },
  fareLabel: { color: colors.textMuted },
  fareVal: { color: colors.text, fontWeight: '600' },
  earnLabel: { color: colors.text, fontWeight: '700' },
  earn: { color: '#4ade80', fontWeight: '800', fontSize: 20 },
  surge: { color: '#fbbf24', fontWeight: '700', marginTop: spacing.sm },
  mapsBtn: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mapsBtnText: { color: colors.primaryBright, fontWeight: '800' },
});

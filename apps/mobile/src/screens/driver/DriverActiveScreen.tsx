import React, { useCallback, useEffect, useState } from 'react';
import { AppAlert } from '../../alert';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { StackScroll } from '../../components/layout/StackScroll';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { advanceRide, fetchActiveRide, updateDriverLocation } from '../../api/driver';
import type { DriverRide } from '../../types/driver';
import { colors, spacing, radii } from '../../theme';
import { shared } from '../../theme/styles';

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Accepted — head to pickup',
  arriving: 'Arriving at pickup',
  arrived: 'Arrived at pickup',
  in_progress: 'Ride in progress',
  completed: 'Completed'};

const NEXT_STATUS: Record<string, string> = {
  assigned: 'arriving',
  arriving: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed'};

const BUTTON_LABELS: Record<string, string> = {
  assigned: 'Mark: Arriving at pickup',
  arriving: 'Mark: Arrived',
  arrived: 'Start ride',
  in_progress: 'End ride'};

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function DriverActiveScreen() {
  const [ride, setRide] = useState<DriverRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRide(await fetchActiveRide());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!ride?.id) return;
    const rideId = ride.id;
    const tick = () => {
      Geolocation.getCurrentPosition((pos) => {
        void updateDriverLocation(pos.coords.latitude, pos.coords.longitude, rideId);
      });
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [ride?.id]);

  const advance = async () => {
    if (!ride) return;
    const next = NEXT_STATUS[ride.status];
    if (!next) return;
    setBusy(true);
    try {
      const updated = await advanceRide(ride.id, next);
      setRide(updated);
      if (updated.status === 'completed') {
        AppAlert.alert(
          'Ride completed',
          `You earned ₹${updated.driverEarned} (fare ₹${updated.fare}, platform ₹${updated.platformFee})`
        );
      }
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  if (!ride) {
    return (
      <StackScroll>
        <Text style={shared.muted}>No active ride. Stay online on the Hub tab.</Text>
      </StackScroll>
    );
  }

  const pickup = ride.pickup.coordinates;
  const drop = ride.drop.coordinates;
  const navTarget =
    ride.status === 'in_progress' || ride.status === 'arrived' ? drop : pickup;
  const btnLabel = BUTTON_LABELS[ride.status];

  return (
    <StackScroll>
      <View style={styles.statusPill}>
        <Text style={styles.status}>{STATUS_LABELS[ride.status] ?? ride.status}</Text>
      </View>

      <Card glow>
        <Text style={shared.h}>Pickup</Text>
        <Text style={styles.line}>{ride.pickup.line1}</Text>
        <Pressable onPress={() => void Linking.openURL(mapsUrl(pickup.lat, pickup.lng))}>
          <Text style={styles.nav}>Navigate to pickup →</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={shared.h}>Drop</Text>
        <Text style={styles.line}>{ride.drop.line1}</Text>
        <Pressable onPress={() => void Linking.openURL(mapsUrl(drop.lat, drop.lng))}>
          <Text style={styles.nav}>Navigate to destination →</Text>
        </Pressable>
      </Card>

      <Card glow>
        <Text style={shared.h}>Fare breakdown</Text>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Ride fare</Text>
          <Text style={styles.fareVal}>₹{ride.fare}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Platform fee</Text>
          <Text style={styles.fareVal}>₹{ride.platformFee}</Text>
        </View>
        <View style={[styles.fareRow, styles.fareRowLast]}>
          <Text style={styles.earnLabel}>You earn</Text>
          <Text style={styles.earn}>₹{ride.driverEarned}</Text>
        </View>
        {ride.surgeMultiplier && ride.surgeMultiplier > 1 ? (
          <Text style={styles.surge}>Surge {ride.surgeMultiplier}x active</Text>
        ) : null}
        {ride.tollCharges ? <Text style={styles.line}>Tolls: ₹{ride.tollCharges}</Text> : null}
      </Card>

      <Pressable
        style={styles.mapsBtn}
        onPress={() => void Linking.openURL(mapsUrl(navTarget.lat, navTarget.lng))}
      >
        <Text style={styles.mapsBtnText}>Open Google Maps navigation</Text>
      </Pressable>

      {btnLabel && ride.status !== 'completed' ? (
        <Button title={btnLabel} onPress={() => void advance()} loading={busy} />
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginBottom: spacing.lg},
  status: { color: colors.lavender, fontWeight: '800', fontSize: 14 },
  line: { color: colors.textSecondary },
  nav: { color: colors.primaryBright, fontWeight: '700', marginTop: spacing.md },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
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
    marginBottom: spacing.md},
  mapsBtnText: { color: colors.primaryBright, fontWeight: '800' }});

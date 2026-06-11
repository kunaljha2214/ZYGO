import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useDriverRequestStore } from '../../store/driverRequestStore';
import { acceptRide, rejectRide } from '../../api/driver';
import { AppAlert } from '../../alert';
import { colors, radii, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';

type Props = {
  onAccepted: () => void;
};

export function DriverRequestModal({ onAccepted }: Props) {
  const incoming = useDriverRequestStore((s) => s.incoming);
  const setIncoming = useDriverRequestStore((s) => s.setIncoming);
  const [seconds, setSeconds] = useState(15);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!incoming) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(incoming.expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(left);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [incoming]);

  if (!incoming) return null;

  const onAccept = async () => {
    setBusy(true);
    try {
      await acceptRide(incoming.rideId);
      setIncoming(null);
      onAccepted();
    } catch (e) {
      AppAlert.alert('Accept failed', e instanceof Error ? e.message : 'Could not accept ride');
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      await rejectRide(incoming.rideId);
      setIncoming(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.glow}>
          <View style={styles.card}>
            <View style={styles.timerRow}>
              <Text style={styles.badge}>New ride request</Text>
              <View style={styles.timer}>
                <Text style={styles.timerText}>{seconds}s</Text>
              </View>
            </View>
            <Text style={styles.rideType}>{incoming.rideType.toUpperCase()}</Text>
            <View style={styles.place}>
              <Text style={styles.placeLabel}>Pickup</Text>
              <Text style={styles.placeLine}>{incoming.pickup.line1}</Text>
            </View>
            <View style={styles.place}>
              <Text style={styles.placeLabel}>Drop</Text>
              <Text style={styles.placeLine}>{incoming.drop.line1}</Text>
            </View>
            <Text style={styles.dist}>
              {incoming.distanceToPickupKm} km to pickup · {incoming.tripDistanceKm} km trip · ~
              {incoming.estimatedMinutes} min
            </Text>
            <Text style={styles.earn}>Est. earnings {formatInr(incoming.estimatedEarnings)}</Text>
            <Text style={styles.fareMeta}>
              Fare {formatInr(incoming.estimatedFare)} · Platform {formatInr(incoming.platformFee)}
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.reject} onPress={() => void onReject()} disabled={busy}>
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
              <Pressable style={styles.accept} onPress={() => void onAccept()} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.acceptText}>Accept</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  glow: {
    borderRadius: radii.xl + 2,
    padding: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.5)',
  },
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { color: colors.primaryBright, fontWeight: '800' },
  timer: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  timerText: { color: colors.lavender, fontWeight: '800' },
  rideType: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: spacing.sm },
  place: { marginTop: spacing.md },
  placeLabel: { color: colors.lavender, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  placeLine: { color: colors.textSecondary, marginTop: 2 },
  dist: { color: colors.textMuted, marginTop: spacing.md, fontSize: 13 },
  earn: { color: '#4ade80', fontSize: 22, fontWeight: '800', marginTop: spacing.lg },
  fareMeta: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  reject: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  rejectText: { color: colors.error, fontWeight: '700' },
  accept: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  acceptText: { color: colors.text, fontWeight: '800' },
});

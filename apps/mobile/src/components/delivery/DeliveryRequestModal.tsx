import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useDeliveryRequestStore } from '../../store/deliveryRequestStore';
import { acceptDelivery, rejectDelivery } from '../../api/deliveryPartner';
import { AppAlert } from '../../alert';
import { colors, radii, spacing } from '../../theme';

type Props = {
  onAccepted: () => void;
};

export function DeliveryRequestModal({ onAccepted }: Props) {
  const incoming = useDeliveryRequestStore((s) => s.incoming);
  const setIncoming = useDeliveryRequestStore((s) => s.setIncoming);
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
      await acceptDelivery(incoming.orderId);
      setIncoming(null);
      onAccepted();
    } catch (e) {
      AppAlert.alert('Accept failed', e instanceof Error ? e.message : 'Could not accept delivery');
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      await rejectDelivery(incoming.orderId);
      setIncoming(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>New delivery · {seconds}s</Text>
          <Text style={styles.title}>{incoming.restaurantName}</Text>
          <Text style={styles.line}>
            Pickup {incoming.distanceToRestaurantKm} km · Drop {incoming.distanceToCustomerKm} km
          </Text>
          <Text style={styles.earn}>Est. earnings ₹{incoming.estimatedEarnings}</Text>
          <Text style={styles.meta}>~{incoming.estimatedMinutes} min total</Text>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badge: { color: colors.primaryBright, fontWeight: '800', marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  line: { color: colors.textSecondary, marginTop: spacing.sm },
  earn: { color: '#4ade80', fontSize: 20, fontWeight: '800', marginTop: spacing.lg },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
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

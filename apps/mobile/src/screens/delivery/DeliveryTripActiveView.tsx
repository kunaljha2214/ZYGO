import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, TextInput } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { AppAlert } from '../../alert';
import { AppScreen } from '../../components/layout/AppScreen';
import { GlassCard } from '../../components/neon/GlassCard';
import { Button } from '../../components/Button';
import { DeliveryStatusPills } from '../../components/delivery/DeliveryStatusPills';
import { advanceDelivery, updatePartnerLocation, verifyDeliveryOtp } from '../../api/deliveryPartner';
import type { PartnerOrder } from '../../types/deliveryPartner';
import { colors, radii, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';
import { drivingDirectionsUrl } from '../../utils/navigationUrl';
import { TripContactCard } from '../../components/trip/TripContactCard';
import { callDeliveryOrderCustomer } from '../../utils/placePeerCall';
import { distanceMeters } from '../../utils/addressDisplay';

const CUSTOMER_CONTACT_STATUSES = new Set([
  'accepted',
  'arriving_at_restaurant',
  'picked_up',
  'out_for_delivery',
  'arrived_at_customer',
  'delivered',
]);

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Accepted — head to restaurant',
  arriving_at_restaurant: 'Arriving at restaurant',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  arrived_at_customer: 'Arrived at customer',
  delivered: 'Delivered',
};

const NEXT_LABEL: Record<string, string> = {
  accepted: 'Arriving at restaurant',
  arriving_at_restaurant: 'Picked up',
  picked_up: 'Out for delivery',
  out_for_delivery: 'Arrived at customer',
  arrived_at_customer: 'Delivered',
};

type Props = {
  order: PartnerOrder;
  onOrderUpdated: (order: PartnerOrder | null) => void;
};

export function DeliveryTripActiveView({ order, onOrderUpdated }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [current, setCurrent] = React.useState(order);
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [otp, setOtp] = React.useState('');
  const [otpBusy, setOtpBusy] = React.useState(false);

  useEffect(() => {
    setCurrent(order);
  }, [order]);

  useEffect(() => {
    if (!current?.id) return;
    const orderId = current.id;
    const status = current.deliveryStatus;
    const tick = () => {
      Geolocation.getCurrentPosition((pos) => {
        setPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        void updatePartnerLocation(pos.coords.latitude, pos.coords.longitude, orderId);
      });
    };
    tick();
    const intervalMs = status === 'out_for_delivery' ? 5000 : 12000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [current?.id, current.deliveryStatus]);

  const advance = async () => {
    setBusy(true);
    try {
      const updated = await advanceDelivery(current.id);
      setCurrent(updated);
      if (updated.deliveryStatus === 'delivered') {
        onOrderUpdated(null);
        AppAlert.alert('Delivered', 'Earnings added to your wallet.');
      } else {
        onOrderUpdated(updated);
      }
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const rest = current.restaurantCoords ?? { lat: 12.97, lng: 77.59 };
  const drop = current.deliveryAddress.coordinates;
  const nextLabel = NEXT_LABEL[current.deliveryStatus];
  const navTarget =
    current.deliveryStatus === 'picked_up' ||
    current.deliveryStatus === 'out_for_delivery' ||
    current.deliveryStatus === 'arrived_at_customer'
      ? drop
      : rest;
  const navLabel =
    current.deliveryStatus === 'picked_up' ||
    current.deliveryStatus === 'out_for_delivery' ||
    current.deliveryStatus === 'arrived_at_customer'
      ? 'Customer'
      : current.restaurantName ?? 'Restaurant';

  const GEOFENCE_M = 50;
  const distToRest = pos ? distanceMeters(pos, rest) : null;
  const distToDrop = pos ? distanceMeters(pos, drop) : null;
  const isNearRest = distToRest != null && distToRest <= GEOFENCE_M;
  const isNearDrop = distToDrop != null && distToDrop <= GEOFENCE_M;
  const needsHandoff =
    current.deliveryStatus === 'arriving_at_restaurant' && !current.handoffConfirmedAt;
  const needsOtp =
    current.deliveryStatus === 'arrived_at_customer' && !current.deliveryOtpVerifiedAt;

  const canMarkNext =
    !busy &&
    Boolean(nextLabel) &&
    (current.deliveryStatus === 'accepted'
      ? isNearRest
      : current.deliveryStatus === 'arriving_at_restaurant'
        ? isNearRest && !needsHandoff
        : current.deliveryStatus === 'out_for_delivery'
          ? isNearDrop
          : current.deliveryStatus === 'arrived_at_customer'
            ? isNearDrop && !needsOtp
          : current.deliveryStatus === 'picked_up'
            ? true
            : true);

  const disabledHint = !pos
    ? 'Enable GPS to continue.'
    : current.deliveryStatus === 'accepted' && !isNearRest
      ? `Get within ${GEOFENCE_M}m of the restaurant to mark arrival.`
      : current.deliveryStatus === 'arriving_at_restaurant' && !isNearRest
        ? `Get within ${GEOFENCE_M}m of the restaurant to pick up.`
        : needsHandoff
          ? 'Waiting for restaurant to confirm handoff.'
          : needsOtp
            ? 'Enter customer OTP to complete delivery.'
      : (current.deliveryStatus === 'out_for_delivery' || current.deliveryStatus === 'arrived_at_customer') && !isNearDrop
        ? `Get within ${GEOFENCE_M}m of the customer address to continue.`
            : null;

  const submitOtp = async () => {
    if (!current?.id) return;
    const code = otp.trim();
    if (!/^[0-9]{4}$/.test(code)) {
      AppAlert.alert('OTP', 'Enter the 4-digit OTP from the customer.');
      return;
    }
    setOtpBusy(true);
    try {
      await verifyDeliveryOtp(current.id, code);
      const updated = { ...current, deliveryOtpVerifiedAt: new Date().toISOString() };
      setCurrent(updated);
      onOrderUpdated(updated);
      AppAlert.alert('OTP verified', 'You can now complete delivery.');
    } catch (e) {
      AppAlert.alert('OTP', e instanceof Error ? e.message : 'Could not verify OTP');
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <AppScreen tab scroll eyebrow="Delivery" title="Your trip" subtitle="Active delivery">
      <Text style={styles.orderNum}>{current.orderNumber}</Text>
      <View style={styles.statusPill}>
        <Text style={styles.status}>
          {STATUS_LABELS[current.deliveryStatus] ?? current.deliveryStatus.replace(/_/g, ' ')}
        </Text>
      </View>

      <DeliveryStatusPills status={current.deliveryStatus} />

      {current.customer && CUSTOMER_CONTACT_STATUSES.has(current.deliveryStatus) ? (
        <TripContactCard
          title="Customer"
          name={current.customer.name}
          onCall={() => callDeliveryOrderCustomer(current.id)}
        />
      ) : null}

      <GlassCard glow style={styles.card}>
        <Text style={styles.cardLabel}>Restaurant</Text>
        <Text style={styles.name}>{current.restaurantName ?? 'Restaurant'}</Text>
        <Pressable
          onPress={() =>
            void Linking.openURL(
              drivingDirectionsUrl(rest.lat, rest.lng, current.restaurantName ?? 'Restaurant')
            )
          }
        >
          <Text style={styles.nav}>Navigate to restaurant →</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardLabel}>Customer</Text>
        <Text style={styles.line}>{current.deliveryAddress.line1}</Text>
        {current.customerNotes ? (
          <Text style={styles.notes}>Note: {current.customerNotes}</Text>
        ) : null}
        <Pressable
          onPress={() => void Linking.openURL(drivingDirectionsUrl(drop.lat, drop.lng, 'Customer'))}
        >
          <Text style={styles.nav}>Navigate to customer →</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardLabel}>Order items</Text>
        {current.items.map((it, i) => (
          <Text key={i} style={styles.itemLine}>
            {it.quantity}× {it.name}
          </Text>
        ))}
        <View style={styles.earnRow}>
          <Text style={styles.earnLabel}>You earn</Text>
          <Text style={styles.earn}>{formatInr(current.estimatedRiderEarnings ?? 35)}</Text>
        </View>
        {current.deliveryEtaMinutes ? (
          <Text style={styles.eta}>ETA ~{current.deliveryEtaMinutes} min</Text>
        ) : null}
      </GlassCard>

      <Pressable
        style={styles.mapsBtn}
        onPress={() => void Linking.openURL(drivingDirectionsUrl(navTarget.lat, navTarget.lng, navLabel))}
      >
        <Text style={styles.mapsBtnText}>Open navigation</Text>
      </Pressable>

      {current.deliveryStatus === 'arrived_at_customer' && !current.deliveryOtpVerifiedAt ? (
        <GlassCard style={styles.otpCard}>
          <Text style={styles.cardLabel}>Delivery OTP</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter 4-digit OTP"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            style={styles.otpInput}
          />
          <Button title="Verify OTP" onPress={() => void submitOtp()} loading={otpBusy} />
        </GlassCard>
      ) : null}

      {disabledHint && !canMarkNext && nextLabel ? (
        <Text style={styles.disabledHint}>{disabledHint}</Text>
      ) : null}

      {current.deliveryStatus !== 'delivered' && nextLabel ? (
        <Button
          title={`Mark: ${nextLabel}`}
          onPress={() => void advance()}
          loading={busy}
          disabled={!canMarkNext}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  orderNum: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.lavender,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
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
  name: { color: colors.text, fontWeight: '700', fontSize: 17 },
  line: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  notes: { color: colors.textMuted, fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  itemLine: { color: colors.text, fontSize: 14, marginBottom: 4 },
  nav: { color: colors.primaryBright, fontWeight: '700', marginTop: spacing.md, fontSize: 14 },
  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  earnLabel: { color: colors.text, fontWeight: '700' },
  earn: { color: '#4ade80', fontWeight: '800', fontSize: 20 },
  eta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
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
  disabledHint: { color: '#fbbf24', fontWeight: '700', marginBottom: spacing.md, lineHeight: 20 },
  otpCard: { marginBottom: spacing.md, padding: spacing.md },
  otpInput: {
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
});

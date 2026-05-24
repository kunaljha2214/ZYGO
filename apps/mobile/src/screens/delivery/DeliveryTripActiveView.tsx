import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { AppAlert } from '../../alert';
import { AppScreen } from '../../components/layout/AppScreen';
import { GlassCard } from '../../components/neon/GlassCard';
import { Button } from '../../components/Button';
import { DeliveryStatusPills } from '../../components/delivery/DeliveryStatusPills';
import { advanceDelivery, updatePartnerLocation } from '../../api/deliveryPartner';
import type { PartnerOrder } from '../../types/deliveryPartner';
import { colors, radii, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';
import { drivingDirectionsUrl } from '../../utils/navigationUrl';
import { TripContactCard } from '../../components/trip/TripContactCard';
import { callDeliveryOrderCustomer } from '../../utils/placePeerCall';

const CUSTOMER_CONTACT_STATUSES = new Set([
  'accepted',
  'arriving_at_restaurant',
  'picked_up',
  'out_for_delivery',
  'delivered',
]);

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Accepted — head to restaurant',
  arriving_at_restaurant: 'Arriving at restaurant',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

const NEXT_LABEL: Record<string, string> = {
  accepted: 'Arriving at restaurant',
  arriving_at_restaurant: 'Picked up',
  picked_up: 'Out for delivery',
  out_for_delivery: 'Delivered',
};

type Props = {
  order: PartnerOrder;
  onOrderUpdated: (order: PartnerOrder | null) => void;
};

export function DeliveryTripActiveView({ order, onOrderUpdated }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [current, setCurrent] = React.useState(order);

  useEffect(() => {
    setCurrent(order);
  }, [order]);

  useEffect(() => {
    if (!current?.id) return;
    const orderId = current.id;
    const status = current.deliveryStatus;
    const tick = () => {
      Geolocation.getCurrentPosition((pos) => {
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
    current.deliveryStatus === 'picked_up' || current.deliveryStatus === 'out_for_delivery'
      ? drop
      : rest;
  const navLabel =
    current.deliveryStatus === 'picked_up' || current.deliveryStatus === 'out_for_delivery'
      ? 'Customer'
      : current.restaurantName ?? 'Restaurant';

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

      {current.deliveryStatus !== 'delivered' && nextLabel ? (
        <Button title={`Mark: ${nextLabel}`} onPress={() => void advance()} loading={busy} />
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
});

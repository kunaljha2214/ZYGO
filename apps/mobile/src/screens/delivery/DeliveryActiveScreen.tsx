import React, { useCallback, useEffect, useState } from 'react';
import { AppAlert } from '../../alert';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { StackScroll } from '../../components/layout/StackScroll';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { advanceDelivery, fetchActiveDelivery } from '../../api/deliveryPartner';
import { updatePartnerLocation } from '../../api/deliveryPartner';
import type { PartnerOrder } from '../../types/deliveryPartner';
import { colors, spacing } from '../../theme';
import { shared } from '../../theme/styles';

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Accepted',
  arriving_at_restaurant: 'Arriving at restaurant',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered'};

function mapsUrl(lat: number, lng: number, label?: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function DeliveryActiveScreen() {
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(await fetchActiveDelivery());
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
    if (!order?.id) return;
    const orderId = order.id;
    const tick = () => {
      Geolocation.getCurrentPosition((pos) => {
        void updatePartnerLocation(pos.coords.latitude, pos.coords.longitude, orderId);
      });
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [order?.id]);

  const advance = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await advanceDelivery(order.id);
      setOrder(updated);
      if (updated.deliveryStatus === 'delivered') {
        AppAlert.alert('Delivered', 'Earnings added to your wallet.');
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

  if (!order) {
    return (
      <StackScroll>
        <Text style={shared.muted}>No active delivery. Stay online on the Hub tab.</Text>
      </StackScroll>
    );
  }

  const rest = order.restaurantCoords ?? { lat: 12.97, lng: 77.59 };
  const drop = order.deliveryAddress.coordinates;
  const nextLabel = STATUS_LABELS[
    order.deliveryStatus === 'accepted'
      ? 'arriving_at_restaurant'
      : order.deliveryStatus === 'arriving_at_restaurant'
        ? 'picked_up'
        : order.deliveryStatus === 'picked_up'
          ? 'out_for_delivery'
          : order.deliveryStatus === 'out_for_delivery'
            ? 'delivered'
            : ''
  ];

  return (
    <StackScroll>
      <Text style={styles.num}>{order.orderNumber}</Text>
      <Text style={styles.status}>{STATUS_LABELS[order.deliveryStatus] ?? order.deliveryStatus}</Text>

      <Card glow>
        <Text style={shared.h}>Restaurant</Text>
        <Text style={styles.name}>{order.restaurantName}</Text>
        <Pressable onPress={() => void Linking.openURL(mapsUrl(rest.lat, rest.lng, order.restaurantName))}>
          <Text style={styles.nav}>Navigate to restaurant →</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={shared.h}>Customer</Text>
        <Text style={styles.line}>{order.deliveryAddress.line1}</Text>
        <Pressable onPress={() => void Linking.openURL(mapsUrl(drop.lat, drop.lng))}>
          <Text style={styles.nav}>Navigate to customer →</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={shared.h}>Items</Text>
        {order.items.map((it, i) => (
          <Text key={i} style={shared.line}>
            {it.quantity}× {it.name}
          </Text>
        ))}
        <Text style={styles.earn}>Earn ₹{order.estimatedRiderEarnings ?? 35}</Text>
      </Card>

      {order.deliveryStatus !== 'delivered' && nextLabel ? (
        <Button title={`Mark: ${nextLabel}`} onPress={() => void advance()} loading={busy} />
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  num: { fontSize: 22, fontWeight: '800', color: colors.text },
  status: { color: colors.primaryBright, fontWeight: '700', marginBottom: spacing.lg },
  name: { color: colors.text, fontWeight: '700', fontSize: 17 },
  line: { color: colors.textSecondary },
  nav: { color: colors.primaryBright, fontWeight: '700', marginTop: spacing.md },
  earn: { color: '#4ade80', fontWeight: '800', marginTop: spacing.md, fontSize: 18 }});

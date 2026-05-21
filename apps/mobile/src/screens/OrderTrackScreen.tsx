import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { RideMapView } from '../components/rides/RideMapView';
import { MapMarker } from '../components/rides/MapMarker';
import { StackScroll } from '../components/layout/StackScroll';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HomeStackParamList, OrdersStackParamList } from '../navigation/types';
import { api } from '../api/client';
import { StatusStepper } from '../components/StatusStepper';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { shared } from '../theme/styles';
import { connectOrderTracking, disconnectOrderTracking } from '../services/orderSocket';
import { colors } from '../theme';

type FoodOrder = {
  id: string;
  type: 'food';
  orderNumber: string;
  restaurantName?: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string;
  total: number;
  status: string;
  deliveryStatus?: string;
  deliveryEtaMinutes?: number;
  deliveryAddress: { label: string; line1: string; coordinates?: { lat: number; lng: number } };
  riderLocation?: { lat: number; lng: number } | null;
};

type R = RouteProp<HomeStackParamList, 'OrderTrack'> | RouteProp<OrdersStackParamList, 'FoodOrderDetail'>;

export function OrderTrackScreen() {
  const { orderId } = useRoute<R>().params;
  const qc = useQueryClient();
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data: o } = await api.get<FoodOrder>(`/orders/${orderId}`);
      return o;
    },
    refetchInterval: 5000});

  useEffect(() => {
    if (!data || data.status !== 'out_for_delivery') return;
    const socket = connectOrderTracking(orderId);
    socket.on('rider:location', (payload: { lat: number; lng: number }) => {
      setRiderPos({ lat: payload.lat, lng: payload.lng });
    });
    return () => {
      socket.off('rider:location');
      disconnectOrderTracking();
    };
  }, [orderId, data?.status]);

  useEffect(() => {
    if (data?.riderLocation) setRiderPos(data.riderLocation);
  }, [data?.riderLocation]);

  const cancelMut = useMutation({
    mutationFn: async () => {
      await api.patch(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['order', orderId] })});

  if (isLoading || !data) {
    return (
      <View style={shared.center}>
        <Text style={shared.muted}>{error ? String(error) : 'Loading…'}</Text>
      </View>
    );
  }

  const drop = data.deliveryAddress.coordinates;
  const showLiveMap =
    (data.status === 'out_for_delivery' || data.status === 'rider_assigned') && drop && riderPos;

  return (
    <StackScroll>
      <Text style={shared.orderNum}>{data.orderNumber}</Text>
      {data.restaurantName ? <Text style={shared.meta}>{data.restaurantName}</Text> : null}
      <Text style={shared.stat}>Status: {data.status.replace(/_/g, ' ')}</Text>
      {data.deliveryEtaMinutes ? (
        <Text style={styles.eta}>ETA ~{data.deliveryEtaMinutes} min</Text>
      ) : null}
      <StatusStepper kind="food" status={data.status} />

      {showLiveMap ? (
        <View style={styles.mapWrap}>
          <RideMapView
            style={styles.map}
            initialRegion={{
              latitude: riderPos!.lat,
              longitude: riderPos!.lng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04}}
            region={{
              latitude: riderPos!.lat,
              longitude: riderPos!.lng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04}}
          >
            <MapMarker coordinate={{ latitude: riderPos!.lat, longitude: riderPos!.lng }} title="Rider" pinColor="#7c3aed" />
            <MapMarker coordinate={{ latitude: drop.lat, longitude: drop.lng }} title="You" pinColor="#22c55e" />
          </RideMapView>
          <Text style={styles.live}>Live rider tracking</Text>
        </View>
      ) : null}

      <Card glow style={shared.block}>
        <Text style={shared.h}>Items</Text>
        {data.items.map((it, i) => (
          <Text key={i} style={shared.line}>
            {it.name} × {it.quantity} — ₹{(it.price * it.quantity).toFixed(2)}
          </Text>
        ))}
        {(data.discountAmount ?? 0) > 0 ? (
          <>
            <Text style={shared.line}>
              Subtotal ₹{(data.subtotal ?? data.total).toFixed(2)}
            </Text>
            <Text style={[shared.line, { color: '#4ade80' }]}>
              Coupon {data.couponCode} −₹{(data.discountAmount ?? 0).toFixed(2)}
            </Text>
          </>
        ) : null}
        <Text style={shared.total}>Total ₹{data.total.toFixed(2)}</Text>
      </Card>
      <Card style={shared.block}>
        <Text style={shared.h}>Deliver to</Text>
        <Text style={shared.line}>
          {data.deliveryAddress.label}: {data.deliveryAddress.line1}
        </Text>
      </Card>
      {data.status === 'placed' ? (
        <Button
          title="Cancel order"
          variant="ghost"
          onPress={() => cancelMut.mutate()}
          loading={cancelMut.isPending}
        />
      ) : null}
    </StackScroll>
  );
}

const mapH = Math.min(220, Dimensions.get('window').height * 0.28);

const styles = StyleSheet.create({
  eta: { color: colors.primaryBright, fontWeight: '700', marginBottom: 8 },
  mapWrap: { marginVertical: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  map: { width: '100%', height: mapH },
  live: { textAlign: 'center', color: colors.textMuted, padding: 8, fontSize: 12 }});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LiveDeliveryMap } from '../components/map/LiveDeliveryMap';
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
import {
  coordsFromGeoLocation,
  restaurantIdFromOrder,
} from '../utils/restaurantCoords';

const TRACK_MAP_STATUSES = new Set(['rider_assigned', 'out_for_delivery']);

type FoodOrder = {
  id: string;
  type: 'food';
  orderNumber: string;
  restaurantId?: string | { id?: string; _id?: string };
  restaurantName?: string;
  restaurantCoords?: { lat: number; lng: number } | null;
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
  const [mapGestureActive, setMapGestureActive] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data: o } = await api.get<FoodOrder>(`/orders/${orderId}`);
      const stored = o.restaurantCoords;
      if (
        stored?.lat != null &&
        stored?.lng != null &&
        Number.isFinite(stored.lat) &&
        Number.isFinite(stored.lng)
      ) {
        return o;
      }
      const rid = restaurantIdFromOrder(o.restaurantId);
      if (!rid) return o;
      try {
        const { data: rest } = await api.get<{
          location?: { coordinates?: number[] };
        }>(`/restaurants/${rid}`);
        const coords = coordsFromGeoLocation(rest.location);
        if (coords) return { ...o, restaurantCoords: coords };
      } catch {
        /* restaurant lookup optional */
      }
      return o;
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status && TRACK_MAP_STATUSES.has(status)) return 5000;
      return false;
    },
  });

  const onRiderLocation = useCallback((payload: { lat: number; lng: number }) => {
    setRiderPos({ lat: payload.lat, lng: payload.lng });
  }, []);

  useEffect(() => {
    if (!data?.status || !TRACK_MAP_STATUSES.has(data.status)) return;
    const socket = connectOrderTracking(orderId);
    socket.on('rider:location', onRiderLocation);
    return () => {
      socket.off('rider:location', onRiderLocation);
      disconnectOrderTracking();
    };
  }, [orderId, data?.status, onRiderLocation]);

  useEffect(() => {
    if (data?.riderLocation) {
      setRiderPos(data.riderLocation);
    }
  }, [data?.riderLocation?.lat, data?.riderLocation?.lng]);

  const cancelMut = useMutation({
    mutationFn: async () => {
      await api.patch(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['order', orderId] }),
  });

  if (isLoading || !data) {
    return (
      <View style={shared.center}>
        <Text style={shared.muted}>{error ? String(error) : 'Loading…'}</Text>
      </View>
    );
  }

  const customer = data.deliveryAddress.coordinates;
  const restaurant = data.restaurantCoords ?? null;
  const hasCustomer =
    customer && Number.isFinite(customer.lat) && Number.isFinite(customer.lng);
  const showMap = TRACK_MAP_STATUSES.has(data.status) && !!hasCustomer;

  const liveRider = riderPos ?? data.riderLocation ?? null;
  const showRiderOnMap =
    !!liveRider &&
    Number.isFinite(liveRider.lat) &&
    Number.isFinite(liveRider.lng) &&
    TRACK_MAP_STATUSES.has(data.status);
  const showRiderLeg = data.status === 'out_for_delivery' && showRiderOnMap;
  const hasRestaurant =
    restaurant != null &&
    Number.isFinite(restaurant.lat) &&
    Number.isFinite(restaurant.lng);

  return (
    <StackScroll nestedScrollEnabled scrollEnabled={!mapGestureActive}>
      <Text style={shared.orderNum}>{data.orderNumber}</Text>
      {data.restaurantName ? <Text style={shared.meta}>{data.restaurantName}</Text> : null}
      <Text style={shared.stat}>Status: {data.status.replace(/_/g, ' ')}</Text>
      {data.deliveryEtaMinutes ? (
        <Text style={styles.eta}>ETA ~{data.deliveryEtaMinutes} min</Text>
      ) : null}
      <StatusStepper kind="food" status={data.status} />

      {showMap && customer ? (
        <View
          style={styles.mapWrap}
          onTouchStart={() => setMapGestureActive(true)}
          onTouchEnd={() => setMapGestureActive(false)}
          onTouchCancel={() => setMapGestureActive(false)}
        >
          <LiveDeliveryMap
            style={styles.map}
            restaurant={hasRestaurant ? restaurant : null}
            customer={customer}
            rider={showRiderOnMap ? liveRider : null}
            showRiderLeg={showRiderLeg}
            liveLabel={
              !hasRestaurant
                ? 'Live map · restaurant route unavailable for this order'
                : showRiderOnMap
                  ? 'Restaurant → you · live rider on map (updates every few seconds)'
                  : 'Restaurant → you · waiting for rider GPS…'
            }
          />
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
            <Text style={shared.line}>Subtotal ₹{(data.subtotal ?? data.total).toFixed(2)}</Text>
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

const mapH = Math.min(240, Dimensions.get('window').height * 0.32);

const styles = StyleSheet.create({
  eta: { color: colors.primaryBright, fontWeight: '700', marginBottom: 8 },
  mapWrap: {
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    height: mapH,
  },
  map: { flex: 1, width: '100%', height: '100%' },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import { LiveDeliveryMap } from '../components/map/LiveDeliveryMap';
import { StackScroll } from '../components/layout/StackScroll';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HomeStackParamList, OrdersStackParamList } from '../navigation/types';
import { api } from '../api/client';
import { StatusStepper } from '../components/StatusStepper';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { OrderPriceBreakdown } from '../components/food/OrderPriceBreakdown';
import type { CustomerPriceBreakdown } from '../api/orders';
import { checkoutOrderPayment, verifyOrderPayment } from '../api/orders';
import { openRazorpayCheckout } from '../services/razorpayCheckout';
import { TripContactCard } from '../components/trip/TripContactCard';
import { callOrderRestaurant, callOrderRider } from '../utils/placePeerCall';
import { shared } from '../theme/styles';
import {
  bindOrderDeliveryEvents,
  connectOrderTracking,
  disconnectOrderTracking,
} from '../services/orderSocket';
import { colors } from '../theme';
import {
  coordsFromGeoLocation,
  restaurantIdFromOrder,
} from '../utils/restaurantCoords';

const TRACK_MAP_STATUSES = new Set(['rider_assigned', 'out_for_delivery']);

const RESTAURANT_CONTACT_STATUSES = new Set([
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'out_for_delivery',
  'delivered',
]);

const RIDER_CONTACT_STATUSES = new Set(['rider_assigned', 'out_for_delivery', 'delivered']);

type OrderPeerSummary = { id: string; name: string };

type FoodOrder = {
  id: string;
  type: 'food';
  orderNumber: string;
  restaurantId?: string | { id?: string; _id?: string };
  restaurantName?: string;
  restaurantCoords?: { lat: number; lng: number } | null;
  restaurant?: OrderPeerSummary | null;
  rider?: OrderPeerSummary | null;
  items: { name: string; price: number; quantity: number }[];
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string;
  total: number;
  paymentStatus?: string;
  pricing?: CustomerPriceBreakdown;
  fulfillment?: string;
  deliveryFee?: number;
  packageFee?: number;
  gstAmount?: number;
  status: string;
  assignmentState?: string;
  riderDispatchMessage?: string | null;
  rejectReason?: string | null;
  acceptExpiresAt?: string | null;
  deliveryStatus?: string;
  deliveryEtaMinutes?: number;
  deliveryOtp?: string;
  deliveryOtpExpiresAt?: string;
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
      const assignment = q.state.data?.assignmentState;
      if (status === 'placed') return 5000;
      if (status === 'ready_for_pickup' && assignment !== 'assigned') return 8000;
      if (status && TRACK_MAP_STATUSES.has(status)) return 5000;
      return false;
    },
  });

  const onRiderLocation = useCallback((payload: { lat: number; lng: number }) => {
    setRiderPos({ lat: payload.lat, lng: payload.lng });
  }, []);

  useEffect(() => {
    if (!data?.status) return;
    const needsSocket =
      TRACK_MAP_STATUSES.has(data.status) ||
      (data.status === 'ready_for_pickup' && data.assignmentState !== 'assigned');
    if (!needsSocket) return;

    const socket = connectOrderTracking(orderId);
    socket.on('rider:location', onRiderLocation);
    const onOtp = () => void qc.invalidateQueries({ queryKey: ['order', orderId] });
    socket.on('order:otp', onOtp);
    const unbindDelivery = bindOrderDeliveryEvents(socket, {
      onDispatching: () => void qc.invalidateQueries({ queryKey: ['order', orderId] }),
      onNoRider: () => void qc.invalidateQueries({ queryKey: ['order', orderId] }),
      onAssigned: () => void qc.invalidateQueries({ queryKey: ['order', orderId] }),
    });
    return () => {
      socket.off('rider:location', onRiderLocation);
      socket.off('order:otp', onOtp);
      unbindDelivery();
      disconnectOrderTracking();
    };
  }, [orderId, data?.status, data?.assignmentState, onRiderLocation, qc]);

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
    onError: (err: unknown) => {
      Alert.alert('Cancel failed', err instanceof Error ? err.message : 'Could not cancel order');
    },
  });

  const payMut = useMutation({
    mutationFn: async () => {
      const checkout = await checkoutOrderPayment(orderId);
      const paymentResult = await openRazorpayCheckout(checkout.payment);
      await verifyOrderPayment(paymentResult);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['order', orderId] }),
    onError: (err: unknown) => {
      const code = (err as { code?: number })?.code;
      if (code === 0) return;
      Alert.alert('Payment', err instanceof Error ? err.message : 'Payment failed');
    },
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

  const paymentDue =
    data.paymentStatus === 'pending' || data.paymentStatus === 'failed';
  const showEta =
    data.deliveryEtaMinutes &&
    data.status !== 'delivered' &&
    data.status !== 'cancelled';

  return (
    <StackScroll nestedScrollEnabled scrollEnabled={!mapGestureActive}>
      <Text style={shared.orderNum}>{data.orderNumber}</Text>
      {data.restaurantName ? <Text style={shared.meta}>{data.restaurantName}</Text> : null}
      {data.paymentStatus && data.paymentStatus !== 'paid' && data.paymentStatus !== 'refunded' ? (
        <Text style={styles.paymentPending}>
          {data.paymentStatus === 'refund_failed'
            ? 'Refund could not be processed automatically. Contact Zygo support with your order number.'
            : `Payment ${data.paymentStatus} — complete payment to confirm your order.`}
        </Text>
      ) : null}
      {data.paymentStatus === 'refunded' ? (
        <Text style={styles.refunded}>
          Full refund processed — amount will return to your payment method in 5–7 business days.
        </Text>
      ) : null}
      {data.status === 'placed' ? (
        <Text style={styles.acceptWindow}>
          Waiting for restaurant to accept (up to 3 minutes)
        </Text>
      ) : null}
      {data.riderDispatchMessage ? (
        <Text
          style={
            data.assignmentState === 'failed' ? styles.riderSearchWarn : styles.riderSearchInfo
          }
        >
          {data.riderDispatchMessage}
        </Text>
      ) : null}
      {data.status === 'cancelled' && data.rejectReason ? (
        <Text style={styles.cancelReason}>{data.rejectReason}</Text>
      ) : null}
      {data.deliveryEtaMinutes && showEta ? (
        <Text style={styles.eta}>ETA ~{data.deliveryEtaMinutes} min</Text>
      ) : null}
      <StatusStepper kind="food" status={data.status} />

      {data.deliveryOtp ? (
        <Card glow style={shared.block}>
          <Text style={shared.h}>Delivery OTP</Text>
          <Text style={styles.otpCode}>{data.deliveryOtp}</Text>
          <Text style={styles.otpHint}>Share this OTP with your delivery partner to complete delivery.</Text>
        </Card>
      ) : null}

      {data.restaurant && RESTAURANT_CONTACT_STATUSES.has(data.status) ? (
        <TripContactCard
          title="Restaurant"
          name={data.restaurant.name}
          onCall={() => callOrderRestaurant(orderId)}
        />
      ) : null}

      {data.rider && RIDER_CONTACT_STATUSES.has(data.status) ? (
        <TripContactCard
          title="Your rider"
          name={data.rider.name}
          onCall={() => callOrderRider(orderId)}
        />
      ) : null}

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
      </Card>

      {data.pricing ? (
        <OrderPriceBreakdown breakdown={data.pricing} couponCode={data.couponCode} />
      ) : (
        <Card style={shared.block}>
          <Text style={shared.total}>Total ₹{data.total.toFixed(2)}</Text>
        </Card>
      )}
      <Card style={shared.block}>
        <Text style={shared.h}>Deliver to</Text>
        <Text style={shared.line}>
          {data.deliveryAddress.label}: {data.deliveryAddress.line1}
        </Text>
      </Card>
      {paymentDue && data.status === 'payment_pending' ? (
        <Button
          title={`Pay ₹${data.total.toFixed(2)}`}
          onPress={() => payMut.mutate()}
          loading={payMut.isPending}
        />
      ) : null}
      {data.status === 'placed' || data.status === 'payment_pending' ? (
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
  paymentPending: { color: '#fbbf24', fontWeight: '600', marginBottom: 8 },
  acceptWindow: { color: colors.primaryBright, fontWeight: '600', marginBottom: 8 },
  riderSearchInfo: { color: colors.primaryBright, fontWeight: '600', marginBottom: 8, lineHeight: 20 },
  riderSearchWarn: { color: '#fbbf24', fontWeight: '600', marginBottom: 8, lineHeight: 20 },
  otpCode: { color: colors.lavender, fontSize: 32, fontWeight: '900', letterSpacing: 4, marginTop: 6 },
  otpHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  cancelReason: { color: colors.error, fontWeight: '600', marginBottom: 8 },
  refunded: { color: colors.primaryBright, fontWeight: '600', marginBottom: 8 },
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

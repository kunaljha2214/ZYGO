import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HomeStackParamList, OrdersStackParamList } from '../navigation/types';
import { api } from '../api/client';
import { StatusStepper } from '../components/StatusStepper';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LiveRideMap } from '../components/map/LiveRideMap';
import {
  connectRideTracking,
  disconnectRideTracking,
  offDriverLocation,
  onDriverLocation,
} from '../services/rideSocket';
import { TripContactCard } from '../components/trip/TripContactCard';
import { callRideCaptain } from '../utils/placePeerCall';
import { checkoutRidePayment, verifyRidePayment } from '../api/rides';
import { openRazorpayCheckout } from '../services/razorpayCheckout';
import { shared } from '../theme/styles';
import { colors } from '../theme';

type Ride = {
  id: string;
  type: 'ride';
  pickup: { line1: string; coordinates: { lat: number; lng: number } };
  drop: { line1: string; coordinates: { lat: number; lng: number } };
  vehicleType: string;
  fare: number;
  distanceKm?: number;
  durationMin?: number;
  status: string;
  paymentStatus?: string;
  rideOtp?: string;
  rideOtpExpiresAt?: string;
  driverLastLocation?: { lat: number; lng: number } | null;
  captain?: { id: string; name: string } | null;
};

const CAPTAIN_CONTACT_STATUSES = new Set([
  'assigned',
  'arriving',
  'arrived',
  'in_progress',
  'completed',
]);

type R = RouteProp<HomeStackParamList, 'RideTrack'> | RouteProp<OrdersStackParamList, 'RideDetail'>;

const LIVE_STATUSES = new Set(['assigned', 'arriving', 'arrived', 'in_progress']);

export function RideTrackScreen() {
  const { rideId } = useRoute<R>().params;
  const qc = useQueryClient();
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mapGestureActive, setMapGestureActive] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ride', rideId],
    queryFn: async () => {
      const { data: r } = await api.get<Ride>(`/rides/${rideId}`);
      return r;
    },
    refetchInterval: 5000,
  });

  const onDriverLocationUpdate = useCallback(
    (payload: { lat: number; lng: number; rideId?: string }) => {
      if (payload.rideId && payload.rideId !== rideId) return;
      setDriverPos({ lat: payload.lat, lng: payload.lng });
    },
    [rideId]
  );

  useEffect(() => {
    if (!data || !LIVE_STATUSES.has(data.status)) return;
    const socket = connectRideTracking(rideId);
    onDriverLocation(onDriverLocationUpdate);
    const onStatus = () => void qc.invalidateQueries({ queryKey: ['ride', rideId] });
    socket.on('ride:status', onStatus);
    const onOtp = () => void qc.invalidateQueries({ queryKey: ['ride', rideId] });
    socket.on('ride:otp', onOtp);
    const onOtpVerified = () => void qc.invalidateQueries({ queryKey: ['ride', rideId] });
    socket.on('ride:otp_verified', onOtpVerified);
    return () => {
      offDriverLocation(onDriverLocationUpdate);
      socket.off('ride:status', onStatus);
      socket.off('ride:otp', onOtp);
      socket.off('ride:otp_verified', onOtpVerified);
      disconnectRideTracking();
    };
  }, [rideId, data?.status, onDriverLocationUpdate, qc]);

  useEffect(() => {
    if (data?.driverLastLocation) {
      setDriverPos(data.driverLastLocation);
    }
  }, [data?.driverLastLocation]);

  const cancelMut = useMutation({
    mutationFn: async () => {
      await api.patch(`/rides/${rideId}/cancel`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ride', rideId] }),
    onError: (err: unknown) => {
      Alert.alert('Cancel failed', err instanceof Error ? err.message : 'Could not cancel ride');
    },
  });

  const payMut = useMutation({
    mutationFn: async () => {
      const checkout = await checkoutRidePayment(rideId);
      const paymentResult = await openRazorpayCheckout(checkout.payment);
      await verifyRidePayment(paymentResult);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ride', rideId] }),
    onError: (err: unknown) => {
      const code = (err as { code?: number })?.code;
      if (code === 0) return;
      const msg = err instanceof Error ? err.message : 'Payment failed';
      Alert.alert('Payment', msg);
    },
  });

  if (isLoading || !data) {
    return (
      <View style={shared.center}>
        <Text style={shared.muted}>{error ? String(error) : 'Loading…'}</Text>
      </View>
    );
  }

  const pickup = data.pickup.coordinates;
  const drop = data.drop.coordinates;
  const showLiveMap = LIVE_STATUSES.has(data.status);
  const liveDriver = driverPos ?? data.driverLastLocation ?? null;
  const showDriverOnMap =
    showLiveMap &&
    !!liveDriver &&
    Number.isFinite(liveDriver.lat) &&
    Number.isFinite(liveDriver.lng);
  const showDriverLeg =
    showDriverOnMap &&
    data.status !== 'in_progress' &&
    data.status !== 'completed';
  const cancellable = data.status !== 'in_progress' && data.status !== 'completed';
  const paymentPending =
    data.status === 'completed' && data.paymentStatus !== 'paid';
  const paymentDone = data.status === 'completed' && data.paymentStatus === 'paid';

  return (
    <StackScroll nestedScrollEnabled scrollEnabled={!mapGestureActive}>
      <Text style={shared.fareAccent}>₹{data.fare.toFixed(2)}</Text>
      <Text style={shared.metaCap}>
        {data.vehicleType} · {data.status.replace(/_/g, ' ')}
      </Text>
      {data.durationMin && data.status !== 'completed' && data.status !== 'cancelled' ? (
        <Text style={styles.eta}>
          ETA ~{data.durationMin} min
          {data.distanceKm ? ` · ${data.distanceKm} km` : ''}
        </Text>
      ) : null}
      <StatusStepper kind="ride" status={data.status} />

      {data.rideOtp ? (
        <Card glow style={shared.block}>
          <Text style={shared.h}>Ride OTP</Text>
          <Text style={styles.otpCode}>{data.rideOtp}</Text>
          <Text style={styles.otpHint}>Share this OTP with your captain to start the ride.</Text>
        </Card>
      ) : null}

      <View
        onTouchStart={() => setMapGestureActive(true)}
        onTouchEnd={() => setMapGestureActive(false)}
        onTouchCancel={() => setMapGestureActive(false)}
      >
        {showLiveMap ? (
          <LiveRideMap
            style={styles.mapWrap}
            pickup={pickup}
            drop={drop}
            driver={showDriverOnMap ? liveDriver : null}
            vehicleType={data.vehicleType}
            showDriverToPickup={showDriverLeg}
            liveLabel={
              showDriverOnMap
                ? 'Pickup → drop · live captain on map (updates every few seconds)'
                : 'Pickup → drop · waiting for captain GPS…'
            }
          />
        ) : (
          <LiveRideMap
            style={styles.mapWrap}
            pickup={pickup}
            drop={drop}
            liveLabel="Pickup → drop route"
            showHeatmap
          />
        )}
      </View>

      {data.captain && CAPTAIN_CONTACT_STATUSES.has(data.status) ? (
        <TripContactCard
          title="Your captain"
          name={data.captain.name}
          onCall={() => callRideCaptain(rideId)}
        />
      ) : null}

      <Card glow style={shared.block}>
        <Text style={shared.h}>Pickup</Text>
        <Text style={shared.line}>{data.pickup.line1}</Text>
      </Card>
      <Card style={shared.block}>
        <Text style={shared.h}>Drop</Text>
        <Text style={shared.line}>{data.drop.line1}</Text>
      </Card>
      {paymentPending ? (
        <Button
          title={`Pay ₹${data.fare.toFixed(2)}`}
          onPress={() => payMut.mutate()}
          loading={payMut.isPending}
        />
      ) : null}
      {paymentDone ? (
        <Text style={styles.paidNote}>Fare paid · thank you for riding with Zygo</Text>
      ) : null}
      {cancellable && data.status !== 'cancelled' ? (
        <Button
          title="Cancel ride"
          variant="ghost"
          onPress={() => cancelMut.mutate()}
          loading={cancelMut.isPending}
        />
      ) : null}
    </StackScroll>
  );
}

const mapH = Math.min(280, Dimensions.get('window').height * 0.36);

const styles = StyleSheet.create({
  paidNote: {
    color: colors.primaryBright,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 12,
  },
  eta: { color: colors.primaryBright, fontWeight: '700', marginBottom: 8 },
  otpCode: { color: colors.lavender, fontSize: 32, fontWeight: '900', letterSpacing: 4, marginTop: 6 },
  otpHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  mapWrap: {
    height: mapH,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
});

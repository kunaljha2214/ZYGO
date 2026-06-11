import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';
import type { HomeStackProps } from '../navigation/types';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LiveRideMap } from '../components/map/LiveRideMap';
import { isFiniteCoord } from '../components/rides/mapTypes';
import { shared } from '../theme/styles';
import { colors } from '../theme';

type Vehicle = { id: string; label: string; baseFare: number; perKm: number; perMin: number };

type Props = HomeStackProps<'RideFare'>;

export function RideFareScreen({ navigation, route }: Props) {
  const { pickup, drop } = route.params;

  const [vehicleType, setVehicleType] = useState<string>('bike');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [estimate, setEstimate] = useState<{
    distanceKm: number;
    durationMin: number;
    fare: number;
  } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(true);
  const [estimateErr, setEstimateErr] = useState<string | null>(null);
  const [estimateRetry, setEstimateRetry] = useState(0);
  const [booking, setBooking] = useState(false);
  const [bookErr, setBookErr] = useState<string | null>(null);
  const [mapGestureActive, setMapGestureActive] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{ vehicleTypes: Vehicle[] }>('/config/vehicle-types');
        setVehicles(data.vehicleTypes);
      } catch {
        setVehicles([
          { id: 'bike', label: 'Bike', baseFare: 25, perKm: 8, perMin: 1.5 },
          { id: 'auto', label: 'Auto', baseFare: 40, perKm: 12, perMin: 2 },
          { id: 'car', label: 'Car', baseFare: 60, perKm: 18, perMin: 2.5 },
        ]);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setEstimateLoading(true);
      setEstimateErr(null);
      try {
        const { data } = await api.post<{ distanceKm: number; durationMin: number; fare: number }>(
          '/rides/estimate',
          {
            pickup: { coordinates: pickup.coordinates },
            drop: { coordinates: drop.coordinates },
            vehicleType,
          }
        );
        if (!cancelled) {
          setEstimate(data);
          setEstimateLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setEstimate(null);
          setEstimateErr(e instanceof Error ? e.message : 'Could not calculate fare');
          setEstimateLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickup.coordinates.lat, pickup.coordinates.lng, drop.coordinates.lat, drop.coordinates.lng, vehicleType, estimateRetry]);

  async function confirm() {
    setBookErr(null);
    setBooking(true);
    try {
      const { data } = await api.post<{ id: string }>('/rides', {
        pickup,
        drop,
        vehicleType,
      });
      navigation.replace('RideTrack', { rideId: data.id });
    } catch (e) {
      setBookErr(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  const pickupCoord = pickup.coordinates;
  const dropCoord = drop.coordinates;
  const showRouteMap = isFiniteCoord(pickupCoord) && isFiniteCoord(dropCoord);

  return (
    <StackScroll nestedScrollEnabled scrollEnabled={!mapGestureActive}>
      {showRouteMap ? (
        <View
          style={shared.mapBox}
          onTouchStart={() => setMapGestureActive(true)}
          onTouchEnd={() => setMapGestureActive(false)}
          onTouchCancel={() => setMapGestureActive(false)}
        >
          <LiveRideMap
            style={shared.map}
            pickup={pickupCoord}
            drop={dropCoord}
            liveLabel="Pickup → drop · confirm your route below"
          />
        </View>
      ) : null}

      <Card glow style={styles.tripCard}>
        <Text style={shared.label}>Pickup</Text>
        <Text style={styles.placeLine} numberOfLines={3}>
          {pickup.line1}
        </Text>
        <Text style={[shared.label, styles.dropLabel]}>Drop</Text>
        <Text style={styles.placeLine} numberOfLines={3}>
          {drop.line1}
        </Text>
      </Card>

      <Text style={shared.sectionLabel}>Vehicle</Text>

      <View style={shared.vehicleRow}>
        {vehicles.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => setVehicleType(v.id)}
            style={[shared.vehicleChip, vehicleType === v.id && shared.vehicleChipOn]}
          >
            <Text style={[shared.vehicleChipTxt, vehicleType === v.id && shared.vehicleChipTxtOn]}>
              {v.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {estimate ? (
        <Card glow style={shared.box}>
          <Text style={shared.meta}>
            Route · ~{estimate.distanceKm} km · ~{estimate.durationMin} min
          </Text>
          <Text style={shared.fare}>₹{estimate.fare.toFixed(2)}</Text>
          <Text style={shared.muted}>Pay securely with Razorpay after your ride ends</Text>
        </Card>
      ) : estimateLoading ? (
        <Text style={shared.muted}>Calculating fare…</Text>
      ) : (
        <View>
          <Text style={shared.err}>{estimateErr ?? 'Could not calculate fare'}</Text>
          <Button
            title="Retry fare estimate"
            variant="ghost"
            onPress={() => setEstimateRetry((n) => n + 1)}
          />
        </View>
      )}

      <Button
        title="Confirm ride"
        onPress={() => void confirm()}
        loading={booking}
        disabled={!estimate}
      />

      {bookErr ? <Text style={shared.err}>{bookErr}</Text> : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  tripCard: { marginBottom: 4 },
  dropLabel: { marginTop: 14 },
  placeLine: { color: colors.text, fontSize: 16, lineHeight: 22 },
});


import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { RideMapView } from '../rides/RideMapView';
import { MapMarker } from '../rides/MapMarker';
import { RiderMapMarker } from './RiderMapMarker';
import { RouteLine } from './RouteLine';
import { fetchDrivingRoute } from '../../services/mapboxDirections';
import {
  boundsFromLatLngPoints,
  isFiniteCoord,
  toMapCoordinate,
} from '../rides/mapTypes';
import { colors } from '../../theme';

type Coord = { lat: number; lng: number };

type Props = {
  style?: StyleProp<ViewStyle>;
  customer: Coord;
  restaurant?: Coord | null;
  rider?: Coord | null;
  showRiderLeg?: boolean;
  liveLabel?: string;
};

export function LiveDeliveryMap({
  style,
  customer,
  restaurant,
  rider,
  showRiderLeg = false,
  liveLabel = 'Live rider tracking',
}: Props) {
  const [deliveryRoute, setDeliveryRoute] = useState<[number, number][] | null>(null);
  const [riderRoute, setRiderRoute] = useState<[number, number][] | null>(null);

  const hasRestaurant = restaurant != null && isFiniteCoord(restaurant);

  useEffect(() => {
    if (!hasRestaurant || !restaurant) {
      setDeliveryRoute(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const route = await fetchDrivingRoute(restaurant, customer);
      if (!cancelled && route) setDeliveryRoute(route.coordinates);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasRestaurant, restaurant?.lat, restaurant?.lng, customer.lat, customer.lng]);

  useEffect(() => {
    if (!showRiderLeg || !rider || !isFiniteCoord(rider)) {
      setRiderRoute(null);
      return;
    }
    const dest = customer;
    let cancelled = false;
    void (async () => {
      const route = await fetchDrivingRoute(rider, dest);
      if (!cancelled && route) setRiderRoute(route.coordinates);
    })();
    return () => {
      cancelled = true;
    };
  }, [rider?.lat, rider?.lng, customer.lat, customer.lng, showRiderLeg]);

  const fitBounds = useMemo(() => {
    const local: Coord[] = [customer];
    if (rider && isFiniteCoord(rider)) local.push(rider);

    const all: Coord[] = [...local];
    if (hasRestaurant && restaurant) all.unshift(restaurant);
    if (deliveryRoute?.length) {
      for (const [lng, lat] of deliveryRoute) {
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          all.push({ lat, lng });
        }
      }
    }

    const full = boundsFromLatLngPoints(all, 0.2);
    if (!full) return boundsFromLatLngPoints(local, 0.2);

    const latSpan = Math.abs(full.ne[1] - full.sw[1]);
    const lngSpan = Math.abs(full.ne[0] - full.sw[0]);
    // Bad/mismatched coords (e.g. seed restaurant vs real delivery) — keep a usable street-level view.
    if (latSpan > 0.12 || lngSpan > 0.12) {
      return boundsFromLatLngPoints(local, 0.22);
    }
    return full;
  }, [hasRestaurant, restaurant, customer, rider, deliveryRoute]);

  const fitBoundsKey = useMemo(() => {
    const r = hasRestaurant && restaurant ? `${restaurant.lat},${restaurant.lng}` : 'no-rest';
    const hasRider = rider && isFiniteCoord(rider) ? '1' : '0';
    return `${r},${customer.lat},${customer.lng},rider${hasRider},route${deliveryRoute?.length ?? 0}`;
  }, [hasRestaurant, restaurant, customer, rider, deliveryRoute?.length]);

  const customerPin = toMapCoordinate(customer);
  const restPin = hasRestaurant && restaurant ? toMapCoordinate(restaurant) : null;
  const riderPin = rider && isFiniteCoord(rider) ? toMapCoordinate(rider) : null;

  return (
    <View style={style}>
      <RideMapView style={styles.map} fitBounds={fitBounds} fitBoundsKey={fitBoundsKey} fitPadding={56}>
        {deliveryRoute ? (
          <RouteLine id="delivery-route" coordinates={deliveryRoute} color="#c084fc" width={4} />
        ) : null}
        {riderRoute ? (
          <RouteLine id="rider-leg" coordinates={riderRoute} color="#38bdf8" width={3.5} dashed />
        ) : null}
        {restPin ? (
          <MapMarker coordinate={restPin} identifier="restaurant" pinColor="#22c55e" />
        ) : null}
        <MapMarker coordinate={customerPin} identifier="customer" pinColor="#ef4444" />
        {riderPin ? <RiderMapMarker coordinate={riderPin} /> : null}
      </RideMapView>
      {liveLabel ? (
        <Text style={styles.live} pointerEvents="none">
          {liveLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%', height: '100%' },
  live: {
    textAlign: 'center',
    color: colors.primaryBright,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 8,
    backgroundColor: 'rgba(15,15,26,0.85)',
  },
});

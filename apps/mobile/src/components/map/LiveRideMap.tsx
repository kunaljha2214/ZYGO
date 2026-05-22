import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { RideMapView } from '../rides/RideMapView';
import { MapMarker } from '../rides/MapMarker';
import { DriverMapMarker } from './DriverMapMarker';
import { RouteLine } from './RouteLine';
import { DemandHeatmap } from './DemandHeatmap';
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
  pickup: Coord;
  drop: Coord;
  driver?: Coord | null;
  vehicleType?: string;
  showHeatmap?: boolean;
  showDriverToPickup?: boolean;
  liveLabel?: string;
};

export function LiveRideMap({
  style,
  pickup,
  drop,
  driver,
  vehicleType,
  showHeatmap = false,
  showDriverToPickup = false,
  liveLabel,
}: Props) {
  const [tripRoute, setTripRoute] = useState<[number, number][] | null>(null);
  const [driverRoute, setDriverRoute] = useState<[number, number][] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const route = await fetchDrivingRoute(pickup, drop);
      if (!cancelled && route) setTripRoute(route.coordinates);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickup.lat, pickup.lng, drop.lat, drop.lng]);

  useEffect(() => {
    if (!showDriverToPickup || !driver) {
      setDriverRoute(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const route = await fetchDrivingRoute(driver, pickup);
      if (!cancelled && route) setDriverRoute(route.coordinates);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.lat, driver?.lng, pickup.lat, pickup.lng, showDriverToPickup]);

  const fitBounds = useMemo(() => {
    const local: Coord[] = [pickup, drop];
    if (driver && isFiniteCoord(driver)) local.push(driver);

    const all: Coord[] = [...local];
    if (tripRoute?.length) {
      for (const [lng, lat] of tripRoute) {
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          all.push({ lat, lng });
        }
      }
    }

    const full = boundsFromLatLngPoints(all, 0.22);
    if (!full) return boundsFromLatLngPoints(local, 0.22);

    const latSpan = Math.abs(full.ne[1] - full.sw[1]);
    const lngSpan = Math.abs(full.ne[0] - full.sw[0]);
    if (latSpan > 0.12 || lngSpan > 0.12) {
      return boundsFromLatLngPoints(local, 0.22);
    }
    return full;
  }, [pickup, drop, driver, tripRoute]);

  const fitBoundsKey = useMemo(() => {
    const hasDriver = driver && isFiniteCoord(driver) ? '1' : '0';
    return `${pickup.lat.toFixed(5)},${pickup.lng.toFixed(5)},${drop.lat.toFixed(5)},${drop.lng.toFixed(5)},driver${hasDriver},r${tripRoute?.length ?? 0}`;
  }, [pickup, drop, driver, tripRoute?.length]);

  const pickupPin = toMapCoordinate(pickup);
  const dropPin = toMapCoordinate(drop);
  const driverPin = driver && isFiniteCoord(driver) ? toMapCoordinate(driver) : null;

  return (
    <View style={style}>
      <RideMapView
        style={styles.map}
        fitBounds={fitBounds}
        fitBoundsKey={fitBoundsKey}
        fitPadding={56}
        showsUserLocation
      >
        {showHeatmap ? <DemandHeatmap /> : null}
        {tripRoute ? <RouteLine id="trip-route" coordinates={tripRoute} color="#c084fc" width={4} /> : null}
        {driverRoute ? (
          <RouteLine id="driver-route" coordinates={driverRoute} color="#38bdf8" width={3.5} dashed />
        ) : null}
        <MapMarker coordinate={pickupPin} identifier="pickup" pinColor="#22c55e" />
        <MapMarker coordinate={dropPin} identifier="drop" pinColor="#ef4444" />
        {driverPin ? (
          <DriverMapMarker coordinate={driverPin} vehicleType={vehicleType} />
        ) : null}
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

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { RideMapView } from '../rides/RideMapView';
import { MapMarker } from '../rides/MapMarker';
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
  showHeatmap?: boolean;
  showDriverToPickup?: boolean;
  liveLabel?: string;
};

export function LiveRideMap({
  style,
  pickup,
  drop,
  driver,
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
    const points: Coord[] = [pickup, drop];
    if (driver && isFiniteCoord(driver)) points.push(driver);
    if (tripRoute?.length) {
      for (const [lng, lat] of tripRoute) {
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          points.push({ lat, lng });
        }
      }
    }
    return boundsFromLatLngPoints(points, 0.22);
  }, [pickup, drop, driver, tripRoute]);

  const fitBoundsKey = useMemo(
    () =>
      `${pickup.lat.toFixed(5)},${pickup.lng.toFixed(5)},${drop.lat.toFixed(5)},${drop.lng.toFixed(5)},r${tripRoute?.length ?? 0}`,
    [pickup, drop, tripRoute?.length]
  );

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
          <MapMarker coordinate={driverPin} identifier="driver" pinColor="#fbbf24" />
        ) : null}
      </RideMapView>
      {liveLabel ? <Text style={styles.live}>{liveLabel}</Text> : null}
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { RideMapView } from '../rides/RideMapView';
import { MapMarker } from '../rides/MapMarker';
import { DemandHeatmap } from './DemandHeatmap';
import {
  ensureLocationPermission,
  getFreshMapCoordinates,
  type Coords,
} from '../../services/location';
import { colors, radii, spacing } from '../../theme';

export type PartnerHubMapVariant = 'ride' | 'delivery';

type Props = {
  online?: boolean;
  variant?: PartnerHubMapVariant;
};

const COPY: Record<
  PartnerHubMapVariant,
  { liveTitle: string; previewTitle: string; subReady: string; subWait: string; markerId: string }
> = {
  ride: {
    liveTitle: 'Live map',
    previewTitle: 'Map preview',
    subReady: 'Your GPS position · pinch to zoom, drag to pan',
    subWait: 'Waiting for GPS…',
    markerId: 'driver-hub',
  },
  delivery: {
    liveTitle: 'Live map',
    previewTitle: 'Map preview',
    subReady: 'Your position · pinch to zoom, drag to pan',
    subWait: 'Waiting for GPS…',
    markerId: 'delivery-hub',
  },
};

export function PartnerHubMap({ online, variant = 'ride' }: Props) {
  const copy = COPY[variant];
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  const cameraFittedRef = useRef(false);
  const watchStartedRef = useRef(false);

  const resolveLocation = useCallback(async () => {
    setLocating(true);
    setLocError(null);
    const permission = await ensureLocationPermission();
    if (permission !== 'granted') {
      setLocating(false);
      setLocError('Allow location to show your position on the map.');
      return;
    }
    try {
      const fix = await getFreshMapCoordinates();
      setCoords(fix);
    } catch {
      setLocError('Could not get GPS — check Location is on, then refresh Hub.');
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    void resolveLocation();
  }, [resolveLocation]);

  useEffect(() => {
    if (!coords || watchStartedRef.current) return;
    watchStartedRef.current = true;
    const watchId = Geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        distanceFilter: 25,
        interval: 10_000,
        fastestInterval: 5000,
      }
    );
    return () => {
      Geolocation.clearWatch(watchId);
      watchStartedRef.current = false;
    };
  }, [coords]);

  const regionFitKey = (() => {
    if (!coords) return 'hub-waiting';
    if (cameraFittedRef.current) return 'hub-ready';
    cameraFittedRef.current = true;
    return 'hub-initial-fit';
  })();

  const mapRegion = coords
    ? {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      }
    : undefined;

  return (
    <View style={styles.wrap}>
      {locating && !coords ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primaryBright} />
          <Text style={styles.overlayText}>Finding your location…</Text>
        </View>
      ) : null}
      {locError && !coords ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayErr}>{locError}</Text>
        </View>
      ) : null}
      {coords ? (
        <RideMapView
          style={styles.map}
          region={mapRegion}
          regionFitKey={regionFitKey}
          showsUserLocation
        >
          {online ? <DemandHeatmap /> : null}
          <MapMarker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            identifier={copy.markerId}
            pinColor={online ? '#22c55e' : colors.primary}
          />
        </RideMapView>
      ) : (
        <View style={styles.mapPlaceholder} />
      )}
      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.captionTitle}>{online ? copy.liveTitle : copy.previewTitle}</Text>
        <Text style={styles.captionSub}>{coords ? copy.subReady : copy.subWait}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.card,
  },
  map: { flex: 1, width: '100%', height: '100%' },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    padding: spacing.md,
  },
  overlayText: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
  overlayErr: { color: colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 18 },
  caption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  captionTitle: { color: colors.lavender, fontWeight: '800', fontSize: 13 },
  captionSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});

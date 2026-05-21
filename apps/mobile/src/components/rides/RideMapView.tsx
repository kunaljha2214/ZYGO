import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Camera, LocationPuck, MapView, UserLocation } from '@rnmapbox/maps';
import { hasValidMapboxToken, mapboxStyleURL } from '../../config/mapbox';
import { colors } from '../../theme';
import {
  regionToCenter,
  zoomFromLatitudeDelta,
  type MapBounds,
  type MapCoordinate,
  type MapPressEvent,
  type MapRegion,
} from './mapTypes';

const DEFAULT_FIT_PADDING = 52;

export type RideMapViewRef = {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  fitBounds: (bounds: MapBounds, padding?: number) => void;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: MapRegion;
  /** Fit once when regionFitKey changes; does not override user pan/zoom after. */
  region?: MapRegion;
  regionFitKey?: string;
  /** Fit once when fitBoundsKey changes (preferred for routes). */
  fitBounds?: MapBounds | null;
  fitBoundsKey?: string;
  fitPadding?: number;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  loadingEnabled?: boolean;
  moveOnMarkerPress?: boolean;
  cacheEnabled?: boolean;
  onMapReady?: () => void;
  onPress?: (e: MapPressEvent) => void;
  onLongPress?: (e: MapPressEvent) => void;
  onPoiClick?: (e: MapPressEvent) => void;
  onUserLocationChange?: (e: {
    nativeEvent: { coordinate?: MapCoordinate };
  }) => void;
  children?: React.ReactNode;
};

function MapUnavailablePanel({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.unavailable, style]}>
      <Text style={styles.unavailableTitle}>Map unavailable</Text>
      <Text style={styles.unavailableBody}>
        Add MAPBOX_ACCESS_TOKEN (pk.…) to apps/mobile/.env, then rebuild the app.
      </Text>
    </View>
  );
}

function pressFromFeature(
  feature: { geometry?: { type?: string; coordinates?: number[] } },
  handler?: (e: MapPressEvent) => void
): void {
  if (!handler) return;
  const coords = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : null;
  if (!coords || coords.length < 2) return;
  handler({
    nativeEvent: {
      coordinate: { latitude: coords[1], longitude: coords[0] },
    },
  });
}

function cameraPadding(pad: number) {
  return {
    paddingTop: pad,
    paddingBottom: pad,
    paddingLeft: pad,
    paddingRight: pad,
  };
}

export const RideMapView = React.forwardRef<RideMapViewRef, Props>(function RideMapView(
  {
    style,
    initialRegion,
    region,
    regionFitKey,
    fitBounds,
    fitBoundsKey,
    fitPadding = DEFAULT_FIT_PADDING,
    showsUserLocation,
    onMapReady,
    onPress,
    onLongPress,
    onUserLocationChange,
    children,
  },
  ref
) {
  const cameraRef = useRef<Camera>(null);
  const mapReadyFired = useRef(false);
  const lastFitKeyRef = useRef<string | null>(null);
  const activeRegion = region ?? initialRegion;

  const applyBounds = useCallback((bounds: MapBounds, padding: number, duration = 450) => {
    cameraRef.current?.setCamera({
      bounds: { ne: bounds.ne, sw: bounds.sw },
      padding: cameraPadding(padding),
      animationDuration: duration,
      animationMode: 'easeTo',
    });
  }, []);

  const animateToRegion = useCallback((r: MapRegion, duration = 280) => {
    cameraRef.current?.setCamera({
      centerCoordinate: regionToCenter(r),
      zoomLevel: zoomFromLatitudeDelta(r.latitudeDelta),
      animationDuration: duration,
      animationMode: 'easeTo',
    });
  }, []);

  const fitBoundsToMap = useCallback(
    (bounds: MapBounds, padding = fitPadding) => {
      applyBounds(bounds, padding);
    },
    [applyBounds, fitPadding]
  );

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion,
      fitBounds: fitBoundsToMap,
    }),
    [animateToRegion, fitBoundsToMap]
  );

  useEffect(() => {
    if (!fitBounds || !fitBoundsKey) return;
    if (lastFitKeyRef.current === fitBoundsKey) return;
    lastFitKeyRef.current = fitBoundsKey;
    applyBounds(fitBounds, fitPadding);
  }, [fitBounds, fitBoundsKey, fitPadding, applyBounds]);

  useEffect(() => {
    if (!region || !regionFitKey) return;
    if (lastFitKeyRef.current === regionFitKey) return;
    lastFitKeyRef.current = regionFitKey;
    animateToRegion(region, 400);
  }, [region, regionFitKey, animateToRegion]);

  const handleMapLoaded = useCallback(() => {
    if (mapReadyFired.current) return;
    mapReadyFired.current = true;

    if (fitBounds && fitBoundsKey) {
      if (lastFitKeyRef.current !== fitBoundsKey) {
        lastFitKeyRef.current = fitBoundsKey;
        applyBounds(fitBounds, fitPadding, 0);
      }
    } else if (region && regionFitKey) {
      if (lastFitKeyRef.current !== regionFitKey) {
        lastFitKeyRef.current = regionFitKey;
        animateToRegion(region, 0);
      }
    } else if (activeRegion) {
      animateToRegion(activeRegion, 0);
    }

    onMapReady?.();
  }, [
    activeRegion,
    animateToRegion,
    applyBounds,
    fitBounds,
    fitBoundsKey,
    fitPadding,
    onMapReady,
    region,
    regionFitKey,
  ]);

  if (!hasValidMapboxToken()) {
    return <MapUnavailablePanel style={style} />;
  }

  const mapStyle = StyleSheet.flatten([styles.mapFill, style]);

  const initialZoom = activeRegion
    ? zoomFromLatitudeDelta(activeRegion.latitudeDelta)
    : 14;
  const initialCenter = activeRegion ? regionToCenter(activeRegion) : [77.3178, 28.4089];

  return (
    <MapView
      style={mapStyle}
      styleURL={mapboxStyleURL()}
      compassEnabled
      pitchEnabled={false}
      rotateEnabled={false}
      scrollEnabled
      zoomEnabled
      onDidFinishLoadingMap={handleMapLoaded}
      onPress={(f) => pressFromFeature(f, onPress)}
      onLongPress={(f) => pressFromFeature(f, onLongPress)}
    >
      <Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: initialCenter,
          zoomLevel: initialZoom,
        }}
      />
      {showsUserLocation ? <LocationPuck puckBearingEnabled puckBearing="heading" visible /> : null}
      {onUserLocationChange ? (
        <UserLocation
          visible={false}
          onUpdate={(loc) => {
            const c = loc.coords;
            if (!c) return;
            onUserLocationChange({
              nativeEvent: {
                coordinate: { latitude: c.latitude, longitude: c.longitude },
              },
            });
          }}
        />
      ) : null}
      {children}
    </MapView>
  );
});

const styles = StyleSheet.create({
  mapFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  unavailable: {
    flex: 1,
    minHeight: 160,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  unavailableTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  unavailableBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { RideMapView } from './RideMapView';
import { Button } from '../Button';
import { reverseGeocode, type GeocodedPlace } from '../../services/geocoding';
import { ensureLocationPermission, getFreshMapCoordinates } from '../../services/location';
import { withTimeout } from '../../utils/withTimeout';
import { colors } from '../../theme';

export type LocationPickerKind = 'pickup' | 'drop';

type Props = {
  visible: boolean;
  kind: LocationPickerKind;
  title: string;
  hint: string;
  fallback: { lat: number; lng: number };
  onClose: () => void;
  onConfirm: (place: GeocodedPlace, kind: LocationPickerKind) => void;
};

function regionFor(lat: number, lng: number): Region {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.004,
    longitudeDelta: 0.004,
  };
}

export function LocationPickerModal({
  visible,
  kind,
  title,
  hint,
  fallback,
  onClose,
  onConfirm,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const snappedToUser = useRef(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [pin, setPin] = useState(fallback);
  const [initialRegion, setInitialRegion] = useState<Region>(() =>
    regionFor(fallback.lat, fallback.lng)
  );
  const [booting, setBooting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [addressPreview, setAddressPreview] = useState<string | null>(null);

  const centerMap = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(regionFor(lat, lng), 280);
  }, []);

  const loadPreview = useCallback(async (lat: number, lng: number) => {
    setPreviewLoading(true);
    try {
      const p = await withTimeout(reverseGeocode(lat, lng), 10_000, 'address');
      setAddressPreview(p.label);
    } catch {
      setAddressPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const placePinAt = useCallback(
    (lat: number, lng: number) => {
      setPin({ lat, lng });
      centerMap(lat, lng);
      void loadPreview(lat, lng);
    },
    [centerMap, loadPreview]
  );

  const onModalShow = useCallback(() => {
    setMapMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      setMapMounted(false);
      snappedToUser.current = false;
      return;
    }

    setPin(fallback);
    setInitialRegion(regionFor(fallback.lat, fallback.lng));
    setAddressPreview(null);

    let cancelled = false;

    void (async () => {
      setBooting(true);
      snappedToUser.current = false;

      const permission = await ensureLocationPermission();
      let start = fallback;

      if (permission === 'granted') {
        try {
          const gps = await withTimeout(getFreshMapCoordinates(), 15_000, 'GPS');
          start = gps;
        } catch {
          /* keep fallback */
        }
      }

      if (cancelled) return;

      setPin(start);
      const region = regionFor(start.lat, start.lng);
      setInitialRegion(region);
      void loadPreview(start.lat, start.lng);
      setBooting(false);

      if (mapMounted) {
        setTimeout(() => centerMap(start.lat, start.lng), Platform.OS === 'android' ? 400 : 100);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, kind, fallback.lat, fallback.lng, loadPreview, mapMounted, centerMap]);

  const onMapReady = useCallback(() => {
    centerMap(pin.lat, pin.lng);
  }, [centerMap, pin.lat, pin.lng]);

  const onUserLocationChange = useCallback(
    (e: { nativeEvent: { coordinate?: { latitude: number; longitude: number } } }) => {
      const c = e.nativeEvent.coordinate;
      if (!c || snappedToUser.current) return;
      snappedToUser.current = true;
      placePinAt(c.latitude, c.longitude);
    },
    [placePinAt]
  );

  async function confirmPin() {
    setBusy(true);
    try {
      const place = await withTimeout(reverseGeocode(pin.lat, pin.lng), 12_000, 'address');
      onConfirm(place, kind);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      hardwareAccelerated
      onShow={onModalShow}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {booting ? (
          <View style={styles.bootBanner}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.bootBannerText}>Getting your location…</Text>
          </View>
        ) : null}

        <View style={styles.mapWrap}>
          {mapMounted ? (
            <RideMapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              onMapReady={onMapReady}
              loadingEnabled
              showsUserLocation
              showsMyLocationButton
              moveOnMarkerPress={false}
              cacheEnabled={false}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                placePinAt(latitude, longitude);
              }}
              onLongPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                placePinAt(latitude, longitude);
              }}
              onPoiClick={(e) => {
                const { coordinate } = e.nativeEvent;
                placePinAt(coordinate.latitude, coordinate.longitude);
              }}
              onUserLocationChange={onUserLocationChange}
            >
              <Marker
                key={`pin-${pin.lat.toFixed(6)}-${pin.lng.toFixed(6)}`}
                identifier="selected-pin"
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                draggable
                tracksViewChanges={Platform.OS === 'android'}
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  placePinAt(latitude, longitude);
                }}
              />
            </RideMapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>{hint}</Text>
          {previewLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.previewLoader} />
          ) : addressPreview ? (
            <Text style={styles.preview}>{addressPreview}</Text>
          ) : null}
          <Button
            title="Use this location"
            onPress={() => void confirmPin()}
            loading={busy}
            disabled={booting || !mapMounted}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  close: { color: colors.primary, fontWeight: '700' },
  title: { color: colors.text, fontWeight: '700', fontSize: 17 },
  headerSpacer: { width: 48 },
  bootBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  bootBannerText: { color: colors.textSecondary, fontSize: 14 },
  mapWrap: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  hint: { color: colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  preview: { color: colors.text, fontWeight: '600', marginBottom: 12 },
  previewLoader: { marginBottom: 12, alignSelf: 'flex-start' },
});

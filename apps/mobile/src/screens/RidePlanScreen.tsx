import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { HomeStackProps } from '../navigation/types';
import type { Place } from '../navigation/types';
import { Button } from '../components/Button';
import { StackScroll } from '../components/layout/StackScroll';
import { LiveRideMap } from '../components/map/LiveRideMap';
import { RideMapView } from '../components/rides/RideMapView';
import { MapMarker } from '../components/rides/MapMarker';
import { LocationSearchField } from '../components/rides/LocationSearchField';
import {
  LocationPickerModal,
  type LocationPickerKind} from '../components/rides/LocationPickerModal';
import { reverseGeocode, looksLikeCoordinateLine, type GeocodedPlace } from '../services/geocoding';
import { isFiniteCoord } from '../components/rides/mapTypes';
import {
  ensureLocationPermission,
  getCurrentCoordinates,
  describeLocationFailure} from '../services/location';
import { withTimeout } from '../utils/withTimeout';
import { colors } from '../theme';
import { shared } from '../theme/styles';

const FALLBACK_CENTER = { lat: 28.4089, lng: 77.3178 };

type Props = HomeStackProps<'RidePlan'>;
type PickerMode = LocationPickerKind | null;

export function RidePlanScreen({ navigation }: Props) {
  const [pickupLine, setPickupLine] = useState('');
  const [pickupLabel, setPickupLabel] = useState('');
  const [dropLine, setDropLine] = useState('');
  const [pickup, setPickup] = useState(FALLBACK_CENTER);
  const [drop, setDrop] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [gpsFailed, setGpsFailed] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [dropFieldKey, setDropFieldKey] = useState(0);
  const [dropErr, setDropErr] = useState<string | null>(null);
  const [mapGestureActive, setMapGestureActive] = useState(false);

  const applyPickup = useCallback((place: GeocodedPlace) => {
    setPickup(place.coordinates);
    setPickupLine(place.line1);
    setPickupLabel(place.label);
    setGpsFailed(false);
    setGeocoding(false);
    setDropErr(null);
  }, []);

  const applyDrop = useCallback((place: GeocodedPlace) => {
    if (!isFiniteCoord(place.coordinates)) {
      setDropErr('Could not read that location. Try another result or pick on the map.');
      return;
    }
    setDrop(place.coordinates);
    setDropLine(place.line1);
    setDropFieldKey((k) => k + 1);
    setDropErr(null);
  }, []);

  const resolveAddress = useCallback(
    async (c: { lat: number; lng: number }) => {
      setGeocoding(true);
      setPickupLine('Finding address…');
      try {
        const place = await withTimeout(reverseGeocode(c.lat, c.lng), 12_000, 'address');
        if (looksLikeCoordinateLine(place.line1)) {
          setPickup(c);
          setPickupLine('Address not found for GPS. Choose pickup on map or try GPS again.');
          setPickupLabel('Pickup');
          setGpsFailed(true);
        } else {
          applyPickup(place);
        }
      } catch {
        setPickup(c);
        setPickupLine('Could not load address. Tap “Choose pickup on map” or try GPS again.');
        setPickupLabel('Pickup');
        setGpsFailed(true);
      } finally {
        setGeocoding(false);
      }
    },
    [applyPickup]
  );

  const detectPickupFromGps = useCallback(async () => {
    setLocating(true);
    setGeocoding(false);
    setGpsFailed(false);
    setPickupLine('Detecting your location…');

    const permission = await ensureLocationPermission();
    if (permission !== 'granted') {
      setLocating(false);
      setGpsFailed(true);
      setPickupLine(describeLocationFailure(null, permission));
      return;
    }

    await new Promise((r) => setTimeout(r, 300));

    try {
      const c = await withTimeout(getCurrentCoordinates(), 22_000, 'GPS');
      setPickup(c);
      setLocating(false);
      void resolveAddress(c);
    } catch (err) {
      setLocating(false);
      setGpsFailed(true);
      setPickupLine(describeLocationFailure(err, 'granted'));
    }
  }, [resolveAddress]);

  useEffect(() => {
    void detectPickupFromGps();
  }, [detectPickupFromGps]);

  const pickupMapRegion = useMemo(() => {
    const delta = 0.004;
    return {
      latitude: pickup.lat,
      longitude: pickup.lng,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
  }, [pickup.lat, pickup.lng]);

  const pickupMapFitKey = useMemo(
    () => `pickup-${pickup.lat.toFixed(5)},${pickup.lng.toFixed(5)}`,
    [pickup.lat, pickup.lng]
  );

  const handleMapConfirm = useCallback(
    (place: GeocodedPlace, kind: LocationPickerKind) => {
      if (kind === 'pickup') applyPickup(place);
      else applyDrop(place);
      setPickerMode(null);
    },
    [applyDrop, applyPickup]
  );

  function continueNext() {
    if (!drop || !dropLine.trim()) {
      setDropErr('Search or pick a drop location on the map.');
      return;
    }
    if (!pickupLine.trim() || gpsFailed || pickupLine === 'Detecting your location…') {
      setDropErr('Set pickup — tap “Try GPS again” or choose pickup on map.');
      return;
    }
    const pickupPlace: Place = {
      label: pickupLabel || 'Pickup',
      line1: pickupLine,
      coordinates: pickup};
    const dropPlace: Place = {
      label: 'Drop',
      line1: dropLine,
      coordinates: drop};
    navigation.navigate('RideFare', { pickup: pickupPlace, drop: dropPlace });
  }

  const pickerFallback = pickerMode === 'drop' ? drop ?? pickup : pickup;
  const showPickupSpinner = locating || geocoding;

  return (
    <StackScroll
      keyboardShouldPersistTaps="always"
      nestedScrollEnabled
      scrollEnabled={!mapGestureActive}
    >
      <View
        style={shared.mapBox}
        onTouchStart={() => setMapGestureActive(true)}
        onTouchEnd={() => setMapGestureActive(false)}
        onTouchCancel={() => setMapGestureActive(false)}
      >
        {drop && isFiniteCoord(pickup) && isFiniteCoord(drop) ? (
          <LiveRideMap style={shared.map} pickup={pickup} drop={drop} />
        ) : (
          <RideMapView
            style={shared.map}
            region={pickupMapRegion}
            regionFitKey={pickupMapFitKey}
            showsUserLocation
            showsMyLocationButton
          >
            <MapMarker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" />
          </RideMapView>
        )}
      </View>

      <Text style={shared.label}>Pickup</Text>
      <View style={styles.pickupBox}>
        {showPickupSpinner ? (
          <ActivityIndicator color={colors.primary} style={styles.pickupSpinner} />
        ) : null}
        <Text style={styles.pickupText} numberOfLines={4}>
          {pickupLine || 'Detecting your location…'}
        </Text>
      </View>
      {gpsFailed ? (
        <Button title="Try GPS again" variant="ghost" onPress={() => void detectPickupFromGps()} />
      ) : null}
      <Button title="Choose pickup on map" variant="ghost" onPress={() => setPickerMode('pickup')} />

      <LocationSearchField
        key={`drop-${dropFieldKey}`}
        label="Drop"
        value={dropLine}
        placeholder="Search destination (e.g. MG Road)"
        onSelect={applyDrop}
      />
      <Button title="Choose drop on map" variant="ghost" onPress={() => setPickerMode('drop')} />

      {dropErr ? <Text style={shared.err}>{dropErr}</Text> : null}
      <Button title="Continue" onPress={continueNext} />

      {pickerMode ? (
        <LocationPickerModal
          visible
          kind={pickerMode}
          title={pickerMode === 'pickup' ? 'Pickup location' : 'Drop location'}
          hint="Tap anywhere on the map, a place name (POI), or drag the pin. Then tap Use this location."
          fallback={pickerFallback}
          onClose={() => setPickerMode(null)}
          onConfirm={handleMapConfirm}
        />
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  pickupBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    marginBottom: 8,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center'},
  pickupSpinner: { marginRight: 10 },
  pickupText: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 22 }});

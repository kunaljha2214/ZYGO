import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchSavedAddresses } from '../../api/addresses';
import {
  useFoodDeliveryLocationStore,
  FOOD_DELIVERY_RADIUS_KM,
  type FoodDeliveryLocation,
} from '../../store/foodDeliveryLocationStore';
import {
  ensureLocationPermission,
  getFreshMapCoordinates,
} from '../../services/location';
import { reverseGeocode } from '../../services/geocoding';
import { withTimeout } from '../../utils/withTimeout';
import { addressLines } from '../../utils/addressDisplay';
import { AppAlert } from '../../alert';
import { colors, radii } from '../../theme';

type Props = {
  onLocationReady: (loc: FoodDeliveryLocation) => void;
};

export function FoodDeliveryLocationFilter({ onLocationReady }: Props) {
  const selected = useFoodDeliveryLocationStore((s) => s.selected);
  const setSelected = useFoodDeliveryLocationStore((s) => s.setSelected);
  const [loadingCurrent, setLoadingCurrent] = useState(false);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchSavedAddresses,
  });

  const applyLocation = useCallback(
    (loc: FoodDeliveryLocation) => {
      setSelected(loc);
      onLocationReady(loc);
    },
    [setSelected, onLocationReady]
  );

  const loadCurrentLocation = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const permission = await ensureLocationPermission();
      if (permission !== 'granted') {
        AppAlert.alert(
          'Location needed',
          'Allow location access to find restaurants near you.'
        );
        return;
      }
      const coords = await withTimeout(getFreshMapCoordinates(), 22_000, 'GPS');
      const place = await withTimeout(reverseGeocode(coords.lat, coords.lng), 12_000, 'address');
      applyLocation({
        source: 'current',
        id: 'current',
        label: 'Current location',
        line1: place.line1,
        coordinates: coords,
      });
    } catch (e) {
      AppAlert.alert(
        'Location unavailable',
        e instanceof Error ? e.message : 'Could not get your location'
      );
    } finally {
      setLoadingCurrent(false);
    }
  }, [applyLocation]);

  useEffect(() => {
    if (!selected) {
      void loadCurrentLocation();
    } else {
      onLocationReady(selected);
    }
  }, [selected, loadCurrentLocation, onLocationReady]);

  function selectSaved(addr: (typeof savedAddresses)[0]) {
    const lat = addr.coordinates?.lat;
    const lng = addr.coordinates?.lng;
    if (!lat || !lng) {
      AppAlert.alert('Address incomplete', 'This saved address has no map location. Edit it in profile.');
      return;
    }
    applyLocation({
      source: 'saved',
      id: addr._id,
      label: addr.label,
      line1: addressLines(addr).join(', '),
      coordinates: { lat, lng },
    });
  }

  const isCurrentActive = selected?.source === 'current';

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Deliver to</Text>
      <Text style={styles.sub}>
        Restaurants within {FOOD_DELIVERY_RADIUS_KM} km of this location
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          onPress={() => void loadCurrentLocation()}
          disabled={loadingCurrent}
          style={[styles.chip, isCurrentActive && styles.chipActive]}
        >
          {loadingCurrent && isCurrentActive ? (
            <ActivityIndicator size="small" color={colors.primaryBright} style={styles.chipSpinner} />
          ) : (
            <Text style={styles.chipIcon}>📍</Text>
          )}
          <Text style={[styles.chipText, isCurrentActive && styles.chipTextActive]}>
            Current location
          </Text>
        </Pressable>
        {savedAddresses.map((addr) => {
          const active = selected?.source === 'saved' && selected.id === addr._id;
          return (
            <Pressable
              key={addr._id}
              onPress={() => selectSaved(addr)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={styles.chipIcon}>
                {addr.label.toLowerCase() === 'work' ? '🏢' : addr.label.toLowerCase() === 'home' ? '🏠' : '📌'}
              </Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {addr.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected ? (
        <Text style={styles.selectedLine} numberOfLines={2}>
          {selected.line1}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  heading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxWidth: 200,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
  },
  chipIcon: { fontSize: 16, marginRight: 6 },
  chipSpinner: { marginRight: 6 },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  selectedLine: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 17,
  },
});

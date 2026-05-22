import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ProfileStackProps } from '../../navigation/types';
import { StackScroll } from '../../components/layout/StackScroll';
import { AppTextInput } from '../../components/AppTextInput';
import { Button } from '../../components/Button';
import { AddressSelectRow } from '../../components/profile/AddressSelectRow';
import { PlaceSearchSheet } from '../../components/profile/PlaceSearchSheet';
import { createSavedAddress } from '../../api/addresses';
import type { SavedAddressKind } from '../../api/addresses';
import { useAuthStore } from '../../store/authStore';
import { searchPlaces, type GeocodedPlace } from '../../services/geocoding';
import { AppAlert } from '../../alert';
import { colors, radii } from '../../theme';

type Props = ProfileStackProps<'AddSavedAddress'>;

type SearchTarget = 'city' | 'area' | null;

const LABEL_OPTIONS: { label: string; kind: SavedAddressKind }[] = [
  { label: 'Home', kind: 'home' },
  { label: 'Work', kind: 'work' },
  { label: 'Other', kind: 'other' },
];

export function AddSavedAddressScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [label, setLabel] = useState('Home');
  const [addressKind, setAddressKind] = useState<SavedAddressKind>('home');
  const [city, setCity] = useState('');
  const [cityPlace, setCityPlace] = useState<GeocodedPlace | null>(null);
  const [area, setArea] = useState('');
  const [areaPlace, setAreaPlace] = useState<GeocodedPlace | null>(null);
  const [line1, setLine1] = useState('');
  const [searchTarget, setSearchTarget] = useState<SearchTarget>(null);
  const [saving, setSaving] = useState(false);

  function onCityPick(place: GeocodedPlace) {
    setCity(place.label);
    setCityPlace(place);
    setArea('');
    setAreaPlace(null);
  }

  function onAreaPick(place: GeocodedPlace) {
    setArea(place.label);
    setAreaPlace(place);
  }

  async function onSave() {
    if (!city.trim()) {
      AppAlert.alert('City required', 'Select a city for this address.');
      return;
    }
    if (!area.trim()) {
      AppAlert.alert('Area required', 'Select an area or street.');
      return;
    }
    if (!line1.trim()) {
      AppAlert.alert('Address required', 'Enter your complete address.');
      return;
    }
    setSaving(true);
    try {
      let coords = areaPlace?.coordinates ?? { lat: 0, lng: 0 };
      if (!coords.lat && !coords.lng) {
        const q = [line1, area, city, 'India'].filter(Boolean).join(', ');
        const found = await searchPlaces(q);
        if (found[0]) coords = found[0].coordinates;
      }
      await createSavedAddress({
        label,
        addressKind,
        city: city.trim(),
        area: area.trim(),
        line1: line1.trim(),
        contactName: user?.name,
        contactPhone: user?.phone,
        coordinates: coords,
      });
      navigation.goBack();
    } catch (e) {
      AppAlert.alert('Save failed', e instanceof Error ? e.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <StackScroll keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Address details</Text>

        <Text style={styles.fieldLabel}>SAVE AS</Text>
        <View style={styles.chipRow}>
          {LABEL_OPTIONS.map((opt) => {
            const active = label === opt.label;
            return (
              <Pressable
                key={opt.label}
                onPress={() => {
                  setLabel(opt.label);
                  setAddressKind(opt.kind);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <AddressSelectRow
          icon="🏙️"
          label="Select a city"
          value={city}
          placeholder="Tap to search city"
          onPress={() => setSearchTarget('city')}
        />
        <AddressSelectRow
          icon="📍"
          label="Select an area, street"
          value={area}
          placeholder="Tap to search area"
          onPress={() => city.trim() && setSearchTarget('area')}
          disabled={!city.trim()}
        />

        <AppTextInput
          label="Complete address"
          placeholder="Enter complete address*"
          value={line1}
          onChangeText={setLine1}
          multiline
          style={styles.multiline}
        />
        <Text style={styles.example}>
          Example: A-504, Shanti Heights, Link Road, Near Inorbit Mall, Malad West
        </Text>

        <AppTextInput
          label="Contact name"
          value={user?.name ?? ''}
          editable={false}
        />
        <AppTextInput
          label="Phone number"
          value={user?.phone ?? ''}
          editable={false}
        />

        <Button title="Save address" onPress={() => void onSave()} loading={saving} />
      </StackScroll>

      <PlaceSearchSheet
        visible={searchTarget === 'city'}
        title="Select a city"
        hint="Cities only — pick your city"
        searchKind="city"
        onClose={() => setSearchTarget(null)}
        onSelect={onCityPick}
      />
      <PlaceSearchSheet
        visible={searchTarget === 'area'}
        title="Select area or street"
        hint={
          city
            ? `Search colony, sector, or street inside ${city}`
            : 'Select a city first'
        }
        searchKind="area"
        cityName={city}
        cityCoordinates={cityPlace?.coordinates}
        onClose={() => setSearchTarget(null)}
        onSelect={onAreaPick}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.primaryBright,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
  },
  chipText: { color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.text, fontWeight: '700' },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  example: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 16,
  },
});

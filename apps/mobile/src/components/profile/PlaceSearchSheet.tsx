import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { AppTextInput } from '../AppTextInput';
import { searchPlaces, type GeocodedPlace, type PlaceSearchKind } from '../../services/geocoding';
import { colors } from '../../theme';

type Props = {
  visible: boolean;
  title: string;
  hint: string;
  searchKind: PlaceSearchKind;
  /** Selected city name — scopes area search (e.g. Faridabad). */
  cityName?: string;
  /** City center from city picker — biases results near that city. */
  cityCoordinates?: { lat: number; lng: number };
  onClose: () => void;
  onSelect: (place: GeocodedPlace) => void;
};

export function PlaceSearchSheet({
  visible,
  title,
  hint,
  searchKind,
  cityName,
  cityCoordinates,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void searchPlaces(
        q,
        searchKind,
        searchKind === 'area'
          ? {
              areaQuery: q,
              city: cityName,
              cityCoordinates,
            }
          : undefined
      )
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible, cityName, cityCoordinates, searchKind]);

  function pick(place: GeocodedPlace) {
    Keyboard.dismiss();
    onSelect(place);
    onClose();
  }

  const placeholder =
    searchKind === 'city'
      ? 'Search city (e.g. Delhi, Mumbai)'
      : cityName
        ? `Colony, sector, street in ${cityName}`
        : 'Search area or street name';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.hint}>{hint}</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={12}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <AppTextInput
            label="Search"
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            autoCorrect={false}
          />
          {loading ? (
            <ActivityIndicator color={colors.primaryBright} style={styles.loader} />
          ) : null}
          <FlatList
            data={results}
            keyExtractor={(item, i) => `${item.label}-${item.coordinates.lat}-${i}`}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={
              query.trim().length >= 2 && !loading ? (
                <Text style={styles.empty}>
                  {searchKind === 'city'
                    ? 'No cities found. Try another spelling.'
                    : cityName
                      ? `No areas found in ${cityName}. Try "Nawada colony" or add details in complete address below.`
                      : 'No places found. Try a different search.'}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => pick(item)}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.label}
                </Text>
                {searchKind !== 'city' && item.line1 !== item.label ? (
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {item.line1}
                  </Text>
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  closeIcon: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  loader: { marginVertical: 12 },
  list: { maxHeight: 320 },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  rowPressed: { backgroundColor: colors.primarySoft },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
});

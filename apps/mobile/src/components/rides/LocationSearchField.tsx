import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { AppTextInput } from '../AppTextInput';
import { searchPlaces, type GeocodedPlace } from '../../services/geocoding';
import { colors, radii } from '../../theme';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onSelect: (place: GeocodedPlace) => void;
};

export function LocationSearchField({ label, value, placeholder, onSelect }: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    setDraft(value);
    if (value.trim()) {
      setFocused(false);
      setSuggestions([]);
    }
  }, [value]);

  useEffect(() => {
    if (!focused) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = draft.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const results = await searchPlaces(q);
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, focused]);

  function commitSelection(item: GeocodedPlace) {
    skipSearchRef.current = true;
    setSuggestions([]);
    setLoading(false);
    setFocused(false);
    setDraft(item.line1);
    Keyboard.dismiss();
    onSelect(item);
  }

  const shown = focused ? draft : value;

  return (
    <View style={styles.wrap}>
      <AppTextInput
        label={label}
        value={shown}
        onChangeText={(text) => {
          setDraft(text);
          if (!focused) setFocused(true);
        }}
        onFocus={() => {
          setFocused(true);
          setDraft(value || draft);
        }}
        onBlur={() => {
          setTimeout(() => {
            setFocused(false);
            setSuggestions([]);
          }, 200);
        }}
        placeholder={placeholder ?? 'Search address or place name'}
        autoCorrect={false}
      />
      {loading && focused ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      ) : null}
      {focused && suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((item, index) => (
            <Pressable
              key={`${item.coordinates.lat}-${item.coordinates.lng}-${index}`}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => commitSelection(item)}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {item.line1}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4, zIndex: 10 },
  spinner: { marginTop: -8, marginBottom: 8 },
  list: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 4,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rowPressed: { backgroundColor: colors.primarySoft },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
});

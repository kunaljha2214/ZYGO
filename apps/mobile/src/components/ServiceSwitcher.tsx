import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServiceMode } from '../store/serviceStore';
import { colors, radii } from '../theme';

type Props = {
  value: ServiceMode;
  onChange: (v: ServiceMode) => void;
};

export function ServiceSwitcher({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {(['food', 'rides'] as const).map((key) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.seg, active && styles.segActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {key === 'food' ? 'Food' : 'Rides'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  segActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  labelActive: { color: colors.text, fontWeight: '700' },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  label: string;
  unit?: string;
  value: string;
  progress: number;
};

export function CircularGauge({ label, unit, value, progress }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const rotation = `${Math.min(340, clamped * 360)}deg`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <View style={styles.ringWrap}>
        <View style={styles.track} />
        <View style={[styles.arc, { transform: [{ rotate: rotation }] }]} />
        <View style={styles.inner}>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

const SIZE = 88;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  unit: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(168, 85, 247, 0.12)',
  },
  arc: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: colors.primaryBright,
    borderRightColor: colors.primary,
  },
  inner: {
    width: SIZE - 20,
    height: SIZE - 20,
    borderRadius: (SIZE - 20) / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  online?: boolean;
};

/** Stitch-style map panel until live tiles are wired. */
export function DriverMapPlaceholder({ online }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={i} style={[styles.cell, i % 5 === 0 && styles.cellHot]} />
        ))}
      </View>
      <View style={styles.pin}>
        <Text style={styles.pinIcon}>📍</Text>
      </View>
      <View style={styles.caption}>
        <Text style={styles.captionTitle}>{online ? 'Live coverage' : 'Map preview'}</Text>
        <Text style={styles.captionSub}>
          {online
            ? 'Hotspots & demand zones — full heatmap coming soon'
            : 'Go online to broadcast your location'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 168,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.card,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.55,
  },
  cell: {
    width: '16.66%',
    height: '25%',
    borderWidth: 0.5,
    borderColor: 'rgba(168, 85, 247, 0.12)',
    backgroundColor: colors.backgroundElevated,
  },
  cellHot: { backgroundColor: 'rgba(168, 85, 247, 0.18)' },
  pin: {
    position: 'absolute',
    top: '42%',
    left: '48%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  pinIcon: { fontSize: 28 },
  caption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  captionTitle: { color: colors.lavender, fontWeight: '800', fontSize: 13 },
  captionSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});

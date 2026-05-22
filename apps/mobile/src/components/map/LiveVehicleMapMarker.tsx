import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PointAnnotation } from '@rnmapbox/maps';
import { colors } from '../../theme';
import type { MapCoordinate } from '../rides/mapTypes';

type Props = {
  coordinate: MapCoordinate;
  icon: string;
  idPrefix: string;
  bubbleColor?: string;
  pulseColor?: string;
};

/** Live captain / delivery partner — drawn above route lines. */
export function LiveVehicleMapMarker({
  coordinate,
  icon,
  idPrefix,
  bubbleColor = colors.primary,
  pulseColor = 'rgba(168,85,247,0.35)',
}: Props) {
  const id = `${idPrefix}-live-${coordinate.latitude.toFixed(6)}-${coordinate.longitude.toFixed(6)}`;

  return (
    <PointAnnotation
      id={id}
      coordinate={[coordinate.longitude, coordinate.latitude]}
      anchor={{ x: 0.5, y: 0.85 }}
    >
      <View style={styles.wrap} collapsable={false}>
        <View style={[styles.pulse, { backgroundColor: pulseColor }]} />
        <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={[styles.stem, { backgroundColor: bubbleColor }]} />
      </View>
    </PointAnnotation>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: 44,
    height: 52,
  },
  pulse: {
    position: 'absolute',
    top: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  stem: {
    width: 3,
    height: 8,
    marginTop: -1,
    borderRadius: 2,
  },
});

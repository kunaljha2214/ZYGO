import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PointAnnotation } from '@rnmapbox/maps';
import { colors } from '../../theme';
import type { MapCoordinate, MapPressEvent } from './mapTypes';

type Props = {
  coordinate: MapCoordinate;
  identifier?: string;
  title?: string;
  pinColor?: string;
  draggable?: boolean;
  onDragEnd?: (e: MapPressEvent) => void;
};

export function MapMarker({
  coordinate,
  identifier,
  pinColor,
  draggable,
  onDragEnd,
}: Props) {
  const id =
    identifier ?? `pin-${coordinate.latitude.toFixed(5)}-${coordinate.longitude.toFixed(5)}`;

  return (
    <PointAnnotation
      id={id}
      coordinate={[coordinate.longitude, coordinate.latitude]}
      draggable={draggable}
      onDragEnd={(e) => {
        const coords = e.geometry?.coordinates;
        if (!coords || coords.length < 2 || !onDragEnd) return;
        onDragEnd({
          nativeEvent: {
            coordinate: { latitude: coords[1], longitude: coords[0] },
          },
        });
      }}
    >
      <View style={[styles.pin, { backgroundColor: pinColor ?? colors.primary }]} />
    </PointAnnotation>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

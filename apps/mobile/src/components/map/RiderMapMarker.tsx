import React from 'react';
import { LiveVehicleMapMarker } from './LiveVehicleMapMarker';
import type { MapCoordinate } from '../rides/mapTypes';

type Props = {
  coordinate: MapCoordinate;
};

/** Live delivery partner on customer order track map. */
export function RiderMapMarker({ coordinate }: Props) {
  return (
    <LiveVehicleMapMarker coordinate={coordinate} icon="🛵" idPrefix="rider" />
  );
}

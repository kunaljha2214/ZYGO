import React from 'react';
import { LiveVehicleMapMarker } from './LiveVehicleMapMarker';
import type { MapCoordinate } from '../rides/mapTypes';
import { vehicleMapIcon } from '../../utils/vehicleMapIcon';

type Props = {
  coordinate: MapCoordinate;
  vehicleType?: string;
};

/** Live ride captain on customer track map. */
export function DriverMapMarker({ coordinate, vehicleType }: Props) {
  const icon = vehicleMapIcon(vehicleType);
  const idPrefix = `driver-${(vehicleType ?? 'car').toLowerCase()}`;

  return (
    <LiveVehicleMapMarker
      coordinate={coordinate}
      icon={icon}
      idPrefix={idPrefix}
      bubbleColor="#fbbf24"
      pulseColor="rgba(251,191,36,0.4)"
    />
  );
}

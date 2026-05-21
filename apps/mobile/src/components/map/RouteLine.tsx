import React, { useMemo } from 'react';
import { ShapeSource, LineLayer } from '@rnmapbox/maps';

type Props = {
  id?: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
  dashed?: boolean;
};

export function RouteLine({
  id = 'route',
  coordinates,
  color = '#a855f7',
  width = 4,
  dashed = false,
}: Props) {
  const shape = useMemo(
    () => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
      properties: {},
    }),
    [coordinates]
  );

  if (coordinates.length < 2) return null;

  return (
    <ShapeSource id={`${id}-source`} shape={shape}>
      <LineLayer
        id={`${id}-layer`}
        style={{
          lineColor: color,
          lineWidth: width,
          lineOpacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
          ...(dashed ? { lineDasharray: [2, 1.5] } : {}),
        }}
      />
    </ShapeSource>
  );
}

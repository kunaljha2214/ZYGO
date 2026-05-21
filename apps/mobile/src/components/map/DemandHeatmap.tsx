import React, { useMemo } from 'react';
import { ShapeSource, HeatmapLayer } from '@rnmapbox/maps';
import { DEMAND_HEATMAP_POINTS } from '../../config/demandZones';

type Props = {
  id?: string;
  points?: Array<{ lat: number; lng: number; weight: number }>;
};

export function DemandHeatmap({ id = 'demand-heat', points = DEMAND_HEATMAP_POINTS }: Props) {
  const shape = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: points.map((p, i) => ({
        type: 'Feature' as const,
        id: `demand-${i}`,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat] as [number, number],
        },
        properties: { weight: p.weight },
      })),
    }),
    [points]
  );

  if (!points.length) return null;

  return (
    <ShapeSource id={`${id}-source`} shape={shape}>
      <HeatmapLayer
        id={`${id}-layer`}
        style={{
          heatmapWeight: ['get', 'weight'],
          heatmapIntensity: 0.8,
          heatmapRadius: 28,
          heatmapOpacity: 0.65,
          heatmapColor: [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(124, 58, 237, 0)',
            0.35,
            'rgba(168, 85, 247, 0.55)',
            0.7,
            'rgba(251, 191, 36, 0.75)',
            1,
            'rgba(239, 68, 68, 0.9)',
          ],
        }}
      />
    </ShapeSource>
  );
}

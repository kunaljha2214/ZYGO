import React from 'react';
import Config from 'react-native-config';
import MapView, { PROVIDER_GOOGLE, UrlTile, type MapViewProps } from 'react-native-maps';

const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function hasValidGoogleMapsKey(): boolean {
  const key = Config.GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (!key) return false;
  const lower = key.toLowerCase();
  return (
    !lower.includes('placeholder') &&
    !lower.startsWith('your-') &&
    key.length > 10
  );
}

type Props = MapViewProps & {
  children?: React.ReactNode;
};

/** Google Maps when API key is set; otherwise OpenStreetMap tiles (no key required). */
export function RideMapView({ children, mapType, provider, ...rest }: Props) {
  const useGoogle = hasValidGoogleMapsKey();
  return (
    <MapView
      provider={useGoogle ? PROVIDER_GOOGLE : provider}
      mapType={useGoogle ? mapType ?? 'standard' : 'none'}
      googleRenderer={useGoogle ? 'LATEST' : undefined}
      {...rest}
    >
      {!useGoogle ? (
        <UrlTile urlTemplate={OSM_TILE} maximumZ={19} flipY={false} shouldReplaceMapContent />
      ) : null}
      {children}
    </MapView>
  );
}

import Config from 'react-native-config';

/** Default ride style — override with MAPBOX_STYLE_ID in .env. */
const DEFAULT_STYLE_ID = 'mapbox/navigation-night-v1';

export function mapboxAccessToken(): string | null {
  const token = Config.MAPBOX_ACCESS_TOKEN?.trim() ?? '';
  if (!token) return null;
  const lower = token.toLowerCase();
  if (lower.includes('placeholder') || lower.startsWith('your-')) return null;
  if (!token.startsWith('pk.')) return null;
  return token;
}

export function hasValidMapboxToken(): boolean {
  return mapboxAccessToken() != null;
}

export function mapboxStyleId(): string {
  const raw = Config.MAPBOX_STYLE_ID?.trim();
  return raw && raw.includes('/') ? raw : DEFAULT_STYLE_ID;
}

/** Mapbox GL style URL for @rnmapbox/maps MapView. */
export function mapboxStyleURL(): string {
  return `mapbox://styles/${mapboxStyleId()}`;
}

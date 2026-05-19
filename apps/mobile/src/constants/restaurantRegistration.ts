export const CUISINE_OPTIONS = [
  'Indian',
  'South Indian',
  'North Indian',
  'Chinese',
  'Italian',
  'Fast Food',
  'Biryani',
  'Healthy',
  'Desserts',
  'Cafe',
] as const;

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const DEFAULT_MAP = { lat: 12.9716, lng: 77.5946 };

/** Tiny 1x1 PNG for dev document upload testing */
export const SAMPLE_DOC_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function defaultOpeningHours() {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: '09:00',
    close: '22:00',
    closed: false,
  }));
}

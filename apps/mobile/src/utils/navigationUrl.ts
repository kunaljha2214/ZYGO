/** Opens the device maps app for turn-by-turn (no Google Maps API key required). */
export function drivingDirectionsUrl(lat: number, lng: number, label?: string) {
  const q = label ? `${lat},${lng}(${encodeURIComponent(label)})` : `${lat},${lng}`;
  return `geo:0,0?q=${q}`;
}

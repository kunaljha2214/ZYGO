type GeoLocation = { coordinates?: number[] };

export function coordsFromGeoLocation(
  location?: GeoLocation | null
): { lat: number; lng: number } | null {
  const c = location?.coordinates;
  if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
    return null;
  }
  return { lat: c[1], lng: c[0] };
}

export function restaurantIdFromOrder(
  restaurantId: string | { id?: string; _id?: string } | undefined
): string | null {
  if (!restaurantId) return null;
  if (typeof restaurantId === 'string') return restaurantId;
  const id = restaurantId.id ?? restaurantId._id;
  return id != null ? String(id) : null;
}

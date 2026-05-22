/** Map marker emoji for live captain position by booked vehicle type. */
export function vehicleMapIcon(vehicleType?: string): string {
  const id = (vehicleType ?? '').trim().toLowerCase();
  if (id === 'bike') return '🛵';
  return '🚗';
}

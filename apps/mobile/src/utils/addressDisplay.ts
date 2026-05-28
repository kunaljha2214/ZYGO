import type { SavedAddress, SavedAddressKind } from '../api/addresses';

export function addressKindIcon(kind: SavedAddressKind | undefined, label: string): string {
  const k = kind ?? inferKind(label);
  if (k === 'home') return '🏠';
  if (k === 'work') return '🏢';
  return '📍';
}

export function inferKind(label: string): SavedAddressKind {
  const l = label.trim().toLowerCase();
  if (l === 'home') return 'home';
  if (l === 'work') return 'work';
  return 'other';
}

export function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  return phone;
}

export function addressLines(addr: SavedAddress): string[] {
  const lines: string[] = [];
  if (addr.contactName?.trim()) {
    lines.push(addr.contactName.trim());
  }
  const detail = addr.line1?.trim() ?? '';
  if (detail) lines.push(detail);
  const locality = [addr.area, addr.city].filter(Boolean).join(', ');
  if (locality && !detail.includes(locality)) {
    lines.push(locality);
  }
  return lines.length ? lines : [addr.line1 || 'Address'];
}

export function shareAddressText(addr: SavedAddress): string {
  const parts = [
    addr.label,
    addr.contactName,
    addr.line1,
    addr.area,
    addr.city,
    addr.contactPhone ? `Phone: ${formatPhoneDisplay(addr.contactPhone)}` : null,
  ].filter(Boolean);
  return parts.join('\n');
}

/** Haversine distance in km */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number | null {
  if (!a.lat || !a.lng || !b.lat || !b.lng) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number | null {
  const km = distanceKm(a, b);
  return km == null ? null : km * 1000;
}

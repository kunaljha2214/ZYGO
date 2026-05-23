/** Normalize Indian mobile numbers to 10-digit local form (e.g. 9444444444). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/** Normalize stored 10-digit Indian mobile to tel: dial string (no spaces). */
export function toDialNumber(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 10) return `+91${digits}`;
  const raw = phone.replace(/\D/g, '');
  if (raw.length === 12 && raw.startsWith('91')) return `+${raw}`;
  if (raw.startsWith('0') && raw.length === 11) return `+91${raw.slice(1)}`;
  return raw.length > 0 ? `+${raw}` : '';
}

/** Mask for optional UI hints — never show full number in app chrome. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  if (last4.length < 4) return '••••';
  return `•••• •• ${last4}`;
}

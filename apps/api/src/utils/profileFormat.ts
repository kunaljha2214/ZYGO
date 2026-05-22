export function formatMemberSince(createdAt: Date): string {
  return createdAt.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDateOfBirth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day}/${m}/${y}`;
}

/** Parse DD/MM/YYYY or YYYY-MM-DD */
export function parseDateOfBirthInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function validateDateOfBirth(d: Date): string | null {
  const now = new Date();
  if (d.getTime() > now.getTime()) {
    return 'Date of birth cannot be in the future';
  }
  const minAge = new Date();
  minAge.setUTCFullYear(minAge.getUTCFullYear() - 13);
  if (d.getTime() > minAge.getTime()) {
    return 'You must be at least 13 years old';
  }
  const maxAge = new Date();
  maxAge.setUTCFullYear(maxAge.getUTCFullYear() - 120);
  if (d.getTime() < maxAge.getTime()) {
    return 'Enter a valid date of birth';
  }
  return null;
}

/** Default picker date when none set (~25 years ago). */
export function defaultBirthDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 25);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function parseBirthDateString(raw: string | null | undefined): Date {
  if (!raw?.trim()) return defaultBirthDate();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12, 0, 0, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return defaultBirthDate();
}

export function formatBirthDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** API expects DD/MM/YYYY */
export function formatBirthDateForApi(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

export function birthDateLimits(): { minimumDate: Date; maximumDate: Date } {
  const maximumDate = new Date();
  maximumDate.setFullYear(maximumDate.getFullYear() - 13);
  maximumDate.setHours(23, 59, 59, 999);

  const minimumDate = new Date();
  minimumDate.setFullYear(minimumDate.getFullYear() - 120);
  minimumDate.setHours(0, 0, 0, 0);

  return { minimumDate, maximumDate };
}

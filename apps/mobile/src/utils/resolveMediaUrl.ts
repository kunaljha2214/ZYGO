import { API_BASE_URL } from '../config/env';

/** Turn API-relative `/uploads/...` paths into absolute URLs; Cloudinary & device URIs pass through. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(file|content|ph|assets-library):\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('data:')) return trimmed;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

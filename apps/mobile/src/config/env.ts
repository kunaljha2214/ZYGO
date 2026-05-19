import { GENERATED_API_BASE_URL } from './generatedApiUrl';

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

/**
 * Base URL for REST calls (`…/api/v1`).
 * Run `node scripts/sync-env.js` after editing `.env`, or use `npm start` / `npm run android` (runs sync automatically).
 */
export const API_BASE_URL = stripTrailingSlash(GENERATED_API_BASE_URL);

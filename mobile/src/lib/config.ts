/**
 * Runtime configuration.
 *
 * Only `EXPO_PUBLIC_*` variables are visible to app code: Expo inlines them at
 * build time, so each one has to be referenced as a full static expression
 * (`process.env.EXPO_PUBLIC_API_URL`, never `process.env[name]`).
 *
 * Anything shipped in the bundle is public — `EXPO_PUBLIC_API_KEY` authenticates
 * the app against *our* route, not against the model provider. The provider key
 * stays on the server. See `mobile/README.md`.
 */

/** Base URL of the Threshold backend, without a trailing slash. */
export const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

/** Client key sent as `Authorization: Bearer …` to the backend. */
export const apiKey = (process.env.EXPO_PUBLIC_API_KEY ?? '').trim();

/** True once an API URL is configured; otherwise the app runs on the mock. */
export const isApiConfigured = apiBaseUrl.length > 0;

export const API_CAMPAIGNS_PATH = '/campaigns';

/** Absolute URL for a backend path, tolerating a missing leading slash. */
export function apiUrl(path: string): string {
    return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

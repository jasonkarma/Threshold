/**
 * Configuration and `.env` loading.
 *
 * There is no dependency on `dotenv`, and no reliance on `node --env-file`:
 * that flag fails hard when the file is missing, which makes the very first run
 * (before anyone has created `.env`) crash with an error about a file rather
 * than about the settings. A ~20-line parser keeps `node index.js` working with
 * or without one, and keeps `npm install` unnecessary.
 *
 * Real environment variables always win over the file, so
 * `LLM_MODEL=x node index.js` overrides `.env` without editing it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_DIR = dirname(fileURLToPath(import.meta.url));

loadEnvFile(join(SERVER_DIR, '.env'));

function loadEnvFile(path) {
    let raw;
    try {
        raw = readFileSync(path, 'utf8');
    } catch {
        return; // No .env — environment variables or defaults carry the config.
    }

    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;

        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();

        // Strip one layer of matching quotes, if present.
        if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
            value = value.slice(1, -1);
        }

        if (key && !(key in process.env)) process.env[key] = value;
    }
}

function str(name, fallback = '') {
    const value = process.env[name];
    return value === undefined || value === '' ? fallback : value.trim();
}

function int(name, fallback) {
    const parsed = Number.parseInt(str(name), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
    /** Port this server listens on. */
    port: int('PORT', 8787),

    /* ---------------------------------------------------------- our route ---- */

    /**
     * The token the app sends as `Authorization: Bearer`. It ships inside the
     * Expo bundle, so it is public by construction: it exists to stop casual
     * abuse of a route, not to authenticate a user. Blank disables the check
     * (convenient locally, never acceptable off localhost).
     */
    clientApiKey: str('CLIENT_API_KEY'),

    /** Generations allowed per client token per hour. 0 disables the limit. */
    rateLimitPerHour: int('RATE_LIMIT_PER_HOUR', 20),

    /* ------------------------------------------------------------ gateway ---- */

    /** Base URL of the LLM gateway, without a trailing slash. */
    llmBaseUrl: str('LLM_BASE_URL', 'https://lumiarouter.com/v1').replace(/\/+$/, ''),

    /** Model ID passed to the gateway. See `plans/threshold-llm-backend-plan.md` §3. */
    llmModel: str('LLM_MODEL', 'claude-opus-5-5'),

    /** The billable provider key. Never leaves this process. */
    llmApiKey: str('LLM_API_KEY'),

    /** Cap on generated tokens. Too low truncates the JSON mid-array. */
    llmMaxTokens: int('LLM_MAX_TOKENS', 8192),

    /** Per-attempt gateway timeout, in milliseconds. */
    llmTimeoutMs: int('LLM_TIMEOUT_MS', 40_000),

    /** Total budget for one generation, including repair retries. */
    overallDeadlineMs: int('OVERALL_DEADLINE_MS', 50_000),
};

/**
 * Fails fast at boot if the gateway cannot possibly work, so the first symptom
 * is a clear message in the terminal rather than a 502 during onboarding.
 */
export function assertConfigured() {
    const problems = [];

    if (!config.llmApiKey) problems.push('LLM_API_KEY is not set — the gateway will reject every call.');
    if (!config.llmModel) problems.push('LLM_MODEL is empty.');

    // The app aborts at 60s. Anything at or beyond that means the server keeps
    // working after the user has already been shown a timeout.
    if (config.overallDeadlineMs >= 60_000) {
        problems.push(
            `OVERALL_DEADLINE_MS is ${config.overallDeadlineMs}ms, but the app gives up at 60000ms. ` +
            'The server must fail first, or the client sees a bare timeout with no server-side reason.',
        );
    }

    return problems;
}

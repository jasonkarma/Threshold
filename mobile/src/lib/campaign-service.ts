/**
 * Campaign generation service.
 *
 * This is the seam where the real LLM call lands. Everything in the UI depends
 * on the `CampaignService` interface, never on an implementation, so the app
 * runs identically against the demo path or a real backend.
 *
 *   EXPO_PUBLIC_API_URL set   → POST {API_URL}/campaigns
 *   EXPO_PUBLIC_API_URL empty → `mockCampaignService` (fixed 10-level path)
 *
 * The model provider key never reaches this file: the app authenticates against
 * our own route with EXPO_PUBLIC_API_KEY, and that route holds the provider key.
 */
import { API_CAMPAIGNS_PATH, apiKey, apiUrl, isApiConfigured } from './config';
import { buildDemoCampaign, GENERATION_STEPS, shortenAmbition } from './mock-campaign';
import type { Campaign, CampaignSeed, FrictionDomain, Mission, MissionStatus } from './types';

export type GenerationProgress = {
    /** 0-based index into the status lines shown on S08. */
    step: number;
    label: string;
};

export interface CampaignService {
    generate(seed: CampaignSeed, onProgress?: (progress: GenerationProgress) => void): Promise<Campaign>;
}

/** Raised when generation fails for a reason worth showing the user. */
export class CampaignGenerationError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = 'CampaignGenerationError';
    }
}

/* ------------------------------------------------------------------ mock ---- */

/**
 * Simulates the latency and rotating status lines of the real generation call
 * (mirrors mock-up S08). Used whenever no API URL is configured.
 */
export const mockCampaignService: CampaignService = {
    async generate(seed, onProgress) {
        for (let step = 0; step < GENERATION_STEPS.length; step += 1) {
            onProgress?.({ step, label: GENERATION_STEPS[step] });
            await delay(900);
        }
        return buildDemoCampaign(seed, `campaign-${Date.now()}`);
    },
};

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ http ---- */

/** How long to wait on the backend before giving up and letting the user retry. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Status lines are emitted on a timer rather than reported by the server: the
 * backend answers with one JSON body, so there is no real progress to stream.
 * The lines are honest about what the server is doing and stop at the last one.
 */
const PROGRESS_TICK_MS = 1400;

export const httpCampaignService: CampaignService = {
    async generate(seed, onProgress) {
        let step = 0;
        onProgress?.({ step, label: GENERATION_STEPS[step] });

        const ticker = setInterval(() => {
            if (step >= GENERATION_STEPS.length - 1) return;
            step += 1;
            onProgress?.({ step, label: GENERATION_STEPS[step] });
        }, PROGRESS_TICK_MS);

        try {
            const payload = await postCampaigns(seed);
            return normalizeCampaign(payload, seed);
        } finally {
            clearInterval(ticker);
        }
    },
};

async function postCampaigns(seed: CampaignSeed): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(apiUrl(API_CAMPAIGNS_PATH), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : null),
            },
            body: JSON.stringify({ seed }),
            signal: controller.signal,
        });
    } catch (cause) {
        throw new CampaignGenerationError(
            controller.signal.aborted
                ? 'Generation timed out. Check your connection and try again.'
                : 'Could not reach the campaign service.',
            cause,
        );
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new CampaignGenerationError(
            response.status === 401 || response.status === 403
                ? 'The campaign service rejected this app key.'
                : `Campaign service returned ${response.status}.`,
        );
    }

    try {
        return await response.json();
    } catch (cause) {
        throw new CampaignGenerationError('The campaign service returned malformed JSON.', cause);
    }
}

/* ----------------------------------------------------------- normalising ---- */

const DOMAINS: FrictionDomain[] = ['public_async', 'live_strangers', 'authority'];
const STATUSES: MissionStatus[] = ['locked', 'active', 'in_progress', 'completed'];

/**
 * Coerces a server payload into the internal `Campaign` shape.
 *
 * The backend is the source of truth for content, but the UI assumes every
 * field exists — a missing `tips` or an unknown `domain` would crash a screen
 * rather than degrade, so defaults are applied at this boundary and nowhere
 * else. Level order is taken from the array, not trusted from the payload.
 */
export function normalizeCampaign(payload: unknown, seed: CampaignSeed): Campaign {
    const record = asRecord(payload);
    // Tolerate `{ campaign: {...} }` as well as the object itself.
    const body = asRecord(record.campaign ?? record);

    const rawMissions = Array.isArray(body.missions) ? body.missions : [];
    if (rawMissions.length === 0) {
        throw new CampaignGenerationError('The campaign service returned a path with no missions.');
    }

    const missions = rawMissions
        .map((mission, index) => normalizeMission(mission, index))
        .sort((a, b) => a.level - b.level);

    // Exactly one mission may be actionable, and only the first unfinished one.
    const completed = new Set(
        (Array.isArray(body.completedLevels) ? body.completedLevels : [])
            .map((level) => Number(level))
            .filter((level) => Number.isFinite(level)),
    );
    const nextLevel = missions.find((m) => !completed.has(m.level))?.level ?? missions.length;

    return {
        id: asString(body.id) || `campaign-${Date.now()}`,
        seed,
        label: asString(body.label) || shortenAmbition(seed.ambition),
        createdAt: asString(body.createdAt) || new Date().toISOString(),
        // The pacing engine's pointer. Distinct from any frontier: this is where
        // the user is acting, not where they are holding (`lib/calibration.ts`).
        activeLevel: nextLevel,
        missions: missions.map((mission) => ({
            ...mission,
            status: completed.has(mission.level)
                ? 'completed'
                : mission.level === nextLevel
                    ? 'active'
                    : 'locked',
        })),
    };
}

function normalizeMission(value: unknown, index: number): Mission {
    const record = asRecord(value);
    const level = Number(record.level);

    return {
        id: asString(record.id) || `m${Number.isFinite(level) ? level : index + 1}`,
        level: Number.isFinite(level) && level > 0 ? Math.round(level) : index + 1,
        title: asString(record.title) || `Level ${index + 1}`,
        description: asString(record.description) || '',
        tags: Array.isArray(record.tags) ? record.tags.map(asString).filter(Boolean) : [],
        domain: DOMAINS.includes(record.domain as FrictionDomain) ? (record.domain as FrictionDomain) : 'public_async',
        context: asString(record.context) || 'Real-world mission',
        tip: asString(record.tip) || '',
        status: STATUSES.includes(record.status as MissionStatus) ? (record.status as MissionStatus) : 'locked',
    };
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
}

/* ------------------------------------------------------------- selection ---- */

/** Single place to repoint the app at a real backend. */
export const campaignService: CampaignService = isApiConfigured ? httpCampaignService : mockCampaignService;

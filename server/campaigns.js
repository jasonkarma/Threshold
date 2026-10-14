/**
 * `POST /campaigns` orchestration.
 *
 * Validate the seed → prompt the model → validate the output → repair once if
 * needed → shape the response the app expects. Everything that knows about
 * prompts, retries or the gateway lives here or below; `index.js` only does
 * HTTP.
 *
 * ## The deadline
 *
 * The app aborts the request at 60s (`REQUEST_TIMEOUT_MS` in
 * `mobile/src/lib/campaign-service.ts`). Retries make overrunning that trivially
 * easy, so every attempt shares one `AbortController` with a budget *shorter*
 * than the client's. If we fail, we fail first, with a reason the log can show —
 * rather than the client timing out and the server continuing to burn tokens on
 * a campaign nobody will ever see.
 */
import { config } from './config.js';
import { complete, LlmError } from './llm.js';
import { CAMPAIGN_SCHEMA, TOOL_NAME, repairPrompt, systemPrompt, userPrompt } from './prompts/campaign.js';
import { ValidationError, validateCampaign } from './validate.js';

/** Raised for failures worth showing the user; `status` is passed to the client. */
export class CampaignError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = 'CampaignError';
        this.status = status;
    }
}

const TRANSIENT_RETRY_DELAY_MS = 1200;

const TOOL = {
    name: TOOL_NAME,
    description: 'Emit the complete Threshold mission path for this user.',
    parameters: CAMPAIGN_SCHEMA,
};

/**
 * @param {unknown} rawSeed the `seed` object from the request body
 * @returns {{ ambition: string, friction: string, baseline: string }}
 */
export function readSeed(rawSeed) {
    const seed = {
        ambition: text(rawSeed?.ambition, 600),
        friction: text(rawSeed?.friction, 600),
        baseline: text(rawSeed?.baseline, 300),
    };

    const missing = Object.entries(seed).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) {
        // 422 rather than 400: the request is well-formed JSON, the contents
        // are what cannot be worked with.
        throw new CampaignError(`the seed is missing: ${missing.join(', ')}.`, 422);
    }

    return seed;
}

/**
 * Generates one campaign.
 *
 * @param {{ ambition: string, friction: string, baseline: string }} seed
 * @returns {Promise<object>} the response body the app expects
 */
export async function generateCampaign(seed) {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), config.overallDeadlineMs);
    const started = Date.now();

    try {
        const messages = [{ role: 'user', content: userPrompt(seed) }];
        let lastReason = 'generation failed.';

        // Two attempts, not more: one initial call plus one repair. The first
        // usually succeeds, so a third attempt would mostly buy latency.
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            let input;
            try {
                const result = await withTransientRetry(
                    () => complete({ system: systemPrompt(), messages, tool: TOOL, toolName: TOOL_NAME, signal: controller.signal }),
                    controller.signal,
                );

                logUsage({ attempt, usage: result.usage, model: result.model, elapsed: Date.now() - started });
                input = result.input;
            } catch (error) {
                if (error instanceof LlmError && !error.retryable && error.status) {
                    throw new CampaignError(error.message, error.status);
                }
                lastReason = error?.message ?? 'the gateway call failed.';
                break;
            }

            try {
                const { name, missions } = validateCampaign(input);
                return shapeResponse(missions, name);
            } catch (error) {
                if (!(error instanceof ValidationError)) throw error;
                lastReason = error.message;

                if (controller.signal.aborted) break;

                // Feed the specific failure back. A bare "try again" wastes the
                // attempt; naming the offending mission and field usually fixes it.
                messages.push(
                    { role: 'assistant', content: JSON.stringify(input) },
                    { role: 'user', content: repairPrompt(error.message) },
                );
            }
        }

        throw new CampaignError(`could not build a valid path — ${lastReason}`, 502);
    } finally {
        clearTimeout(deadline);
    }
}

/**
 * Retries only genuinely transient gateway failures, and only while the shared
 * deadline has not passed. Auth errors and token-limit truncations are not
 * retried: repeating the identical call cannot change either outcome.
 */
async function withTransientRetry(attemptFn, signal) {
    try {
        return await attemptFn();
    } catch (error) {
        if (!(error instanceof LlmError) || !error.retryable || signal.aborted) throw error;

        await sleep(TRANSIENT_RETRY_DELAY_MS, signal);
        return attemptFn();
    }
}

/**
 * Wraps validated missions in the envelope the app reads.
 *
 * `label` is the model's `name` for the campaign, passed through unchanged. It
 * used to be sliced out of the ambition here — first clause, truncated at 48 —
 * which is free and deterministic but names the wrong thing: it is the *opening
 * words the user typed*, not the goal the path serves. Two campaigns started
 * from differently-worded versions of the same intention ("Network with
 * founders…", "Build a founder network before I launch") collapsed onto names
 * that read like fragments, and a name like "Network with startup founders and
 * build real relationships" tells the user nothing about where they are going.
 * Only the model has read the ambition, the friction and the baseline together,
 * so the name is generated alongside the path and validated like any other field.
 *
 * `id` and `createdAt` remain generated here — they are facts, not judgements.
 */
function shapeResponse(missions, name) {
    return {
        id: `cmp_${crypto.randomUUID()}`,
        label: name,
        createdAt: new Date().toISOString(),
        missions,
    };
}

/**
 * One structured log line per model call. This is the A02 (*API Usage*, Story 6)
 * dataset — token spend per campaign cannot be reconstructed after the fact.
 */
function logUsage({ attempt, usage, model, elapsed }) {
    const parts = [
        `[llm] attempt=${attempt}`,
        `model=${model ?? config.llmModel}`,
        `latency=${elapsed}ms`,
    ];

    if (usage) {
        parts.push(`in=${usage.prompt_tokens ?? '?'}`, `out=${usage.completion_tokens ?? '?'}`);
        if (usage.total_tokens) parts.push(`total=${usage.total_tokens}`);
    }

    // The gateway is a passthrough alias list, so the echoed model is the only
    // evidence of what actually answered. Flag a substitution loudly.
    if (model && model !== config.llmModel) {
        parts.push(`NOTE=asked for ${config.llmModel}, gateway reported ${model}`);
    }

    console.log(parts.join(' '));
}

function sleep(ms, signal) {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
}

function text(value, max) {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

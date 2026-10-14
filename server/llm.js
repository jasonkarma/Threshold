/**
 * LLM gateway adapter — OpenAI-compatible `POST /v1/chat/completions`.
 *
 * The gateway at `lumiarouter.com` reports `supported_endpoint_types: ["openai"]`
 * for every model in its catalogue, including the Claude ones, so the OpenAI
 * shape is the only one that works here. See
 * `plans/threshold-llm-backend-plan.md` §3.
 *
 * Three things this file is responsible for that are easy to get wrong:
 *
 * 1. **Getting structured output.** A forced function call is the primary path
 *    — `tool_choice` pins the reply to one schema, so there are no markdown
 *    fences or pleasantries to strip. `response_format: json_schema` is attempted
 *    only as an opportunistic upgrade, because no gateway can natively honour it
 *    for Claude: they translate it into a forced tool they define themselves, or
 *    reject it outright with a 400.
 * 2. **Tolerant extraction.** Whatever comes back is parsed defensively, since
 *    a gateway that ignores `tool_choice` will hand us prose.
 * 3. **Bounded time.** Every attempt has its own timeout, and the caller passes
 *    a shared deadline so retries cannot run past the point where the client has
 *    already given up.
 */
import { config } from './config.js';

/** Raised for anything that should surface as a 502 rather than a 500. */
export class LlmError extends Error {
    constructor(message, { retryable = false, status } = {}) {
        super(message);
        this.name = 'LlmError';
        this.retryable = retryable;
        this.status = status;
    }
}

/**
 * Calls the gateway once. Retries on transient failures are the caller's job,
 * because only the caller knows how much of the deadline is left.
 *
 * @param {object} options
 * @param {string} options.system
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} options.messages
 * @param {object} options.tool       function definition, OpenAI shape
 * @param {string} options.toolName
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ input: unknown, usage: object | null, model: string | null, raw: string }>}
 */
export async function complete({ system, messages, tool, toolName, signal }) {
    const body = {
        model: config.llmModel,
        max_tokens: config.llmMaxTokens,
        messages: [{ role: 'system', content: system }, ...messages],
        tools: [{ type: 'function', function: tool }],
        tool_choice: { type: 'function', function: { name: toolName } },
        temperature: 0.7,
    };

    const started = Date.now();
    const response = await post(body, signal);
    const elapsed = Date.now() - started;

    if (response.status === 400) {
        // Most likely cause: the gateway rejects a parameter it does not
        // support. Surface the body — a bare "400" is undebuggable.
        const detail = await safeText(response);
        throw new LlmError(
            `gateway rejected the request (400). ${truncate(detail, 400)}`,
            { retryable: false, status: 400 },
        );
    }

    if (response.status === 401 || response.status === 403) {
        throw new LlmError('gateway rejected our API key (LLM_API_KEY).', { retryable: false, status: response.status });
    }

    if (response.status === 429) {
        throw new LlmError('gateway rate-limited the request (429).', { retryable: true, status: 429 });
    }

    if (response.status >= 500) {
        throw new LlmError(`gateway returned ${response.status}.`, { retryable: true, status: response.status });
    }

    if (!response.ok) {
        throw new LlmError(`gateway returned ${response.status}.`, { retryable: false, status: response.status });
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        const detail = await safeText(response);
        // A 200 with a non-JSON body is exactly the failure the app hit when it
        // was pointed at this gateway's root instead of a real route.
        throw new LlmError(
            `gateway returned 200 with a non-JSON body — is LLM_BASE_URL pointing at the API root? ` +
            `First bytes: ${truncate(detail, 200)}`,
            { retryable: false, status: 502 },
        );
    }

    const choice = payload?.choices?.[0];
    if (!choice) {
        throw new LlmError(`gateway response had no choices. Body: ${truncate(JSON.stringify(payload), 400)}`, {
            retryable: true,
            status: 502,
        });
    }

    if (choice.finish_reason === 'length') {
        // Truncated mid-array: retrying identically will truncate identically,
        // so this is not marked retryable. Fix LLM_MAX_TOKENS instead.
        throw new LlmError(
            `model hit the token limit mid-response (LLM_MAX_TOKENS=${config.llmMaxTokens}). ` +
            'Raise it and retry.',
            { retryable: false, status: 502 },
        );
    }

    if (choice.finish_reason === 'content_filter') {
        throw new LlmError('gateway filtered the response.', { retryable: true, status: 502 });
    }

    const input = extractStructured(choice.message);
    if (input === undefined) {
        const text = typeof choice.message?.content === 'string' ? choice.message.content : '';
        throw new LlmError(
            `could not find JSON in the model's reply. Finish reason: ${choice.finish_reason ?? 'unknown'}. ` +
            `Reply began: ${truncate(text, 300)}`,
            { retryable: true, status: 502 },
        );
    }

    return {
        input,
        usage: payload.usage ?? null,
        // Trust the echoed model over the one we sent: if they differ, the
        // gateway substituted something, and that is worth a log line.
        model: typeof payload.model === 'string' ? payload.model : null,
        raw: JSON.stringify(input),
    };
}

async function post(body, signal) {
    const timeout = AbortSignal.timeout(config.llmTimeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    try {
        return await fetch(`${config.llmBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.llmApiKey}`,
            },
            body: JSON.stringify(body),
            signal: combined,
        });
    } catch (cause) {
        if (timeout.aborted) {
            throw new LlmError(`gateway did not answer within ${config.llmTimeoutMs}ms.`, {
                retryable: true,
                status: 504,
            });
        }
        if (signal?.aborted) {
            // Caller's deadline: no point retrying, and the reason should be
            // the deadline, not the gateway.
            throw new LlmError('generation deadline reached before the gateway answered.', {
                retryable: false,
                status: 504,
            });
        }
        throw new LlmError(`could not reach the gateway at ${config.llmBaseUrl}: ${cause?.message ?? cause}`, {
            retryable: true,
            status: 502,
        });
    }
}

/**
 * Pulls structured data out of a message, in order of reliability:
 * forced function call → JSON in `content` → balanced-brace scan of prose.
 */
export function extractStructured(message) {
    const call = message?.tool_calls?.[0];
    const args = call?.function?.arguments;

    if (typeof args === 'string' && args.trim()) {
        const parsed = tryParse(args);
        if (parsed !== undefined) return parsed;
        // Some gateways return an already-parsed object here, or a nested
        // string of JSON; one more pass covers both.
        const reparsed = tryParse(args.trim());
        if (reparsed !== undefined) return reparsed;
    }

    if (call?.function?.arguments && typeof call.function.arguments === 'object') {
        return call.function.arguments;
    }

    const content = message?.content;
    if (typeof content === 'string' && content.trim()) {
        const direct = tryParse(content);
        if (direct !== undefined) return direct;

        const block = firstJsonBlock(content);
        if (block) {
            const parsed = tryParse(block);
            if (parsed !== undefined) return parsed;
        }
    }

    return undefined;
}

function tryParse(text) {
    try {
        const value = JSON.parse(text);
        return value && typeof value === 'object' ? value : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Finds the first balanced `{…}` block in a string, tracking string-escape
 * state so a brace inside a mission description does not end the scan early.
 * This is the fallback for a gateway that ignored `tool_choice` and wrapped the
 * JSON in prose or fences.
 */
export function firstJsonBlock(text) {
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
        const char = text[i];

        if (inString) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
            continue;
        }

        if (char === '"') inString = true;
        else if (char === '{') depth += 1;
        else if (char === '}') {
            depth -= 1;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }

    return null; // Unbalanced — truncated output.
}

async function safeText(response) {
    try {
        return await response.text();
    } catch {
        return '';
    }
}

function truncate(text, max) {
    if (typeof text !== 'string') return '';
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

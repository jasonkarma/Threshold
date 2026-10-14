/**
 * The validation gate between the model and the app.
 *
 * ## Why this is strict while the app is lenient
 *
 * `normalizeCampaign` in `mobile/src/lib/campaign-service.ts` defaults every
 * missing field so a screen can never crash. That is correct for a client and
 * it has a sharp consequence: garbage renders as ten plausible-looking cards
 * titled "Level 1" with an empty description, and nothing anywhere reports an
 * error. A silent failure is indistinguishable from a working generation.
 *
 * This server is the last place that can tell the difference, so it is the
 * strict one. Anything unusable throws, the route answers 502, and the reason
 * reaches the terminal log.
 */
import { DOMAINS } from './prompts/campaign.js';

/**
 * Thrown when the model's output cannot be turned into a usable path. The
 * message is written to be read by a human in the terminal *and* fed back to
 * the model on the repair retry, so it names the offending mission and field.
 */
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

const MAX_TITLE = 80;
const MAX_DESCRIPTION = 400;
const MAX_CONTEXT = 120;
const MAX_TIP = 300;

/**
 * Coerces a raw model payload into the exact shape the app expects, renumbering
 * levels gaplessly, or throws with a specific reason.
 *
 * @param {unknown} payload parsed model output — either the whole object or the
 *   mission array itself, since models occasionally unwrap one level.
 * @returns {{ missions: Array<Record<string, unknown>> }}
 */
export function validateCampaign(payload) {
    const root = asObject(payload);
    if (!root) throw new ValidationError('output was not a JSON object.');

    // Tolerate the array on its own: models sometimes return `[...]` or
    // `{ "missions": { "missions": [...] } }` when they wrap twice.
    const raw = Array.isArray(payload)
        ? payload
        : Array.isArray(root.missions)
            ? root.missions
            : asObject(root.missions)?.missions;

    if (!Array.isArray(raw)) {
        throw new ValidationError('output had no `missions` array.');
    }
    if (raw.length === 0) {
        throw new ValidationError('`missions` was empty.');
    }
    if (raw.length < 5) {
        throw new ValidationError(`only ${raw.length} missions were returned; a usable path needs at least 5.`);
    }

    // Sort by the level the model intended, so an out-of-order array still
    // maps to the right sequence, then renumber. The app sorts by level but
    // never renumbers, so a gap (1,2,3,5,…) would leave a permanently locked
    // level in the UI — renumbering here is what prevents that.
    const ordered = raw
        .map((mission, index) => ({ mission: asObject(mission), index }))
        .sort((a, b) => levelOf(a.mission, a.index) - levelOf(b.mission, b.index))
        .map((entry) => entry.mission);

    const missions = ordered.map((mission, index) => coerceMission(mission, index + 1));

    const titles = new Set(missions.map((m) => m.title.toLowerCase()));
    if (titles.size < missions.length) {
        throw new ValidationError('two missions had the same title; every level must be distinct.');
    }

    return { missions };
}

function coerceMission(raw, level) {
    if (!raw) throw new ValidationError(`mission ${level} was not an object.`);

    const title = clean(raw.title ?? raw.missionTitle ?? raw.name, MAX_TITLE);
    if (!title) throw new ValidationError(`mission ${level} had no title.`);

    const description = clean(raw.description ?? raw.detail ?? raw.body, MAX_DESCRIPTION);
    if (!description) throw new ValidationError(`mission ${level} ("${title}") had no description.`);

    const domain = normalizeDomain(raw.domain ?? raw.targetContext ?? raw.category);
    if (!domain) {
        throw new ValidationError(
            `mission ${level} ("${title}") had domain "${String(raw.domain ?? raw.targetContext ?? '')}", ` +
            `which is not one of: ${DOMAINS.join(', ')}.`,
        );
    }

    const context = clean(raw.context ?? raw.setting, MAX_CONTEXT);
    if (!context) throw new ValidationError(`mission ${level} ("${title}") had no context line.`);

    // A missing tip is the one field worth defaulting: it is a nicety, and
    // failing a whole generation over it would waste an otherwise good path.
    const tip = clean(raw.tip ?? raw.hint, MAX_TIP) || 'Start smaller than feels necessary. The first minute is the hard part.';

    const tags = Array.isArray(raw.tags)
        ? raw.tags.map((tag) => clean(tag, 24)).filter(Boolean).slice(0, 3)
        : [];

    return {
        level,
        title,
        description,
        tags: tags.length >= 1 ? tags : ['Focused'],
        domain,
        context,
        tip,
    };
}

/** Maps a level to a sortable number, falling back to array position. */
function levelOf(mission, index) {
    const value = Number(mission?.level ?? mission?.levelNumber);
    return Number.isFinite(value) && value > 0 ? value : index + 1;
}

/**
 * Normalises the model's domain vocabulary onto the app's three values.
 * An unknown domain is a hard failure rather than a default, because silently
 * rewriting it to `public_async` would mislabel the mission on Progress and
 * corrupt the friction-domain readout.
 */
function normalizeDomain(value) {
    if (typeof value !== 'string') return null;
    const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (DOMAINS.includes(key)) return key;

    const aliases = {
        async: 'public_async',
        public: 'public_async',
        public_async_: 'public_async',
        private_async: 'public_async',
        social_media: 'public_async',
        online: 'public_async',
        live: 'live_strangers',
        strangers: 'live_strangers',
        in_person: 'live_strangers',
        live_event: 'live_strangers',
        networking: 'live_strangers',
        authority_figure: 'authority',
        authority_figures: 'authority',
        direct_ask: 'authority',
        high_stakes: 'authority',
    };
    return aliases[key] ?? null;
}

function clean(value, maxLength) {
    if (typeof value !== 'string') return '';
    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…` : trimmed;
}

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

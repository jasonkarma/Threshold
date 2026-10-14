/**
 * Derived metrics — the Frontier, the Debrief archetypes and the pacing engine.
 *
 * Read `plans/threshold-points-plan.md` before changing anything here. The short
 * version:
 *
 *   ① FRONTIER    — a 1.0–10.0 watermark of the highest level reliably executed.
 *                   Monotonic. Aborts and repetition cannot move it.
 *   ② ARCHETYPES  — every logged outcome classifies into exactly one of six
 *                   states. Determines S14 copy. Rewards nothing.
 *   ③ PACING      — which mission is active next: advance, repeat, or bridge.
 *
 * The three touch but never merge. There is deliberately no points system and no
 * streak: rewarding `expected − actual` would put a price on the user's honesty,
 * and a tally would let abort-grinding reach the same altitude as a genuine climb.
 */
import type {
    ArchetypeReadout,
    Campaign,
    Debrief,
    DebriefArchetype,
    DomainCapability,
    DomainStanding,
    FrictionDomain,
    FrontierRung,
    Mission,
    PacingDecision,
    PacingOption,
    PredictionError,
    Reframe,
    ThresholdFrontier,
} from './types';

/* ------------------------------------------------------------- constants ---- */

/**
 * The ratchet rule. Asymmetric on purpose: a mission must be *clearly* rough
 * before the 0.2 reservation applies, so the common case ratchets cleanly to `L`.
 */
export const FRONTIER = {
    floor: 1.0,
    ceiling: 10.0,
    /** `actual <= this` at level L ratchets the frontier to L outright. */
    manageableActual: 55,
    /** `actual > manageableActual`: credit L minus this. A reservation, not a penalty. */
    highFrictionDiscount: 0.2,
    /** Completed via a bridge: credit L minus this. */
    bridgeDiscount: 0.5,
} as const;

export const ARCHETYPE_THRESHOLDS = {
    /** `|delta|` at or past this is a material expectancy gap. */
    deltaBand: 15,
    /** `actual` at or above this is a genuinely hard mission. */
    distressActual: 60,
    /** `actual` at or above this is real, moderate friction. */
    moderateActual: 45,
} as const;

/** Gates for the S11 Reality Check. All four must pass. */
export const REFRAME = {
    minExpected: 50,
    minCompletions: 2,
    minMeanOverestimation: 5,
} as const;

/** The one question asked after an approach attempt. Chips, never free text. */
export const FREEZE_TRIGGERS = [
    "Didn't know what to say",
    'Timing was wrong',
    'Fear spiked',
    'Got a bad response',
    'Other',
] as const;

/* ---------------------------------------------------------------- rungs ---- */

/**
 * Rung boundaries sit *at mission levels*, so `3.4` reads as "solidly past
 * Level 3" and the user can see what the next name costs. Seven names, bounded
 * at 10.0 — a finite ladder, because an unbounded number is a treadmill.
 */
export const RUNGS: FrontierRung[] = [
    { index: 0, name: 'First Step', floor: 1.0, blurb: "You did something you'd been dodging." },
    { index: 1, name: 'In Motion', floor: 2.1, blurb: 'Doing it is becoming routine, not an event.' },
    { index: 2, name: 'Steady', floor: 3.4, blurb: "You're choosing the harder version on purpose." },
    { index: 3, name: 'At Ease', floor: 4.7, blurb: 'The old fear is getting boring.' },
    { index: 4, name: 'Widening', floor: 6.1, blurb: "You're carrying it into new rooms and new people." },
    { index: 5, name: 'Beyond Your Path', floor: 7.5, blurb: "You're doing things you never put on a list." },
    { index: 6, name: 'Second Nature', floor: 9.0, blurb: 'It stopped being a decision.' },
];

/** The `0.0` state — a named state, not a rung you can plateau on. */
export const COMMITTED: FrontierRung = {
    index: -1,
    name: 'Committed',
    floor: 0,
    blurb: 'You named what you avoid and built a path.',
};

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

function clampFrontier(value: number): number {
    return Math.min(FRONTIER.ceiling, round1(Math.max(FRONTIER.floor, value)));
}

/* ------------------------------------------------------------- frontier ---- */

/**
 * The whole ratchet rule, pure (§3.1). Called once per mission, at logging time,
 * and the result is frozen onto the debrief.
 *
 * `attempted` returns `prev` exactly — attempts are worth zero *structurally*,
 * not capped at zero, so no future tuning can turn them into a currency.
 */
export function frontierAfter(
    prev: number,
    input: {
        level: number;
        actual: number;
        outcome: 'completed' | 'attempted';
        viaBridge?: boolean;
    },
): number {
    if (input.outcome !== 'completed') return prev;

    let candidate: number;
    if (input.viaBridge) {
        // Crossing in a smaller form is genuinely worth less altitude.
        candidate = input.level - FRONTIER.bridgeDiscount;
    } else if (input.actual > FRONTIER.manageableActual) {
        candidate = input.level - FRONTIER.highFrictionDiscount;
    } else {
        candidate = input.level;
    }

    return clampFrontier(Math.max(prev, candidate));
}

/** Folds the ratchet over a campaign's log, in chronological order. */
export function frontierValue(debriefs: Debrief[]): number {
    const ordered = [...debriefs].sort(
        (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );

    return ordered.reduce((prev, debrief) => {
        // Frozen at write time; the fold only matters for legacy rows.
        if (typeof debrief.frontierAfter === 'number') return debrief.frontierAfter;
        return frontierAfter(prev, {
            level: debrief.level,
            actual: debrief.actualDifficulty,
            outcome: debrief.outcome ?? 'completed',
            viaBridge: debrief.viaBridge,
        });
    }, 0);
}

export function rungFor(value: number): FrontierRung {
    if (value < FRONTIER.floor) return COMMITTED;
    let current = RUNGS[0];
    for (const rung of RUNGS) {
        if (value >= rung.floor) current = rung;
    }
    return current;
}

/**
 * The campaign-level readout. `activeLevel` may exceed `value` on purpose —
 * pacing probes what is possible, the frontier records what is held.
 */
export function frontier(debriefs: Debrief[], campaign: Campaign | null): ThresholdFrontier {
    const value = frontierValue(debriefs);
    const rung = rungFor(value);
    const next = RUNGS.find((r) => r.floor > value) ?? null;
    const isCommitted = value < FRONTIER.floor;

    return {
        value,
        rung,
        next,
        ratio: isCommitted ? 0 : Math.max(0, Math.min(1, value / FRONTIER.ceiling)),
        activeLevel: campaign?.activeLevel ?? 1,
        isCommitted,
    };
}

/** `3.4` / `0.0` — one decimal everywhere the frontier is displayed. */
export function formatFrontier(value: number): string {
    return clampFrontier(value).toFixed(1);
}

/* ----------------------------------------------------------- archetypes ---- */

export function predictionError(expected: number, actual: number): PredictionError {
    const delta = Math.round(expected - actual);
    return { expected, actual, delta, easier: delta > 0 };
}

/**
 * Pure, total, deterministic. Precedence per §4.0 — the final branch is
 * unconditional, so this can never return `undefined` for any input.
 *
 * Rows 2 and 5 exist to close coverage gaps in the original four arms: without
 * `underestimate` a `35/60` mission misreads as Distress Tolerance ("both
 * numbers are honest") when they are 25 apart, and without `calibration_match` a
 * `50/55` completion produces no verdict at all.
 */
export function classifyDebrief(debrief: Debrief): DebriefArchetype {
    const outcome = debrief.outcome ?? 'completed';
    if (outcome === 'attempted') return 'approach_attempt';

    const { delta } = predictionError(debrief.expectedDifficulty, debrief.actualDifficulty);
    const actual = debrief.actualDifficulty;

    if (delta <= -ARCHETYPE_THRESHOLDS.deltaBand) return 'underestimate';
    if (delta >= ARCHETYPE_THRESHOLDS.deltaBand) return 'expectancy_violation';
    if (actual >= ARCHETYPE_THRESHOLDS.distressActual) return 'distress_tolerance';
    if (actual >= ARCHETYPE_THRESHOLDS.moderateActual) return 'calibration_match';
    return 'baseline_mastery';
}

const ARCHETYPE_LABELS: Record<DebriefArchetype, string> = {
    expectancy_violation: 'Fear disconfirmed',
    distress_tolerance: 'Courage breakthrough',
    baseline_mastery: 'Consolidated',
    approach_attempt: 'Approach attempt',
    calibration_match: 'Accurate read',
    underestimate: 'Underestimated',
};

export function archetypeReadout(debrief: Debrief): ArchetypeReadout {
    const archetype = classifyDebrief(debrief);
    const { expected, actual, delta } = predictionError(
        debrief.expectedDifficulty,
        debrief.actualDifficulty,
    );
    const gap = Math.abs(delta);

    switch (archetype) {
        case 'approach_attempt':
            return {
                archetype,
                label: ARCHETYPE_LABELS[archetype],
                headline: 'You walked up to the edge.',
                body: 'That counts as data, not a failure.',
                emphasiseGap: false,
            };

        case 'underestimate':
            return {
                archetype,
                label: ARCHETYPE_LABELS[archetype],
                headline: `Reality ran heavier than your prediction — by ${gap}.`,
                body: "That's the first real measurement of this edge, and it's worth more than a comfortable run would have been.",
                emphasiseGap: true,
            };

        case 'expectancy_violation':
            return {
                archetype,
                label: ARCHETYPE_LABELS[archetype],
                headline: 'Your fear wrote a bigger number than reality did.',
                body: `You predicted ${expected} and met ${actual}.`,
                emphasiseGap: true,
            };

        case 'distress_tolerance':
            return {
                archetype,
                label: ARCHETYPE_LABELS[archetype],
                headline: 'Both numbers are honest. You did it anyway.',
                body: `It was genuinely hard — ${actual}/100 — and you finished it without the fear shrinking first.`,
                emphasiseGap: false,
            };

        case 'calibration_match':
            return {
                archetype,
                label: ARCHETYPE_LABELS[archetype],
                headline: 'You knew what you were walking into, and you walked in.',
                body: `You called it at ${expected}, it landed at ${actual}.`,
                emphasiseGap: false,
            };

        case 'baseline_mastery':
        default:
            return {
                archetype: 'baseline_mastery',
                label: ARCHETYPE_LABELS.baseline_mastery,
                headline: 'This tier is routine now.',
                body: 'Nothing to prove here.',
                emphasiseGap: false,
            };
    }
}

/** Fallback one-liner, retained for screens that only have the numbers. */
export function insightFor(err: PredictionError): string {
    const magnitude = Math.abs(err.delta);
    if (magnitude < 10) return 'Your read on this was close to reality.';
    if (err.easier) {
        return magnitude >= 30
            ? 'It was far easier than you feared.'
            : 'It was easier than you feared.';
    }
    return magnitude >= 30
        ? 'That was harder than expected — useful data, not failure.'
        : 'That ran a little harder than you expected.';
}

/* --------------------------------------------------------------- pacing ---- */

/**
 * A bridge is the **same level, lighter content** — a micro-step down in
 * friction, not a demotion. Derived deterministically from `tags`: no server
 * round-trip, no latency at the worst possible moment, no LLM dependency.
 */
export function bridgeFor(mission: Mission): Mission {
    const tags = mission.tags.map((t) => t.toLowerCase());

    let title = mission.title;
    let description = mission.description;
    let tags2 = [...mission.tags];
    let tip = mission.tip;

    if (tags.some((t) => t.includes('in person'))) {
        title = `${mission.title} — over DM instead`;
        description =
            'Same introduction, same person, but written instead of spoken. Send one message and stop there.';
        tags2 = ['Private', 'Written', 'Lower stakes'];
        tip = 'Write it as if you were the only person who will ever read it. Lower the bar on the wording.';
    } else if (tags.some((t) => t.includes('direct ask'))) {
        title = `${mission.title} — no ask`;
        description =
            'Make contact with the same person, but ask for nothing at all. One message, zero requests.';
        tags2 = ['Contact', 'No ask', 'Lower stakes'];
        tip = 'End without a question. An ask-free message is easier to send and still counts as contact.';
    } else if (tags.some((t) => t.includes('public'))) {
        title = `${mission.title} — one person only`;
        description =
            'Say the same thing to a single person in private rather than to everyone in public.';
        tags2 = ['Private', 'One-to-one', 'Lower stakes'];
        tip = 'The words can be identical. Only the audience shrinks.';
    } else if (tags.some((t) => t.includes('sustained') || t.includes('extended'))) {
        title = `${mission.title} — half the time`;
        description = 'Run the same mission at half the duration. You can stop early and it still counts.';
        tags2 = ['Shorter', 'Same level', 'Lower stakes'];
        tip = 'Decide your exit point before you start. Knowing where it ends removes most of the pressure.';
    } else {
        title = `${mission.title} — first half only`;
        description = 'Do only the first half of this mission, then stop. That is the whole task today.';
        tags2 = ['Partial', 'Same level', 'Lower stakes'];
        tip = 'Stopping halfway is the intended outcome here, not a shortfall.';
    }

    return {
        ...mission,
        id: `${mission.id}-bridge`,
        title,
        description,
        tags: tags2,
        tip,
        bridgeOf: mission.id,
        status: 'active',
    };
}

/** Options offered after a Distress Tolerance verdict. Neither is recommended. */
export function distressOptions(level: number): PacingOption[] {
    return [
        {
            id: 'repeat',
            label: `Run Level ${level} once more to make it comfortable`,
            blurb: 'Same mission, same level. This is what converts a crossing into a hold.',
            level,
        },
        {
            id: 'advance',
            label: `Push to Level ${level + 1} anyway`,
            blurb: 'You crossed it at high friction. Going further is a legitimate answer.',
            level: level + 1,
        },
    ];
}

/**
 * What the pacing engine does with the last outcome (§5.2).
 *
 * Advancing never *replaces* the frontier — it probes ahead of it. If pacing
 * were gated on the watermark, a user could never attempt anything they had not
 * already mastered, which is the opposite of an exposure ladder.
 */
export function paceNext(debrief: Debrief, mission: Mission, campaign: Campaign): PacingDecision {
    const archetype = classifyDebrief(debrief);
    const level = debrief.level;

    switch (archetype) {
        case 'distress_tolerance':
            return { kind: 'choose', level, options: distressOptions(level) };

        case 'underestimate':
            return { kind: 'repeat', level, reason: 'above_reach' };

        case 'approach_attempt': {
            const canonical = campaign.missions.find((m) => m.level === level) ?? mission;
            return { kind: 'bridge', level, mission: bridgeFor(canonical) };
        }

        case 'expectancy_violation':
        case 'calibration_match':
        case 'baseline_mastery':
        default:
            return { kind: 'advance', level: level + 1 };
    }
}

/* ----------------------------------------------------------- capability ---- */

const DOMAIN_META: Record<FrictionDomain, { label: string; blurb: string }> = {
    public_async: { label: 'Public async', blurb: 'Comments, posts, DMs' },
    live_strangers: { label: 'Live strangers', blurb: 'Meetups, intros' },
    authority: { label: 'Authority figures', blurb: 'Founders, investors' },
};

/**
 * Per-domain capability, spanning *every* campaign the user has run. This is the
 * person-level axis: "can I talk to strangers?" is not a property of the route
 * that happened to exercise it.
 *
 * `debrief.domain` is frozen at write time so a deleted campaign's missions stay
 * in the profile; the campaigns lookup is a fallback for legacy rows only.
 */
export function domainCapabilities(
    debriefs: Debrief[],
    campaigns: Campaign[],
): DomainCapability[] {
    const domains = Object.keys(DOMAIN_META) as FrictionDomain[];

    return domains.map((domain) => {
        const relevant = debriefs.filter((d) => resolveDomain(d, campaigns) === domain);
        const completed = relevant.filter((d) => (d.outcome ?? 'completed') === 'completed');
        const attempts = relevant.length - completed.length;

        const withGap = completed.filter((d) => d.expectedDifficulty > d.actualDifficulty);
        const gap = withGap.length
            ? Math.round(
                withGap.reduce(
                    (sum, d) => sum + (d.expectedDifficulty - d.actualDifficulty),
                    0,
                ) / withGap.length,
            )
            : null;

        const localFrontier = completed.length
            ? completed.reduce((max, d) => Math.max(max, d.level), 0)
            : null;
        const maxActualHandled = completed.length
            ? completed.reduce((max, d) => Math.max(max, d.actualDifficulty), 0)
            : null;

        return {
            domain,
            label: DOMAIN_META[domain].label,
            blurb: DOMAIN_META[domain].blurb,
            localFrontier,
            maxActualHandled,
            completions: completed.length,
            attempts,
            meanExpectancyGap: gap,
            standing: standingFor(completed.length, attempts, gap),
        };
    });
}

export function domainStandingLabel(standing: DomainStanding): string {
    if (standing === 'rising') return 'Rising';
    if (standing === 'resistant') return 'Resistant';
    return 'Untested';
}

/**
 * The `attempts` figure is here because the **ratio is the signal**: 4
 * completions against 4 attempts reads very differently from 8 against 2, and
 * that difference is invisible in any single aggregate.
 */
function standingFor(
    completions: number,
    attempts: number,
    meanGap: number | null,
): DomainStanding {
    if (completions === 0 && attempts === 0) return 'untested';
    if (completions === 0) return 'resistant';
    if (meanGap !== null && meanGap > 0) return 'rising';
    return 'resistant';
}

function resolveDomain(debrief: Debrief, campaigns: Campaign[]): FrictionDomain | null {
    if (debrief.domain) return debrief.domain;
    const campaign = campaigns.find((c) => c.id === debrief.campaignId);
    return campaign?.missions.find((m) => m.id === debrief.missionId)?.domain ?? null;
}

export function meanOverestimation(debriefs: Debrief[]): number | null {
    const withGap = debriefs.filter(
        (d) =>
            (d.outcome ?? 'completed') === 'completed' &&
            d.expectedDifficulty > d.actualDifficulty,
    );
    if (withGap.length === 0) return null;
    return Math.round(
        withGap.reduce((sum, d) => sum + (d.expectedDifficulty - d.actualDifficulty), 0) /
        withGap.length,
    );
}

/** "8 of 10 missions were easier than you feared" — the thesis as one fact. */
export function fearWasWrongRate(debriefs: Debrief[]): { easier: number; total: number } {
    const completed = debriefs.filter((d) => (d.outcome ?? 'completed') === 'completed');
    const easier = completed.filter((d) => d.expectedDifficulty - d.actualDifficulty > 10).length;
    return { easier, total: completed.length };
}

/** Signed mean delta — negative means missions are consistently harder than feared. */
export function averageDelta(debriefs: Debrief[]): number {
    const completed = debriefs.filter((d) => (d.outcome ?? 'completed') === 'completed');
    if (completed.length === 0) return 0;
    const total = completed.reduce(
        (sum, d) => sum + (d.expectedDifficulty - d.actualDifficulty),
        0,
    );
    return Math.round(total / completed.length);
}

export function completedCount(debriefs: Debrief[]): number {
    return debriefs.filter((d) => (d.outcome ?? 'completed') === 'completed').length;
}

export function attemptCount(debriefs: Debrief[]): number {
    return debriefs.filter((d) => d.outcome === 'attempted').length;
}

/* ------------------------------------------------------------ reframing ---- */

/**
 * The pre-mission Reality Check (S11). `null` whenever any gate fails, so the
 * caller never has to re-check them.
 *
 * It states a **fact about the user's history**, never a forecast. "So this will
 * probably be easy" is a prediction the app cannot make, and being wrong once
 * costs every number on the screen its credibility.
 */
export function reframeFor(expected: number, debriefs: Debrief[]): Reframe | null {
    if (expected < REFRAME.minExpected) return null;

    const completed = debriefs.filter((d) => (d.outcome ?? 'completed') === 'completed');
    if (completed.length < REFRAME.minCompletions) return null;

    const mean = meanOverestimation(completed);
    if (mean === null || mean < REFRAME.minMeanOverestimation) return null;

    const { easier, total } = fearWasWrongRate(completed);

    return {
        expected,
        meanOverestimation: mean,
        sampleSize: completed.length,
        easier,
        total,
        headline: `You're predicting ${expected}/100.`,
        body: `Across your past missions, reality ran an average of ${mean} points lighter than your fear predicted.${easier > 0 ? ` ${easier} of ${total} were easier than you feared.` : ''
            }`,
    };
}

/* ------------------------------------------------------------- campaign ---- */

/** Highest level the pacing engine is working, clamped to the path length. */
export function currentLevel(campaign: Campaign, _debriefs: Debrief[]): number {
    return Math.min(campaign.missions.length, Math.max(1, campaign.activeLevel));
}

/**
 * Resolves a mission id against both the canonical path and the current bridge.
 *
 * A bridge keeps the parent's *level* but carries its own id (`${parentId}-bridge`),
 * so every mission route must check both — otherwise a bridged mission would
 * render as "no longer part of your campaign", at the exact moment the user is
 * most fragile.
 */
export function missionById(campaign: Campaign | null, missionId: string): Mission | null {
    if (!campaign) return null;
    return (
        campaign.missions.find((m) => m.id === missionId) ??
        (campaign.activeBridge?.id === missionId ? campaign.activeBridge : null)
    );
}

/**
 * Which mission the user should act on next.
 *
 * Prefers the bridge when the pacing engine swapped one in — that is the whole
 * point of a bridge: the user is never parked on the mission that beat them.
 */
export function activeMission(campaign: Campaign, debriefs: Debrief[]): Mission | null {
    if (campaign.activeBridge) return campaign.activeBridge;
    const level = currentLevel(campaign, debriefs);
    return campaign.missions.find((m) => m.level === level) ?? null;
}

export function nextMission(campaign: Campaign, debriefs: Debrief[]): Mission | null {
    const level = currentLevel(campaign, debriefs) + 1;
    return campaign.missions.find((m) => m.level === level) ?? null;
}

export function lastDebrief(debriefs: Debrief[]): Debrief | null {
    return debriefs.length ? debriefs[debriefs.length - 1] : null;
}

export function isCampaignComplete(campaign: Campaign, debriefs: Debrief[]): boolean {
    const completedLevels = new Set(
        debriefs
            .filter((d) => (d.outcome ?? 'completed') === 'completed')
            .map((d) => d.level),
    );
    return campaign.missions.every((m) => completedLevels.has(m.level));
}

export { DOMAIN_META };

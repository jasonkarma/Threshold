/**
 * Domain types for Threshold.
 *
 * These mirror the data the real backend will own (campaign generation, mission
 * debriefs, calibration). The mock service in `src/lib/campaign-service.ts`
 * implements the generation half today; a Supabase/LLM-backed service will
 * implement the same surface later.
 *
 * The scoring model is documented in `plans/threshold-points-plan.md`: a
 * monotonic **Frontier** (1.0–10.0) per campaign, six **Debrief archetypes**
 * that carry the meaning, and a **pacing engine** that decides what is active
 * next. There are deliberately no points and no streaks.
 */

/** Where the friction lives — the stable capability axis across all campaigns. */
export type FrictionDomain = 'public_async' | 'live_strangers' | 'authority';

export type MissionStatus = 'locked' | 'active' | 'in_progress' | 'completed';

export type User = {
    id: string;
    name: string;
    email: string;
    /** Initials shown in the Settings avatar. */
    initials: string;
};

/** A single real-world exposure mission inside a campaign. */
export type Mission = {
    id: string;
    /** 1-based position in the campaign path. Ordinal *within* one campaign only. */
    level: number;
    title: string;
    /** What the user actually does, in one or two sentences. */
    description: string;
    /** Short "Specific · Public · No pitch" style qualifier row. */
    tags: string[];
    domain: FrictionDomain;
    /** Context line shown on the pre-rating screen. */
    context: string;
    /** One practical hint shown while the mission is live. */
    tip: string;
    status: MissionStatus;
    /**
     * Set when this mission is the bridge alternative for another mission's
     * level (see `bridgeFor`). It keeps the parent's `level` so history reads
     * honestly, and this id points back at the canonical mission.
     */
    bridgeOf?: string;
};

/** The user's answers from onboarding — the input to campaign generation. */
export type CampaignSeed = {
    ambition: string;
    friction: string;
    baseline: string;
};

export type Campaign = {
    id: string;
    seed: CampaignSeed;
    /**
     * The campaign's name, shown on Home, Campaigns, Progress and Settings.
     *
     * Generated with the path (`name` in the backend schema) because it has to
     * state the goal, not repeat the ambition: the first words the user typed
     * are the *input*, and a name cut from them reads as a truncated sentence
     * rather than a destination. Costing a few tokens is worth a name that
     * looks deliberate. Renameable in `/campaigns/[campaignId]`.
     */
    label: string;
    missions: Mission[];
    createdAt: string;
    /**
     * Level the pacing engine is currently working. **May exceed the frontier** —
     * the frontier records what is held, pacing probes what is possible
     * (`plans/threshold-points-plan.md` §5.3).
     */
    activeLevel: number;
    /**
     * Set when the pacing engine swapped in a lighter variant of the active
     * level (see `bridgeFor`). It is a *derived mission object*, stored rather
     * than recomputed so the copy cannot drift mid-mission.
     */
    activeBridge?: Mission;
};

/**
 * Derived, never stored — see `campaignStatus()`. Only `activeCampaignId` is
 * persisted, which is what stops a stale "completed" badge existing at all.
 */
export type CampaignStatus = 'active' | 'paused' | 'completed';

/* --------------------------------------------------------------- debriefs ---- */

/**
 * `attempted` is not an outcome — it is an act of approach. It pays nothing and
 * never moves the frontier (`plans/threshold-points-plan.md` §3.1.1), but it is
 * recorded, and it triggers a bridge so the user is never parked on the mission
 * that beat them.
 */
export type MissionOutcome = 'completed' | 'attempted';

/** Post-mission debrief — both fields required (Story 3 acceptance criteria). */
export type Debrief = {
    missionId: string;
    level: number;
    missionTitle: string;
    expectedDifficulty: number;
    actualDifficulty: number;
    notes: string;
    completedAt: string;

    /** Owning campaign. Absent on legacy rows — see `app-store` migration. */
    campaignId?: string;
    /**
     * Friction domain of the mission, **frozen at write time**. Stored rather
     * than looked up because deleting a campaign must not remove its missions
     * from the capability profile (`plans/threshold-multi-campaign-plan.md` §4.4).
     */
    domain?: FrictionDomain;
    /** Absent on rows logged before this change; treated as `'completed'`. */
    outcome?: MissionOutcome;
    /**
     * The frontier this mission produced, **frozen at write time**. Never
     * recomputed: a ratchet enforced by a formula humans edit is not a ratchet
     * (`plans/threshold-points-plan.md` §7.1).
     */
    frontierAfter?: number;
    /** True when completed through the bridge alternative for this level. */
    viaBridge?: boolean;
    /** Set only on approach attempts. One chip, never an essay. */
    freezeTrigger?: string;
};

/** Pre-mission rating. */
export type PreRating = {
    missionId: string;
    expectedDifficulty: number;
    recordedAt: string;
};

/** Derived, never stored: what the user feared vs. what happened. */
export type PredictionError = {
    expected: number;
    actual: number;
    /** expected - actual. Negative means "harder than feared". */
    delta: number;
    easier: boolean;
};

/* --------------------------------------------------------------- frontier ---- */

export type FrontierRung = {
    index: number;
    name: string;
    /** Inclusive lower bound on the 1.0–10.0 scale. */
    floor: number;
    blurb: string;
};

export type ThresholdFrontier = {
    /** `0.0` before the first completion, then `1.0`–`10.0`, one decimal. */
    value: number;
    rung: FrontierRung;
    next: FrontierRung | null;
    /** 0–1 across the whole 1.0–10.0 scale, for the ring arc. */
    ratio: number;
    /** Level pacing is working. May exceed `value`. */
    activeLevel: number;
    /** True while no completion has been logged — the "Committed" state. */
    isCommitted: boolean;
};

/* ------------------------------------------------------------- archetypes ---- */

export type DebriefArchetype =
    | 'expectancy_violation'
    | 'distress_tolerance'
    | 'baseline_mastery'
    | 'approach_attempt'
    | 'calibration_match'
    | 'underestimate';

export type ArchetypeReadout = {
    archetype: DebriefArchetype;
    /** Badge label for S14, e.g. "Fear disconfirmed". */
    label: string;
    /** One-line S14 headline. */
    headline: string;
    /** Supporting copy. */
    body: string;
    /**
     * Render the expected → actual gap as the visual anchor? False for
     * Distress Tolerance, where the numbers must not read as a verdict.
     */
    emphasiseGap: boolean;
};

/* ----------------------------------------------------------------- pacing ---- */

export type PacingOption = {
    id: 'repeat' | 'advance';
    label: string;
    blurb: string;
    level: number;
};

export type PacingDecision =
    | { kind: 'advance'; level: number }
    | { kind: 'repeat'; level: number; reason: 'consolidate' | 'above_reach' }
    | { kind: 'bridge'; level: number; mission: Mission }
    | { kind: 'choose'; level: number; options: PacingOption[] };

/* ------------------------------------------------------------- capability ---- */

export type DomainStanding = 'untested' | 'rising' | 'resistant';

/**
 * One row of the person-level capability table (S15). Deliberately spans *all*
 * campaigns: "can I talk to strangers?" is a property of the user, not of the
 * route that happened to exercise it.
 */
export type DomainCapability = {
    domain: FrictionDomain;
    label: string;
    blurb: string;
    /** Highest level completed in this domain. Ordinal — a citation, not a score. */
    localFrontier: number | null;
    /**
     * Highest *actual difficulty* survived in this domain (0–100). Cardinal and
     * comparable across every campaign, unlike `localFrontier`.
     */
    maxActualHandled: number | null;
    completions: number;
    attempts: number;
    /** Mean of (expected − actual) over completions where expected > actual. */
    meanExpectancyGap: number | null;
    standing: DomainStanding;
};

/** Person-level roll-up shown above the domain table on S15. */
export type CapabilityProfile = {
    completions: number;
    attempts: number;
    /** Counts every campaign the user has ever created, including deleted ones. */
    campaigns: number;
    domains: DomainCapability[];
    /** Signed mean delta across all completed missions. */
    averageDelta: number;
    fearWasWrong: { easier: number; total: number };
};

/* ------------------------------------------------------------- reframing ---- */

/** Pre-mission Reality Check (S11). Null whenever any gate fails. */
export type Reframe = {
    expected: number;
    meanOverestimation: number;
    sampleSize: number;
    easier: number;
    total: number;
    headline: string;
    body: string;
};

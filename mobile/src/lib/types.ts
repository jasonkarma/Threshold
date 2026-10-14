/**
 * Domain types for Threshold.
 *
 * These mirror the data the real backend will own (campaign generation, mission
 * debriefs, calibration). The mock service in `src/store` implements them today;
 * a Supabase/LLM-backed service will implement the same surface later.
 */

/** Where the friction lives — used for the capability map on Progress. */
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
    /** 1-based position in the campaign path. */
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
    /** Human label shown in Settings / Home (short form of the ambition). */
    label: string;
    missions: Mission[];
    createdAt: string;
};

/** Pre-mission rating. */
export type PreRating = {
    missionId: string;
    expectedDifficulty: number;
    recordedAt: string;
};

/** Post-mission debrief — both fields required (Story 3 acceptance criteria). */
export type Debrief = {
    missionId: string;
    level: number;
    missionTitle: string;
    expectedDifficulty: number;
    actualDifficulty: number;
    notes: string;
    completedAt: string;
};

/** Derived, never stored: what the user feared vs. what happened. */
export type PredictionError = {
    expected: number;
    actual: number;
    /** expected - actual. Negative means "easier than feared". */
    delta: number;
    easier: boolean;
};

export type FrictionDomainStat = {
    domain: FrictionDomain;
    label: string;
    blurb: string;
    attempts: number;
    averageDelta: number | null;
};

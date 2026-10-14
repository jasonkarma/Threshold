/**
 * Derived metrics. Nothing here is stored — it is all computed from the
 * debrief log, so the numbers can never drift out of sync with reality.
 */
import type {
    Campaign,
    Debrief,
    FrictionDomain,
    FrictionDomainStat,
    Mission,
    PredictionError,
} from './types';

export function predictionError(expected: number, actual: number): PredictionError {
    const delta = Math.round(expected - actual);
    return { expected, actual, delta, easier: delta > 0 };
}

/**
 * Threshold Score (0–100) = mean absolute prediction error across completed
 * missions. It answers "how much easier has reality turned out than fear
 * predicted?" — the app's core promise — rather than tracking streaks.
 *
 * NOTE: provisional. Matches the mock-ups (one mission, expected 62 / actual 28
 * → score 34). A second metric for demonstrated exposure is an open decision.
 */
export function thresholdScore(debriefs: Debrief[]): number {
    if (debriefs.length === 0) return 0;
    const total = debriefs.reduce((sum, d) => sum + Math.abs(d.expectedDifficulty - d.actualDifficulty), 0);
    return Math.min(100, Math.round(total / debriefs.length));
}

/** Signed mean delta — negative means missions are consistently easier than feared. */
export function averageDelta(debriefs: Debrief[]): number {
    if (debriefs.length === 0) return 0;
    const total = debriefs.reduce((sum, d) => sum + (d.expectedDifficulty - d.actualDifficulty), 0);
    return Math.round(total / debriefs.length);
}

/** Highest mission level the user has unlocked (1-based, clamped to the path length). */
export function currentLevel(campaign: Campaign, debriefs: Debrief[]): number {
    const total = campaign.missions.length;
    return Math.min(total, debriefs.length + 1);
}

export function completedCount(debriefs: Debrief[]): number {
    return debriefs.length;
}

/** Which mission the user should act on next. */
export function activeMission(campaign: Campaign, debriefs: Debrief[]): Mission | null {
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
    return debriefs.length >= campaign.missions.length;
}

const DOMAIN_META: Record<FrictionDomain, { label: string; blurb: string }> = {
    public_async: { label: 'Public async', blurb: 'Comments, posts, DMs' },
    live_strangers: { label: 'Live strangers', blurb: 'Meetups, intros' },
    authority: { label: 'Authority figures', blurb: 'Founders, investors' },
};

/**
 * Per-domain capability readout. A domain counts as "Rising" once the user has
 * tested it and reality on average came in easier than predicted.
 */
export function frictionDomainStats(debriefs: Debrief[], campaign: Campaign | null): FrictionDomainStat[] {
    const domains = Object.keys(DOMAIN_META) as FrictionDomain[];

    return domains.map((domain) => {
        const relevant = debriefs.filter((d) => {
            const mission = campaign?.missions.find((m) => m.id === d.missionId);
            return mission?.domain === domain;
        });

        const average = relevant.length
            ? Math.round(
                relevant.reduce((sum, d) => sum + (d.expectedDifficulty - d.actualDifficulty), 0) / relevant.length,
            )
            : null;

        return {
            domain,
            label: DOMAIN_META[domain].label,
            blurb: DOMAIN_META[domain].blurb,
            attempts: relevant.length,
            averageDelta: average,
        };
    });
}

export type DomainStanding = 'untested' | 'rising' | 'resistant';

export function domainStanding(stat: FrictionDomainStat): DomainStanding {
    if (stat.attempts === 0) return 'untested';
    return (stat.averageDelta ?? 0) > 0 ? 'rising' : 'resistant';
}

/** One-line takeaway shown on the result screen and Home. */
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
        : 'That ran a little harder than expected.';
}

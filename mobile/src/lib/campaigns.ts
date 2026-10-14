/**
 * Campaign management helpers — pure, no store dependency.
 *
 * Everything here is a fold over `(campaigns, debriefs, activeCampaignId)`. No
 * status is stored anywhere, which is what makes a stale "completed" badge
 * unrepresentable rather than merely unlikely.
 *
 * The product model (`plans/threshold-multi-campaign-plan.md` §3):
 *
 *   **Campaigns are routes. Capability is the person.**
 *
 * A **campaign frontier** is per-campaign, because levels are ordinal only
 * within a route — Level 4 of one path is not Level 4 of another. The
 * **capability profile** is per-person, because "can I talk to strangers?" is not
 * a property of the route that happened to exercise it.
 *
 * Only `activeCampaignId` is stored in the app state. `active` / `paused` /
 * `completed` are all derived here, which is what makes a stale badge
 * unrepresentable.
 */
import {
    averageDelta,
    completedCount,
    attemptCount,
    domainCapabilities,
    fearWasWrongRate,
    frontierAfter,
    frontierValue,
    isCampaignComplete,
    // The explicit extension is required by `node --experimental-strip-types`,
    // which runs `scripts/verify-model.ts` (Node's ESM resolver does not guess
    // extensions). Metro resolves it identically. Only value imports need it —
    // `./types` is type-only and erased.
} from './calibration.ts';
import type { Campaign, CampaignStatus, CapabilityProfile, Debrief } from './types';

/* ------------------------------------------------------------ migration ---- */

/**
 * Back-fills two fields on rows logged before this schema existed:
 * `campaignId` (attribution) and `frontierAfter` (the frozen ratchet).
 *
 * Deterministic from stored fields, so the back-fill is exact and the ratchet
 * holds across the whole history. Two properties that must never regress, and
 * which `npm test` pins:
 *
 * 1. **Every row survives.** This sorts and maps; it never filters.
 * 2. **An already-frozen row is never recomputed.** Retuning a constant must not
 *    silently move a watermark the user already earned.
 */
export function migrateDebriefs(debriefs: Debrief[], campaignId: string | null): Debrief[] {
    let running = 0;

    return [...debriefs]
        .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
        .map((debrief) => {
            const computed = frontierAfter(running, {
                level: debrief.level,
                actual: debrief.actualDifficulty,
                outcome: debrief.outcome ?? 'completed',
                viaBridge: debrief.viaBridge,
            });

            running = typeof debrief.frontierAfter === 'number' ? debrief.frontierAfter : computed;

            return {
                ...debrief,
                campaignId: debrief.campaignId ?? campaignId ?? undefined,
                frontierAfter: running,
            };
        });
}

/* --------------------------------------------------------------- status ---- */

export function campaignStatus(
    campaign: Campaign,
    debriefs: Debrief[],
    activeId: string | null,
): CampaignStatus {
    if (isCampaignComplete(campaign, campaignDebriefs(campaign, debriefs))) return 'completed';
    if (campaign.id === activeId) return 'active';
    return 'paused';
}

/** Every debrief belonging to one campaign. Orphans (deleted campaigns) are excluded. */
export function campaignDebriefs(campaign: Campaign, debriefs: Debrief[]): Debrief[] {
    return debriefs.filter((d) => d.campaignId === campaign.id);
}

export function debriefsFor(campaignId: string, debriefs: Debrief[]): Debrief[] {
    return debriefs.filter((d) => d.campaignId === campaignId);
}

/* ------------------------------------------------------------- progress ---- */

export type CampaignProgress = {
    status: CampaignStatus;
    /** 1.0–10.0 watermark for this route only. */
    frontier: number;
    completions: number;
    attempts: number;
    /** Total missions in the path, for the `n of N` readout. */
    total: number;
    /** When the last completion landed, ISO. Null if never. */
    lastActivityAt: string | null;
    finishedAt: string | null;
};

export function campaignProgress(
    campaign: Campaign,
    debriefs: Debrief[],
    activeId: string | null,
): CampaignProgress {
    const own = campaignDebriefs(campaign, debriefs);
    const completions = own.filter((d) => (d.outcome ?? 'completed') === 'completed');

    return {
        status: campaignStatus(campaign, debriefs, activeId),
        frontier: frontierValue(own),
        completions: completions.length,
        attempts: own.length - completions.length,
        total: campaign.missions.length,
        lastActivityAt: own.length ? own[own.length - 1].completedAt : null,
        finishedAt:
            campaign.id === activeId || completions.length < campaign.missions.length
                ? null
                : (completions[completions.length - 1]?.completedAt ?? null),
    };
}

/* ------------------------------------------------------------- ordering ---- */

const STATUS_RANK: Record<CampaignStatus, number> = { active: 0, paused: 1, completed: 2 };

/**
 * Active first, then paused by most recent activity, then completed by most
 * recent finish. Unbounded — no cap and no nagging, but an abandoned campaign
 * drifts down rather than accumulating at the top (decision 5).
 */
export function sortCampaigns(
    campaigns: Campaign[],
    debriefs: Debrief[],
    activeId: string | null,
): Campaign[] {
    return [...campaigns].sort((a, b) => {
        const ra = campaignProgress(a, debriefs, activeId);
        const rb = campaignProgress(b, debriefs, activeId);

        if (STATUS_RANK[ra.status] !== STATUS_RANK[rb.status]) {
            return STATUS_RANK[ra.status] - STATUS_RANK[rb.status];
        }

        if (ra.status === 'completed') {
            return timeOf(rb.finishedAt ?? b.createdAt) - timeOf(ra.finishedAt ?? a.createdAt);
        }
        if (ra.status === 'paused') {
            return timeOf(rb.lastActivityAt ?? b.createdAt) - timeOf(ra.lastActivityAt ?? a.createdAt);
        }
        return 0;
    });
}

function timeOf(iso: string | null): number {
    return iso ? new Date(iso).getTime() : 0;
}

/* ----------------------------------------------------------- capability ---- */

/**
 * The person-level roll-up for S15. Deliberately does **not** aggregate frontiers
 * across campaigns: there is no single number that honestly summarises capability
 * across routes, so the hero is counts and the domain table is the readout.
 */
export function capabilityProfile(
    campaigns: Campaign[],
    debriefs: Debrief[],
): CapabilityProfile {
    return {
        completions: completedCount(debriefs),
        attempts: attemptCount(debriefs),
        campaigns: campaigns.length,
        domains: domainCapabilities(debriefs, campaigns),
        averageDelta: averageDelta(debriefs),
        fearWasWrong: fearWasWrongRate(debriefs),
    };
}

/** Distinct campaign names present in the log — including deleted ones. */
export function campaignNameFor(
    campaignId: string | undefined,
    campaigns: Campaign[],
): string | null {
    if (!campaignId) return null;
    return campaigns.find((c) => c.id === campaignId)?.label ?? null;
}

/**
 * Only campaigns that actually appear in the log. Used for the S16 filter chips,
 * which must include orphaned rows (deleted campaigns) rather than dropping them.
 */
export function logOwners(
    campaigns: Campaign[],
    debriefs: Debrief[],
): { id: string | null; label: string }[] {
    const ids = new Set<string | null>();
    for (const debrief of debriefs) ids.add(debrief.campaignId ?? null);

    return [...ids].map((id) => ({
        id,
        label: id ? (campaignNameFor(id, campaigns) ?? 'Deleted campaign') : 'Deleted campaign',
    }));
}

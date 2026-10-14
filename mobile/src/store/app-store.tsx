/**
 * App-wide state: session, campaigns, and the debrief log the capability
 * metrics are derived from.
 *
 * Two structural decisions here, both documented in `plans/`:
 *
 * 1. **`campaigns` is an array; `campaign` is a derived selector** for the
 *    *active* one. Every screen in the mission loop keeps reading `campaign`
 *    and needs no changes. Only campaign management and the person-level
 *    screens (S15/S16) know there is more than one.
 * 2. **The frontier is frozen onto each debrief at write time.** Diagnostics
 *    recompute from the log; the ratchet does not, because a monotonic value
 *    enforced by a formula humans edit is not monotonic
 *    (`plans/threshold-points-plan.md` §7.1).
 *
 * Only `activeCampaignId` is stored. `active` / `paused` / `completed` are all
 * derived in `lib/campaigns.ts`, so a stale status badge is unrepresentable.
 */
import React, { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';

import { campaignService, type GenerationProgress } from '@/lib/campaign-service';
import { bridgeFor, frontierAfter, frontierValue, paceNext } from '@/lib/calibration';
import { debriefsFor as selectDebriefsFor, migrateDebriefs } from '@/lib/campaigns';
import { DEMO_SEED } from '@/lib/mock-campaign';
import type {
    Campaign,
    CampaignSeed,
    Debrief,
    Mission,
    MissionOutcome,
    PacingDecision,
    User,
} from '@/lib/types';

type State = {
    user: User | null;
    campaigns: Campaign[];
    /** Exactly one, or null before the first campaign exists. */
    activeCampaignId: string | null;
    debriefs: Debrief[];
    /** missionId → expected difficulty captured on the pre-rating screen. */
    preRatings: Record<string, number>;
    /** missionId → the Reality Check was already shown, so it lands once. */
    reframeSeen: Record<string, boolean>;
    seed: CampaignSeed;
    remindersEnabled: boolean;
};

type Action =
    | { type: 'signIn'; user: User }
    | { type: 'signOut' }
    | { type: 'setSeed'; patch: Partial<CampaignSeed> }
    | { type: 'addCampaign'; campaign: Campaign }
    | { type: 'activateCampaign'; id: string }
    | { type: 'renameCampaign'; id: string; label: string }
    | { type: 'deleteCampaign'; id: string }
    | { type: 'recordPreRating'; missionId: string; value: number }
    | { type: 'markReframeSeen'; missionId: string }
    | { type: 'completeMission'; debrief: Debrief }
    | { type: 'logAttempt'; debrief: Debrief }
    | { type: 'setPacing'; decision: PacingDecision }
    | { type: 'setReminders'; enabled: boolean };

const DEMO_USER: User = {
    id: 'user-demo',
    name: 'Karma Chou',
    email: 'karma@threshold.app',
    initials: 'KC',
};

const initialState: State = {
    user: null,
    campaigns: [],
    activeCampaignId: null,
    debriefs: [],
    preRatings: {},
    reframeSeen: {},
    seed: DEMO_SEED,
    remindersEnabled: true,
};

/* ---------------------------------------------------------------- helpers ---- */

/** The active campaign, or null. Never stored — always derived from the array. */
export function activeCampaignOf(state: Pick<State, 'campaigns' | 'activeCampaignId'>): Campaign | null {
    return state.campaigns.find((c) => c.id === state.activeCampaignId) ?? null;
}

/**
 * Applies a pacing decision to a campaign. `choose` is deliberately a no-op:
 * the user owns that branch, and it stays unresolved until `setPacing`.
 */
function applyPacing(campaign: Campaign, decision: PacingDecision): Campaign {
    switch (decision.kind) {
        case 'advance':
            return { ...campaign, activeLevel: decision.level, activeBridge: undefined };
        case 'repeat':
            return { ...campaign, activeLevel: decision.level, activeBridge: undefined };
        case 'bridge':
            return { ...campaign, activeLevel: decision.level, activeBridge: decision.mission };
        case 'choose':
        default:
            return campaign;
    }
}

/* ---------------------------------------------------------------- reducer ---- */

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'signIn':
            return { ...state, user: action.user };

        case 'signOut':
            return { ...initialState, user: null };

        case 'setSeed':
            return { ...state, seed: { ...state.seed, ...action.patch } };

        case 'addCampaign': {
            // A new campaign is appended, never substituted: the debrief log is
            // the user's record and must survive every campaign boundary. This
            // is the highest-risk regression in the multi-campaign feature.
            const campaigns = [...state.campaigns, action.campaign];
            return { ...state, campaigns, activeCampaignId: action.campaign.id };
        }

        case 'activateCampaign': {
            if (!state.campaigns.some((c) => c.id === action.id)) return state;
            // Pausing is implicit: activating B is what pauses A. There is no
            // separate pause action, so there is no decision to justify.
            return { ...state, activeCampaignId: action.id };
        }

        case 'renameCampaign':
            return {
                ...state,
                campaigns: state.campaigns.map((c) =>
                    c.id === action.id ? { ...c, label: action.label } : c,
                ),
            };

        case 'deleteCampaign': {
            // Orphans the debriefs rather than removing them. The campaign is a
            // path; the log is what the user actually did.
            const campaigns = state.campaigns.filter((c) => c.id !== action.id);
            const wasActive = state.activeCampaignId === action.id;
            const nextActive = wasActive
                ? (campaigns[0]?.id ?? null)
                : state.activeCampaignId;

            return {
                ...state,
                campaigns,
                activeCampaignId: nextActive,
            };
        }

        case 'recordPreRating':
            return { ...state, preRatings: { ...state.preRatings, [action.missionId]: action.value } };

        case 'markReframeSeen':
            return { ...state, reframeSeen: { ...state.reframeSeen, [action.missionId]: true } };

        case 'completeMission': {
            const { debrief } = action;
            const campaign = activeCampaignOf(state);
            if (!campaign) return state;

            const own = state.debriefs.filter((d) => d.campaignId === campaign.id);
            const mission = campaign.missions.find((m) => m.level === debrief.level) ?? campaign.missions[0];

            // The ratchet is frozen at write time; the pacing decision is
            // applied immediately unless the user owns the branch ('choose').
            const stored: Debrief = {
                ...debrief,
                campaignId: campaign.id,
                outcome: 'completed',
                frontierAfter: frontierAfter(frontierValue(own), {
                    level: debrief.level,
                    actual: debrief.actualDifficulty,
                    outcome: 'completed',
                    viaBridge: Boolean(campaign.activeBridge),
                }),
            };

            const decision = paceNext(stored, mission, campaign);
            const nextCampaign = applyPacing(campaign, decision);

            return {
                ...state,
                campaigns: state.campaigns.map((c) => (c.id === campaign.id ? nextCampaign : c)),
                debriefs: [...state.debriefs, stored],
            };
        }

        case 'logAttempt': {
            const campaign = activeCampaignOf(state);
            if (!campaign) return state;

            const stored: Debrief = {
                ...action.debrief,
                campaignId: campaign.id,
                outcome: 'attempted',
                // Attempts are worth zero structurally: they can never move the
                // frontier, in this fold or any future one.
                frontierAfter: frontierValue(state.debriefs.filter((d) => d.campaignId === campaign.id)),
            };

            // The bridge is derived here rather than at the call site so it can
            // never be forgotten: an approach attempt must always leave the user
            // with a smaller next step, not parked on the mission that beat them.
            const canonical =
                campaign.missions.find((m) => m.level === stored.level) ?? campaign.missions[0];
            const nextCampaign = canonical
                ? {
                    ...campaign,
                    activeLevel: stored.level,
                    activeBridge: bridgeFor(canonical),
                }
                : campaign;

            return {
                ...state,
                campaigns: state.campaigns.map((c) => (c.id === campaign.id ? nextCampaign : c)),
                debriefs: [...state.debriefs, stored],
            };
        }

        case 'setPacing': {
            const campaign = activeCampaignOf(state);
            if (!campaign) return state;
            const nextCampaign = applyPacing(campaign, action.decision);
            return {
                ...state,
                campaigns: state.campaigns.map((c) => (c.id === campaign.id ? nextCampaign : c)),
            };
        }

        case 'setReminders':
            return { ...state, remindersEnabled: action.enabled };

        default:
            return state;
    }
}

/* ---------------------------------------------------------------- context ---- */

export type CompleteMissionInput = {
    missionId: string;
    level: number;
    missionTitle: string;
    /** Friction domain, frozen onto the log so a deleted campaign's missions survive. */
    domain: Debrief['domain'];
    expectedDifficulty: number;
    actualDifficulty: number;
    notes: string;
    viaBridge?: boolean;
};

export type LogAttemptInput = {
    missionId: string;
    level: number;
    missionTitle: string;
    domain: Debrief['domain'];
    expectedDifficulty: number;
    notes: string;
    freezeTrigger: string;
};

type AppContextValue = State & {
    /**
     * The **active** campaign. Derived, never stored — every screen in the
     * mission loop reads this and needs no knowledge of the array.
     */
    campaign: Campaign | null;
    /** Signed in but no campaign has been generated yet. */
    needsOnboarding: boolean;
    isGenerating: boolean;
    generationLabel: string;
    generationError: string | null;
    signIn: (user?: Partial<User>) => void;
    signOut: () => void;
    updateSeed: (patch: Partial<CampaignSeed>) => void;
    generateCampaign: () => Promise<Campaign>;
    generateCampaignFromSeed: (seed: CampaignSeed) => Promise<Campaign>;
    activateCampaign: (id: string) => void;
    renameCampaign: (id: string, label: string) => void;
    deleteCampaign: (id: string) => void;
    recordPreRating: (missionId: string, value: number) => void;
    markReframeSeen: (missionId: string) => void;
    wasReframeSeen: (missionId: string) => boolean;
    completeMission: (input: CompleteMissionInput) => void;
    logAttempt: (input: LogAttemptInput) => void;
    setPacing: (decision: PacingDecision) => void;
    setReminders: (enabled: boolean) => void;
    expectedFor: (missionId: string) => number | null;
    debriefsFor: (campaignId: string) => Debrief[];
    uncompletedMissions: Mission[];
    level: number;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationLabel, setGenerationLabel] = useState('');
    const [generationError, setGenerationError] = useState<string | null>(null);

    const signIn = useCallback((user?: Partial<User>) => {
        dispatch({ type: 'signIn', user: { ...DEMO_USER, ...user } });
    }, []);

    const signOut = useCallback(() => dispatch({ type: 'signOut' }), []);

    const updateSeed = useCallback((patch: Partial<CampaignSeed>) => {
        dispatch({ type: 'setSeed', patch });
    }, []);

    const generateCampaignFromSeed = useCallback(async (seed: CampaignSeed) => {
        setIsGenerating(true);
        setGenerationLabel('');
        setGenerationError(null);
        try {
            const campaign = await campaignService.generate(seed, (progress: GenerationProgress) => {
                setGenerationLabel(progress.label);
            });
            dispatch({ type: 'addCampaign', campaign });
            return campaign;
        } catch (error) {
            // Kept in state rather than rethrown only: S08 has no back
            // affordance, so the failure has to be renderable there.
            setGenerationError(
                error instanceof Error ? error.message : 'Campaign generation failed. Try again.',
            );
            throw error;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const generateCampaign = useCallback(
        () => generateCampaignFromSeed(state.seed),
        [generateCampaignFromSeed, state.seed],
    );

    const activateCampaign = useCallback((id: string) => {
        dispatch({ type: 'activateCampaign', id });
    }, []);

    const renameCampaign = useCallback((id: string, label: string) => {
        dispatch({ type: 'renameCampaign', id, label });
    }, []);

    const deleteCampaign = useCallback((id: string) => {
        dispatch({ type: 'deleteCampaign', id });
    }, []);

    const recordPreRating = useCallback((missionId: string, value: number) => {
        dispatch({ type: 'recordPreRating', missionId, value });
    }, []);

    const markReframeSeen = useCallback((missionId: string) => {
        dispatch({ type: 'markReframeSeen', missionId });
    }, []);

    const completeMission = useCallback((input: CompleteMissionInput) => {
        dispatch({
            type: 'completeMission',
            debrief: { ...input, completedAt: new Date().toISOString() },
        });
    }, []);

    const logAttempt = useCallback((input: LogAttemptInput) => {
        dispatch({
            type: 'logAttempt',
            debrief: {
                ...input,
                actualDifficulty: input.expectedDifficulty,
                completedAt: new Date().toISOString(),
            },
        });
    }, []);

    const setPacing = useCallback((decision: PacingDecision) => {
        dispatch({ type: 'setPacing', decision });
    }, []);

    const setReminders = useCallback((enabled: boolean) => {
        dispatch({ type: 'setReminders', enabled });
    }, []);

    const value = useMemo<AppContextValue>(() => {
        const campaign = activeCampaignOf(state);
        const expectedFor = (missionId: string) => state.preRatings[missionId] ?? null;
        const wasReframeSeen = (missionId: string) => Boolean(state.reframeSeen[missionId]);
        // Debriefs are back-filled on read so legacy rows still contribute to
        // the capability profile and the frontier.
        const debriefs = migrateDebriefs(state.debriefs, campaign?.id ?? null);
        const uncompletedMissions = campaign
            ? campaign.missions.filter((m) => m.status !== 'completed')
            : [];

        return {
            ...state,
            debriefs,
            campaign,
            needsOnboarding: Boolean(state.user) && state.campaigns.length === 0,
            isGenerating,
            generationLabel,
            generationError,
            signIn,
            signOut,
            updateSeed,
            generateCampaign,
            generateCampaignFromSeed,
            activateCampaign,
            renameCampaign,
            deleteCampaign,
            recordPreRating,
            markReframeSeen,
            wasReframeSeen,
            completeMission,
            logAttempt,
            setPacing,
            setReminders,
            expectedFor,
            debriefsFor: (campaignId: string) => selectDebriefsFor(campaignId, debriefs),
            uncompletedMissions,
            level: campaign?.activeLevel ?? 1,
        };
    }, [
        state,
        isGenerating,
        generationLabel,
        generationError,
        signIn,
        signOut,
        updateSeed,
        generateCampaign,
        generateCampaignFromSeed,
        activateCampaign,
        renameCampaign,
        deleteCampaign,
        recordPreRating,
        markReframeSeen,
        completeMission,
        logAttempt,
        setPacing,
        setReminders,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used inside <AppProvider>');
    return context;
}

export type { MissionOutcome };

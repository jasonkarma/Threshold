/**
 * App-wide state: session, campaign, and the debrief log the calibration
 * metrics are derived from.
 *
 * Deliberately a plain React context + reducer — no data library, no
 * persistence yet. When auth and the database arrive, only the actions in here
 * change; screens read from the derived selectors in `lib/calibration.ts`.
 */
import React, { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';

import { campaignService, type GenerationProgress } from '@/lib/campaign-service';
import { currentLevel } from '@/lib/calibration';
import { DEMO_SEED } from '@/lib/mock-campaign';
import type { Campaign, CampaignSeed, Debrief, Mission, User } from '@/lib/types';

type State = {
    user: User | null;
    campaign: Campaign | null;
    debriefs: Debrief[];
    /** missionId → expected difficulty captured on the pre-rating screen. */
    preRatings: Record<string, number>;
    seed: CampaignSeed;
    remindersEnabled: boolean;
};

type Action =
    | { type: 'signIn'; user: User }
    | { type: 'signOut' }
    | { type: 'setSeed'; patch: Partial<CampaignSeed> }
    | { type: 'setCampaign'; campaign: Campaign }
    | { type: 'clearCampaign' }
    | { type: 'recordPreRating'; missionId: string; value: number }
    | { type: 'completeMission'; debrief: Debrief }
    | { type: 'setReminders'; enabled: boolean };

const DEMO_USER: User = {
    id: 'user-demo',
    name: 'Karma Chou',
    email: 'karma@threshold.app',
    initials: 'KC',
};

const initialState: State = {
    user: null,
    campaign: null,
    debriefs: [],
    preRatings: {},
    seed: DEMO_SEED,
    remindersEnabled: true,
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'signIn':
            return { ...state, user: action.user };

        case 'signOut':
            return { ...initialState, user: null };

        case 'setSeed':
            return { ...state, seed: { ...state.seed, ...action.patch } };

        case 'setCampaign':
            return { ...state, campaign: action.campaign };

        case 'clearCampaign':
            return { ...state, campaign: null, debriefs: [], preRatings: {} };

        case 'recordPreRating':
            return { ...state, preRatings: { ...state.preRatings, [action.missionId]: action.value } };

        case 'completeMission': {
            const { debrief } = action;
            const nextLevel = debrief.level + 1;
            const campaign = state.campaign
                ? {
                    ...state.campaign,
                    missions: state.campaign.missions.map((m): Mission => {
                        if (m.level === debrief.level) return { ...m, status: 'completed' };
                        if (m.level === nextLevel) return { ...m, status: 'active' };
                        return m;
                    }),
                }
                : null;

            return {
                ...state,
                campaign,
                debriefs: [...state.debriefs, debrief],
            };
        }

        case 'setReminders':
            return { ...state, remindersEnabled: action.enabled };

        default:
            return state;
    }
}

type AppContextValue = State & {
    /** Signed in but the campaign has not been generated yet. */
    needsOnboarding: boolean;
    isGenerating: boolean;
    generationLabel: string;
    /** Message from the last failed generation, or null. */
    generationError: string | null;
    signIn: (user?: Partial<User>) => void;
    signOut: () => void;
    updateSeed: (patch: Partial<CampaignSeed>) => void;
    generateCampaign: () => Promise<Campaign>;
    generateCampaignFromSeed: (seed: CampaignSeed) => Promise<Campaign>;
    resetCampaign: () => void;
    recordPreRating: (missionId: string, value: number) => void;
    completeMission: (debrief: Omit<Debrief, 'completedAt'>) => void;
    setReminders: (enabled: boolean) => void;
    expectedFor: (missionId: string) => number | null;
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
            dispatch({ type: 'setCampaign', campaign });
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

    const resetCampaign = useCallback(() => dispatch({ type: 'clearCampaign' }), []);

    const recordPreRating = useCallback((missionId: string, value: number) => {
        dispatch({ type: 'recordPreRating', missionId, value });
    }, []);

    const completeMission = useCallback((debrief: Omit<Debrief, 'completedAt'>) => {
        dispatch({ type: 'completeMission', debrief: { ...debrief, completedAt: new Date().toISOString() } });
    }, []);

    const setReminders = useCallback((enabled: boolean) => {
        dispatch({ type: 'setReminders', enabled });
    }, []);

    const value = useMemo<AppContextValue>(() => {
        const expectedFor = (missionId: string) => state.preRatings[missionId] ?? null;
        const uncompletedMissions = state.campaign
            ? state.campaign.missions.filter((m) => m.status !== 'completed')
            : [];

        return {
            ...state,
            needsOnboarding: Boolean(state.user) && !state.campaign,
            isGenerating,
            generationLabel,
            generationError,
            signIn,
            signOut,
            updateSeed,
            generateCampaign,
            generateCampaignFromSeed,
            resetCampaign,
            recordPreRating,
            completeMission,
            setReminders,
            expectedFor,
            uncompletedMissions,
            level: state.campaign ? currentLevel(state.campaign, state.debriefs) : 1,
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
        resetCampaign,
        recordPreRating,
        completeMission,
        setReminders,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used inside <AppProvider>');
    return context;
}

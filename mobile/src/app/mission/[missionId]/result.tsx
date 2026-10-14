import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, FooterActions, NavHeader, Screen, ScoreRow, type BadgeTone } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import {
    archetypeReadout,
    classifyDebrief,
    formatFrontier,
    frontier,
    lastDebrief,
    predictionError,
} from '@/lib/calibration';
import { useApp } from '@/store/app-store';
import type { DebriefArchetype } from '@/lib/types';
import { colors, spacing } from '@/theme/tokens';

/**
 * S14 — Prediction error result.
 *
 * The screen is driven entirely by the **archetype** the mission classifies
 * into (`plans/threshold-points-plan.md` §4). There is no points receipt, no
 * delta-as-currency and no near-miss countdown: the reward here is the meaning,
 * not a balance.
 *
 * Two rules that are easy to undo by accident:
 *
 * 1. **A mission that ran harder than feared renders no zero-value line.** A
 *    visible `+0` undoes the sentence sitting above it. `emphasiseGap` decides
 *    whether the numbers are the anchor or are de-emphasised.
 * 2. **Only Distress Tolerance offers a choice**, and neither branch is styled
 *    as the recommended one — the app does not know which answer is right.
 */
/**
 * Leaves the mission loop entirely.
 *
 * The loop is a modal stack over the tabs, so `replace` would only swap its top
 * screen — the finished pre-rating → debrief screens would stay underneath and
 * a back press would land the user in a mission they already logged. Dismissing
 * the stack is what actually returns them to the tabs.
 */
function useExitMission() {
    const router = useRouter();

    return useCallback(
        (destination: '/(tabs)/home' | '/(tabs)/progress') => {
            if (router.canDismiss()) {
                router.dismissTo(destination);
                return;
            }
            router.replace(destination);
        },
        [router],
    );
}

const ARCHETYPE_TONE: Record<DebriefArchetype, BadgeTone> = {
    expectancy_violation: 'success',
    distress_tolerance: 'amber',
    baseline_mastery: 'muted',
    approach_attempt: 'muted',
    calibration_match: 'success',
    underestimate: 'amber',
};

export default function ResultScreen() {
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { debriefs, campaign, setPacing } = useApp();
    const exitMission = useExitMission();

    const debrief =
        [...debriefs].reverse().find((d) => d.missionId === missionId) ?? lastDebrief(debriefs);

    if (!debrief) {
        return (
            <>
                <NavHeader title="Fear vs reality" />
                <Screen>
                    <Subtitle>No debrief logged yet. Complete a mission to see your prediction error.</Subtitle>
                    <Button label="Back to Home" onPress={() => exitMission('/(tabs)/home')} />
                </Screen>
            </>
        );
    }

    const readout = archetypeReadout(debrief);
    const archetype = classifyDebrief(debrief);
    const error = predictionError(debrief.expectedDifficulty, debrief.actualDifficulty);
    const current = frontier(debriefs, campaign);
    const nextLevel = campaign?.missions.find((m) => m.level === debrief.level + 1) ?? null;

    return (
        <>
            <NavHeader title="Fear vs reality" />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.hero}>
                    <Badge label={readout.label} tone={ARCHETYPE_TONE[archetype]} />
                    <Text variant="title" center style={styles.headline}>
                        {readout.headline}
                    </Text>
                    <Subtitle center>{readout.body}</Subtitle>
                </View>

                {/*
                  `emphasiseGap` is false for Distress Tolerance, where the two
                  numbers are close and the point is that the user acted anyway.
                  Painting the delta green there would read as a verdict.
                */}
                <ScoreRow
                    expected={error.expected}
                    actual={error.actual}
                    delta={error.delta}
                    emphasiseDelta={readout.emphasiseGap}
                />

                {archetype === 'distress_tolerance' ? (
                    <Card>
                        <Text variant="kicker">Your call</Text>
                        <Subtitle>
                            You crossed Level {debrief.level} at high friction. Both branches are legitimate — the
                            app has no opinion about which one you should take.
                        </Subtitle>
                        <Button
                            label={`Run Level ${debrief.level} once more`}
                            onPress={() => setPacing({ kind: 'repeat', level: debrief.level, reason: 'consolidate' })}
                        />
                        <Button
                            label={`Push to Level ${debrief.level + 1} anyway`}
                            variant="secondary"
                            onPress={() => setPacing({ kind: 'advance', level: debrief.level + 1 })}
                        />
                    </Card>
                ) : null}

                {archetype === 'approach_attempt' ? (
                    <Card>
                        <Text variant="kicker">What we changed</Text>
                        <Subtitle>
                            {debrief.freezeTrigger
                                ? `You logged the freeze: “${debrief.freezeTrigger}”. `
                                : ''}
                            We&rsquo;ve lowered the step for Level {debrief.level} — same level, smaller move. You are not
                            parked on the mission that beat you.
                        </Subtitle>
                    </Card>
                ) : null}

                <Card>
                    <Text variant="kicker">
                        {archetype === 'underestimate' ? 'Not yet held' : 'Calibration'}
                    </Text>
                    {archetype === 'underestimate' ? (
                        <Subtitle>
                            Level {debrief.level} is still above what you can comfortably hold. Running it once more is the
                            fastest way to close that — not a step back.
                        </Subtitle>
                    ) : nextLevel ? (
                        <Subtitle>
                            Level {nextLevel.level} is next: {nextLevel.title}.
                        </Subtitle>
                    ) : (
                        <Subtitle>
                            That was the last level in this campaign. You crossed the whole path — start a new one from
                            Settings to keep going.
                        </Subtitle>
                    )}
                </Card>

                <Card variant="soft">
                    <View style={styles.frontierHeader}>
                        <Text variant="kicker">Your frontier</Text>
                        <Text variant="mono" color={colors.amber}>
                            {formatFrontier(current.value)}
                        </Text>
                    </View>
                    <Text variant="subhead">{current.rung.name}</Text>
                    <Subtitle>{current.rung.blurb}</Subtitle>
                    <Subtitle>
                        This is a watermark, not a payment — nothing was added to a balance. It only ever rises, and it is
                        the same number you&rsquo;ll see on Capability.
                        {current.next ? ` Next name: ${current.next.name} at ${current.next.floor.toFixed(1)}.` : ''}
                    </Subtitle>
                </Card>

                <Card variant="soft">
                    <Subtitle>
                        <Text variant="caption" color={colors.snow} weight="700">
                            Your note:{' '}
                        </Text>
                        {debrief.notes}
                    </Subtitle>
                </Card>

                <FooterActions>
                    <Button label="Back to Home" onPress={() => exitMission('/(tabs)/home')} />
                    <Button
                        label="View Capability"
                        variant="secondary"
                        onPress={() => exitMission('/(tabs)/progress')}
                    />
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xxl, paddingTop: spacing.sm },
    hero: { alignItems: 'center', gap: spacing.md },
    headline: { fontSize: 24 },
    frontierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

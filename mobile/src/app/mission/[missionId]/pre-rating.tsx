import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, FooterActions, NavHeader, Screen } from '@/components/ui';
import { DifficultySlider } from '@/components/ui/difficulty-slider';
import { Subtitle, Text } from '@/components/ui/text';
import { missionById, reframeFor } from '@/lib/calibration';
import { useGoBack } from '@/lib/navigation';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S11 — Active mission pre-rating.
 *
 * The expected-difficulty reading is mandatory before the mission can start.
 * Without a pre-rating there is no prediction to be wrong about, and the whole
 * calibration loop has nothing to measure (Story 2 acceptance criteria).
 *
 * It is also **unpriced**: the number feeds the archetype and the Reality Check,
 * never a reward. That is what makes it trustworthy enough to be worth asking
 * for — see `plans/threshold-points-plan.md` §1.3.
 *
 * The Reality Check itself (§6.2) supplies motivation *before* the action, which
 * is where it actually reduces avoidance, rather than paying for it afterwards.
 */
export default function PreRatingScreen() {
    const router = useRouter();
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { campaign, debriefs, recordPreRating, expectedFor, wasReframeSeen, markReframeSeen } = useApp();
    // The mission stack is a modal over the tabs, so an empty history means the
    // user landed here by deep link — Home is the only sensible place to go.
    const goBack = useGoBack('/(tabs)/home');

    const mission = missionById(campaign, missionId);
    const [value, setValue] = useState(expectedFor(missionId) ?? 50);

    if (!mission) {
        return (
            <>
                <NavHeader title="Mission unavailable" onBack={goBack} />
                <Screen>
                    <Subtitle>This mission is no longer part of your campaign.</Subtitle>
                </Screen>
            </>
        );
    }

    // Re-evaluates as the slider moves and crosses the gate — the callout is
    // most useful at the exact moment the user admits it feels intimidating.
    const reframe = wasReframeSeen(mission.id) ? null : reframeFor(Math.round(value), debriefs);

    const start = () => {
        recordPreRating(mission.id, Math.round(value));
        if (reframe) markReframeSeen(mission.id);
        router.push(`/mission/${mission.id}/in-progress`);
    };

    return (
        <>
            <NavHeader title="Before you go" onBack={goBack} />
            <Screen topInset={false} contentStyle={styles.content}>
                <Card>
                    <View style={styles.cardHeader}>
                        <Badge label={`Level ${mission.level}`} />
                        <Text variant="micro" color={colors.fog}>
                            {mission.tags.join(' · ')}
                        </Text>
                    </View>
                    <Text variant="headline">{mission.title}</Text>
                    <Subtitle>{mission.description}</Subtitle>
                    <Divider />
                    <Text variant="caption" color={colors.fog}>
                        <Text variant="caption" color={colors.snow} weight="700">
                            Context:{' '}
                        </Text>
                        {mission.context}
                    </Text>
                </Card>

                <DifficultySlider
                    label="Expected"
                    helper="How intimidating does this feel right now? (0 = none, 100 = freeze)"
                    value={value}
                    onChange={setValue}
                />

                {reframe ? (
                    <Card variant="soft" style={styles.reframe}>
                        <Text variant="kicker">Reality check</Text>
                        <Text variant="subhead">{reframe.headline}</Text>
                        <Subtitle>{reframe.body}</Subtitle>
                        {/*
                          Never predictive. "So this will probably be easy" is a
                          forecast the app cannot make, and being wrong once costs
                          every number on the screen its credibility. This states
                          a fact about the user's history and stops.
                        */}
                        <Text variant="caption" color={colors.muted}>
                            That&rsquo;s your history, not a prediction about today.
                        </Text>
                    </Card>
                ) : null}

                <FooterActions>
                    <Button label="I'm ready — start" onPress={start} />
                    <Button label="Cancel" variant="ghost" onPress={goBack} />
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xxl, paddingTop: spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reframe: { borderColor: colors.amberDim },
});

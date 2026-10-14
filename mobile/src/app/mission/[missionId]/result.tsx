import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, FooterActions, NavHeader, Screen, ScoreRow } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { insightFor, lastDebrief, predictionError } from '@/lib/calibration';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S14 — Prediction error result.
 *
 * The payoff screen: expected vs actual vs delta, framed as evidence rather
 * than a grade. Long-term the calibration note here should describe the actual
 * adjustment the system made to the next mission's difficulty.
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

export default function ResultScreen() {
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { debriefs, campaign } = useApp();
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

    const error = predictionError(debrief.expectedDifficulty, debrief.actualDifficulty);
    const nextLevel = campaign?.missions.find((m) => m.level === debrief.level + 1) ?? null;

    return (
        <>
            <NavHeader title="Fear vs reality" />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.hero}>
                    <Badge label="Mission logged" tone="success" />
                    <Text variant="title" center style={styles.headline}>
                        {insightFor(error)}
                    </Text>
                    <Subtitle center>Your prediction error just expanded the map.</Subtitle>
                </View>

                <ScoreRow expected={error.expected} actual={error.actual} delta={error.delta} />

                <Card>
                    <Text variant="kicker">Calibration</Text>
                    {nextLevel ? (
                        <Subtitle>
                            Level {nextLevel.level} is unlocked: {nextLevel.title}. Future missions in this context will
                            bias slightly {error.easier ? 'easier' : 'harder'} based on this gap.
                        </Subtitle>
                    ) : (
                        <Subtitle>
                            That was the last level in this campaign. You crossed the whole path — regenerate from
                            Settings to keep going.
                        </Subtitle>
                    )}
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
                        label="View Progress"
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
});

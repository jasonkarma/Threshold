import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, FooterActions, LevelPill, NavHeader, Screen, Chip, ChipRow } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { FREEZE_TRIGGERS, missionById } from '@/lib/calibration';
import { useGoBack } from '@/lib/navigation';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S12 — Mission in progress.
 *
 * A deliberately quiet screen: the user is meant to be acting in the real
 * world, not looking at the phone. No timer, no streak clock, no urgency —
 * there is nothing here that punishes walking away and coming back later.
 *
 * The "log an attempt" path is the most important thing on this screen. It is
 * framed as **diagnostic data**, never as a consolation prize: the behaviour
 * treatment actually reinforces is the approach, and completing is an outcome
 * the user cannot control. So it pays nothing, never moves the frontier, and
 * always swaps in a lighter step rather than parking them here
 * (`plans/threshold-points-plan.md` §4.4).
 */
export default function InProgressScreen() {
    const router = useRouter();
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { campaign, expectedFor, logAttempt } = useApp();
    // Swipe-back is disabled on this screen (see mission/_layout.tsx), so the
    // header is the only way out — it must work even without history.
    const goBack = useGoBack('/(tabs)/home');

    const mission = missionById(campaign, missionId);
    const expected = expectedFor(missionId);
    const [loggingAttempt, setLoggingAttempt] = useState(false);
    const [trigger, setTrigger] = useState<string | null>(null);

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

    const submitAttempt = () => {
        if (!trigger) return;
        logAttempt({
            missionId: mission.id,
            level: mission.level,
            missionTitle: mission.title,
            domain: mission.domain,
            expectedDifficulty: expected ?? 50,
            notes: `Held back — ${trigger.toLowerCase()}.`,
            freezeTrigger: trigger,
        });
        router.replace(`/mission/${mission.id}/result`);
    };

    return (
        <>
            <NavHeader title="In the field" onBack={goBack} />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.centered}>
                    <Badge label="Mission live" />
                    <Text variant="title" center style={styles.headline}>
                        Go do the thing.
                    </Text>
                    <Subtitle center>
                        This screen stays quiet while you act. Come back when you&rsquo;re done — no streak clock
                        running.
                    </Subtitle>
                </View>

                <Card>
                    <View style={styles.cardHeader}>
                        <LevelPill label={`L${mission.level}`} />
                        <Text variant="mono" color={colors.fog}>
                            Expected {expected ?? '—'}
                        </Text>
                    </View>
                    <Text variant="subhead">{mission.title}</Text>
                    <Subtitle>{mission.tags.join(' · ')}</Subtitle>
                </Card>

                <Card variant="soft">
                    <Subtitle>
                        <Text variant="caption" color={colors.snow} weight="700">
                            Tip:{' '}
                        </Text>
                        {mission.tip}
                    </Subtitle>
                </Card>

                {loggingAttempt ? (
                    <Card style={styles.attemptCard}>
                        <Text variant="kicker">What tripped the freeze?</Text>
                        <Subtitle>
                            Finishing isn&rsquo;t required to log this. Trying counts — and we&rsquo;ll lower the step so
                            the next one is smaller.
                        </Subtitle>
                        <ChipRow>
                            {FREEZE_TRIGGERS.map((option) => (
                                <Chip
                                    key={option}
                                    label={option}
                                    active={trigger === option}
                                    onPress={() => setTrigger(option)}
                                />
                            ))}
                        </ChipRow>
                        <Button label="Log the attempt" onPress={submitAttempt} disabled={!trigger} />
                        <Button
                            label="Never mind — I'll try again"
                            variant="ghost"
                            onPress={() => setLoggingAttempt(false)}
                        />
                    </Card>
                ) : null}

                <FooterActions>
                    {!loggingAttempt ? (
                        <>
                            <Button
                                label="I did it — debrief"
                                onPress={() => router.push(`/mission/${mission.id}/debrief`)}
                            />
                            <Button
                                label="Log an attempt"
                                variant="secondary"
                                onPress={() => setLoggingAttempt(true)}
                            />
                            <Text variant="caption" color={colors.fog} center>
                                Held back is real data, not a failure. It&rsquo;s worth logging.
                            </Text>
                        </>
                    ) : null}
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xxl, paddingTop: spacing.sm },
    centered: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
    headline: { fontSize: 22 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    attemptCard: { borderColor: colors.amberDim },
});

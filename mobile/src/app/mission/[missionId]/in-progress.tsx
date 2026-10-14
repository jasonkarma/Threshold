import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, FooterActions, LevelPill, NavHeader, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useGoBack } from '@/lib/navigation';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S12 — Mission in progress.
 *
 * A deliberately quiet screen: the user is meant to be acting in the real
 * world, not looking at the phone. No timer, no streak clock, no urgency —
 * there is nothing here that punishes walking away and coming back later.
 */
export default function InProgressScreen() {
    const router = useRouter();
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { campaign, expectedFor } = useApp();
    // Swipe-back is disabled on this screen (see mission/_layout.tsx), so the
    // header is the only way out — it must work even without history.
    const goBack = useGoBack('/(tabs)/home');

    const mission = campaign?.missions.find((m) => m.id === missionId) ?? null;
    const expected = expectedFor(missionId);

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

                <FooterActions>
                    <Button label="I did it — debrief" onPress={() => router.push(`/mission/${mission.id}/debrief`)} />
                    <Button label="Abort / pause" variant="secondary" onPress={() => router.replace('/(tabs)/home')} />
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
});

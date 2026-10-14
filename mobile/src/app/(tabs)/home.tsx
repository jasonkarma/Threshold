import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, LevelPill, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { activeMission, insightFor, lastDebrief, nextMission, predictionError } from '@/lib/calibration';
import { useApp } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * S10 — Home dashboard.
 *
 * Four stacked sections: greeting + threshold badge, the active mission, a
 * locked preview of the next level, and the last prediction error. The insight
 * slot is the product's memory — it is what keeps the "fear vs reality" loop
 * present between missions.
 */
export default function HomeScreen() {
    const router = useRouter();
    const { user, campaign, debriefs } = useApp();

    const current = campaign ? activeMission(campaign, debriefs) : null;
    const upcoming = campaign ? nextMission(campaign, debriefs) : null;
    const recent = lastDebrief(debriefs);
    const score = recent ? Math.abs(recent.expectedDifficulty - recent.actualDifficulty) : null;

    return (
        <Screen hasTabBar>
            <View style={styles.greeting}>
                <View style={styles.greetingText}>
                    <Text variant="caption" color={colors.fog}>
                        Welcome back
                    </Text>
                    <Text variant="title" style={styles.name}>
                        {user?.name.split(' ')[0] ?? 'Friend'}
                    </Text>
                </View>
                <Badge label={`Threshold ${score ?? 0}`} />
            </View>

            {current ? (
                <Card>
                    <View style={styles.cardHeader}>
                        <Text variant="kicker">Active mission</Text>
                        <LevelPill label={`L${current.level}`} />
                    </View>
                    <Text variant="headline">{current.title}</Text>
                    <Subtitle>{current.description}</Subtitle>
                    <Button label="Begin mission" onPress={() => router.push(`/mission/${current.id}/pre-rating`)} />
                </Card>
            ) : (
                <Card>
                    <Text variant="kicker">Campaign complete</Text>
                    <Text variant="headline">You crossed every level.</Text>
                    <Subtitle>
                        {campaign
                            ? `All ${campaign.missions.length} missions logged. Regenerate your campaign from Settings to keep going.`
                            : 'Sign in and complete onboarding to generate your mission path.'}
                    </Subtitle>
                </Card>
            )}

            {upcoming ? (
                <Card variant="soft" style={styles.lockedCard}>
                    <View style={styles.cardHeader}>
                        <Badge label="Locked" tone="muted" />
                        <LevelPill label={`L${upcoming.level}`} />
                    </View>
                    <Text variant="subhead">{upcoming.title}</Text>
                    <Subtitle>Unlocks after Level {upcoming.level - 1} debrief.</Subtitle>
                </Card>
            ) : null}

            <Card variant="soft">
                <Text variant="kicker">Last insight</Text>
                {recent ? (
                    <Subtitle>
                        {insightFor(
                            predictionError(recent.expectedDifficulty, recent.actualDifficulty),
                        )}{' '}
                        Expected {recent.expectedDifficulty}, lived {recent.actualDifficulty}.
                    </Subtitle>
                ) : (
                    <Subtitle>
                        No missions completed yet. Your first prediction error will show here.
                    </Subtitle>
                )}
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    greeting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
    greetingText: { flex: 1 },
    name: { fontSize: 26, marginTop: spacing.xs },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lockedCard: { borderRadius: radius.md },
});
